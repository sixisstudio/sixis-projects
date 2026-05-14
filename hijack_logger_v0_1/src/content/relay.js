// Hijack Poker HH Logger — Page → Service Worker relay
//
// Runs in the ISOLATED world at document_start. Bridges window.postMessage
// from the MAIN-world proxy to the service worker.
//
// v0.2.29: switched from per-message chrome.runtime.sendMessage (which silently
// drops when the SW is busy or evicted between messages) to a long-lived port
// via chrome.runtime.connect. Ports queue messages reliably and keep the SW
// alive while open. Reduces "relay dropped X frames" from hundreds per minute
// to near-zero during normal play.

(() => {
  'use strict';

  const RELAY_NS = '__hjk_v1__';
  const PORT_NAME = 'hjk-relay';

  let port = null;
  let droppedCount = 0;
  let lastDropReport = 0;
  let reconnectTimer = null;

  function openPort() {
    try {
      port = chrome.runtime.connect({ name: PORT_NAME });
      port.onDisconnect.addListener(() => {
        // SW evicted or extension reloaded. Schedule reconnect with backoff.
        port = null;
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          openPort();
        }, 1000);
      });
      // Identify the relay to the SW on connect
      port.postMessage({ [RELAY_NS]: 1, kind: 'relay_loaded', t: Date.now() });
    } catch (e) {
      port = null;
      droppedCount++;
    }
  }

  function send(msg) {
    if (!port) {
      droppedCount++;
      openPort();  // try to recover for the next send
      return;
    }
    try {
      port.postMessage(msg);
    } catch (e) {
      droppedCount++;
      port = null;
      openPort();
    }
  }

  openPort();

  // Listen for relay messages from the page's MAIN world
  window.addEventListener('message', (ev) => {
    if (ev.source !== window) return;
    const msg = ev.data;
    if (!msg || msg[RELAY_NS] !== 1) return;

    send(msg);

    // Periodically signal drops back to the SW for telemetry
    const now = Date.now();
    if (droppedCount > 0 && now - lastDropReport > 30000) {
      lastDropReport = now;
      send({ [RELAY_NS]: 1, kind: 'relay_drops', count: droppedCount, t: now });
      droppedCount = 0;
    }
  }, false);
})();
