// Hijack Logger — Offscreen document
//
// Runs in a hidden DOM context that persists across service-worker evictions.
// Holds the FileSystemDirectoryHandle in module-scope memory so its 'granted'
// permission state survives. Service worker delegates all FSA writes here
// via chrome.runtime.sendMessage.
//
// This is the canonical MV3 solution for FSA permission persistence — the
// service worker can't reliably hold FSA grants because it lacks DOM/window
// context and gets evicted after ~30s idle.

import { idbGet, idbSet, IDB_HANDLE_KEY, IDB_DIRNAME_KEY } from '../lib/idb.js';

// In-memory cached handle (preferred — survives as long as offscreen is alive)
let cachedHandle = null;

// On boot, try to recover the handle from IDB (popup → IDB → offscreen)
(async () => {
  try {
    const handle = await idbGet(IDB_HANDLE_KEY);
    if (handle && typeof handle.queryPermission === 'function') {
      cachedHandle = handle;
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      console.log(`[hjk-offscreen] boot: recovered handle from IDB, name=${handle.name}, perm=${perm}`);
      if (perm === 'prompt') {
        // We can call requestPermission from offscreen context since it has a
        // DOM. May still need user gesture in some Chrome versions; if it
        // fails, we'll surface that on first write attempt.
        try {
          const granted = await handle.requestPermission({ mode: 'readwrite' });
          console.log(`[hjk-offscreen] boot: requestPermission returned '${granted}'`);
        } catch (e) {
          console.warn(`[hjk-offscreen] boot: requestPermission threw: ${e.message}`);
        }
      }
    } else {
      console.log('[hjk-offscreen] boot: no usable handle in IDB');
    }
  } catch (e) {
    console.warn('[hjk-offscreen] boot error:', e.message);
  }
})();

// ─── Message router ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== 'offscreen') return false;

  switch (msg.kind) {
    case 'offscreen_set_handle': {
      // Popup wrote a fresh handle to IDB AND sends a direct copy via this
      // message to avoid any IDB-cross-context permission issues. The handle
      // arrives intact via runtime messaging IFF Chrome's structured clone
      // path preserves FSA handles for extension-internal messages.
      (async () => {
        try {
          if (msg.handle && typeof msg.handle.queryPermission === 'function') {
            cachedHandle = msg.handle;
            const perm = await msg.handle.queryPermission({ mode: 'readwrite' });
            console.log(`[hjk-offscreen] received handle from popup (name=${msg.handle.name}, perm=${perm})`);
            sendResponse({ ok: true, perm });
          } else {
            // Handle was stripped en route — fall back to IDB read
            const fromIDB = await idbGet(IDB_HANDLE_KEY);
            if (fromIDB && typeof fromIDB.queryPermission === 'function') {
              cachedHandle = fromIDB;
              const perm = await fromIDB.queryPermission({ mode: 'readwrite' });
              console.log(`[hjk-offscreen] handle from popup stripped; recovered from IDB (name=${fromIDB.name}, perm=${perm})`);
              sendResponse({ ok: true, perm, recoveredFromIDB: true });
            } else {
              sendResponse({ ok: false, error: 'handle stripped in transit AND IDB has no usable handle' });
            }
          }
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    case 'offscreen_write': {
      (async () => {
        if (!cachedHandle) {
          try {
            const h = await idbGet(IDB_HANDLE_KEY);
            if (h && typeof h.queryPermission === 'function') cachedHandle = h;
          } catch (e) {}
        }
        if (!cachedHandle) {
          sendResponse({ ok: false, error: 'no cached handle; popup must pick folder' });
          return;
        }
        try {
          let perm = await cachedHandle.queryPermission({ mode: 'readwrite' });
          if (perm === 'prompt') {
            try { perm = await cachedHandle.requestPermission({ mode: 'readwrite' }); } catch (e) {}
          }
          if (perm !== 'granted') {
            sendResponse({ ok: false, error: `perm=${perm} (need 'granted'); user must re-pick in popup`, perm });
            return;
          }
          const fileHandle = await cachedHandle.getFileHandle(msg.filename, { create: true });
          const file = await fileHandle.getFile();
          const writable = await fileHandle.createWritable({ keepExistingData: true });
          await writable.seek(file.size);
          await writable.write(msg.text);
          await writable.close();
          // v0.2.1: cleanup pass — delete stale .crswap files in the output
          // directory. Google Drive's File Provider doesn't reliably clean up
          // FSA's temp files on close→rename, so they accumulate and waste
          // disk + sync bandwidth. Each write triggers a cleanup of stale
          // swaps (>60s old) so the folder stays tidy.
          cleanupStaleSwaps(cachedHandle).catch(() => {});
          sendResponse({ ok: true, filename: msg.filename, fileSize: file.size + msg.text.length });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }

    case 'offscreen_ping': {
      sendResponse({
        ok: true,
        hasHandle: !!cachedHandle,
        handleName: cachedHandle && cachedHandle.name,
      });
      return true;
    }
  }
  return false;
});

// ─── Stale .crswap cleanup ─────────────────────────────────────────
// FSA's createWritable creates a .crswap temp file; close() atomically
// renames it to the target. Google Drive's File Provider on macOS doesn't
// always clean up these swaps, leaving them as 40-50MB litter that wastes
// disk + sync bandwidth. We periodically scan the output dir and delete
// any .crswap older than the threshold.
const SWAP_AGE_MS = 60 * 1000;  // 60s
let cleanupInFlight = false;

async function cleanupStaleSwaps(dirHandle) {
  if (cleanupInFlight) return;
  cleanupInFlight = true;
  try {
    const now = Date.now();
    let deleted = 0;
    for await (const [name, entry] of dirHandle.entries()) {
      if (!name.endsWith('.crswap')) continue;
      if (entry.kind !== 'file') continue;
      try {
        const f = await entry.getFile();
        if (now - f.lastModified > SWAP_AGE_MS) {
          await dirHandle.removeEntry(name);
          deleted++;
        }
      } catch (e) { /* swallow; next pass will retry */ }
    }
    if (deleted > 0) {
      console.log(`[hjk-offscreen] cleaned up ${deleted} stale .crswap file(s)`);
    }
  } finally {
    cleanupInFlight = false;
  }
}

console.log('[hjk-offscreen] booted');
