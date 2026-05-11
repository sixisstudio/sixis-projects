// Hijack Poker HH Logger — File System Access API writer
//
// Manages the FileSystemDirectoryHandle persisted in IndexedDB, opens
// per-table session files, appends hand-history text live, and tracks
// session lifecycle (tab-open → tab-close = one session = one .txt).
//
// Per council R2: File System Access API as v1, native-messaging as v2
// escape hatch if Gate 5 durability fails.

const IDB_NAME = 'hjk_logger_v1';
const IDB_STORE = 'config';
const IDB_HANDLE_KEY = 'outputDirHandle';
const IDB_DIRNAME_KEY = 'outputDirName';

// ─── IndexedDB helpers ────────────────────────────────────────────

function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbGet(key) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const g = tx.objectStore(IDB_STORE).get(key);
    g.onsuccess = () => res(g.result);
    g.onerror = () => rej(g.error);
  });
}

async function idbSet(key, value) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Persist a directory handle (called from popup after the user picks).
 * @param {FileSystemDirectoryHandle} handle
 */
export async function setOutputDirHandle(handle) {
  await idbSet(IDB_HANDLE_KEY, handle);
  await idbSet(IDB_DIRNAME_KEY, handle.name);
}

/**
 * Get the persisted handle, request permission if needed.
 * Returns null if no handle stored or permission denied.
 * @returns {Promise<FileSystemDirectoryHandle | null>}
 */
export async function getOutputDirHandle() {
  const handle = await idbGet(IDB_HANDLE_KEY);
  if (!handle) return null;
  let perm = await handle.queryPermission({ mode: 'readwrite' });
  if (perm === 'prompt') {
    perm = await handle.requestPermission({ mode: 'readwrite' });
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
