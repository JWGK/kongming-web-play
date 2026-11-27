// The original 五丈原 location-caption commands, anchored to their source bytes.
const captions = new Map([
  ["4:3:11:0:3", [0x1bf990, 18289, "五丈原", "五丈原"]],
  ["4:3:11:0:24", [0x1bfa0a, 18296, "五丈原　蜀軍幕舎", "五丈原　蜀軍營帳"]],
  ["4:3:11:1:2", [0x1bfa64, 18879, "城", "郿城"]],
  ["4:3:11:1:7", [0x1bfa74, 18884, "城近郊　渭水河岸", "郿城近郊　渭水河岸"]],
  ["4:3:11:2:5", [0x1bfaac, 19118, "城　陣地", "郿城　陣地"]],
  ["4:3:12:0:22", [0x1bfb82, 19650, "五丈原　蜀軍幕舎", "五丈原　蜀軍營帳"]],
  ["4:3:12:1:5", [0x1bfc72, 21086, "城近郊　渭水河岸", "郿城近郊　渭水河岸"]],
  ["4:3:12:2:13", [0x1bfce9, 21326, "城　魏軍幕舎", "郿城　魏軍營帳"]],
  ["4:3:15:0:8", [0x1c0372, 23451, "五丈原　幕舎", "五丈原　營帳"]],
  ["4:3:15:1:19", [0x1c040a, 24175, "五丈原　陣地", "五丈原　陣地"]],
  ["4:3:15:2:5", [0x1c052c, 24665, "城近郊　渭水河岸", "郿城近郊　渭水河岸"]],
  ["4:3:15:3:13", [0x1c05a3, 24900, "城　魏軍幕舎", "郿城　魏軍營帳"]],
]);
export const wuzhangCursor = cursor => Array.isArray(cursor) && cursor.length === 5 &&
  cursor[0] === 4 && cursor[1] === 3 && [10,11,12,13,15,16].includes(cursor[2]);
export function wuzhangCaption(recipe) {
  const cursor = recipe?.sourceCursor;
  if (recipe?.version !== 'chapter4-wuzhang-presentation/1' || recipe.kind !== 'caption' ||
      recipe.opcode !== 11 || !wuzhangCursor(cursor)) return null;
  const row=captions.get(cursor.join(':'));
  return row && recipe.sourceOffset === row[0] && recipe.details?.reference === row[1] &&
    [row[2], row[2].replaceAll("\uE01F", "郿")].includes(recipe.afterRoom?.caption) ? row[3] : null;
}
export function wuzhangDialogue(view) {
  if (view?.chapterId !== 'chapter4-wuzhang-source' || view.coreStage !== 'presentation' || view.dialogue) return null;
  const text=wuzhangCaption(view.presentation);
  return text ? {textJa:text,speakerDefinition:null} : null;
}
export const wuzhangWorldStill=(room,cursor)=>wuzhangCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
