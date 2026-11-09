/** Original static definitions, independent of route and mutable campaign state.
 *
 * This catalog is NOT an actor collection, recruitment list or supported-class
 * declaration. A source default never supplies unknown current save/history
 * fields. Names retain CP932 text including unresolved private-use glyphs.
 *
 * Reviewed meanings: +0x0c 武力, +0x0d 統率力, +0x0e 知力,
 * +0x16 initial class, +0x17 initial level. Other fields retain offset labels.
 * F724/F744 use the native low-nine-bit ID and 28-byte ROM record stride.
 * See docs/native-entity-definitions.md for source evidence and reproduction.
 */

const SOURCE = Object.freeze({
  schemaVersion: 'native-entity-definitions-1',
  purpose: 'original_static_entity_definitions',
  sourceRomSha256: 'acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511',
  tableRomOffset: 0x095c10,
  recordStride: 28,
  definitionCount: 512,
  tableSha256: '08f98d95901385c2a089cce00f166d81b5b64bdff9081af1802560d630b1c3d2',
  textIndexSha256: '18419a86df7356d7592e01f25643763db3a7ddcb257a4efca1e31c0e58067cdc',
});
const INPUT_KEYS = [...Object.keys(SOURCE), 'tableHex', 'sourceStrings'].sort();
const captured = new WeakSet();
let sharedCatalog;
const need = (ok, message) => { if (!ok) throw new TypeError(message); };
const hex = (value, length) => typeof value === 'string' && value.length === length && /^[0-9a-f]+$/.test(value);

function dataObject(value, keys, label) {
  need(value !== null && typeof value === 'object' &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value)), `${label} must be a plain data object`);
  const descriptors = Object.getOwnPropertyDescriptors(value), actual = Reflect.ownKeys(descriptors);
  need(actual.length === keys.length && actual.every(k => typeof k === 'string') &&
    actual.sort().every((k, i) => k === keys[i]), `${label} has unexpected fields`);
  need(actual.every(k => 'value' in descriptors[k] && descriptors[k].enumerable), `${label} must not contain accessors`);
  return Object.fromEntries(actual.map(k => [k, descriptors[k].value]));
}

function dense(value, length, label) {
  need(Array.isArray(value) && value.length === length && Reflect.ownKeys(value).length === length + 1,
    `${label} must contain exactly ${length} entries`);
  const out = [];
  for (let i = 0; i < length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
    need(descriptor && 'value' in descriptor && descriptor.enumerable, `${label} must be dense data`);
    out.push(descriptor.value);
  }
  return out;
}

function bytesFromHex(value) {
  return Uint8Array.from({length: value.length / 2}, (_, i) => parseInt(value.slice(i * 2, i * 2 + 2), 16));
}

async function sha256(bytes) {
  need(globalThis.crypto?.subtle, 'WebCrypto SHA-256 is required to validate native definitions');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sourceText([romOffset, rawHex, textJa]) {
  const privateUseCodepoints = [...new Set([...textJa].map(c => c.codePointAt(0))
    .filter(c => c >= 0xe000 && c <= 0xf8ff))].sort((a, b) => a - b)
    .map(c => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`);
  return Object.freeze({romOffset, rawHex, textJa, privateUseCodepoints: Object.freeze(privateUseCodepoints)});
}

/** A brand check, not a structural guess based on user-controlled properties. */
export function isNativeEntityDefinitionCatalog(value) {
  return value !== null && typeof value === 'object' && captured.has(value);
}

/** Capture a bounded JSON payload once, without retaining mutable input.
 * Every new unbranded input is validated, even after a successful capture.
 * Both exact source bytes AND the complete pointer/CP932 text mapping are pinned.
 * No loading, storage, actor initialization or current-state overlay occurs here.
 */
export async function captureNativeEntityDefinitionCatalog(input) {
  if (isNativeEntityDefinitionCatalog(input)) return input;
  const value = dataObject(input, INPUT_KEYS, 'Native definition catalog');
  for (const [key, expected] of Object.entries(SOURCE)) need(value[key] === expected, `Invalid native definition ${key}`);
  need(hex(value.tableHex, SOURCE.recordStride * SOURCE.definitionCount * 2), 'Invalid native definition table bytes');
  // Snapshot every untrusted array/primitive before the first await. Caller
  // mutation during digest cannot change what is subsequently materialized.
  const strings = dense(value.sourceStrings, 551, 'Native source strings').map((row, i) => {
    const [offset, raw, text] = dense(row, 3, `Native source string ${i}`);
    need(Number.isSafeInteger(offset) && offset >= 0x094b24 && offset < SOURCE.tableRomOffset,
      'Native source string pointer is outside the reviewed pool');
    need(typeof raw === 'string' && raw.length <= 16 && raw.length % 2 === 0 && hex(raw, raw.length),
      'Invalid native CP932 bytes');
    need(typeof text === 'string' && text.length > 0 && text.length <= 8,
      'Invalid native decoded source text');
    return [offset, raw, text];
  });
  need(strings.every((s, i) => i === 0 || strings[i - 1][0] < s[0]), 'Native source pointers must be unique and ordered');
  const bytes = bytesFromHex(value.tableHex);
  const [tableHash, textHash] = await Promise.all([
    sha256(bytes), sha256(new TextEncoder().encode(JSON.stringify(strings))),
  ]);
  need(tableHash === SOURCE.tableSha256, 'Native definition table integrity mismatch');
  need(textHash === SOURCE.textIndexSha256, 'Native definition source text integrity mismatch');
  if (sharedCatalog) return sharedCatalog;

  const textByOffset = new Map(strings.map(row => [row[0], sourceText(row)]));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const definitions = Array.from({length: SOURCE.definitionCount}, (_, definitionIndex) => {
    const start = definitionIndex * SOURCE.recordStride;
    const nameSource = textByOffset.get(view.getUint32(start, true) - 0x08000000);
    const readingSource = textByOffset.get(view.getUint32(start + 4, true) - 0x08000000);
    need(nameSource && readingSource, 'Native name/reading pointer is not indexed');
    const rawFields = {field_08: view.getInt16(start + 8, true)};
    for (let offset = 10; offset < SOURCE.recordStride; offset++) {
      if (offset > 16 && offset < 20) continue;
      rawFields[`field_${offset.toString(16).padStart(2, '0')}`] = offset === 16
        ? view.getUint32(start + offset, true) : bytes[start + offset];
    }
    return Object.freeze({
      definitionIndex,
      romOffset: SOURCE.tableRomOffset + start,
      rawRecordHex: value.tableHex.slice(start * 2, (start + SOURCE.recordStride) * 2),
      nameJa: nameSource.textJa,
      readingJa: readingSource.textJa,
      nameSource,
      readingSource,
      sourceField08: rawFields.field_08,
      baseFields: Object.freeze({'武力': bytes[start + 12], '統率力': bytes[start + 13], '知力': bytes[start + 14]}),
      initialClassIndex: bytes[start + 22],
      initialLevel: bytes[start + 23],
      rawFields: Object.freeze(rawFields),
    });
  });
  sharedCatalog = Object.freeze({...SOURCE, definitions: Object.freeze(definitions)});
  captured.add(sharedCatalog);
  return sharedCatalog;
}

/** Strict native ID lookup. No masking, wrapping, name merging or fallback. */
export function getNativeEntityDefinition(catalog, definitionIndex) {
  need(isNativeEntityDefinitionCatalog(catalog), 'Captured native definition catalog required');
  if (!Number.isSafeInteger(definitionIndex) || definitionIndex < 0 || definitionIndex >= SOURCE.definitionCount)
    throw new RangeError('Native definitionIndex must be an integer in 0..511');
  return catalog.definitions[definitionIndex];
}
