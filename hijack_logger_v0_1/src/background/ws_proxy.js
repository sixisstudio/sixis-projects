// Hijack Poker HH Logger — Stealth-hardened WebSocket proxy
//
// Runs in the MAIN world of the game.hijack.poker tab at document_start.
// Captures every WebSocket frame in/out and relays via window.postMessage
// to the content script (ISOLATED world), which forwards to the service worker.
//
// HARDENING (Phase 0 + R2 council spec):
//   1. All originals stashed in a closure BEFORE any patching.
//   2. Patched functions return native-looking toString() via per-function override
//      (NOT a global Function.prototype.toString patch — louder).
//   3. Property descriptors preserved exactly (writable/enumerable/configurable).
//   4. No leaks via instanceof / constructor.name / Symbol.toStringTag /
//      prototype.constructor.
//   5. No DOM mutations, no extra network requests, no globals other than the
//      single namespaced relay event.
//
// This file ASSUMES Phase 0 Gate 1 confirmed window.WebSocket was vanilla at
// game load time. If a future Hijack client update wraps WebSocket BEFORE this
// proxy runs, we'd see it as Gate 1 reverification failure — the service worker
// should re-run Gate 1 on each session start.

(() => {
  'use strict';

  // ─── Guard against double-injection ────────────────────────────────
  if (window.__hjk_ws_proxy_installed__) return;
  Object.defineProperty(window, '__hjk_ws_proxy_installed__', {
    value: true, writable: false, configurable: false, enumerable: false
  });

  // ─── Stash originals (in closure, not on globals) ──────────────────
  const _Orig = {
    WebSocket: window.WebSocket,
    send: WebSocket.prototype.send,
    addEventListener: WebSocket.prototype.addEventListener,
    removeEventListener: WebSocket.prototype.removeEventListener,
    onmessageDesc: Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage'),
    sendDesc: Object.getOwnPropertyDescriptor(WebSocket.prototype, 'send'),
    fnToString: Function.prototype.toString,
    objectDefineProperty: Object.defineProperty,
    postMessage: window.postMessage.bind(window),
    Date_now: Date.now.bind(Date),
  };

  // ─── Per-function toString registry (defeats native-code check) ────
  // Map: patched-fn → string to return for its .toString()
  const _toStringMap = new WeakMap();

  function makeNativeToString(displayName) {
    return `function ${displayName}() { [native code] }`;
  }

  // Install a per-function .toString override that returns the registered string
  function maskFunction(patchedFn, originalFn, displayName) {
    _toStringMap.set(patchedFn, makeNativeToString(displayName || originalFn.name || 'anonymous'));
    // Override .toString on the patched function itself
    _Orig.objectDefineProperty(patchedFn, 'toString', {
      value: function toString() {
        return _toStringMap.get(this) || _Orig.fnToString.call(this);
      },
      writable: true, configurable: true, enumerable: false
    });
    // Recursively mask .toString.toString (it's also a function)
    const ts = patchedFn.toString;
    _toStringMap.set(ts, makeNativeToString('toString'));
    _Orig.objectDefineProperty(ts, 'toString', {
      value: function toString() { return _toStringMap.get(this) || _Orig.fnToString.call(this); },
      writable: true, configurable: true, enumerable: false
    });
    // Also override .name so it doesn't expose our function name
    try {
      _Orig.objectDefineProperty(patchedFn, 'name', {
        value: displayName || originalFn.name, configurable: true, writable: false
      });
    } catch (e) { /* swallow */ }
  }

  // ─── Relay channel ─────────────────────────────────────────────────
  // We use window.postMessage with a namespaced envelope. The ISOLATED-world
  // content script listens for these and forwards to chrome.runtime.

  const RELAY_NS = '__hjk_v1__';

  // Strip JWT and any query string from URL before relay (PII hygiene)
  function safeUrl(url) {
    if (typeof url !== 'string') return '';
    const q = url.indexOf('?');
    return q === -1 ? url : url.slice(0, q);
  }

  // Encode message data for postMessage. ArrayBuffer/Blob get converted to
  // base64 so postMessage's structured clone doesn't choke or lose info.
  function encodeData(data) {
    if (typeof data === 'string') return { type: 'string', value: data };
    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      // base64 — chunked to avoid stack overflow on large buffers
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return { type: 'arraybuffer', value: btoa(bin), byteLength: bytes.length };
    }
    if (data && data.constructor && data.constructor.name === 'Blob') {
      // Blob handled async — defer reading. Caller has to await.
      return { type: 'blob', size: data.size, _blob: data };
    }
    return { type: 'unknown', value: null };
  }

  function relay(kind, payload) {
    try {
      _Orig.postMessage({ [RELAY_NS]: 1, kind, t: _Orig.Date_now(), ...payload }, '*');
    } catch (e) {
      // Swallow — we never want the proxy to throw on the page's thread
    }
  }

  // ─── Patch WebSocket.prototype.send (outbound capture) ────────────
  const patchedSend = function send(data) {
    try {
      const url = safeUrl(this.url);
      const enc = encodeData(data);
      if (enc.type === 'blob') {
        // Read blob async, relay when ready
        const blob = enc._blob;
        blob.arrayBuffer().then(buf => {
          relay('frame', { dir: 'out', url, data: encodeData(buf) });
        }).catch(() => { /* swallow */ });
      } else {
        relay('frame', { dir: 'out', url, data: enc });
      }
    } catch (e) { /* swallow */ }
    return _Orig.send.call(this, data);
  };
  maskFunction(patchedSend, _Orig.send, 'send');
  _Orig.objectDefineProperty(WebSocket.prototype, 'send', {
    value: patchedSend,
    writable: _Orig.sendDesc.writable,
    enumerable: _Orig.sendDesc.enumerable,
    configurable: _Orig.sendDesc.configurable,
  });

  // ─── Patch WebSocket.prototype.addEventListener (inbound capture) ──
  const patchedAddListener = function addEventListener(type, listener, options) {
    if (type === 'message' && typeof listener === 'function') {
      const url = this.url;
      const wrapped = function wrapped(ev) {
        try {
          const enc = encodeData(ev.data);
          if (enc.type === 'blob') {
            enc._blob.arrayBuffer().then(buf => {
              relay('frame', { dir: 'in', url: safeUrl(url), data: encodeData(buf) });
            }).catch(() => {});
          } else {
            relay('frame', { dir: 'in', url: safeUrl(url), data: enc });
          }
        } catch (e) { /* swallow */ }
        return listener.call(this, ev);
      };
      maskFunction(wrapped, listener, listener.name || 'anonymous');
      return _Orig.addEventListener.call(this, type, wrapped, options);
    }
    return _Orig.addEventListener.call(this, type, listener, options);
  };
  maskFunction(patchedAddListener, _Orig.addEventListener, 'addEventListener');
  _Orig.objectDefineProperty(WebSocket.prototype, 'addEventListener', {
    value: patchedAddListener,
    writable: true, enumerable: false, configurable: true,
  });

  // ─── Patch onmessage setter (inbound capture for direct .onmessage = fn) ──
  if (_Orig.onmessageDesc && _Orig.onmessageDesc.set && _Orig.onmessageDesc.get) {
    const origOnMessageSet = _Orig.onmessageDesc.set;
    const origOnMessageGet = _Orig.onmessageDesc.get;
    _Orig.objectDefineProperty(WebSocket.prototype, 'onmessage', {
      configurable: _Orig.onmessageDesc.configurable,
      enumerable: _Orig.onmessageDesc.enumerable,
      get: origOnMessageGet,
      set: function (fn) {
        if (typeof fn === 'function') {
          const url = this.url;
          const wrapped = function wrapped(ev) {
            try {
              const enc = encodeData(ev.data);
              if (enc.type === 'blob') {
                enc._blob.arrayBuffer().then(buf => {
                  relay('frame', { dir: 'in', url: safeUrl(url), data: encodeData(buf) });
                }).catch(() => {});
              } else {
                relay('frame', { dir: 'in', url: safeUrl(url), data: enc });
              }
            } catch (e) {}
            return fn.call(this, ev);
          };
          maskFunction(wrapped, fn, fn.name || 'anonymous');
          return origOnMessageSet.call(this, wrapped);
        }
        return origOnMessageSet.call(this, fn);
      }
    });
  }

  // ─── Wrap WebSocket constructor ────────────────────────────────────
  // Track new sockets opened from this point on (for socket-open events).
  // Preserve every observable property (name, prototype, statics, toString).
  const _OrigWS = _Orig.WebSocket;
  function PatchedWebSocket(url, protocols) {
    let ws;
    if (protocols === undefined) {
      ws = new _OrigWS(url);
    } else {
      ws = new _OrigWS(url, protocols);
    }
    try {
      relay('socket_open', { url: safeUrl(typeof url === 'string' ? url : url.toString()) });
    } catch (e) {}
    return ws;
  }
  // Mimic native function appearance
  maskFunction(PatchedWebSocket, _OrigWS, 'WebSocket');
  _Orig.objectDefineProperty(PatchedWebSocket, 'name', { value: 'WebSocket', configurable: true });
  PatchedWebSocket.prototype = _OrigWS.prototype;
  // Patch prototype.constructor to point at PatchedWebSocket so the
  // `instance.constructor === window.WebSocket` check passes
  try {
    _Orig.objectDefineProperty(WebSocket.prototype, 'constructor', {
      value: PatchedWebSocket,
      writable: true, enumerable: false, configurable: true,
    });
  } catch (e) {}
  // Preserve static constants
  ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(k => {
    try {
      _Orig.objectDefineProperty(PatchedWebSocket, k, {
        value: _OrigWS[k], writable: false, enumerable: true, configurable: false
      });
    } catch (e) {}
  });
  // Replace window.WebSocket
  _Orig.objectDefineProperty(window, 'WebSocket', {
    value: PatchedWebSocket,
    writable: true, enumerable: true, configurable: true,
  });

  // ─── Signal install ────────────────────────────────────────────────
  relay('proxy_installed', { v: '0.1.0' });
})();
