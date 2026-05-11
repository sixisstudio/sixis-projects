// Hijack Poker HH Logger — Service Worker entry point (v0.2.0)
//
// Wires together: proxy injection, frame routing, per-table state machines,
// writers (HH .txt + raw sidecar), schema-drift detection, popup state.

import { decodeData, parseGameWSFrame } from './parser.js';
import { TableState } from './hand_state.js';
import { renderHand } from './ps_writer.js';
import { SessionWriter } from './fs_writer.js';
import { RawSidecarWriter } from './raw_sidecar.js';
import { DriftDetector, runHandHeuristics } from './schema_fingerprint.js';

const RELAY_NS = '__hjk_v1__';
const HIJACK_HOST = 'game.hijack.poker';

// ─── State ────────────────────────────────────────────────────────
const state = {
  perTab: new Map(),   // tabId → { sessionId, startedAt, frames, hands, degraded, tableStates: Map<gameID, TableState>, drift: DriftDetector }
  totals: { frames: 0, handsCompleted: 0, handsPlayed: 0, spectatorHands: 0, degradedHands: 0 },
  settings: { rawSidecar: true, schemaWarn: true },
};

// Initialize writers as singletons — they coordinate across tabs
const sessionWriter = new SessionWriter();
const rawWriter = new RawSidecarWriter();

// Restore settings from storage
chrome.storage.local.get(['rawSidecar', 'schemaWarn', 'totals']).then((r) => {
  if (typeof r.rawSidecar === 'boolean') state.settings.rawSidecar = r.rawSidecar;
  if (typeof r.schemaWarn === 'boolean') state.settings.schemaWarn = r.schemaWarn;
  if (r.totals) state.totals = { ...state.totals, ...r.totals };
  rawWriter.setEnabled(state.settings.rawSidecar);
});

// ─── Keep-alive (MV3 service workers get evicted after ~30s idle) ──
// We register a chrome.alarms tickle so the SW stays warm during a Hijack
// session. Each alarm fire reaches into state, which keeps the worker
// alive. Alarms with periods >= 30s are persistent across SW evictions.
chrome.alarms.create('hjk-keepalive', { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'hjk-keepalive') {
    // No-op; just touching state keeps the SW warm
    const tabCount = state.perTab.size;
    if (tabCount > 0) {
      console.log(`[hjk] keepalive tick: ${tabCount} active Hijack tab(s), ${state.totals.frames} total frames`);
    }
  }
});

// ─── Programmatic MAIN-world injection ────────────────────────────
chrome.webNavigation.onCommitted.addListener(async (details) => {
  if (details.frameId !== 0) return;
  const url = new URL(details.url);
  if (url.hostname !== HIJACK_HOST) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      world: 'MAIN',
      injectImmediately: true,
      files: ['src/background/ws_proxy.js'],
    });
  } catch (e) {
    console.error('[hjk] proxy injection failed:', e);
  }
});

// ─── Tab close cleanup ───────────────────────────────────────────
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const tab = state.perTab.get(tabId);
  if (tab) {
    // Flush state machines
    for (const [, ts] of tab.tableStates) ts.flush('tab_close');
    await rawWriter.flushAll();
    sessionWriter.closeTab(tabId);
    rawWriter.closeTab(tabId);
    state.perTab.delete(tabId);
  }
});

// ─── Hero seat auto-resolver ─────────────────────────────────────
/**
 * Find the seat with real (non-facedown, non-empty) card values in its
 * p{N}card slots. That's the hero seat (server-side filter only populates
 * the recipient's slots).
 * Returns 0 if no seat has real cards yet (hand not dealt to anyone, or
 * we're a spectator).
 */
function heroSeatResolver(snap) {
  const isRealCard = c => c && c.length === 2 && c !== 'facedown';
  for (const s of snap.seats) {
    if (s.cards.some(isRealCard)) return s.seat;
  }
  return 0;
}

// ─── Per-tab state setup ─────────────────────────────────────────
function ensureTab(tabId) {
  if (state.perTab.has(tabId)) return state.perTab.get(tabId);
  const tab = {
    sessionId: `${Date.now()}-${tabId}`,
    startedAt: Math.floor(Date.now() / 1000),
    frames: 0,
    hands: 0,
    degraded: 0,
    tableStates: new Map(),   // gameID → TableState
    drift: new DriftDetector(),
  };
  state.perTab.set(tabId, tab);
  return tab;
}

function ensureTable(tabId, gameID) {
  const tab = ensureTab(tabId);
  if (tab.tableStates.has(gameID)) return tab.tableStates.get(gameID);
  const ts = new TableState({
    gameID,
    heroSeatResolver,
    onHandComplete: (hand) => handleHandComplete(tabId, gameID, hand),
    onAction: () => { /* available for future popup live-feed */ },
  });
  tab.tableStates.set(gameID, ts);
  return ts;
}

async function handleHandComplete(tabId, gameID, hand) {
  const tab = state.perTab.get(tabId);
  if (!tab) return;

  console.log(`[hjk] hand complete: gameID=${gameID} handNo=${hand.handNo} hero.cards=${hand.hero?.cards?.length || 0} ended=${hand.ended}`);

  const heroPlayed = hand.hero && hand.hero.cards && hand.hero.cards.length > 0;
  if (heroPlayed) {
    tab.handsPlayed = (tab.handsPlayed || 0) + 1;
    state.totals.handsPlayed = (state.totals.handsPlayed || 0) + 1;
  } else {
    tab.spectatorHands = (tab.spectatorHands || 0) + 1;
    state.totals.spectatorHands = (state.totals.spectatorHands || 0) + 1;
  }

  const check = runHandHeuristics(hand);
  const degraded = !check.ok || hand.degraded;
  if (degraded) {
    hand.degraded = true;
    hand.degradedReason = (hand.degradedReason ? hand.degradedReason + ';' : '') + check.reasons.join(',');
    tab.degraded++;
    state.totals.degradedHands++;
  }
  tab.drift.recordHand(degraded);
  tab.hands++;
  state.totals.handsCompleted++;

  try {
    const text = renderHand(hand);
    console.log(`[hjk] rendered hand ${hand.handNo}: ${text.length} chars; writing to disk...`);
    const result = await sessionWriter.writeHand(tabId, gameID, tab.startedAt, text);
    if (!result.ok) {
      console.warn(`[hjk] hand write FAILED: gameID=${gameID} handNo=${hand.handNo} error=${result.error} consecutive=${result.consecutiveErrors}`);
    } else {
      console.log(`[hjk] hand WROTE: gameID=${gameID} handNo=${hand.handNo} file=${result.filename} totalWritten=${result.handsWritten}`);
    }
  } catch (e) {
    console.warn(`[hjk] hand render/write threw: gameID=${gameID} handNo=${hand.handNo} error=${e.message} stack=${e.stack}`);
    hand.degraded = true;
  }

  chrome.storage.local.set({ totals: state.totals }).catch(() => {});
}

// ─── Message router ──────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return false;

  // Popup messages (not from page proxy)
  if (msg[RELAY_NS] !== 1) {
    return handlePopupMessage(msg, sender, sendResponse);
  }

  // Page proxy messages
  const tabId = sender.tab && sender.tab.id;
  if (!tabId) return false;
  const tab = ensureTab(tabId);

  switch (msg.kind) {
    case 'proxy_installed':
      tab.proxyInstalledAt = Date.now();
      break;

    case 'relay_loaded':
      tab.relayLoadedAt = Date.now();
      break;

    case 'socket_open':
      // No-op for v1; could track if useful for drift detection
      break;

    case 'frame': {
      tab.frames++;
      state.totals.frames++;
      processFrame(tabId, msg).catch(e => console.warn('[hjk] processFrame:', e.message));
      break;
    }

    case 'relay_drops':
      console.warn('[hjk] relay dropped', msg.count, 'frames');
      break;
  }

  if (state.totals.frames % 200 === 0) {
    chrome.storage.local.set({ totals: state.totals }).catch(() => {});
  }

  return false;
});

async function processFrame(tabId, msg) {
  // Only care about the auth'd game-ws channel (plain JSON), not socket.io engine
  if (!msg.url || !msg.url.includes('game-ws.hijackpoker.com')) return;

  const raw = decodeData(msg.data);
  const parsed = parseGameWSFrame(raw);
  if (!parsed) return;

  if (parsed.event !== 'gotOmaha') return;
  const game = parsed.payload.game;
  if (!game || !game.gameID) return;

  const tab = state.perTab.get(tabId);

  // Schema-drift check on first frame of session
  if (state.settings.schemaWarn) {
    const check = await tab.drift.checkSchema(game);
    if (!check.ok) {
      console.warn('[hjk] schema drift detected:', check);
      // Future: notify popup
    }
  }

  // Route to per-table state machine
  const ts = ensureTable(tabId, game.gameID);
  ts.process(parsed.payload);

  // Always-on raw sidecar
  if (state.settings.rawSidecar) {
    await rawWriter.push(tabId, game.gameID, tab.startedAt, {
      t: msg.t || Date.now(),
      dir: msg.dir,
      url: msg.url,
      data: msg.data,
    });
  }
}

function handlePopupMessage(msg, sender, sendResponse) {
  switch (msg.kind) {
    case 'popup_state_request': {
      const sessions = [];
      for (const [tabId, tab] of state.perTab) {
        const perTable = [];
        for (const [gameID, ts] of tab.tableStates) {
          perTable.push({
            gameID,
            currentHandNo: ts.currentHand ? ts.currentHand.handNo : null,
            heroSeat: ts.heroSeat,
          });
        }
        sessions.push({
          tabId,
          startedAt: tab.startedAt,
          frames: tab.frames,
          hands: tab.hands,
          degraded: tab.degraded,
          spectatorHands: tab.spectatorHands || 0,
          tables: perTable,
          driftAlerted: tab.drift.isAlerted(),
        });
      }
      sendResponse({
        totals: state.totals,
        settings: state.settings,
        sessions,
      });
      return true;  // async-safe (we already responded synchronously)
    }

    case 'output_dir_changed': {
      // v0.1.4: popup writes the handle directly to IDB (because chrome.runtime
      // .sendMessage strips FSA-handle methods). This message just notifies the
      // SW that the change happened so it can refresh in-memory state.
      console.log('[hjk] output directory changed to', msg.name);
      sendResponse({ ok: true });
      return true;
    }
    case 'set_output_dir': {
      // v0.1.3-and-earlier compat: ignore handle in message (it's a stripped
      // husk anyway). Tell user to re-pick if they hit this path.
      sendResponse({
        ok: false,
        error: 'v0.1.3 set_output_dir is deprecated; popup writes to IDB directly in v0.1.4+. Re-pick the folder in the popup.',
      });
      return true;
    }

    case 'set_setting': {
      if (msg.key === 'rawSidecar') {
        state.settings.rawSidecar = !!msg.value;
        rawWriter.setEnabled(state.settings.rawSidecar);
      }
      if (msg.key === 'schemaWarn') state.settings.schemaWarn = !!msg.value;
      chrome.storage.local.set({ [msg.key]: msg.value }).catch(() => {});
      sendResponse({ ok: true });
      return true;
    }

    // 'open_output_dir' removed in v0.1.1. Chrome doesn't expose absolute
    // paths for FSA-picked folders, so there's no portable way to open the
    // folder in the OS file manager from extension context.
  }
  return false;
}

console.log('[hjk] service worker booted v0.1.5');
