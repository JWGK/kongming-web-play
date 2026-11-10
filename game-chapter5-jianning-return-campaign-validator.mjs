import {disputeTree as tree} from './game-qishan-dispute-preparation.mjs';
import {validateChapter5JianningIdentity} from './engine/chapter5-jianning-source.mjs';
import {validateChapter5JianningRouteControlEvidence} from './game-chapter5-jianning-route-validator.mjs';
import {readCampaignRecordBits} from './engine/campaign-records.mjs';
import {validateMeichengGarrisonControls} from './engine/meicheng-garrison-controls.mjs';
/** Current-state semantic admission only. No battle/history authenticity claim. */
import {validateCampaignRecords} from './engine/campaign-records.mjs';
import {validateFengmingSparseControls} from './engine/fengming-prelude.mjs';
import {normalizePersistentParty} from './engine/campaign-persistence.mjs';
import {validateEntityOverrides} from './engine/campaign-entities.mjs';
import {partitionKnownCampaignEntities} from './engine/campaign-available-entities.mjs';
const validators=new WeakSet();
export const isChapter5JianningReturnCampaignValidator=v=>validators.has(v);
const PROFILE=Object.freeze({sourceBlocks:Object.freeze([3,4]),targetContexts:Object.freeze([[5,1,5]].map(Object.freeze)),garrison:true,reference:Object.freeze({battleSave:'chapter5-jianning-return-manual/1',sourceAnchorRef:'chapter5-jianning-return-manual/1'})});
export const JIANNING_RETURN_MANUAL_REFERENCE=PROFILE.reference;
const need=(v,m)=>{if(!v)throw new RangeError(m);},same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(o,ks)=>need(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join(',')===ks.split(',').sort().join(','),'Exact aftermath fields: '+ks);
const uint=(v,n)=>need(Number.isInteger(v)&&v>=0&&v<=n,'Snapshot integer range');
const str=(v,n=128)=>need(typeof v==='string'&&v.length<=n,'Bounded snapshot string');
const list=(a,n)=>need(Array.isArray(a)&&a.length<=n,'Bounded snapshot array');
const bytes=(a,n)=>{need(Array.isArray(a)&&a.length===n,'Snapshot byte array');a.forEach(v=>uint(v,255));};
const context=(c,blocks)=>{exact(c,'root,section,block');need(c.root===5&&c.section===1&&blocks.includes(c.block),'Exact current aftermath source context');};
function actor(r){exact(r,'definitionIndex,nameJa,classIndex,level,experience,lastLearnedStrategyMarker,entityControlClass,itemSlots,baseFields');uint(r.definitionIndex,511);str(r.nameJa,32);uint(r.classIndex,42);uint(r.level,99);need(r.level>0,'Positive actor level');uint(r.experience,99);uint(r.lastLearnedStrategyMarker,255);uint(r.entityControlClass,31);bytes(r.itemSlots,13);exact(r.baseFields,'武力,統率力,知力');Object.values(r.baseFields).forEach(x=>uint(x,255));}
function validatePersistent(p){exact(p,'currency,party,itemInstances,warehouseCounts,discoveryBytes,cityAvailabilityBytes');uint(p.currency,50000);list(p.party,512);need(p.party.length>0,'Known party');const ids=new Set();for(const r of p.party){actor(r);need(!ids.has(r.definitionIndex),'Unique party actor');ids.add(r.definitionIndex);}need(p.itemInstances?.length===255,'All mutable item slots');p.itemInstances.forEach((r,i)=>{exact(r,'slotId,definitionId,bytes');need(r.slotId===i,'Ordered mutable item slot');uint(r.definitionId,255);bytes(r.bytes,4);need(r.bytes[0]===r.definitionId,'Mutable item mapping');});bytes(p.warehouseCounts,255);bytes(p.discoveryBytes,32);bytes(p.cityAvailabilityBytes,8);return p;}
function validateCurrentShape(c,profile){exact(c,'sourceCampaignByte33,sourceCampaignWord16,version,kind,sourceContext,targetContext,provenance,initialSeed,rngState,lifespan,sceneFlagBytes,decisions,persistentState,campaignEntityOverrides,records,unlockedRecords,nativeRecordState'+(Object.hasOwn(c,'sourceSparseEntityControls')?',sourceSparseEntityControls':'')+(profile.garrison&&Object.hasOwn(c,'sourceMeichengGarrisonControls')?',sourceMeichengGarrisonControls':'')+(Object.hasOwn(c,'sourceJianningRouteControls')?',sourceJianningRouteControls':''));need(c.version===1&&c.kind==='campaign-story-continuation-carry','Carry schema');context(c.sourceContext,profile.sourceBlocks);if(profile.targetContexts){exact(c.targetContext,'root,section,block');need(profile.targetContexts.some(t=>same(t,[c.targetContext.root,c.targetContext.section,c.targetContext.block])),'Exact cross-section current target');}else context(c.targetContext,profile.targetBlocks);if(profile.reference)need(same(c.provenance,profile.reference),'New explicit snapshot reference');else {exact(c.provenance,'battleSave,sourceAnchorRef');str(c.provenance.battleSave);str(c.provenance.sourceAnchorRef);}for(const k of ['initialSeed','rngState'])uint(c[k],0xffffffff);if(c.lifespan!==null)uint(c.lifespan,profile.reference?65535:0xffffffff);if(c.sourceCampaignByte33!==null)uint(c.sourceCampaignByte33,255);if(c.sourceCampaignWord16!==null)uint(c.sourceCampaignWord16,65535);bytes(c.sceneFlagBytes,32);validatePersistent(c.persistentState);
 exact(c.campaignEntityOverrides,'version,unobserved,entries,origins');const e=c.campaignEntityOverrides;need(e.version===2&&e.unobserved==='unknown','Sparse legacy unknown coverage');list(e.entries,512);need(e.origins&&typeof e.origins==='object'&&!Array.isArray(e.origins),'Sparse origin coverage');need(Object.keys(e.origins).sort().join(',')===e.entries.map(r=>String(r.definitionIndex)).sort().join(','),'Exact known row origins');let prev=-1;for(const r of e.entries){actor(r);need(r.definitionIndex>prev&&!c.persistentState.party.some(p=>p.definitionIndex===r.definitionIndex),'Ordered disjoint sparse actors');prev=r.definitionIndex;need(['source-initial-supported-prefix','observed-prior-battle','observed-current-battle'].includes(e.origins[r.definitionIndex]),'Known row source label');}
 list(c.decisions,64);for(const d of c.decisions){exact(d,'choiceId,optionId,optionIndex,setFlag');str(d.choiceId);str(d.optionId);uint(d.optionIndex,255);uint(d.setFlag,255);}
 list(c.records,256);for(const r of c.records){exact(r,Object.hasOwn(r,'zhugeLevel')?'recordId,zhugeLevel,elapsedNative,elapsedNativeRestored':'recordId,elapsedNative,elapsedNativeRestored');uint(r.recordId,255);if(Object.hasOwn(r,'zhugeLevel')){uint(r.zhugeLevel,99);need(r.zhugeLevel>0,'Record level');}if(r.elapsedNative!==null)uint(r.elapsedNative,0xffffffff);need(typeof r.elapsedNativeRestored==='boolean','Record knownness');}list(c.unlockedRecords,256);c.unlockedRecords.forEach(x=>uint(x,255));need(new Set(c.unlockedRecords).size===c.unlockedRecords.length,'Unique unlocks');
 const n=c.nativeRecordState;exact(n,'version,unlockSlots,completion,knownBits,provenance');exact(n.knownBits,'unlockSlots,completion');list(n.provenance,16);n.provenance.forEach(s=>str(s));for(const p of ['unlockSlots','completion'])for(const x of Object.values(n.knownBits[p]))exact(x,'value,mask');validateCampaignRecords(n);validateObservedRecordConsistency(c);if(profile.garrison&&Object.hasOwn(c,'sourceMeichengGarrisonControls'))validateMeichengGarrisonControls(c.sourceMeichengGarrisonControls,c);if(Object.hasOwn(c,'sourceSparseEntityControls')){validateFengmingSparseControls(c.sourceSparseEntityControls);for(const r of c.sourceSparseEntityControls.entries){const known=[...c.persistentState.party,...e.entries].find(x=>x.definitionIndex===r.definitionIndex);need(!known||known.entityControlClass===r.control,'Sparse control known-row binding');}}return c;
}

/** Browser observations are partial history, while native bits are partial knowledge.
 * Completion writers append history and add browser IDs together. Native unlockSlots
 * are a DIFFERENT pool: never infer their state from these browser IDs. */
function validateObservedRecordConsistency(c){
 const ids=new Set(c.unlockedRecords),native=c.nativeRecordState;
 for(const row of c.records)need(ids.has(row.recordId),'Observed completion must retain its browser record ID');
 for(const id of ids){const at=id>>3,bit=1<<(id&7),value=native.completion[at],partial=native.knownBits.completion[at];
  const mask=value===null?(partial?.mask??0):255,knownValue=value===null?(partial?.value??0):value;
  need(!(mask&bit)||!!(knownValue&bit),'Observed completion contradicts known-clear native record');
 }
 // Unknown native bits, native-only completions and duplicate history rows are
 // intentional: neither ledger claims a complete historical reconstruction.
}
/** validationData must come from the captured current Wugong configuration. */
export function createChapter5JianningReturnCampaignValidator({validationData,createEntityData}={}){
 need(typeof createEntityData==='function'||validationData?.statsRules&&Array.isArray(validationData.entityTemplates)&&Array.isArray(validationData.movementProfiles),'Captured Wugong semantic rules required');
 const fixed=validationData?structuredClone(validationData):null;
 const validate=function(c,{saveCursor,contextId,phase='manual'}={}){
  tree(c);validateChapter5JianningIdentity(contextId,contextId==='5:1:3'?'east-west':'north-fire');
  need(['manual','current','entry'].includes(phase),'Exact Jianning validation phase');
  const block=Number(contextId.at(-1)),profile={...PROFILE,sourceBlocks:phase==='entry'?[2]:[block],targetContexts:phase==='entry'?[[5,1,block]]:[[5,1,5]],reference:phase==='manual'?PROFILE.reference:null};
  need(same(saveCursor,[5,1,5,0,13]),'Exact Jianning first manual site');
  validateCurrentShape(c,profile);
  need(!(c.sceneFlagBytes[190>>3]&(128>>(190&7)))&&!(c.sceneFlagBytes[139>>3]&(128>>(139&7)))&&!!(c.sceneFlagBytes[203>>3]&(128>>(203&7))),'Released pre-allegiance Jianning route flags');
  validateChapter5JianningRouteControlEvidence(c);
  const known=[...c.persistentState.party,...c.campaignEntityOverrides.entries],emperor=known.find(r=>r.definitionIndex===23);
  need(emperor?emperor.entityControlClass===9:!!c.sourceJianningRouteControls,'Source Liu Shan control9 known row or exact sparse evidence');
  for(const id of [182,187,188])need(known.find(r=>r.definitionIndex===id)?.entityControlClass===3,'Pre-allegiance source enemy control retained '+id);
  need(c.sourceCampaignWord16===6,'Retained six-garrison counter');
  need(same(c.persistentState.cityAvailabilityBytes,[1,48,0,0,16,0,0,0]),'Source council city mask retained');
  for(const id of (phase==='entry'?[15,64,131,188]:[15,64,131,188,65,132]))need(c.unlockedRecords.includes(id)&&c.records.some(r=>r.recordId===id)&&readCampaignRecordBits(c.nativeRecordState,'completion',id>>3,1<<(id&7))===true,'Retained known original record '+id);
  if(phase!=='entry')need(c.records.at(-1)?.recordId===132&&c.records.findLastIndex(r=>r.recordId===65)<c.records.length-1,'Latest source record132 follows opening65');
  const data=createEntityData?createEntityData(c.persistentState):fixed;need(data?.statsRules&&Array.isArray(data.entityTemplates)&&Array.isArray(data.movementProfiles),'Synchronous captured aftermath entity data');const names=new Map(data.entityTemplates.map(row=>[row.definitionIndex,row.nameJa]));
  const current={...data,playerDefinitionPool:c.persistentState.party.map(row=>row.definitionIndex),ownedDefinitionPool:c.persistentState.party.map(row=>row.definitionIndex)};
  need(same(normalizePersistentParty(c.persistentState,current),c.persistentState),'Exact aftermath current party resources');
  validateEntityOverrides(c.campaignEntityOverrides,c.persistentState,current);
  for(const row of [...c.persistentState.party,...c.campaignEntityOverrides.entries])need(names.get(row.definitionIndex)===row.nameJa,'Known aftermath actor identity');
  const partition=partitionKnownCampaignEntities(c.persistentState,c.campaignEntityOverrides);
  need(same(partition.persistentState,c.persistentState)&&same(partition.campaignEntityOverrides,c.campaignEntityOverrides),'Exact aftermath known availability partition');
  return true;
 };
 validators.add(validate);return Object.freeze(validate);
}
