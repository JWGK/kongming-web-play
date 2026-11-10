/** Structural source validation. Only the owning session authenticates current traversal. */
import {source,statsDelta} from './chapter5-jianning-source-constants.mjs';
import {disputeTree} from '../game-qishan-dispute-preparation.mjs';
const clone=structuredClone,need=(v,m)=>{if(!v)throw new TypeError(m);};
const stable=x=>x&&typeof x==='object'?(Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]))):x;
export const sameChapter5Jianning=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const same=sameChapter5Jianning;
export const CHAPTER5_JIANNING_CONTEXTS=Object.freeze(['5:1:3','5:1:4']);
export const CHAPTER5_JIANNING_RULES_VERSION='chapter5-jianning-engine-1';
export const isChapter5JianningContext=id=>CHAPTER5_JIANNING_CONTEXTS.includes(id);
const pin=id=>{need(isChapter5JianningContext(id),'Exact Jianning context required');return source.profiles.find(p=>p.contextId===id);};
export const chapter5JianningProfile=id=>clone(pin(id));
export function validateChapter5JianningIdentity(contextId,profileId){need(pin(contextId).profileId===profileId,'Jianning context and tactical profile must agree');return true;}
export function validateChapter5JianningProfile(p){disputeTree(p);need(same(p,pin(p.contextId)),'Exact Jianning source profile');return p;}
export function validateChapter5JianningBoard(board,mapIndex=44){disputeTree(board);need(mapIndex===44&&same(board,source.profiles[0].board),'Exact Jianning map44 terrain');return true;}
export function validateChapter5JianningAdditions(value){disputeTree(value);need(same(value,source.sourceInitialEntityTemplateAdditions),'Exact source enemy recipes, never friendly history');return true;}
export function validateChapter5JianningStatsDelta(value){disputeTree(value);need(same(value,statsDelta),'Exact Jianning item definitions');return true;}
export function chapter5JianningSourceCursors(id){const p=pin(id);return clone({friendlyConstructorSourceCursor:p.friendlyConstructorSourceCursor,preparationSourceCursor:p.preparationSourceCursor,enemyConstructorSourceCursor:p.enemyConstructorSourceCursor});}
export function validateChapter5JianningRuntimeData(data){
 disputeTree(data);const n=data.nextBattleContext,p=pin(n?.contextId);
 need(data.rulesVersion===CHAPTER5_JIANNING_RULES_VERSION&&n.profileId===p.profileId&&n.mapIndex===44&&data.variant?.id===p.contextId&&data.variant.profileId===p.profileId&&data.variant.scenarioBlock===p.block,'Pinned Jianning battle identity, never map or mutable flag0');
 validateChapter5JianningBoard(data.board);need(same(data.scenario,p.scenario),'Exact Jianning scenario');
 for(const[k,v]of Object.entries(chapter5JianningSourceCursors(p.contextId)))need(same(n[k],v),'Exact Jianning constructor cursor');
 need(same(n.header,p.friendlyDeployment)&&same(data.variant.friendlyRows,p.friendlyDeployment.rows.filter(r=>r.definition!==65535))&&same(data.variant.enemyRows,p.enemyDeployment.rows.filter(r=>r.definition!==65535))&&n.activeGroupStart===2&&same(n.reviewedDuels,p.reviewedDuels),'Exact Jianning source constructors/events/duels');return true;
}
export function validateChapter5JianningEffect(id,record,command,effect){disputeTree(effect);const c=pin(id).scenario.scripts[record]?.commands[command];need(c&&c.opcode===effect.opcode&&same(c.decoded,effect.arguments),'Unreviewed Jianning source effect');return true;}
/** A receipt template is not evidence of traversal. The VM must consume its actual tail. */
export function chapter5JianningCompletionReceipt(id,kind){
 const p=pin(id),tail=source.settlement[p.profileId==='east-west'?'eastWest':'northFire'],expected=p.block===3?'next-block-consumed':'terminal-ff-consumed';
 need(kind===undefined||kind===expected,'Exact Jianning branch terminal kind');
 return {sourceCursor:{root:5,section:1,block:p.block,record:tail.record,commandIndex:6},pendingNextContext:{root:5,section:1,block:5},kind:expected,narrativeOutcome:'chapter5-jianning-victory',strategyBlock:p.block,profileId:p.profileId,contextId:p.contextId,consumedTail:clone(tail.lastRequired),unexecutedTrailingFF:p.block===3?[5,1,3,11,6]:null};
}
export function isChapter5JianningCompletionCursor(id,vm){
 const p=pin(id),r=chapter5JianningCompletionReceipt(id);
 return vm?.status==='complete'&&vm.sceneMode===0x1000&&vm.returnCode===0&&vm.transition?.kind===(p.block===3?'set_block':'next_block')&&vm.transition.blockIndex===5&&vm.recordIndex===r.sourceCursor.record&&vm.commandIndex===6;
}
export function chapter5JianningConsumedCompletion(id,vm){need(isChapter5JianningCompletionCursor(id,vm),'Actual Jianning terminal tail must be consumed');return chapter5JianningCompletionReceipt(id);}
export function validateChapter5JianningDrainedState(state,id){
 const p=pin(id);disputeTree(state);
 need(state.rulesVersion===CHAPTER5_JIANNING_RULES_VERSION&&state.campaignContextId===p.contextId&&state.scenarioBlock===p.block&&state.phase==='settled'&&state.terminal==='victory'&&state.settlement?.outcome==='victory'&&Array.isArray(state.pendingEffects)&&state.pendingEffects.length===0&&Array.isArray(state.tasks)&&state.tasks.length===0&&state.scenario?.vm===null&&same(state.sourceBattleExit,chapter5JianningCompletionReceipt(id)),'Drained native Jianning state with exact branch receipt');return clone(state.sourceBattleExit);
}
export function chapter5JianningDialogueBinding(id,record,commandIndex){const p=pin(id),c=p.scenario.scripts[record]?.commands[commandIndex];need(c?.opcode===0,'Exact ordinary Jianning dialogue');return {contextId:id,record,commandIndex,sourceCommandOffset:c.romOffset,textReference:c.decoded.value_u16,siteKey:`rom:${c.romOffset.toString(16)}:dialogue`};}
export function chapter5JianningDialogueKeys(id){return pin(id).scenario.scripts.flatMap((s,r)=>s.commands.flatMap((c,k)=>c.opcode===0?[chapter5JianningDialogueBinding(id,r,k).siteKey]:[]));}
export function validateChapter5JianningCompletedDialogueEffects(value,id){disputeTree(value);const keys=chapter5JianningDialogueKeys(id);need(Array.isArray(value)&&same(value,keys.filter(k=>value.includes(k))),'Canonical finite Jianning dialogue effects');return value;}
