// Hijack Poker HH Logger — Gzip helper
//
// The socket.io engine channel (wss://engine.hijack.poker) wraps gzip-compressed
// JSON inside its text envelopes: `42["eventName","<base64-gzip>"]`. We don't
// need this channel for hand reconstruction (lobby metadata only), but the
// helper exists in case raw sidecar wants to decode for debug purposes.
//
// Uses native DecompressionStream API (Chrome 80+, fully supported on every
// platform the extension targets).

/**
 * Decompress a base64-encoded gzip payload to a UTF-8 string.
 * @param {string} b64 — base64 of gzip bytes
 * @returns {Promise<string>}
 */
export async function gunzipBase64(b64) {
  // base64 → Uint8Array
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

  // gunzip via DecompressionStream
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

/**
 * Parse a socket.io engine.io v4 frame like `42["eventName","<base64-gzip>"]`.
 * Returns {eventName, payload} where payload is the decoded JSON object/array.
 * Returns null if the frame is not a parseable socket.io message envelope
 * (e.g., engine.io control frames "2", "3", or unparseable JSON).
 * @param {string} frame
 * @returns {Promise<{eventName: string, payload: any} | null>}
 */
export async function parseSocketIOFrame(frame) {
  if (typeof frame !== 'string') return null;
  // Engine.io control: "2" (ping), "3" (pong), etc. — not our concern
  if (!frame.startsWith('42[')) return null;
  const inner = frame.slice(2);  // strip "42"
  let arr;
  try { arr = JSON.parse(inner); } catch (e) { return null; }
  if (!Array.isArray(arr) || arr.length < 2) return null;

  const eventName = arr[0];
  let rawPayload = arr[1];
  // Hijack engine-channel payloads are usually base64-gzip
  if (typeof rawPayload === 'string' && /^[A-Za-z0-9+/=]+$/.test(rawPayload)) {
    try {
      const text = await gunzipBase64(rawPayload);
      try { return { eventName, payload: JSON.parse(text) }; }
      catch (e) { return { eventName, payload: text }; }
    } catch (e) {
      // Not gzip — return raw
      return { eventName, payload: rawPayload };
    }
  }
  return { eventName, payload: rawPayload };
}
