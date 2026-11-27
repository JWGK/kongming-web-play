// The two original location-caption commands, anchored to their source bytes.
const captions = new Map([
  ['4:3:7:0:23', [0x1beaf0, 12351, '祁山　蜀軍幕舎', '祁山　蜀軍營帳']],
  ['4:3:7:17:15', [0x1bec57, 15460, '渭水　魏軍幕舎', '渭水　魏軍營帳']],
]);
export const huluguCursor = cursor => Array.isArray(cursor) && cursor.length === 5 &&
  cursor[0] === 4 && cursor[1] === 3 && [6,7,8,9].includes(cursor[2]);
export function huluguCaption(recipe) {
  const cursor = recipe?.sourceCursor;
  if (recipe?.version !== 'chapter4-hulugu-presentation/1' || recipe.kind !== 'caption' ||
      recipe.opcode !== 11 || !huluguCursor(cursor)) return null;
  const row=captions.get(cursor.join(':'));
  return row && recipe.sourceOffset === row[0] && recipe.details?.reference === row[1] &&
    recipe.afterRoom?.caption === row[2] ? row[3] : null;
}
export function huluguDialogue(view) {
  if (view?.chapterId !== 'chapter4-hulugu-source' || view.coreStage !== 'presentation' || view.dialogue) return null;
  const text=huluguCaption(view.presentation);
  return text ? {textJa:text,speakerDefinition:null} : null;
}
export const huluguWorldStill=(room,cursor)=>huluguCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
