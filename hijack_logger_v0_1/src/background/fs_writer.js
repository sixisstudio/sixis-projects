// Hijack Poker HH Logger — File System Access API writer
//
// Manages the FileSystemDirectoryHandle persisted in IndexedDB, opens
// per-table session files, appends hand-history text live, and tracks
// session lifecycle (tab-open → tab-close = one session = one .txt).
//
// Per council R2: File System Access API as v1, native-messaging as v2
// escape hatch if Gate 5 durability fails.

// v0.1.4: IDB helpers moved to ../lib/idb.js, shared with popup.
import { idbGet, idbSet, idbDelete, IDB_HANDLE_KEY, IDB_DIRNAME_KEY } from '../lib/idb.js';

let huskWarned = false;  // log the stale-husk warning at most once per SW boot

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
 * Append text to a session file. Uses live-append via FSA's createWritable
 * with keepExistingData + seek-to-end.
 * @param {string} filename
 * @param {string} text
 */
export async function appendToSessionFile(filename, text) {
  const dir = await getOutputDirHandle();
  if (!dir) throw new Error('No output directory configured');
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const file = await fileHandle.getFile();
  const writable = await fileHandle.createWritable({ keepExistingData: true });
  await writable.seek(file.size);
  await writable.write(text);
  await writable.close();
}

/**
 * Manages per-session file state. Tracks active session per (tabId, gameID),
 * generates filenames, dedupes writes, surfaces failures.
 */
export class SessionWriter {
  constructor() {
    this.sessions = new Map();  // key: `${tabId}:${gameID}` → { filename, startedAt, sessionSeq, lastWriteAt, handsWritten }
    this.errorCounts = new Map();  // key → consecutive error count
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
      return { ok: false, error: e.message, consecutiveErrors: errs };
    }
  }

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
