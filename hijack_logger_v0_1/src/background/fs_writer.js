// Hijack Poker HH Logger — File System Access API writer
//
// Manages the FileSystemDirectoryHandle persisted in IndexedDB, opens
// per-table session files, appends hand-history text live, and tracks
// session lifecycle (tab-open → tab-close = one session = one .txt).
//
// Per council R2: File System Access API as v1, native-messaging as v2
// escape hatch if Gate 5 durability fails.

// v0.2.0: FSA writes delegated to an offscreen document. The SW can't hold
// FSA permissions reliably (no DOM/window, gets evicted after ~30s idle).
// Offscreen docs run in a real DOM context and persist across SW evictions,
// so handle.queryPermission()='granted' propagates correctly there.
//
// fs_writer.js still owns the file-name composition + session bookkeeping;
// it just forwards the actual write to offscreen via chrome.runtime.sendMessage.

import { idbGet, idbSet, idbDelete, IDB_HANDLE_KEY, IDB_DIRNAME_KEY } from '../lib/idb.js';

const OFFSCREEN_PATH = 'src/offscreen/offscreen.html';

let huskWarned = false;
let offscreenReadyPromise = null;

async function ensureOffscreenReady() {
  if (offscreenReadyPromise) return offscreenReadyPromise;
  offscreenReadyPromise = (async () => {
    try {
      const existing = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
      });
      if (existing && existing.length > 0) return;
      await chrome.offscreen.createDocument({
        url: OFFSCREEN_PATH,
        reasons: ['BLOBS'],
        justification: 'Persist FileSystemDirectoryHandle for hand-history writes across SW evictions.',
      });
      console.log('[hjk] offscreen document created');
    } catch (e) {
      console.warn('[hjk] offscreen createDocument failed:', e.message);
      throw e;
    }
  })();
  return offscreenReadyPromise;
}

async function offscreenWrite(filename, text) {
  await ensureOffscreenReady();
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { target: 'offscreen', kind: 'offscreen_write', filename, text },
      (resp) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(resp || { ok: false, error: 'no response from offscreen' });
        }
      }
    );
  });
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Get the persisted handle, request permission if needed.
 * Returns null if no handle stored or permission denied.
 *
 * The handle MUST have been written to IDB from a context where its methods
 * are intact (popup.js, NOT via chrome.runtime.sendMessage). IDB's structured-
 * clone preserves the handle; chrome.runtime.sendMessage's JSON-ish transport
 * does not.
 *
 * v0.1.6: if we detect a stripped husk (v0.1.3 carry-over), AUTO-WIPE it from
 * IDB so the popup's "Output directory" UI immediately reflects 'not set' and
 * the user knows to re-pick.
 *
 * @returns {Promise<FileSystemDirectoryHandle | null>}
 */
// v0.1.7: verbose logging so we can diagnose silent null returns.
// Each call logs why the handle was rejected (or accepted), once per outcome
// per SW boot to avoid log spam.
const _outcomeLogged = new Set();
function logOutcomeOnce(outcome, details = '') {
  if (_outcomeLogged.has(outcome)) return;
  _outcomeLogged.add(outcome);
  console.log(`[hjk] getOutputDirHandle outcome=${outcome} ${details}`);
}

export async function getOutputDirHandle() {
  const handle = await idbGet(IDB_HANDLE_KEY);
  if (!handle) {
    logOutcomeOnce('no_handle_in_idb', '— IDB has nothing under outputDirHandle key. Re-pick in popup.');
    return null;
  }
  if (typeof handle.queryPermission !== 'function') {
    if (!huskWarned) {
      console.warn(`[hjk] stale stripped handle from v0.1.3 detected in IDB (name=${handle.name}, kind=${handle.kind}, typeof queryPermission=${typeof handle.queryPermission}); wiping. Re-pick the output folder in the popup.`);
      huskWarned = true;
    }
    try {
      await idbDelete(IDB_HANDLE_KEY);
      await idbDelete(IDB_DIRNAME_KEY);
      chrome.storage.local.remove('outputDirName').catch(() => {});
    } catch (e) { /* swallow */ }
    return null;
  }
  let perm;
  try {
    perm = await handle.queryPermission({ mode: 'readwrite' });
  } catch (e) {
    logOutcomeOnce('queryPermission_threw', `error=${e.message}`);
    return null;
  }
  if (perm === 'granted') {
    logOutcomeOnce('granted', `handle.name=${handle.name}`);
    return handle;
  }
  if (perm === 'prompt') {
    console.log(`[hjk] getOutputDirHandle: queryPermission='prompt'; trying requestPermission (note: requires user gesture, may fail in SW context)`);
    try {
      perm = await handle.requestPermission({ mode: 'readwrite' });
      console.log(`[hjk] getOutputDirHandle: requestPermission returned '${perm}'`);
    } catch (e) {
      logOutcomeOnce('requestPermission_threw', `error=${e.message} (likely 'User activation is required' — re-pick in popup)`);
      return null;
    }
    if (perm === 'granted') return handle;
    logOutcomeOnce('request_not_granted', `final perm=${perm}`);
    return null;
  }
  logOutcomeOnce('perm_denied', `queryPermission returned '${perm}'`);
  return null;
}

/**
 * Compose a filename for a (table, session) pair, PokerStars-style.
 * Format: HH<YYYYMMDD>-<HHMMSS> T<gameID>-<sessionSeq>.txt
 */
export function composeFilename(gameID, sessionStartedAt, sessionSeq = 1) {
  const d = new Date(sessionStartedAt * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `HH${date}-${time} T${gameID}-${sessionSeq}.txt`;
}

/**
 * Append text to a session file. v0.2.0: delegates to offscreen document
 * which holds the FSA handle in a DOM context where permissions persist.
 * @param {string} filename
 * @param {string} text
 */
export async function appendToSessionFile(filename, text) {
  const result = await offscreenWrite(filename, text);
  if (!result.ok) {
    throw new Error(result.error || 'offscreen write failed');
  }
}

/**
 * Manages per-session file state. Tracks active session per (tabId, gameID),
 * generates filenames, dedupes writes, surfaces failures.
 */
export class SessionWriter {
  constructor() {
    this.sessions = new Map();  // key: `${tabId}:${gameID}` → { filename, startedAt, sessionSeq, lastWriteAt, handsWritten }
    this.errorCounts = new Map();  // key → consecutive error count
    // v0.2.32: hold failed-write hands in memory; retry on next successful
    // write or on output_dir_changed event. Caps at MAX_PENDING to avoid
    // unbounded memory if permission is never restored.
    this.pendingWrites = [];
    this.MAX_PENDING = 2000;
  }

  _key(tabId, gameID) { return `${tabId}:${gameID}`; }

  /**
   * Get (or lazily create) session info for this tab+table.
   * @param {number} tabId
   * @param {number} gameID
   * @param {number} sessionStartedAt — epoch seconds for filename generation
   */
  ensureSession(tabId, gameID, sessionStartedAt) {
    const key = this._key(tabId, gameID);
    if (this.sessions.has(key)) return this.sessions.get(key);
    const sessionSeq = 1;  // TODO: increment if a prior session for this table closed today
    const filename = composeFilename(gameID, sessionStartedAt || Math.floor(Date.now() / 1000), sessionSeq);
    const sess = {
      filename,
      gameID,
      tabId,
      startedAt: sessionStartedAt,
      sessionSeq,
      lastWriteAt: 0,
      handsWritten: 0,
    };
    this.sessions.set(key, sess);
    return sess;
  }

  /**
   * Append a finalized hand record's PS-format text to its session file.
   */
  async writeHand(tabId, gameID, sessionStartedAt, handText) {
    const sess = this.ensureSession(tabId, gameID, sessionStartedAt);

    // v0.2.32: opportunistically drain any queued failed writes first.
    // If permission is now granted, this catches up on backlog before
    // appending the new hand.
    if (this.pendingWrites.length > 0) {
      await this.drainPending();
    }

    try {
      await appendToSessionFile(sess.filename, handText);
      sess.handsWritten++;
      sess.lastWriteAt = Date.now();
      this.errorCounts.set(this._key(tabId, gameID), 0);
      return { ok: true, filename: sess.filename, handsWritten: sess.handsWritten };
    } catch (e) {
      const key = this._key(tabId, gameID);
      const errs = (this.errorCounts.get(key) || 0) + 1;
      this.errorCounts.set(key, errs);
      // v0.2.32: queue the hand for later retry if the failure looks
      // permission-related. Once user re-picks the folder, drainPending()
      // will write it.
      const recoverable = /perm=prompt|User activation|requestPermission/i.test(e.message || '');
      if (recoverable && this.pendingWrites.length < this.MAX_PENDING) {
        this.pendingWrites.push({ filename: sess.filename, text: handText, queuedAt: Date.now() });
        console.warn(`[hjk] hand queued for retry (pending=${this.pendingWrites.length})`);
      }
      return { ok: false, error: e.message, consecutiveErrors: errs, queued: recoverable };
    }
  }

  /**
   * v0.2.32: retry all pending writes (called on output_dir_changed message
   * from popup, or opportunistically on next successful writeHand).
   */
  async drainPending() {
    if (this.pendingWrites.length === 0) return { drained: 0, remaining: 0 };
    const queue = this.pendingWrites;
    this.pendingWrites = [];
    let drained = 0;
    for (const item of queue) {
      try {
        await appendToSessionFile(item.filename, item.text);
        drained++;
      } catch (e) {
        // Permission still bad — restore the rest of the queue
        this.pendingWrites.push(item, ...queue.slice(queue.indexOf(item) + 1));
        break;
      }
    }
    if (drained > 0) console.log(`[hjk] drainPending: wrote ${drained} queued hands, ${this.pendingWrites.length} still pending`);
    return { drained, remaining: this.pendingWrites.length };
  }

  pendingCount() { return this.pendingWrites.length; }

  /**
   * Close a session — called when the tab closes.
   */
  closeSession(tabId, gameID) {
    this.sessions.delete(this._key(tabId, gameID));
    this.errorCounts.delete(this._key(tabId, gameID));
  }

  /**
   * Close all sessions for a tab.
   */
  closeTab(tabId) {
    const prefix = `${tabId}:`;
    for (const key of Array.from(this.sessions.keys())) {
      if (key.startsWith(prefix)) this.sessions.delete(key);
    }
    for (const key of Array.from(this.errorCounts.keys())) {
      if (key.startsWith(prefix)) this.errorCounts.delete(key);
    }
  }
}
