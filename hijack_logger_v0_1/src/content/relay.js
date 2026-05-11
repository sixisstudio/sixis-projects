// Hijack Poker HH Logger — Page → Service Worker relay
//
// Runs in the ISOLATED world at document_start. Bridges window.postMessage
// from the MAIN-world proxy to chrome.runtime.sendMessage for the service
// worker. Also handles relay-channel filtering and basic rate-limiting.

(() => {
  'use strict';

  const RELAY_NS = '__hjk_v1__';
  let droppedCount = 0;
  let lastDropReport = 0;

  // Listen for relay messages from the page's MAIN world
  window.addEventListener('message', (ev) => {
    // Only accept messages from this window (not iframes, not other origins)
    if (ev.source !== window) return;
    const msg = ev.data;
    if (!msg || msg[RELAY_NS] !== 1) return;

    // Forward to service worker. Service worker is gated by chrome.runtime
    // permissions, so no PII risk here beyond what the proxy already stripped.
    try {
      chrome.runtime.sendMessage(msg, () => {
        // If service worker is gone (extension reloaded), chrome.runtime.lastError
        // is set. Swallow — there's nothing we can do from here.
        if (chrome.runtime.lastError) {
          droppedCount++;
        }
      });
    } catch (e) {
      droppedCount++;
    }

    // Periodically signal drops back to the service worker for telemetry
    const now = Date.now();
    if (droppedCount > 0 && now - lastDropReport > 30000) {
      lastDropReport = now;
      try {
        chrome.runtime.sendMessage({
          [RELAY_NS]: 1,
          kind: 'relay_drops',
          count: droppedCount,
          t: now,
        });
      } catch (e) {}
      droppedCount = 0;
    }
  }, false);

  // Signal relay loaded
  try {
    chrome.runtime.sendMessage({ [RELAY_NS]: 1, kind: 'relay_loaded', t: Date.now() });
  } catch (e) {}
})();
