import {refreshUnit} from '../engine/battle-stats.mjs';

const expect=(condition,diagnostic)=>{
  if(!condition)throw Object.assign(new RangeError(diagnostic),{code:diagnostic});
};
const byte=value=>Number.isInteger(value)&&value>=0&&value<=255;

// The caller supplies only an already restored campaign carry and the stock
// engine's reviewed town rules for that exact carry, never a raw save or fallback actor.
export function projectXinyeDonor({persistentState, reviewed}) {
  const {party,itemInstances}=persistentState??{};
  const {entityTemplates,movementProfiles,statsRules}=reviewed??{};
  expect(Array.isArray(party)&&Array.isArray(itemInstances)&&itemInstances.length===255&&
    Array.isArray(entityTemplates)&&Array.isArray(movementProfiles)&&statsRules, 'FREE_XINYE_DONOR_SCOPE');
  const templates=new Map(entityTemplates.map(u=>[u.definitionIndex,u]));
  const movement=new Map(movementProfiles.map(p=>[p.classIndex,p]));
  const definitions=new Set(statsRules.itemDefinitions.map(item=>item.definitionId));
  const roster=party.map(unit=>{
    const template=templates.get(unit.definitionIndex), profile=movement.get(unit.classIndex);
    expect(template?.statsSource,'FREE_XINYE_DONOR_ACTOR');
    expect(profile?.costs?.length===23&&!profile.scriptOnly,'FREE_XINYE_DONOR_MOVEMENT');
    expect(unit.itemSlots?.length===13&&unit.itemSlots.every(byte),'FREE_XINYE_DONOR_ITEM_SLOTS');
    const stockInstances=[...new Set(unit.itemSlots)].map(slotId=>{
      const definitionId=slotId===255?255:itemInstances[slotId]?.definitionId;
      expect(definitions.has(definitionId),'FREE_XINYE_DONOR_ITEM_RULE');
      return {slotId,definitionId};
    });
    const candidate={...structuredClone(template),...structuredClone(unit),
      statsSource:{...structuredClone(template.statsSource),baseFields:structuredClone(unit.baseFields),itemInstances:stockInstances}};
    // Check passive rules at donor selection, not after the player chooses a squad.
    refreshUnit(candidate,statsRules);
    return candidate;
  });
  return {roster,movementProfiles,statsRules};
}
