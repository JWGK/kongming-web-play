// Use the game's UTF-16 codec on every device so a backup can move between browsers.
const prefix = "KONGMING-CAMPAIGN-BATTLE/1\n";
const outerPrefix = "KONGMING-DISPLAY-STATS/1\n";
const chunkSize = 196608;
const maxChunks = 64;

export function createCampaignBattleRecords({ wrap, unwrap, compress, expand }) {
  function claims(raw) {
    if (typeof raw !== "string" || !raw.startsWith(outerPrefix)) return false;
    const end = raw.indexOf("\n", outerPrefix.length);
    if (end < 0 || end > outerPrefix.length + 3) return false;
    const length = Number(raw.slice(outerPrefix.length, end));
    return Number.isInteger(length) && length > 0 && length <= 512 && raw.startsWith(prefix, end + 1 + length);
  }

  function encode(record, runCycle=1) {
    const json = JSON.stringify(record);
    if (json.length > maxChunks * chunkSize) throw new RangeError("Campaign battle exceeds the save size limit");
    const chunks = [];
    for (let offset = 0; offset < json.length; offset += chunkSize) {
      const part = json.slice(offset, offset + chunkSize);
      const packed = compress(part);
      chunks.push(packed === null ? { plain: part } : { compressed: packed });
    }
    return wrap({ innerText: prefix + JSON.stringify(chunks), channel: "suspend", total: record.turns, runCycle }).text;
  }

  function decode(raw) {
    if (!claims(raw)) throw new TypeError("Unrecognized campaign battle record");
    const frame = unwrap(raw);
    if (frame.channel !== "suspend") throw new TypeError("Expected a battle suspend record");
    const chunks = JSON.parse(frame.innerText.slice(prefix.length));
    if (!Array.isArray(chunks) || !chunks.length || chunks.length > maxChunks) throw new RangeError("Invalid campaign battle size");
    const parts = chunks.map((chunk, index) => {
      if (!chunk || typeof chunk !== "object" || Object.keys(chunk).length !== 1) throw new TypeError("Invalid campaign battle chunk");
      const text = typeof chunk.plain === "string" ? chunk.plain : expand(chunk.compressed);
      if (!text.length || text.length > chunkSize || index + 1 < chunks.length && text.length !== chunkSize) {
        throw new RangeError("Invalid campaign battle chunk length");
      }
      return text;
    });
    const record = JSON.parse(parts.join(""), (key, value) => {
      if (["__proto__", "constructor", "prototype"].includes(key)) throw new TypeError("Invalid campaign battle field");
      return value;
    });
    if (!record || typeof record !== "object" || !(record.turns === null ||
      Number.isInteger(record.turns) && record.turns >= 0 && record.turns <= 0xffffffff) ||
      frame.turns !== (record.turns === null ? null : record.turns & 65535)) {
      throw new TypeError("Campaign battle turn count differs from its display record");
    }
    return record;
  }
  return Object.freeze({ claims, encode, decode });
}
