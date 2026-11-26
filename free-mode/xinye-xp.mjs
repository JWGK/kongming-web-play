// Private projection only: never authorizes an original result or writes storage.
// fieldState is the source control byte (field descriptor +0x15), not side or HP.
export function projectXinyeVictoryExperience({context,phase,terminal,field,applyExperience}={}){
  if(context!=='6:0:0'||phase!==1||terminal!==4||!Array.isArray(field)||field.length!==45||
     typeof applyExperience!=='function')throw Error('Exact original New Field Free stage victory and field required');
  const out=[],seen=new Set();
  for(let i=0;i<45;i++){
    if(!Object.hasOwn(field,i))throw Error('Complete field required');
    const row=field[i];
    if(row===null)continue;
    const {slotIndex,fieldState,definitionIndex,level,experience}=row??{};
    if(slotIndex!==i||![fieldState,definitionIndex,level,experience].every(Number.isInteger)||
      fieldState<0||fieldState>255||definitionIndex<0||definitionIndex>511||
      level<0||level>99||experience<0||experience>255)throw Error('Unreviewed exact native field/EXP');
    if(i>=15||fieldState!==2)continue;
    if(seen.has(definitionIndex))throw Error('Duplicate original EXP actor');
    seen.add(definitionIndex);
    const nativeEligible=definitionIndex<=235&&level<99;
    if(!nativeEligible)continue;
    out.push({slotIndex,definitionIndex,amount:50,next:applyExperience({definitionIndex,level,experience},50)});
  }
  return out;
}
