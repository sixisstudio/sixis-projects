// Hijack Logger popup script
//
// Polls service worker for state, renders session counters + totals,
// handles directory picker + settings toggles.

const POLL_MS = 1500;

async function fetchState() {
  return new Promise((res) => {
    chrome.runtime.sendMessage({ kind: 'popup_state_request' }, (resp) => {
      if (chrome.runtime.lastError || !resp) res(null);
      else res(resp);
    });
  });
}

async function render() {
  const state = await fetchState();
  if (!state) return;

  document.getElementById('totalHands').textContent = state.totals.handsCompleted || 0;
  document.getElementById('totalPlayed').textContent = state.totals.handsPlayed || 0;
  document.getElementById('totalSpectator').textContent = state.totals.spectatorHands || 0;
  document.getElementById('totalDegraded').textContent = state.totals.degradedHands || 0;
  document.getElementById('totalFrames').textContent = state.totals.frames || 0;

  const sessionList = document.getElementById('sessionList');
  if (!state.sessions || state.sessions.length === 0) {
    sessionList.innerHTML = '<div class="empty">No active Hijack tabs</div>';
  } else {
    sessionList.innerHTML = '';
    for (const s of state.sessions) {
      const div = document.createElement('div');
      div.className = 'session';
      // For now we only have session-level info; per-table breakdown comes
      // when hand_state.js is wired up.
      div.innerHTML = `
        <div><span class="table-id">Tab #${s.tabId}</span> <span class="stake">${s.frames} frames</span></div>
        <div class="stats">
          <span>Hands: ${s.hands || 0}</span>
          <span class="degraded">Degraded: ${s.degraded || 0}</span>
        </div>
      `;
      sessionList.appendChild(div);
    }
  }
}

// ─── Directory picker ──────────────────────────────────────────────
// v0.1.4: write the FSA handle DIRECTLY to IDB from this popup context.
// Popup and service worker share the same extension origin, so they share
// the same IDB databases. Going via chrome.runtime.sendMessage strips the
// handle's methods, leaving a useless husk — that was the v0.1.3 bug.
import { idbSet, IDB_HANDLE_KEY, IDB_DIRNAME_KEY } from '../lib/idb.js';

document.getElementById('pickDir').addEventListener('click', async () => {
  // FSA must be invoked from a user gesture; popup click counts.
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
    console.log('[hjk] popup picked dir:', handle.name, 'kind:', handle.kind, 'queryPermission:', typeof handle.queryPermission);
    // v0.1.7: explicitly ask for readwrite permission HERE in the popup
    // (with user gesture). This anchors the permission grant so the SW's
    // queryPermission() will return 'granted' instead of 'prompt' when it
    // tries to write. Without this, FSA handles read from IDB in the SW
    // context often come back as 'prompt' and the SW can't requestPermission
    // (no user activation).
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    console.log('[hjk] popup queryPermission before request:', perm);
    if (perm !== 'granted') {
      perm = await handle.requestPermission({ mode: 'readwrite' });
      console.log('[hjk] popup requestPermission returned:', perm);
    }
    if (perm !== 'granted') {
      console.error('[hjk] popup: readwrite permission not granted; aborting save');
      return;
    }
    // Write the live handle to IDB. IDB structured-clone preserves methods.
    await idbSet(IDB_HANDLE_KEY, handle);
    await idbSet(IDB_DIRNAME_KEY, handle.name);
    console.log('[hjk] popup wrote handle to IDB');
    // Verify the write by reading back and checking the handle is still healthy
    const { idbGet: _idbGet } = await import('../lib/idb.js');
    const verify = await _idbGet(IDB_HANDLE_KEY);
    console.log('[hjk] popup readback after idbSet: typeof queryPermission =', typeof (verify && verify.queryPermission), ', name =', verify && verify.name);
    // Also mirror to chrome.storage.local for the popup's own UI restore.
    chrome.storage.local.set({ outputDirName: handle.name }).catch(() => {});
    // v0.2.0: also send the LIVE handle to the offscreen document for caching.
    // Offscreen will fall back to reading IDB if the message-passed handle
    // arrives stripped.
    chrome.runtime.sendMessage(
      { target: 'offscreen', kind: 'offscreen_set_handle', handle, name: handle.name },
      (resp) => {
        console.log('[hjk] popup → offscreen set_handle resp:', resp || chrome.runtime.lastError);
      }
    );
    // Notify SW so it can update its in-memory state.
    chrome.runtime.sendMessage({ kind: 'output_dir_changed', name: handle.name });
    document.getElementById('outDir').textContent = handle.name;
    // Hide any "you must re-pick" banner
    const banner = document.getElementById('huskWarn');
    if (banner) banner.style.display = 'none';
  } catch (e) {
    if (e.name !== 'AbortError') {
      console.error('directory pick failed:', e);
    }
  }
});

// Note: "Open output folder" button removed in v0.1.1. Chrome's File System
// Access API gives extensions a directory HANDLE, never the absolute path
// — by design. So there's no way to "Show in Finder/Explorer" from
// extension context. User navigates via their OS file manager.

// ─── Settings toggles ──────────────────────────────────────────────
['rawSidecar', 'schemaWarn'].forEach((id) => {
  const cb = document.getElementById(id);
  cb.addEventListener('change', () => {
    chrome.runtime.sendMessage({ kind: 'set_setting', key: id, value: cb.checked });
  });
});

// ─── Boot + poll loop ──────────────────────────────────────────────
render();
setInterval(render, POLL_MS);

// Load setting values from storage on boot
chrome.storage.local.get(['rawSidecar', 'schemaWarn', 'outputDirName']).then((r) => {
  if (r.rawSidecar !== undefined) document.getElementById('rawSidecar').checked = r.rawSidecar;
  if (r.schemaWarn !== undefined) document.getElementById('schemaWarn').checked = r.schemaWarn;
  if (r.outputDirName) document.getElementById('outDir').textContent = r.outputDirName;
});

// Husk detection on popup open — if IDB has a stripped husk, show banner
import { idbGet } from '../lib/idb.js';
(async () => {
  try {
    const handle = await idbGet(IDB_HANDLE_KEY);
    if (handle && typeof handle.queryPermission !== 'function') {
      const banner = document.getElementById('huskWarn');
      if (banner) banner.style.display = 'block';
      document.getElementById('outDir').textContent = 'not set (needs re-pick)';
    }
  } catch (e) { /* swallow */ }
})();
