/** Original 5:1:7/r0/c0..14 entry. Structural validity is not a live transfer lease. */
import {source} from './engine/chapter5-baxi-source-constants.mjs';
import {applyAuthorizedCampaignEntityOperation} from './engine/campaign-available-entities.mjs';
import {disputeCurrentEntities,disputeTree,disputeUint,freezeDispute} from './game-qishan-dispute-preparation.mjs';
import {sameChapter5Baxi as same} from './engine/chapter5-baxi-source.mjs';
const clone=structuredClone,need=(v,m)=>{if(!v)throw new RangeError(m);},fixed=[0,17,44,45];
const flag=(c,n)=>!!(c.sceneFlagBytes[n>>3]&(128>>(n&7)));
export function applyChapter5BaxiEntryPrefix(campaign){
 disputeTree(campaign);disputeCurrentEntities(campaign);
 need(same(campaign.targetContext,{root:5,section:1,block:7})&&Array.isArray(campaign.sceneFlagBytes)&&campaign.sceneFlagBytes.length===32&&flag(campaign,190),'Exact set190 late map40 current entry');
 need(disputeCurrentEntities(campaign).some(e=>e.definitionIndex===17),'Actor17 must retain actual current history');
 let c=clone(campaign);
 // Native3A and39 are plain writes (F804/EADC), not promotion-item helpers.
 // Their order is retained even though derived combat stats are materialized later.
 const effects=[{definitionIndex:44,classIndex:0},{definitionIndex:45,classIndex:3},{definitionIndex:44,levelDelta:14},{definitionIndex:45,levelDelta:14},{definitionIndex:44,classIndex:1},{definitionIndex:45,classIndex:4},{definitionIndex:44,levelDelta:15},{definitionIndex:45,levelDelta:15},{definitionIndex:44,classIndex:2},{definitionIndex:45,classIndex:5},...[17,44,45].map(definitionIndex=>({definitionIndex,control:0}))];
 for(const [i,effect] of effects.entries()){
  c=applyAuthorizedCampaignEntityOperation(c,effect,{initializeMissing:()=>{
   need(i<2&&[44,45].includes(effect.definitionIndex)&&Object.hasOwn(effect,'classIndex'),'Only late Baxi first class writer may initialize');
   return source.sourceInitialEntityTemplateAdditions.find(e=>e.definitionIndex===effect.definitionIndex);
  }});
  // Keep any already existing source control ledger coherent with its known row.
  if(Object.hasOwn(effect,'control')&&c.sourceSparseEntityControls){const row=c.sourceSparseEntityControls.entries.find(e=>e.definitionIndex===effect.definitionIndex);if(row)row.control=effect.control;}
 }
 return freezeDispute(c);
}
export function makeChapter5BaxiPreparation(campaign,block=7,{prePrefixCampaign=null}={}){
 need(block===7&&same(campaign.targetContext,{root:5,section:1,block:7})&&flag(campaign,190),'Exact late map40 preparation');
 if(prePrefixCampaign!==null)need(same(applyChapter5BaxiEntryPrefix(prePrefixCampaign),campaign),'Exact once-only source prefix result');
 const all=disputeCurrentEntities(campaign),eligible=e=>[0,6].includes(e.entityControlClass);
 need(fixed.every(id=>all.some(e=>e.definitionIndex===id&&eligible(e))),'Four actual available late map40 fixed actors');
 const p=source.profiles[0],rows=p.friendlyDeployment.rows.map(r=>[r.row_index,r.definition,r.x,r.y,r.allocation_selector,Number(r.condition_enabled),r.condition_flag,r.direction_source,Number(r.hidden)]),optional=all.filter(e=>eligible(e)&&!fixed.includes(e.definitionIndex)).sort((a,b)=>a.definitionIndex-b.definitionIndex).slice(0,128),descriptors=Array(45).fill(null);let i=0;
 for(const r of rows)if(r[1]!==65535){need(r[4]===1&&r[5]===0,'Fixed unconditional late Baxi descriptor');descriptors[i]={descriptorIndex:i,sourceRow:r[0],definitionIndex:r[1],sourceX:r[2],sourceY:r[3],directionSource:r[7],hidden:r[8]===1};i++;}
 need(i===12&&descriptors.filter(d=>d?.definitionIndex===1024).length===8,'Exact four fixed and eight optional descriptors');
 return freezeDispute({block,sourceConstructorCursor:[5,1,7,0,13],sourceSelectionCursor:[5,1,7,0,14],entryCampaign:clone(campaign),prePrefixCampaign:prePrefixCampaign===null?null:clone(prePrefixCampaign),header:clone(p.friendlyDeployment.header_bytes),sourceRows:rows,resetDescriptorCount:45,fixedDefinitions:[...fixed],requiredDefinitions:[...fixed],optionalDefinitions:optional.map(e=>e.definitionIndex),optionalEntities:clone(optional),capacity:8,maxParticipants:12,selectionSlots:Array(8).fill(null),confirmed:false,descriptorProjection:descriptors});
}
export function toggleChapter5BaxiPreparation(spec,id){need(!spec.confirmed&&spec.block===7&&disputeUint(id,511)&&spec.optionalDefinitions.includes(id),'Current optional late Baxi actor only');const out={...spec,selectionSlots:[...spec.selectionSlots]},at=out.selectionSlots.indexOf(id);if(at>=0)out.selectionSlots[at]=null;else{const empty=out.selectionSlots.indexOf(null);need(empty>=0,'Original eight optional slots');out.selectionSlots[empty]=id;}return freezeDispute(out);}
export function confirmChapter5BaxiPreparation(spec){need(!spec.confirmed&&spec.block===7,'Explicit one-use late Baxi selection');const remaining=spec.selectionSlots.filter(x=>x!==null);need(remaining.length<=8&&new Set(remaining).size===remaining.length&&remaining.every(x=>spec.optionalDefinitions.includes(x)),'Exact selected late Baxi IDs');const descriptorProjection=spec.descriptorProjection.map(d=>d===null?null:{...d,definitionIndex:d.definitionIndex===1024?(remaining.shift()??65535):d.definitionIndex});need(!remaining.length,'Consumed late Baxi selection');return freezeDispute({...spec,confirmed:true,descriptorProjection});}
export function validateChapter5BaxiPreparation(preparation,campaign,contextId='5:1:7'){
 disputeTree(preparation);disputeTree(campaign);need(contextId==='5:1:7'&&preparation.block===7,'Exact late Baxi source preparation context');
 need(preparation.prePrefixCampaign!==null&&typeof preparation.prePrefixCampaign==='object','Retained once-only late Baxi pre-prefix campaign');
 const base=makeChapter5BaxiPreparation(preparation.entryCampaign,7,{prePrefixCampaign:preparation.prePrefixCampaign});need(Array.isArray(preparation.selectionSlots)&&preparation.selectionSlots.length===8,'Exact positional eight slots');const slots=preparation.selectionSlots;need(slots.every(x=>x===null||base.optionalDefinitions.includes(x))&&new Set(slots.filter(x=>x!==null)).size===slots.filter(x=>x!==null).length,'Unique eligible late Baxi selection');
 const expected=confirmChapter5BaxiPreparation(freezeDispute({...base,selectionSlots:clone(slots)}));need(same(preparation,expected)&&same(campaign,preparation.entryCampaign),'Exact unchanged confirmed late Baxi campaign');return true;
}
/** Owned immutable, effect-free roster view after the thirteen ordered original writes. */
export function createChapter5BaxiSourceModel(){
 const models=new WeakSet(),views=new WeakMap(),carries=new WeakMap();
 const get=m=>{need(models.has(m),'Issued late Baxi preparation model');return m;},issue=m=>{freezeDispute(m);models.add(m);return {model:m,intents:[]};};
 function fresh(entry){disputeTree(entry);const {carry,sourceView}=entry;need(carry?.version==='chapter5-kongming-return-carry/1'&&carry.nativeManualMarker===0&&sourceView?.stage==='held-before-battle'&&same(sourceView.sourceCursor,[5,1,7,0,0])&&same(carry.sourceCursor,sourceView.sourceCursor),'Exact current Kongming return frontier');const campaign=applyChapter5BaxiEntryPrefix(carry.campaign),preparation=makeChapter5BaxiPreparation(campaign,7,{prePrefixCampaign:carry.campaign});return issue({entryReturn:clone(entry),campaign,preparation,sourceCursor:[5,1,7,0,14],stage:'preparation'});}
 function reduce(model,action){const prior=get(model);need(prior.stage==='preparation'&&action?.type==='choose'&&typeof action.arg==='string','Explicit current late Baxi roster choice');const s=clone(prior);if(action.arg==='confirm'){s.preparation=confirmChapter5BaxiPreparation(s.preparation);s.stage='held-pre-enemy';s.sourceCursor=[5,1,7,0,15];}else{const id=Number(action.arg.slice(7));need(action.arg===`member:${id}`,'Exact roster member');s.preparation=toggleChapter5BaxiPreparation(s.preparation,id);}return issue(s);}
 function view(model){const s=get(model);if(!views.has(s)){const p=s.preparation;views.set(s,freezeDispute({kind:'chapter-story',chapterId:'chapter5-baxi-source',chapterMode:'chapter5-baxi-source',stage:s.stage,coreStage:s.stage,sourceCursor:[...s.sourceCursor],menuOptions:s.stage==='preparation'?[...p.optionalEntities.map(e=>({id:`member:${e.definitionIndex}`,definitionIndex:e.definitionIndex,labelJa:e.nameJa,selected:p.selectionSlots.includes(e.definitionIndex),enabled:p.selectionSlots.includes(e.definitionIndex)||p.selectionSlots.includes(null)})),{id:'confirm',labelJa:'出陣',enabled:true}]:[],preparation:{...clone(p),selectedSlots:[...p.selectionSlots]},canAdvance:false,canBack:false,canOpenMenu:false,canChangeSettings:false,hasNewSavePoint:false,textJa:s.stage==='preparation'?'巴西の戦いに出陣する武将を選んでください。':'巴西の戦いの出陣準備が整いました。',releaseNoticeZhHant:null}));}return views.get(s);}
 function carry(model){const s=get(model);if(!carries.has(s))carries.set(s,freezeDispute({version:'chapter5-baxi-source-carry/1',entryReturn:clone(s.entryReturn),campaign:clone(s.campaign),preparation:clone(s.preparation),nativeManualMarker:0,sourceCursor:[...s.sourceCursor]}));return carries.get(s);}
 function inspectBattleFrontier(model){const s=get(model);need(s.stage==='held-pre-enemy'&&same(s.sourceCursor,[5,1,7,0,15]),'Exact before-enemy late Baxi frontier');validateChapter5BaxiPreparation(s.preparation,s.campaign);return freezeDispute({carry:carry(s),sourceCursor:{root:5,section:1,block:7,record:0,commandIndex:15}});}
 return Object.freeze({fresh,reduce,view,carry,ownsModel:m=>models.has(m),inspectBattleFrontier});
}
