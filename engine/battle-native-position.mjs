/** Source-bound native descriptor XY. No serialized fields or guessed history.
 * Caller supplies a tactical state already accepted by its campaign/core engine.
 * Never-placed inference is scoped to the audited constructor/lifecycle only.
 */
import {constructVariantUnits} from './battle-variants.mjs';
const ROM='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=p=>p?{x:p.x,y:p.y}:null;
const cache=new WeakMap();
function sourceContext(rules){
 if(rules?.sourceRomSha256!==ROM||!rules.variant)return null;
 const context=rules.nextBattleContext?.contextId??`0:1:${rules.variant.scenarioBlock}`;
 if(rules.scenario.block_index!==rules.variant.scenarioBlock)return null;
 if(rules.nextBattleContext){if(rules.scenario.contextId!==context)return null;if(rules.variant.id!==context&&rules.variant.id!==`${context}:${rules.nextBattleContext.constructorProfileId}`)return null;}
 return context;
}
function stateBound(rules,state,leader,board){
 const context=sourceContext(rules);if(!context||!state||state.rulesVersion!==rules.rulesVersion||state.variantId!==rules.variant.id||state.scenarioBlock!==rules.variant.scenarioBlock)return false;
 if((state.campaignContextId??`0:1:${state.scenarioBlock}`)!==context)return false;
 if((state.battleStageId??null)!==(rules.nextBattleContext?.battleStageId??null)||(state.constructorProfileId??null)!==(rules.nextBattleContext?.constructorProfileId??null))return false;
 if(state.board?.width!==rules.board.width||state.board.height!==rules.board.height||board.width!==rules.board.width||board.height!==rules.board.height)return false;
 const saved=state.units?.find(u=>u.slotIndex===leader.slotIndex);
 return !!saved&&saved.definitionIndex===leader.definitionIndex&&saved.state15===leader.state15&&same(saved.position,leader.position)&&same(saved.lastFieldPosition,leader.lastFieldPosition);
}
function sourceHidden(rules,state,leader){
 if(!Array.isArray(state.deploymentSelection)||typeof state.preparationConfirmed!=='boolean')return false;
 const selection=state.preparationConfirmed?state.deploymentSelection:[],key=JSON.stringify(selection);
 let profiles=cache.get(rules);if(!profiles){profiles=new Map();cache.set(rules,profiles);}
 if(!profiles.has(key))profiles.set(key,constructVariantUnits(rules,selection));
 const built=profiles.get(key),origin=built.units[leader.slotIndex];
 // This is the actual resolved constructor, not future row spawn coordinates.
 // Its only assigned1/null branch is source-hidden; conditional rows stay guarded.
 return origin?.definitionIndex===leader.definitionIndex&&origin.state15===1&&origin.position===null&&
  built.rows.some(r=>r.slot_index===leader.slotIndex&&r.definition_index===leader.definitionIndex)&&
  same(state.runtimeDeploymentRows,built.rows);
}
export function resolveNativeLeaderPosition({leader,rules,tacticalState,board}){
 if(!leader||leader.definitionIndex===null)return {kind:'absent',position:null,sentinel:false};
 if(leader.state15===2)return {kind:'current',position:copy(leader.position),sentinel:false};
 if(leader.lastFieldPosition!==undefined)return {kind:'retained',position:copy(leader.lastFieldPosition),sentinel:false};
 const bound=stateBound(rules,tacticalState,leader,board);
 const active=bound&&tacticalState.boardVisible===true&&tacticalState.terminal===null&&tacticalState.settlement===null&&
  !tacticalState.gameOver&&(tacticalState.campaignState?.outcome===null||tacticalState.campaignState?.outcome===undefined)&&
  ['round_start','player','events','allied','enemy'].includes(tacticalState.phase)&&(tacticalState.scenario?.sceneMode&0xf000)===0x3000;
 if(active&&[0,15].includes(leader.slotIndex)&&leader.state15===1&&leader.position===null&&sourceHidden(rules,tacticalState,leader))
  return {kind:'source-proven-never-placed',position:{x:255,y:255},sentinel:true};
 return {kind:'unknown',position:null,sentinel:false};
}
