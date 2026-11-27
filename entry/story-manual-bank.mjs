// Common scripted save bank for campaign graph and native story owners.
// The source owner still decides the exact record and the continuation.
export function storyManualPromptText(phase) {
  if (phase === 'prompt') return 'ここでセーブしますか？';
  if (phase === 'cancel') return 'セーブしなくてよろしいですか？';
  return null;
}

export function storyManualBankOptions(phase, read) {
  if (phase === 'slots') return Array.from({length:5}, (_, i) => {
    let row;
    try { row = read(i + 1); } catch {}
    return {id:'slot:' + (i + 1), labelJa:row?.labelJa || `${i+1}: データがありません`,
      enabled:true, slot:i+1, occupied:!!row};
  });
  return [{id:'save:yes', labelJa:'はい', enabled:true}, {id:'save:no', labelJa:'いいえ', enabled:true}];
}

export function storyManualBankAction(phase, key) {
  if (key === 'back') return phase === 'slots' ? 'cancel' : phase === 'cancel' ? 'slots' : phase;
  if (phase === 'slots' && /^slot:[1-5]$/.test(key)) return 'write';
  if (key !== 'save:yes' && key !== 'save:no') return phase;
  if (phase === 'cancel') return key === 'save:yes' ? 'continue' : 'slots';
  if (phase === 'prompt') return key === 'save:yes' ? 'slots' : 'continue';
  return phase;
}
