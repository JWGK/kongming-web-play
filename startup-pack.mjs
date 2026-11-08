import {OPENING_EVIDENCE as evidence} from './startup-content.mjs';
export const MAX_PACK_BYTES = 96 * 1024;
export async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
// A local presentation fixture, never a save format, script, or upload endpoint.
export async function parseOpeningPack(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_PACK_BYTES) throw Error('片段檔過大或格式不符。');
  let data;
  try { data = JSON.parse(raw); } catch { throw Error('無法讀取 JSON 片段檔。'); }
  const keys = ['schema','version','checkpointId','sourcePrefixSha256','lines','framePngBase64'];
  if (!data || Array.isArray(data) || typeof data !== 'object' || Object.keys(data).some(key => !keys.includes(key)) ||
      data.schema !== 'kongming-opening-pack' || data.version !== 1 || data.checkpointId !== evidence.checkpointId ||
      data.sourcePrefixSha256 !== evidence.sourcePrefixSha256 || !Array.isArray(data.lines) || data.lines.length !== evidence.lineCount ||
      data.lines.some(line => typeof line !== 'string' || /[\r\n\u0000-\u001f]/u.test(line)) || data.lines.join('').length !== evidence.glyphCount) {
    throw Error('只接受已核實的五行開場片段，不接受完整劇情或其他資料。');
  }
  if (await sha256(new TextEncoder().encode(data.lines.join('\n'))) !== evidence.textSha256) throw Error('片段文字與已核實的來源不符。');
  let frameDataUrl = null;
  if (data.framePngBase64 !== undefined) {
    if (typeof data.framePngBase64 !== 'string' || data.framePngBase64.length > 90 * 1024 || !/^[A-Za-z0-9+/]+={0,2}$/u.test(data.framePngBase64)) throw Error('參考影格格式不符。');
    let bytes;
    try { bytes = Uint8Array.from(atob(data.framePngBase64), char => char.charCodeAt(0)); } catch { throw Error('參考影格格式不符。'); }
    if (bytes.length < 24 || ![137,80,78,71,13,10,26,10].every((byte,index) => bytes[index] === byte)) throw Error('參考影格必須為 PNG。');
    const view = new DataView(bytes.buffer);
    if (view.getUint32(16) !== evidence.frameWidth || view.getUint32(20) !== evidence.frameHeight || await sha256(bytes) !== evidence.frameSha256) throw Error('參考影格與已核實的檢查點不符。');
    frameDataUrl = `data:image/png;base64,${data.framePngBase64}`;
  }
  return Object.freeze({checkpointId:evidence.checkpointId, lines:Object.freeze([...data.lines]), frameDataUrl});
}
