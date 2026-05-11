// Hijack Poker HH Logger — File System Access API writer
//
// Manages the FileSystemDirectoryHandle persisted in IndexedDB, opens
// per-table session files, appends hand-history text live, and tracks
// session lifecycle (tab-open → tab-close = one session = one .txt).
//
// Per council R2: File System Access API as v1, native-messaging as v2
// escape hatch if Gate 5 durability fails.

// v0.1.4: IDB helpers moved to ../lib/idb.js, shared with popup.
import { idbGet, idbSet, IDB_HANDLE_KEY } from '../lib/idb.js';

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
 * @returns {Promise<FileSystemDirectoryHandle | null>}
 */
export async function getOutputDirHandle() {
  const handle = await idbGet(IDB_HANDLE_KEY);
  if (!handle) return null;
  if (typeof handle.queryPermission !== 'function') {
    // v0.1.3 and earlier wrote a stripped husk via chrome.runtime.sendMessage.
    // If we see one, return null — popup will need to re-pick.
    console.warn('[hjk] stale stripped handle in IDB (v0.1.3 bug); please re-pick output folder');
    return null;
  }
  let perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'prompt') {
    try { perm = await handle.requestPermission({ mode: 'readwrite' }); }
    catch (e) { return null; }
  }
  if (perm !== 'granted') return null;
  return handle;
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
