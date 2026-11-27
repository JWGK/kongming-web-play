import {createCampaignStorage} from '../campaign-storage.mjs';
import {previewClearSlot} from '../ng-plus/clear-slot.mjs';
import {decompressRecordText, recordTextChecksum} from './local-record-codec.mjs';

const slotPrefix = 'kongming-first-battle.slot.v1.';
const suspendKey = 'kongming-first-battle.suspend.v1';
const framePrefix = 'KONGMING-DISPLAY-STATS/1\n';
const limit = 2_000_550;
const pendingLabel = '記錄詳情待核對';

// The labels of these native formats identify their location even without chapter data.
const suspendLabels = new Map([
  ['KONGMING-CH4-IMPERIAL-BAIDI-RECAPTURE-NATIVE-SUSPEND/1', '白帝城奪還戰（稱帝線）'],
  ['KONGMING-CH4-IMPERIAL-CHENGDU-CURRENT-SUSPEND/1', '成都防衛戰（稱帝線）'],
  ['KONGMING-CH4-IMPERIAL-YANGPING-NATIVE-SUSPEND/1', '陽平關之戰（稱帝線）'],
  ['KONGMING-LUOYANG-I-FIXED-SUSPEND/1', '洛陽之戰Ⅰ'],
  ['KONGMING-LUOYANG-II-FIXED-SUSPEND/1', '洛陽之戰Ⅱ'],
  ['KONGMING-HUASHAN-NATIVE-SUSPEND/1', '華山之戰'],
  ['KONGMING-HANGU-FIXED-SUSPEND/2', '函谷關之戰']
]);
const manualLabels = new Map([
  ['KONGMING-QISHAN-ROOT4-CAMP-MANUAL/1', '祁山　蜀軍營帳'],
  ['KONGMING-WUZHANG-HISTORICAL-POST-MANUAL/1', '第四章・第三幕 五丈原之戰Ⅱ（史實戰後）'],
  ['KONGMING-HANGU-POST-MANUAL/1', '終章・第四幕 洛陽（函谷關之戰戰後）'],
  ['KONGMING-HUASHAN-POST-MANUAL/1', '終章・第三幕 長安（華山之戰戰後）']
]);
const storySites = new Map([
  ['qishan-dispute-source', '祁山爭奪戰前'],
  ['qishan-map33-source', '陳倉整備'],
  ['chapter4-post-qishan-source', '司馬懿決戰後'],
  ['chapter4-hulugu-source', '葫蘆谷出陣前'],
  ['chapter4-wuzhang-source', '五丈原出陣前'],
  ['chapter5-changan-source', '郿城整備'],
  ['chapter5-wugong-source', '武功出陣前']
]);
const councilSites = new Map([
  ['nanan-council', '祁山　蜀軍營帳'],
  ['tianshui-council', '南安　議事廳'],
  ['nanan-town', '南安'],
  ['aftermath-save', '天水']
]);

function readFrame(text, channel) {
  if (!text.startsWith(framePrefix)) return {body: text, turns: null};
  const lengthTag = /^[1-9][0-9]{0,2}\n/.exec(text.slice(framePrefix.length, framePrefix.length + 4));
  if (!lengthTag) return null;
  const length = Number(lengthTag[0].trim());
  const start = framePrefix.length + lengthTag[0].length;
  if (length > 512 || start + length > text.length) return null;
  const headerText = text.slice(start, start + length);
  const header = JSON.parse(headerText);
  if (!header || header.channel !== channel || ![1, 2].includes(header.version) ||
      typeof header.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(header.checksum)) return null;
  const body = text.slice(start + length);
  const {checksum, ...fields} = header;
  if (JSON.stringify(header) !== headerText || header.innerCodeUnits !== body.length ||
      checksum !== recordTextChecksum(framePrefix + JSON.stringify(fields) + '\n' + body)) return null;
  const turns = header.totalTurns ?? header.turns;
  if (turns !== null && (!Number.isInteger(turns) || turns < 0 || turns > 0xffffffff)) return null;
  return {body, turns};
}

function jsonLocation(body) {
  const record = JSON.parse(body);
  const story = record?.kind === 'entry' ? record.entry : null;
  if (story?.kind === 'entry' && story.dataVersion === 'rom-acf30794-campaign-entry-v2') {
    const mode = story.state?.mode;
    if (mode === 'roam') {
      const roam = JSON.parse(story.roam);
      if (roam?.kind !== 'free-roam' || roam.dataVersion !== 'rom-acf30794-first-free-roam-v1') return null;
      if (roam.state?.city === 0) return '隆中・出陣前';
      if (roam.state?.city === 1) return '新野・出陣前';
    }
    if (mode === 'prologue') return '序幕・三顧之禮';
    if (mode === 'base') return '出陣前的劇情';
  }
  if (story?.kind === 'nanan-tianshui-story' && story.chapterId === 'nanan-tianshui') {
    const site = councilSites.get(story.active?.phase);
    return site ? '第三章・第一幕\n' + site : null;
  }
  if (record?.kind === 'battle' && record.state?.scenarioId === 'bowangpo-map0') return '博望坡之戰';
  switch (record?.state?.campaignContextId) {
    case '3:1:6':
    case '3:1:7': return '第三章・第一幕\n南安・安定之戰';
    case '3:1:10':
    case '3:1:12': return '第三章・第一幕\n天水城之戰';
    default: return null;
  }
}

function storyLocation(payload) {
  const chunks = JSON.parse(payload);
  if (!Array.isArray(chunks) || !chunks.length || chunks.length > 64) return null;
  const first = chunks[0];
  let text = first?.plain;
  if (typeof text !== 'string') {
    const wire = first?.compressed;
    if (typeof wire !== 'string') return null;
    const count = /^\{"kind":"kongming-utf16-lz77","version":1,"codeUnits":([0-9]{1,6}),/.exec(wire.slice(0, 70));
    if (!count || Number(count[1]) > 196608) return null;
    text = decompressRecordText(wire).text;
  }
  if (!text.length || text.length > 196608 || (chunks.length > 1 && text.length !== 196608)) return null;
  // The native story writer always places chapter first. Large saves need just the first chunk.
  const chapter = /^\{"chapter":"([a-z0-9-]+)","cursor":\[/.exec(text.slice(0, 100));
  return chapter && storySites.get(chapter[1]);
}

function preview(raw, key, channel) {
  if (!raw || raw.length > limit) return pendingLabel;
  // Read exactly this physical value, even if another tab writes during the preview.
  const view = createCampaignStorage({getItem: () => raw}, {
    expand: wire => decompressRecordText(wire).text,
    checksum: recordTextChecksum
  });
  const text = view.getItem(key);
  const frame = readFrame(text, channel);
  if (!frame) return pendingLabel;
  const clear = channel === 'manual' && previewClearSlot(text);
  if (clear) return clear.labelJa;
  const {body, turns} = frame;
  let label;
  if (body.startsWith('{')) {
    label = jsonLocation(body);
  } else {
    const end = body.slice(0, 80).indexOf('\n');
    const kind = end < 0 ? '' : body.slice(0, end);
    if (kind === 'KONGMING-STORY-MANUAL/1' && channel === 'manual') {
      label = storyLocation(body.slice(end + 1));
    } else {
      label = (channel === 'suspend' ? suspendLabels : manualLabels).get(kind);
    }
  }
  const lines = [label || pendingLabel];
  if (turns !== null) lines.push('累計回合：' + turns);
  return lines.join('\n');
}

export function createTitleRecords(window) {
  const cachedLabels = new Map();
  function read(key, channel, details) {
    let raw;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      cachedLabels.delete(key);
      return {exists: false, valid: false, unavailable: true, raw: null, label: '無法讀取儲存空間。'};
    }
    const exists = typeof raw === 'string' && raw.length > 0;
    if (!exists) {
      cachedLabels.delete(key);
      return {exists, valid: false, unavailable: false, raw, label: '記錄沒有資料。'};
    }
    // Occupied records stay selectable. The real controller admits the selected save.
    let label = null;
    if (details) {
      const cached = cachedLabels.get(key);
      if (cached?.raw === raw) label = cached.label;
      else {
        try { label = preview(raw, key, channel); } catch { label = pendingLabel; }
        cachedLabels.set(key, {raw, label});
      }
    }
    return {exists, valid: true, unavailable: false, raw, label};
  }
  return {
    readSlot(slot, details = false) {
      if (!Number.isInteger(slot) || slot < 1 || slot > 5) throw new RangeError('Expected a manual slot from 1 to 5');
      return read(slotPrefix + slot, 'manual', details);
    },
    readSuspend(details = false) { return read(suspendKey, 'suspend', details); }
  };
}
