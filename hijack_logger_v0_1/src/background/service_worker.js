// Hijack Poker HH Logger — Service Worker entry point
//
// Responsibilities:
//   1. On tab navigation to game.hijack.poker, inject ws_proxy.js into MAIN world
//      at document_start (programmatic injection because manifest content scripts
//      can't target MAIN world at document_start with the timing we need).
//   2. Receive relayed frames from the content script. Route to parser.
//   3. Maintain per-table state machines (lazy-instantiated via parser).
//   4. Coordinate file writes via fs_writer.js and raw_sidecar.js.
//   5. Expose state to popup via chrome.runtime.onMessage.
//   6. Run Gate 1 integrity reverification on each session start.
//
// This file is the entry; heavy lifting lives in parser/hand_state/ps_writer/etc.

const RELAY_NS = '__hjk_v1__';
const HIJACK_HOST = 'game.hijack.poker';

// ─── State (in-memory; SW will be evicted occasionally — persist to chrome.storage) ──
const state = {
  perTabSessions: new Map(),    // tabId → { sessionId, startedAt, frames: 0, hands: 0, degraded: 0 }
  perTableState: new Map(),     // gameID → hand state machine instance (TODO: import HandState)
  proxyInstalls: new Map(),     // tabId → 'pending' | 'installed' | 'failed'
  totals: { frames: 0, handsCompleted: 0, degradedHands: 0 },
};

// ─── Programmatic MAIN-world injection at document_start ──────────────
// Listen for navigation commits to Hijack and inject the proxy as early as
// possible. webNavigation.onCommitted fires after the document is created
// but BEFORE any page scripts run, which lets us beat Unity bootstrap.

chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;  // top frame only
  const url = new URL(details.url);
  if (url.hostname !== HIJACK_HOST) return;

  state.proxyInstalls.set(details.tabId, 'pending');
  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      world: 'MAIN',
      injectImmediately: true,
      files: ['src/background/ws_proxy.js'],
    });
    state.proxyInstalls.set(details.tabId, 'installed');
  } catch (e) {
    state.proxyInstalls.set(details.tabId, 'failed');
    console.error('[hjk] proxy injection failed:', e);
  }
});

// ─── Tab close cleanup ────────────────────────────────────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  state.proxyInstalls.delete(tabId);
  const session = state.perTabSessions.get(tabId);
  if (session) {
    // TODO: flush any pending writes for this session's tables
    state.perTabSessions.delete(tabId);
  }
});

// ─── Message router (relay frames from content script) ───────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg[RELAY_NS] !== 1) {
    // Not from our relay — might be from popup. Handle popup messages here.
    if (msg && msg.kind === 'popup_state_request') {
      sendResponse({
        totals: state.totals,
        sessions: Array.from(state.perTabSessions.entries()).map(([tabId, s]) => ({ tabId, ...s })),
        proxyInstalls: Array.from(state.proxyInstalls.entries()),
      });
      return true;
    }
    return false;
  }

  // Frame from page
  const tabId = sender.tab && sender.tab.id;
  if (!tabId) return false;

  // Ensure tab session exists
  if (!state.perTabSessions.has(tabId)) {
    state.perTabSessions.set(tabId, {
      sessionId: `${Date.now()}-${tabId}`,
      startedAt: Date.now(),
      frames: 0,
      hands: 0,
      degraded: 0,
    });
  }
  const session = state.perTabSessions.get(tabId);

  switch (msg.kind) {
    case 'proxy_installed':
      session.proxyInstalledAt = Date.now();
      break;
    case 'relay_loaded':
      session.relayLoadedAt = Date.now();
      break;
    case 'socket_open':
      // TODO: forward to hand_state to begin tracking new socket
      break;
    case 'frame':
      session.frames++;
      state.totals.frames++;
      // TODO: forward to parser. For now, just count.
      // handleFrame(tabId, msg);
      break;
    case 'relay_drops':
      // TODO: increment degraded counter for affected tables
      console.warn('[hjk] relay dropped', msg.count, 'frames');
      break;
  }

  // Best-effort persist totals every N frames (so SW eviction doesn't lose all)
  if (state.totals.frames % 100 === 0) {
    chrome.storage.local.set({ totals: state.totals }).catch(() => {});
  }

  return false;  // no response
});

// ─── Restore persisted totals on SW boot ─────────────────────────────
chrome.storage.local.get('totals').then((r) => {
  if (r.totals) state.totals = { ...state.totals, ...r.totals };
});

// ─── Ack the SW booted ───────────────────────────────────────────────
console.log('[hjk] service worker booted v0.1.0');
