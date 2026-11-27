// Only the non-interactive pursuit aftermath (original root 4, section 0,
// block 5). Neither original events nor playable world maps use this policy.
export function pursuitAftermathCursor(cursor) {
  return Array.isArray(cursor) && cursor.length === 5 &&
    cursor[0] === 4 && cursor[1] === 0 && cursor[2] === 5;
}
export function pursuitAftermathCaption(recipe) {
  const c = recipe?.sourceCursor;
  if (recipe?.version !== 'qishan-dispute-presentation/1' ||
      recipe.kind !== 'caption' || recipe.opcode !== 11 ||
      !pursuitAftermathCursor(c) || c[3] !== 1) return null;
  // Original text commands at 0x1ac92f and 0x1ac99d.
  if (c[4] === 2 && recipe.sourceOffset === 0x1ac92f &&
      recipe.details?.reference === 10652 && recipe.afterRoom?.caption === '祁山') return '祁山';
  if (c[4] === 22 && recipe.sourceOffset === 0x1ac99d &&
      recipe.details?.reference === 10657 && recipe.afterRoom?.caption === '祁山　蜀軍幕舎') return '祁山　蜀軍營帳';
  return null;
}
export function pursuitAftermathDialogue(view) {
  if (view?.chapterId !== 'qishan-dispute-source' ||
      view.coreStage !== 'presentation' || view.dialogue) return null;
  const text = pursuitAftermathCaption(view.presentation);
  return text ? { textJa:text, speakerDefinition:null } : null;
}
