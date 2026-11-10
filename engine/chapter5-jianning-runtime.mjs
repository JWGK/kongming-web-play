/** Native runtime-only validation, keeping the frozen source/preparation contract unchanged. */
import {source} from './chapter5-jianning-source-constants.mjs';
import {chapter5JianningProfile,chapter5JianningDialogueBinding,chapter5JianningDialogueKeys,validateChapter5JianningCompletedDialogueEffects,sameChapter5Jianning as same} from './chapter5-jianning-source.mjs';
import {validateChapter5BaxiRules,isChapter5BaxiRemovalQuote} from './chapter5-baxi-source.mjs';
const need=(v,m)=>{if(!v)throw new TypeError(m);};
export const validateChapter5JianningRules=validateChapter5BaxiRules;
export function validateChapter5JianningDynamicBoard(board,effects,contextId){
 const profile=chapter5JianningProfile(contextId),base=profile.board;
 need(board?.width===30&&board.height===24&&Array.isArray(effects),'Exact Jianning geometry and terrain ledger');
 const ordered=contextId==='5:1:4'?source.northFire.placements.map(c=>c.argumentBytes[0]+30*c.argumentBytes[1]):[],cells=new Set(ordered),seen=new Set(),terrain=[...base.terrain];let last=-1;
 for(const e of effects){const i=e.x+30*e.y;need(cells.has(i)&&ordered.indexOf(i)>last&&!seen.has(i)&&e.kind===0&&e.oldTerrain===base.terrain[i],'Exact Jianning source fire cell/order');last=ordered.indexOf(i);seen.add(i);terrain[i]=21;}
 need(same(board.terrain,terrain),'Jianning terrain must match original plus actual fire ledger');return true;
}
export function validateChapter5JianningDialogueEffect(e,s,id){
 need(e?.type==='dialogue'&&s.scenario?.vm,'Current Jianning dialogue head');const b=e.sourceDialogueBinding,v=s.scenario.vm;
 need(b&&b.contextId===id&&b.record===v.recordIndex&&b.commandIndex+1===v.commandIndex&&same(b,chapter5JianningDialogueBinding(id,b.record,b.commandIndex))&&e.value_u16===b.textReference,'Exact consumed Jianning source dialogue');return b;
}
export function acknowledgeChapter5JianningDialogueEffect(s,e,id){const b=validateChapter5JianningDialogueEffect(e,s,id);validateChapter5JianningCompletedDialogueEffects(s.completedDialogueEffects,id);return chapter5JianningDialogueKeys(id).filter(k=>k===b.siteKey||s.completedDialogueEffects.includes(k));}
export const isChapter5JianningRemovalQuote=isChapter5BaxiRemovalQuote;
/** ROM49C58: cue8 on old counter%4=0, then byte increment. Null is deliberately
 * unknown: the predecessor carry does not capture the native global0203382C. */
export function advanceChapter5JianningFireCounter(counter){
 need(counter===null||Number.isInteger(counter)&&counter>=0&&counter<=255,'Native fire byte or explicit unknown');
 return counter===null?{counter:null,cueId:null,known:false}:{counter:(counter+1)&255,cueId:(counter&3)===0?8:null,known:true};
}

/** Native retry49628 clears only the terrain ledger, not global counter0203382C. */
export function resetChapter5JianningTerrainForRetry(counter){advanceChapter5JianningFireCounter(counter);return {sourceFireCounter:counter,terrainEffects:[],presentationRedFilter:false};}
