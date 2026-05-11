// Hijack Poker HH Logger — Shared IndexedDB helpers
//
// IMPORTANT: popup.js and the service worker share the SAME extension origin
// (chrome-extension://<id>/), so they can read/write the SAME IDB database.
// The FileSystemDirectoryHandle is stored from the popup (where it's live
// from showDirectoryPicker) and read from the SW (where the methods like
// .queryPermission, .getFileHandle are intact thanks to IDB's structured-
// clone of FSA handles).
//
// Critical: do NOT pass the handle via chrome.runtime.sendMessage — that
// path strips methods, leaving a useless husk with only .name and .kind.

export const IDB_NAME = 'hjk_logger_v1';
export const IDB_STORE = 'config';
export const IDB_HANDLE_KEY = 'outputDirHandle';
export const IDB_DIRNAME_KEY = 'outputDirName';

export function openIDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function idbGet(key) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const g = tx.objectStore(IDB_STORE).get(key);
    g.onsuccess = () => res(g.result);
    g.onerror = () => rej(g.error);
  });
}

export async function idbSet(key, value) {
  const db = await openIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
