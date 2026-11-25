// Keep the game’s six records synchronous for their native writers. Backups and
// game codecs continue to see precisely the string originally passed to setItem.
const marker = "KONGMING-LOCAL-COMPACT/1\n";
const chunkSize = 196608;
const transportLimit = 2000550;
const gameKey = /^kongming-first-battle\.(?:suspend\.v1|slot\.v1\.[1-5])$/;

export function createCampaignStorage(storage, { compress, expand, checksum }) {
  if (!storage || typeof storage.getItem !== "function") return storage;
  const cache = new Map();

  function pack(text) {
    const chunks = [];
    for (let start = 0; start < text.length; start += chunkSize) {
      const part = text.slice(start, start + chunkSize);
      const encoded = compress(part);
      chunks.push(encoded === null ? { plain: part } : { compressed: encoded });
    }
    const body = JSON.stringify(chunks);
    // Very compact existing formats usually benefit more from being left as-is.
    if (body.length + 80 > text.length * 0.85) return text;
    return marker + text.length + "," + checksum(text) + "\n" + body;
  }

  function unpack(physical) {
    const newline = physical.indexOf("\n", marker.length);
    if (newline < 0 || newline - marker.length > 16 || physical.length > transportLimit) throw new TypeError("Invalid local record");
    const match = /^(\d{1,7}),([0-9a-f]{8})$/.exec(physical.slice(marker.length, newline));
    if (!match) throw new TypeError("Invalid local record header");
    const length = Number(match[1]);
    const chunks = JSON.parse(physical.slice(newline + 1));
    if (!length || length > transportLimit || !Array.isArray(chunks) || chunks.length !== Math.ceil(length / chunkSize)) {
      throw new RangeError("Invalid local record size");
    }
    const text = chunks.map((chunk, index) => {
      if (!chunk || typeof chunk !== "object" || Object.keys(chunk).length !== 1) throw new TypeError("Invalid local record chunk");
      const part = typeof chunk.plain === "string" ? chunk.plain : expand(chunk.compressed);
      if (part.length !== Math.min(chunkSize, length - index * chunkSize)) throw new RangeError("Invalid local record chunk size");
      return part;
    }).join("");
    if (checksum(text) !== match[2]) throw new TypeError("Local record checksum mismatch");
    return text;
  }

  return Object.freeze({
    get length() { return storage.length; },
    key(index) { return storage.key(index); },
    getItem(key) {
      const physical = storage.getItem(key);
      if (typeof physical !== "string" || !gameKey.test(key) || !physical.startsWith(marker)) {
        cache.delete(key);
        return physical;
      }
      const old = cache.get(key);
      if (old?.physical === physical) return old.text;
      let text;
      try { text = unpack(physical); }
      catch { text = physical; } // An unreadable slot can still be exported or deliberately replaced.
      cache.set(key, { physical, text });
      return text;
    },
    setItem(key, value) {
      if (!gameKey.test(key)) return storage.setItem(key, value);
      const text = String(value);
      let physical = text;
      if (text.length >= 262144 && text.length <= transportLimit && !text.startsWith(marker)) {
        const previous = storage.getItem(key);
        const cached = cache.get(key);
        if (cached?.physical === previous && cached.text === text) physical = previous;
        else {
          try { physical = pack(text); } catch { /* The native writer can still store the original representation. */ }
        }
        if (storage.getItem(key) !== previous) {
          throw new DOMException("The save slot changed during compression", "InvalidStateError");
        }
      }
      const result = storage.setItem(key, physical);
      if (physical !== text) cache.set(key, { physical, text });
      else cache.delete(key);
      return result;
    },
    removeItem(key) {
      const result = storage.removeItem(key);
      cache.delete(key);
      return result;
    }
  });
}
