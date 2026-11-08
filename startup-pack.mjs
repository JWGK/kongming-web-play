import {OPENING_ROUTES, isRouteId} from './startup-sequences.mjs';
export const MAX_PACK_BYTES = 96 * 1024;
const exactKeys = (object,required,optional = []) => object && !Array.isArray(object) && typeof object === 'object'
  && required.every(key => Object.hasOwn(object,key)) && Object.keys(object).every(key => [...required,...optional].includes(key));
export async function sha256(bytes) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),value => value.toString(16).padStart(2,'0')).join('');
}
/** The imported file cannot define routes, order, labels, source spans or URLs.
 * All route/page identifiers and content hashes must match checked-in evidence.
 * V1's common prefix is intentionally not assigned to either complete route.
 */
export async function parseOpeningPack(raw,expectedRouteId) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).byteLength > MAX_PACK_BYTES) throw Error('片段檔過大或格式不符。');
  let data; try { data = JSON.parse(raw); } catch { throw Error('無法讀取 JSON 片段檔。'); }
  if (!isRouteId(expectedRouteId) || !exactKeys(data,['schema','version','routeId','sequenceId','pages'])
    || data.schema !== 'kongming-opening-route-pack' || data.version !== 2 || data.routeId !== expectedRouteId) throw Error('只接受目前開場分支已核實的片段檔。');
  const route = OPENING_ROUTES[expectedRouteId];
  if (!route.pages.length) throw Error('目前分支的片段邊界尚未核實，未載入任何內容。');
  if (data.sequenceId !== route.sequenceId || !Array.isArray(data.pages) || data.pages.length !== route.pages.length) throw Error('片段版本或頁面範圍與目前分支不符。');
  const pages = [];
  for (let index = 0; index < route.pages.length; index++) {
    const page = data.pages[index], evidence = route.pages[index];
    if (!exactKeys(page,['id','lines']) || page.id !== evidence.id || !Array.isArray(page.lines)
      || page.lines.length !== evidence.lineCount || page.lines.some(line => typeof line !== 'string' || /[\r\n\u0000-\u001f\u007f]/u.test(line))
      || Array.from(page.lines.join('')).length !== evidence.glyphCount) throw Error('片段頁面與已核實的分支範圍不符。');
    if (await sha256(new TextEncoder().encode(page.lines.join('\n'))) !== evidence.textSha256) throw Error('片段文字與已核實的來源不符。');
    pages.push(Object.freeze({id:page.id,lines:Object.freeze([...page.lines])}));
  }
  return Object.freeze({routeId:route.id,sequenceId:route.sequenceId,language:'ja',pages:Object.freeze(pages)});
}
