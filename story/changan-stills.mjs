// The original 長安 location-caption commands, anchored to their source bytes.
const captions = new Map([
  ["5:0:0:0:8", [0x1c7d82, 55, "城", "郿城"]],
  ["5:0:0:0:22", [0x1c7dd1, 60, "城　会議場", "郿城　議事廳"]],
  ["5:0:0:1:3", [0x1c7e19, 353, "洛陽", "洛陽"]],
  ["5:0:0:1:18", [0x1c7e6e, 358, "洛陽　会議場", "洛陽　議事廳"]],
  ["5:0:0:3:16", [0x1c7f5b, 890, "建業　会議場", "建業　議事廳"]],
  ["5:0:1:0:3", [0x1c80eb, 1197, "五丈原", "五丈原"]],
  ["5:0:1:1:21", [0x1c816c, 1220, "五丈原　蜀軍幕舎", "五丈原　蜀軍營帳"]],
]);
export const changanCursor = cursor => Array.isArray(cursor) && cursor.length === 5 &&
  (cursor[0] === 4 && cursor[1] === 3 && cursor[2] === 14 ||
   cursor[0] === 5 && cursor[1] === 0 && [0,1,2,3].includes(cursor[2]));
export function changanCaption(recipe) {
  const cursor = recipe?.sourceCursor;
  if (recipe?.version !== 'chapter5-changan-presentation/1' || recipe.kind !== 'caption' ||
      recipe.opcode !== 11 || !changanCursor(cursor)) return null;
  const row=captions.get(cursor.join(':'));
  return row && recipe.sourceOffset === row[0] && recipe.details?.reference === row[1] &&
    [row[2], row[2].replaceAll("\uE01F", "郿")].includes(recipe.afterRoom?.caption) ? row[3] : null;
}
export function changanDialogue(view) {
  if (view?.chapterId !== 'chapter5-changan-source' || view.coreStage !== 'presentation' || view.dialogue) return null;
  const text=changanCaption(view.presentation);
  return text ? {textJa:text,speakerDefinition:null} : null;
}
export const changanWorldStill=(room,cursor)=>changanCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
