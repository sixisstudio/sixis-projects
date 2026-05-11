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
document.getElementById('pickDir').addEventListener('click', async () => {
  // FSA must be invoked from a user gesture; popup click counts.
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite', startIn: 'downloads' });
    // Store handle via service worker — popup can't directly access IDB used by SW
    // (different origin); SW will persist via chrome.storage + IDB inside SW context.
    // For now: send handle via message. Note: handles can be transferred via
    // structured clone in Chrome.
    chrome.runtime.sendMessage({ kind: 'set_output_dir', handle, name: handle.name });
    document.getElementById('outDir').textContent = handle.name;
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
