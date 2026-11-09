/** Immutable, allowlisted preaction facts for presentation. No gameplay rule, RNG
 * draw, ROM address or private stat-source payload belongs in these snapshots.
 * Missing optional identity/terrain facts stay null, never fabricated defaults.
 */
const knownInt=n=>Number.isSafeInteger(n)?n:null;
export function captureUnitPresentation(unit,board){
 const position=unit?.position?Object.freeze({x:knownInt(unit.position.x),y:knownInt(unit.position.y)}):null;
 const terrainIndex=position&&Number.isSafeInteger(position.x)&&Number.isSafeInteger(position.y)&&Number.isSafeInteger(board?.width)&&Number.isSafeInteger(board?.height)&&position.x>=0&&position.y>=0&&position.x<board.width&&position.y<board.height?position.y*board.width+position.x:null;
 return Object.freeze({slotIndex:knownInt(unit?.slotIndex),definitionIndex:knownInt(unit?.definitionIndex),classIndex:knownInt(unit?.classIndex),level:knownInt(unit?.level),nameJa:typeof unit?.nameJa==='string'?unit.nameJa:null,position,
  terrainId:terrainIndex!==null?knownInt(board?.terrain?.[terrainIndex]):null,
  troops:knownInt(unit?.troops),maximumTroops:knownInt(unit?.stats?.最大兵数),strategyPoints:knownInt(unit?.strategyPoints),maximumStrategyPoints:knownInt(unit?.stats?.最大策略値),
  status24:knownInt(unit?.status24),status25:knownInt(unit?.status25),status26:knownInt(unit?.status26),facing18:knownInt(unit?.facing18),flags16:knownInt(unit?.flags16)});
}
export function captureActionPresentation({actor,target,targets=[target],board}){
 const snapshots=Object.freeze(targets.map(u=>captureUnitPresentation(u,board))),primary=snapshots.find(u=>u.slotIndex===target.slotIndex);
 if(!primary)throw new TypeError('Primary presentation target must occur in ordered targets');
 return Object.freeze({schemaVersion:1,phase:'beforeAction',actor:captureUnitPresentation(actor,board),target:primary,targets:snapshots,primaryTargetSlot:target.slotIndex,targetIndex:snapshots.indexOf(primary),weatherProfile:knownInt(board?.weatherProfile)});
}
/** Each existing area-hit event selects its own target but preserves one original
 * action's ordered roster, caster maxima and primary target. No new events.
 */
export function presentationForTarget(presentation,slotIndex){
 const targetIndex=presentation.targets.findIndex(u=>u.slotIndex===slotIndex);if(targetIndex<0)throw new TypeError('Target missing from action presentation');
 return Object.freeze({...presentation,target:presentation.targets[targetIndex],targetIndex});
}
