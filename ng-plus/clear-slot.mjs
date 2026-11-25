// Only the selected-slot decoder can admit a saved game. The picker needs its label before that work.
const framePrefix = 'KONGMING-DISPLAY-STATS/1\n';
const clearBodies = ['KONGMING-LUOYANG-II-POST-MANUAL/1\n', 'KONGMING-LUOYANG-II-COMPLETION-MENU-MANUAL/1\n'];

export function previewClearSlot(raw) {
  if (typeof raw !== 'string' || !raw.startsWith(framePrefix)) return null;
  const sizeTag = /^[1-9][0-9]{0,2}\n/.exec(raw.slice(framePrefix.length, framePrefix.length + 4));
  if (!sizeTag) return null;
  const size = Number(sizeTag[0].trim());
  const headerStart = framePrefix.length + sizeTag[0].length;
  const bodyStart = headerStart + size;
  if (size > 512 || !clearBodies.some(prefix => raw.startsWith(prefix, bodyStart))) return null;
  let header;
  try { header = JSON.parse(raw.slice(headerStart, bodyStart)); } catch { return null; }
  if (header?.channel !== 'manual' || ![1, 2].includes(header.version) ||
      header.innerCodeUnits !== raw.length - bodyStart || header.innerCodeUnits > 2000000 ||
      typeof header.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(header.checksum)) return null;
  const turns = header.turns;
  if (turns !== null && (!Number.isInteger(turns) || turns < 0 || turns > 65535)) return null;
  return {
    exists: true, pending: true, valid: false,
    labelJa: '終章・第三幕 漢室再興（洛陽之戰Ⅱ通關）　累計回合：' + (turns ?? '未記錄') + '（待核對）'
  };
}
