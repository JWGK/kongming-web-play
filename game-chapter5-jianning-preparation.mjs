/** c8 always defines east/west; flag0 conditionally replaces with c10, then one c11.
 * These pure data helpers do not grant current-route authority. The owner does. */
import {source} from './engine/chapter5-jianning-source-constants.mjs';
import {chapter5JianningProfile,validateChapter5JianningIdentity,sameChapter5Jianning as same} from './engine/chapter5-jianning-source.mjs';
import {disputeTree,disputeCurrentEntities,disputeUint,freezeDispute as freeze} from './game-qishan-dispute-preparation.mjs';
const clone=structuredClone,need=(v,m)=>{if(!v)throw new RangeError(m);};
const flag=(c,n)=>!!(c.sceneFlagBytes[n>>3]&(128>>(n&7)));
const eligible=e=>[0,6].includes(e.entityControlClass);
const cursor={root:5,section:1,block:2};
function validateEntry(campaign,id){
 disputeTree(campaign);const p=chapter5JianningProfile(id);
 need(same(campaign.targetContext,cursor)&&Array.isArray(campaign.sceneFlagBytes)&&campaign.sceneFlagBytes.length===32&&campaign.sceneFlagBytes.every(x=>disputeUint(x,255))&&!flag(campaign,190)&&flag(campaign,0)===p.routeFlag0BeforeBattle,'Current released route before Jianning constructors');
 return p;
}
export function makeChapter5JianningPreparation(campaign,contextId){
 const p=validateEntry(campaign,contextId),all=disputeCurrentEntities(campaign),fixed=p.block===3?[0,4]:[0],capacity=p.block===3?12:11;
 need(fixed.every(id=>all.some(e=>e.definitionIndex===id&&eligible(e))),'Every fixed Jianning actor must retain actual available history');
 need(!all.some(e=>e.definitionIndex===23&&e.entityControlClass!==9),'Known Liu Shan23 must retain source control9 before preparation');
 const optional=all.filter(e=>eligible(e)&&!fixed.includes(e.definitionIndex)).sort((a,b)=>a.definitionIndex-b.definitionIndex).slice(0,128);
 const projection=Array(45).fill(null);let n=0;
 for(const r of p.friendlyDeployment.rows)if(r.definition!==65535){need(r.allocation_selector===1&&!r.condition_enabled&&!r.hidden,'Visible unconditional Jianning descriptor');projection[n]={descriptorIndex:n,sourceRow:r.row_index,definitionIndex:r.definition,sourceX:r.x,sourceY:r.y,directionSource:r.direction_source,hidden:false};n++;}
 need(n===fixed.length+capacity,'Exact Jianning fixed plus optional descriptors');
 return freeze({version:'chapter5-jianning-preparation/1',profileId:p.profileId,contextId,block:p.block,entryCampaign:clone(campaign),sourceConstructorCursor:[5,1,2,8,p.block===3?8:10],sourceSelectionCursor:[5,1,2,8,11],constructorTrace:clone(source.preparationSequence.filter(x=>p.block===3?[8,9].includes(x.cursor[4]):[8,9,10].includes(x.cursor[4]))),header:clone(p.friendlyDeployment.header_bytes),sourceRows:clone(p.friendlyDeployment.rows),resetDescriptorCount:45,fixedDefinitions:fixed,requiredDefinitions:[...fixed],optionalDefinitions:optional.map(e=>e.definitionIndex),optionalEntities:clone(optional),capacity,maxParticipants:n,selectionSlots:Array(capacity).fill(null),confirmed:false,descriptorProjection:projection,selectionAndExitTrace:[]});
}
function withSlots(spec){
 disputeTree(spec);const base=makeChapter5JianningPreparation(spec.entryCampaign,spec.contextId),slots=spec.selectionSlots;
 need(spec.confirmed===false&&Array.isArray(slots)&&slots.length===base.capacity&&slots.every(x=>x===null||base.optionalDefinitions.includes(x))&&new Set(slots.filter(x=>x!==null)).size===slots.filter(x=>x!==null).length,'Unique current eligible Jianning choices');
 need(same(spec,{...base,selectionSlots:slots}),'Unchanged Jianning preparation source');return {...base,selectionSlots:clone(slots)};
}
export function toggleChapter5JianningPreparation(spec,id){const out=withSlots(spec);need(disputeUint(id,511)&&out.optionalDefinitions.includes(id),'Known optional Jianning actor only');const at=out.selectionSlots.indexOf(id);if(at>=0)out.selectionSlots[at]=null;else{const empty=out.selectionSlots.indexOf(null);need(empty>=0,'Original Jianning optional capacity');out.selectionSlots[empty]=id;}return freeze(out);}
export function confirmChapter5JianningPreparation(spec){
 const p=withSlots(spec),remaining=p.selectionSlots.filter(x=>x!==null),descriptorProjection=p.descriptorProjection.map(d=>d===null?null:{...d,definitionIndex:d.definitionIndex===1024?(remaining.shift()??65535):d.definitionIndex});
 need(!remaining.length,'All Jianning choices consumed once');
 return freeze({...p,confirmed:true,descriptorProjection,selectionAndExitTrace:clone(source.preparationSequence.filter(x=>[11,12,p.block===3?14:13].includes(x.cursor[4])))});
}
export function chapter5JianningPreparedCampaign(preparation){return freeze({...clone(preparation.entryCampaign),sourceContext:{...cursor},targetContext:{root:5,section:1,block:preparation.block}});}
export function validateChapter5JianningPreparation(preparation,campaign,contextId){
 disputeTree(preparation);disputeTree(campaign);validateChapter5JianningIdentity(contextId,preparation.profileId);need(preparation.contextId===contextId,'Preparation profile is fixed before battle flag reuse');
 const base=makeChapter5JianningPreparation(preparation.entryCampaign,contextId),expected=confirmChapter5JianningPreparation({...base,selectionSlots:clone(preparation.selectionSlots)});
 need(same(preparation,expected)&&same(campaign,chapter5JianningPreparedCampaign(expected)),'Exact unchanged once-confirmed Jianning preparation/campaign');return true;
}
export function createChapter5JianningPreparationSourceModel(){
 const models=new WeakSet(),views=new WeakMap(),carries=new WeakMap(),frontiers=new WeakMap();
 const get=m=>{need(models.has(m),'Issued Jianning preparation model');return m;},issue=m=>{freeze(m);models.add(m);return {model:m,intents:[]};};
 function fresh(entry){
  disputeTree(entry);const {carry,sourceView}=entry;
  need(carry?.version==='chapter5-jianning-route-carry/1'&&carry.nativeManualMarker===0&&sourceView?.stage==='held-before-preparation'&&same(carry.sourceCursor,[5,1,2,8,8])&&same(sourceView.sourceCursor,carry.sourceCursor),'Exact Jianning route frontier');
  validateChapter5JianningIdentity(carry.contextId,carry.profileId);
  const preparation=makeChapter5JianningPreparation(carry.campaign,carry.contextId);
  return issue({entryRoute:clone(entry),campaign:clone(carry.campaign),preparation,sourceCursor:[5,1,2,8,11],stage:'preparation'});
 }
 function reduce(model,action){const prior=get(model);need(prior.stage==='preparation'&&action?.type==='choose'&&typeof action.arg==='string','Current Jianning preparation choice only');const next=clone(prior);if(action.arg==='confirm'){next.preparation=confirmChapter5JianningPreparation(next.preparation);next.campaign=chapter5JianningPreparedCampaign(next.preparation);next.sourceCursor=[5,1,next.preparation.block,0,0];next.stage='held-pre-enemy';}else{const id=Number(action.arg.slice(7));need(action.arg===`member:${id}`,'Exact Jianning roster member');next.preparation=toggleChapter5JianningPreparation(next.preparation,id);}return issue(next);}
 function view(model){const m=get(model);if(!views.has(m)){const p=m.preparation;views.set(m,freeze({kind:'chapter-story',chapterId:'chapter5-jianning-source',chapterMode:'chapter5-jianning-source',stage:m.stage,coreStage:m.stage,profileId:p.profileId,contextId:p.contextId,sourceCursor:[...m.sourceCursor],menuOptions:m.stage==='preparation'?[...p.optionalEntities.map(e=>({id:`member:${e.definitionIndex}`,definitionIndex:e.definitionIndex,labelJa:e.nameJa,selected:p.selectionSlots.includes(e.definitionIndex),enabled:p.selectionSlots.includes(e.definitionIndex)||p.selectionSlots.includes(null)})),{id:'confirm',labelJa:'出陣',enabled:true}]:[],preparation:clone(p),canAdvance:false,canBack:false,canOpenMenu:false,canChangeSettings:true,hasNewSavePoint:false}));}return views.get(m);}
 function carry(model){const m=get(model);if(!carries.has(m))carries.set(m,freeze({version:'chapter5-jianning-source-carry/1',entryRoute:clone(m.entryRoute),campaign:clone(m.campaign),preparation:clone(m.preparation),profileId:m.preparation.profileId,contextId:m.preparation.contextId,nativeManualMarker:0,sourceCursor:[...m.sourceCursor]}));return carries.get(m);}
 function inspectBattleFrontier(model){const m=get(model);need(m.stage==='held-pre-enemy','Confirmed Jianning roster before enemy22 only');validateChapter5JianningPreparation(m.preparation,m.campaign,m.preparation.contextId);if(!frontiers.has(m))frontiers.set(m,freeze({carry:carry(m),sourceView:view(m),sourceCursor:{root:5,section:1,block:m.preparation.block,record:0,commandIndex:0}}));return frontiers.get(m);}
 return Object.freeze({fresh,reduce,view,carry,inspectBattleFrontier,ownsModel:m=>models.has(m)});
}
