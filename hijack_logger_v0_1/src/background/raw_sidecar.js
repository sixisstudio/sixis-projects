// Hijack Poker HH Logger — Always-on raw frame sidecar
//
// Writes every captured WS frame verbatim to a parallel .raw.jsonl file in
// the same output directory. Per council R2 (2-of-3 majority): always-on by
// default, with global disable toggle. The "fail-mode-only" approach was
// rejected because by the time the parser fails, you've already lost the
// frames you'd need to recover from.
//
// PII redaction:
//   - chatMessages[].message stripped (player chat content)
//   - c1..c20 chat-slot contents stripped
//   - JWT in URLs is already stripped at proxy relay level
//
// Format: newline-delimited JSON, one frame per line.

import { appendToSessionFile, composeFilename } from './fs_writer.js';

/**
 * Compose a raw sidecar filename for a session — same base as the HH file
 * but with .raw.jsonl extension.
 */
export function composeRawFilename(gameID, sessionStartedAt, sessionSeq = 1) {
  const base = composeFilename(gameID, sessionStartedAt, sessionSeq);
  return base.replace(/\.txt$/, '.raw.jsonl');
}

/**
 * Redact PII from a frame before writing.
 * @param {object} frame — { dir, url, data: {type, value, ...}, t }
 * @returns {object} — frame with redacted payload
 */
function redactFrame(frame) {
  const out = { ...frame };
  if (out.data && out.data.type === 'string' && typeof out.data.value === 'string') {
    let payload = out.data.value;
    // Strip chatMessages content
    try {
      const parsed = JSON.parse(payload);
      if (parsed && parsed.game) {
        const g = parsed.game;
        // Redact chatMessages
        if (Array.isArray(g.chatMessages)) {
          g.chatMessages = g.chatMessages.map(m => ({
            GUID: m && m.GUID,
            displayName: m && m.displayName,
            // strip message text + avatar URL + timestamps for privacy
          }));
        }
        // Redact c1..c20 chat slots
        for (let i = 1; i <= 20; i++) {
          const k = 'c' + i;
          if (typeof g[k] === 'string' && g[k].length > 0) {
            try {
              const inner = JSON.parse(g[k]);
              g[k] = JSON.stringify({
                GUID: inner && inner.GUID,
                displayName: inner && inner.displayName,
              });
            } catch (e) {
              g[k] = '<redacted>';
            }
          }
        }
        out.data = { type: 'string', value: JSON.stringify(parsed) };
      }
    } catch (e) {
      // Not JSON, leave alone
    }
  }
  return out;
}

/**
 * Per-session raw writer. v0.2.1: flushes only on explicit triggers
 * (hand-complete events from service_worker.js + 5-minute safety timer),
 * NOT every-N-frames or every-N-seconds. Reduces FSA .crswap churn ~20x,
 * which matters on Google Drive's File Provider mount where atomic rename
 * is slow and stale swaps accumulate.
 */
export class RawSidecarWriter {
  constructor(opts = {}) {
    this.sessions = new Map();  // key → { filename, buffer: [], lastFlushAt }
    this.maxBufferSize = opts.maxBufferSize || 5000;  // hard cap — flush if we ever hit it
    this.safetyFlushMs = opts.safetyFlushMs || 5 * 60 * 1000;  // 5min as a safety net
    this.enabled = opts.enabled !== false;
  }

  _key(tabId, gameID) { return `${tabId}:${gameID}`; }

  setEnabled(v) { this.enabled = !!v; }

  ensureSession(tabId, gameID, sessionStartedAt) {
    if (!this.enabled) return null;
    const key = this._key(tabId, gameID);
    if (this.sessions.has(key)) return this.sessions.get(key);
    const filename = composeRawFilename(gameID, sessionStartedAt || Math.floor(Date.now() / 1000), 1);
    const sess = { filename, gameID, tabId, buffer: [], lastFlushAt: 0 };
    this.sessions.set(key, sess);
    return sess;
  }

  /**
   * Push a frame to the buffer. Auto-flushes ONLY if buffer hits the hard
   * cap (5000 frames) OR safety interval elapsed (5min). Routine flushes
   * are driven by service_worker.js on hand-complete events.
   */
  async push(tabId, gameID, sessionStartedAt, frame) {
    if (!this.enabled) return;
    const sess = this.ensureSession(tabId, gameID, sessionStartedAt);
    if (!sess) return;
    const redacted = redactFrame(frame);
    sess.buffer.push(redacted);
    const now = Date.now();
    if (sess.buffer.length >= this.maxBufferSize || (sess.lastFlushAt > 0 && now - sess.lastFlushAt > this.safetyFlushMs)) {
      await this.flush(tabId, gameID);
    }
  }

  async flush(tabId, gameID) {
    const key = this._key(tabId, gameID);
    const sess = this.sessions.get(key);
    if (!sess || sess.buffer.length === 0) return;
    const lines = sess.buffer.map(f => JSON.stringify(f)).join('\n') + '\n';
    sess.buffer = [];
    sess.lastFlushAt = Date.now();
    try {
      await appendToSessionFile(sess.filename, lines);
    } catch (e) {
      // Re-queue on failure (cap buffer to avoid unbounded memory)
      // For v1: just log and drop
      console.warn('[hjk] raw sidecar flush failed:', e.message);
    }
  }

  async flushAll() {
    for (const [key] of this.sessions) {
      const [tabId, gameID] = key.split(':').map(Number);
      await this.flush(tabId, gameID);
    }
  }

  closeSession(tabId, gameID) {
    this.sessions.delete(this._key(tabId, gameID));
  }

  closeTab(tabId) {
    const prefix = `${tabId}:`;
    for (const key of Array.from(this.sessions.keys())) {
      if (key.startsWith(prefix)) this.sessions.delete(key);
    }
  }
}
