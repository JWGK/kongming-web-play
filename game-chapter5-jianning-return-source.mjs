/** Exact drained Jianning block5 through its first 3D01, held BEFORE allegiance.
 * Structural carry/snapshot admission is never current-owner or persistence authority. */
import {readChapter5JianningReturnSourceConfiguration} from './game-chapter5-jianning-return-config.mjs';
import {JIANNING_RETURN_MANUAL_REFERENCE} from './game-chapter5-jianning-return-campaign-validator.mjs';
import {consumeChapter5JianningReturnPresentationReceipt} from './game-chapter5-jianning-return-presentation-compiler.mjs';
import {chapter5JianningProfile,validateChapter5JianningIdentity,chapter5JianningCompletionReceipt,validateChapter5JianningCompletedDialogueEffects,sameChapter5Jianning as same} from './engine/chapter5-jianning-source.mjs';
import {validateChapter5JianningPreparation} from './game-chapter5-jianning-preparation.mjs';
import {disputeTree as tree,disputeOwn as own,freezeDispute as freeze} from './game-qishan-dispute-preparation.mjs';
const sourceApis=new WeakSet();
export const isChapter5JianningReturnSourceApi=x=>sourceApis.has(x);
const clone=structuredClone,need=(v,m)=>{if(!v)throw new RangeError(m);};
const ID='chapter5-jianning-return',SAVE=Object.freeze([5,1,5,0,13]),HELD=Object.freeze([5,1,5,0,14]);
export const CHAPTER5_JIANNING_RETURN_MANUAL_SITE=SAVE;
export const CHAPTER5_JIANNING_RETURN_HELD_CURSOR=HELD;
/** Exact shape only. Only the live owning controller can establish drained completion. */
export function inspectChapter5JianningReturnEntryAdmission(c){
 tree(c);own(c,'version,entrySource,campaign,profileId,contextId,confirmedPreparation,completedDialogueEffects,sourceCursor,completion');
 validateChapter5JianningIdentity(c.contextId,c.profileId);const p=chapter5JianningProfile(c.contextId),e=c.entrySource;
 need(c.version==='chapter5-jianning-carry/1'&&same(c.sourceCursor,[5,1,5,0,0])&&e?.version==='chapter5-jianning-source-carry/1'&&e.nativeManualMarker===0&&e.contextId===c.contextId&&e.profileId===c.profileId&&same(e.sourceCursor,[5,1,p.block,0,0])&&same(c.confirmedPreparation,e.preparation),'Exact completed Jianning family and once-confirmed preparation');
 validateChapter5JianningPreparation(c.confirmedPreparation,e.campaign,c.contextId);
 need(same(c.completion,chapter5JianningCompletionReceipt(c.contextId)),'Exact profile-specific consumed tail, never scene11 alone');
 need(same(c.campaign.sourceContext,{root:5,section:1,block:p.block})&&same(c.campaign.targetContext,{root:5,section:1,block:5}),'Exact current postbattle context');
 validateChapter5JianningCompletedDialogueEffects(c.completedDialogueEffects,c.contextId);
 const required=[p.scenario.scripts[1],p.scenario.scripts.at(-1)].flatMap(s=>s.commands.filter(x=>x.opcode===0).map(x=>`rom:${x.romOffset.toString(16)}:dialogue`));
 need(required.every(k=>c.completedDialogueEffects.includes(k)),'Mandatory original opening and settlement dialogue effects completed');
 return freeze({allowed:true,route:ID,contextId:c.contextId,profileId:c.profileId});
}
export function createChapter5JianningReturnSourceModel({configuration}={}){
 const {data,locale,validateCampaign}=readChapter5JianningReturnSourceConfiguration(configuration),issued=new WeakSet(),views=new WeakMap(),carries=new WeakMap();
 const get=m=>{need(issued.has(m),'Current issued Jianning return model');return m;},issue=(m,intents=[])=>{freeze(m);issued.add(m);return freeze({model:m,intents});};
 function validateCurrent(c,contextId,phase='manual'){need(validateCampaign(c,{saveCursor:SAVE,contextId,phase})===true,'Complete strict Jianning current campaign');}
 function base(campaign,contextId,profileId){return {version:ID+'-source-model/1',entryReturn:null,contextId,profileId,campaign:clone(campaign),manualMarker:0,cursor:[5,1,5,0,0],groupBase:0,stage:'source-command',selection:null,serial:1,room:{currentCity:35,sceneMode:0x1000,bgmId:13,inputEnabled:false,actors:[],cityIconAccessMaskBytes:clone(campaign.persistentState.cityAvailabilityBytes),caption:null,darkenLevel:0,march:null},presentation:null,witness:{version:ID+'-fresh-sites/1',domainSize:8,siteIndices:[],semantics:'supported-message-and-spawn-invocations-only'}};}
 const manual=marker=>({mode:1,nativeGroupBase:0,sourceCursor:[...SAVE],nativeManualMarker:marker,capturesInterpreterContinuation:true,webMarkerNormalization:data.manual.webMarkerNormalization,nativeColdSaveCompatibilityClaim:false});
 function next(s){s.cursor[4]++;s.stage='source-command';s.presentation=null;s.selection=null;}
 function present(s,c,kind,room,details={}){s.stage='presentation';s.presentation={version:ID+'-presentation/1',id:`jianning-return:${s.serial++}:${s.cursor.join(':')}:${kind}`,kind,sourceCursor:[...s.cursor],sourceOffset:c.offset,opcode:c.opcode,beforeRoom:clone(s.room),afterRoom:clone(room),details:clone(details),displayProfile:'web-source-endpoint/1'};}
 function step(s,intents){
  if(same(s.cursor,HELD)){s.stage='held-after-manual';return;}
  need(same(s.cursor.slice(0,4),[5,1,5,0])&&s.cursor[4]>=0&&s.cursor[4]<=13,'No later allegiance or common12 commands');
  const c=data.commands[s.cursor[4]],a=c.argumentBytes;need(same(c.cursor,s.cursor),'Exact bounded source order');
  switch(c.opcode){
   case 0x17:need(s.cursor[4]===0&&same(a,[1]),'Original input disable');s.room.inputEnabled=false;next(s);return;
   case 0x2e:need(s.cursor[4]===1&&same(a,[35,0,0,0,255]),'Original Jianning city');s.room.currentCity=35;next(s);return;
   case 0x09:{need(s.cursor[4]===2&&same(a,[17,32]),'Original Jianning riverbank');const r=clone(s.room);Object.assign(r,{sceneMode:0x2011,actors:[],caption:null,march:null,darkenLevel:0});present(s,c,'scene',r,{sceneMode:0x2011});return;}
   case 0x0a:{const id=a[0]|a[1]<<8,r=clone(s.room),site=data.sites.findIndex(x=>same(x,[c.offset,-1,id]));need(site>=0&&!s.witness.siteIndices.includes(site)&&r.actors.length===site,'Exact ordered source room spawn');r.actors.push({slotIndex:site,definitionIndex:id,x:a[2],y:a[3],facing:a[4],poseSelector:a[5]});s.witness.siteIndices.push(site);intents.push({kind:'source-local-fresh-invocation',siteIndex:site,sourceCursor:[...s.cursor],sourceOffset:c.offset,opcode:c.opcode,messageIndex:-1,definitionIndex:id,witnessAdded:true,nativeKnowledgeMutationClaim:false,persistentRecruitmentChange:false});present(s,c,'spawn',r,{definitionIndex:id});return;}
   case 0x38:{need(s.cursor[4]===11&&same(a,[10]),'Original BGM10');const r=clone(s.room);r.bgmId=10;present(s,c,'bgm',r,{bgmId:10});return;}
   case 0x05:{need(s.cursor[4]===12&&a.length===0,'Original fade in');const r=clone(s.room);r.darkenLevel=0;present(s,c,'fade-in',r);return;}
   case 0x3d:need(same(s.cursor,SAVE)&&same(a,[1]),'Original manual mode1 only');if(s.manualMarker===1){s.manualMarker=0;next(s);intents.push({kind:'source-manual-marker-bypass',mode:1,sourceCursor:[...SAVE],nativeColdSaveCompatibilityClaim:false});}else{s.manualMarker=1;s.stage='manual-prompt';}return;
   default:throw new RangeError('Unadmitted Jianning aftermath opcode');
  }
 }
 function pump(s,intents){for(let i=0;i<20&&s.stage==='source-command';i++)step(s,intents);need(s.stage!=='source-command','Bounded return source pump');}
 function fresh(entry){inspectChapter5JianningReturnEntryAdmission(entry);validateCurrent(entry.entrySource.campaign,entry.contextId,'entry');validateCurrent(entry.campaign,entry.contextId,'current');
  for(const key of ['initialSeed','sourceCampaignByte33','sourceCampaignWord16','sourceJianningRouteControls','sourceMeichengGarrisonControls'])need(same(entry.campaign[key]??null,entry.entrySource.campaign[key]??null),'Retained actual Jianning source field '+key);
  const s=base(entry.campaign,entry.contextId,entry.profileId);s.entryReturn=clone(entry);const intents=[];pump(s,intents);return issue(s,intents);
 }
 function snapshot(s){return {version:ID+'-manual-source/1',contextId:s.contextId,profileId:s.profileId,campaign:clone(s.campaign),room:clone(s.room),sourceCursor:[...s.cursor],manual:manual(s.manualMarker),freshInvocationWitness:clone(s.witness)};}
 // Effect-free projection. No command replay, mutable actor writes, rewards or live ancestry.
 function project(campaign,contextId,profileId){const s=base(campaign,contextId,profileId);s.cursor=[...SAVE];s.room.sceneMode=0x2011;s.room.bgmId=10;for(const c of data.commands.filter(c=>c.opcode===10)){const a=c.argumentBytes;s.room.actors.push({slotIndex:s.room.actors.length,definitionIndex:a[0]|a[1]<<8,x:a[2],y:a[3],facing:a[4],poseSelector:a[5]});}s.witness.siteIndices=data.sites.map((_,i)=>i);s.stage='manual-prompt';s.manualMarker=1;return s;}
 function inspectManualSnapshot(value,{saveCursor}={}){need(same(saveCursor,SAVE),'Exact first Jianning manual site');tree(value);own(value,'version,contextId,profileId,campaign,room,sourceCursor,manual,freshInvocationWitness');need(value.version===ID+'-manual-source/1'&&same(value.sourceCursor,SAVE),'Exact flat Jianning manual source');validateChapter5JianningIdentity(value.contextId,value.profileId);validateCurrent(value.campaign,value.contextId);need(same(snapshot(project(value.campaign,value.contextId,value.profileId)),value),'Exact Jianning room, marker, cursor, mode, group and source witness');return true;}
 function exportManualSnapshot(model){const s=get(model);need(s.stage==='manual-prompt'&&s.manualMarker===1&&same(s.cursor,SAVE),'Settled original Jianning manual prompt');const value=snapshot(s);value.campaign.provenance=clone(JIANNING_RETURN_MANUAL_REFERENCE);if(value.campaign.lifespan!==null)value.campaign.lifespan&=65535;inspectManualSnapshot(value,{saveCursor:SAVE});return freeze(value);}
 function restoreManualSnapshot(value,{saveCursor}={}){inspectManualSnapshot(value,{saveCursor});const s=project(value.campaign,value.contextId,value.profileId),intents=[];s.stage='source-command';pump(s,intents);need(s.manualMarker===0&&same(s.cursor,HELD)&&s.entryReturn===null,'Cold web manual consumes only normalized marker');return issue(s,intents);}
 /** Integration-only after verified successful manual bank publication. No storage happens here. */
 function completeManualSave(model){const s=clone(get(model));need(s.stage==='manual-prompt'&&s.manualMarker===1&&same(s.cursor,SAVE),'Current Jianning original manual completion');s.manualMarker=0;next(s);const intents=[];pump(s,intents);return issue(s,intents);}
 function reduce(model,action){get(model);own(action,'type,arg');const s=clone(model),intents=[];
  if(action.type==='focus'){need(s.stage==='manual-prompt'&&['yes','no'].includes(action.arg),'Current explicit manual focus');s.selection=action.arg;return issue(s);}
  if(action.type==='completePresentation'){need(s.stage==='presentation','Current pending Jianning return presentation');consumeChapter5JianningReturnPresentationReceipt(action.arg,model.presentation,configuration);s.room=clone(model.presentation.afterRoom);next(s);}
  else if(action.type==='choose'||action.type==='confirm'){need(s.stage==='manual-prompt'&&action.arg==='no','Only explicit No; SaveYes needs successful reviewed bank integration');s.manualMarker=0;next(s);}
  else throw new RangeError('Unavailable Jianning return action');pump(s,intents);return issue(s,intents);
 }
 function view(model){const s=get(model);if(!views.has(s))views.set(s,freeze({kind:'chapter-story',chapterId:ID,chapterMode:ID,sourceOnly:true,stage:s.stage,coreStage:s.stage,profileId:s.profileId,contextId:s.contextId,selection:s.selection,sourceCursor:[...s.cursor],chapterHeadingJa:data.chapterHeadingJa,chapterHeadingZhHant:locale.bySource[data.chapterHeadingJa],titleJa:data.titleJa,titleZhHant:locale.bySource[data.titleJa],dialogue:null,textJa:s.stage==='held-after-manual'?locale.held:null,runs:null,menuOptions:s.stage==='manual-prompt'?[{id:'yes',labelJa:data.system.yes,labelZhHant:locale.bySource[data.system.yes],enabled:true},{id:'no',labelJa:data.system.no,labelZhHant:locale.bySource[data.system.no],enabled:true}]:[],preparation:null,room:s.room,presentation:s.presentation,settledFrame:{room:s.room},canAdvance:false,canBack:false,canOpenMenu:false,canChangeSettings:s.stage!=='presentation',hasNewSavePoint:s.stage==='manual-prompt',nativeManualMarker:s.manualMarker,manual:s.stage==='manual-prompt'?manual(s.manualMarker):null,freshInvocationWitness:s.witness,systemText:s.stage==='manual-prompt'?{textJa:data.system.manual,textZhHant:locale.bySource[data.system.manual]}:null,releaseNoticeZhHant:locale.notice}));return views.get(s);}
 function carry(model){const s=get(model);if(!carries.has(s))carries.set(s,freeze({version:ID+'-carry/1',entryReturn:s.entryReturn,profileId:s.profileId,contextId:s.contextId,campaign:s.campaign,nativeManualMarker:s.manualMarker,freshInvocationWitness:s.witness,sourceCursor:[...s.cursor]}));return carries.get(s);}
 const api=Object.freeze({fresh,reduce,view,carry,ownsModel:m=>issued.has(m),inspectEntryAdmission:inspectChapter5JianningReturnEntryAdmission,inspectManualSnapshot,exportManualSnapshot,restoreManualSnapshot,completeManualSave,inspectionConfigurationIdentity:()=>configuration});sourceApis.add(api);return api;
}
