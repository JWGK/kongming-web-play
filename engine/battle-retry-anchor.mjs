/** Original opcode36 retry snapshot, not a savegame or whole-state rollback.
 * 172F0/F534(mode1) restore descriptor-scoped control/class/inventory only.
 * Caller owns descriptor reconstruction, fresh entry, healing and lifespan debit.
 * No I/O, RNG draws, implicit anchors, or recursive snapshot history.
 */
import {validateCampaignByte33,validateCampaignWord16} from './campaign-source-fields.mjs';
const clone=structuredClone;
function requireValue(ok,label){if(!ok)throw new TypeError(label);}
function integer(v,min,max,label){requireValue(Number.isSafeInteger(v)&&v>=min&&v<=max,label);return v;}
function dense(a,n,label){requireValue(Array.isArray(a)&&a.length===n&&Array.from({length:n},(_,i)=>Object.hasOwn(a,i)).every(Boolean),label);return a;}
function bytes(a,n,label){return dense(a,n,label).map(v=>integer(v,0,255,label));}
function exactKeys(o,keys,label){requireValue(o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k)),label);}
function identity(v,label){requireValue(typeof v==='string'&&v.length>0&&v.length<=160,label);return v;}
function campaignSnapshot(c){
 const out={currency:integer(c?.currency,0,0xffffffff,'Retry currency'),campaignLifespan:c.campaignLifespan===null?null:integer(c.campaignLifespan,0,0xffffffff,'Retry lifespan'),warehouseCounts:bytes(c.warehouseCounts,255,'Retry warehouse')};
 if(c.cityAvailabilityBytes!==undefined)out.cityAvailabilityBytes=bytes(c.cityAvailabilityBytes,8,'Retry city availability');
 if(c.sourceCampaignByte33!==undefined)out.sourceCampaignByte33=validateCampaignByte33(c.sourceCampaignByte33);
 if(c.sourceCampaignWord16!==undefined)out.sourceCampaignWord16=validateCampaignWord16(c.sourceCampaignWord16);
 return out;
}
function sceneSnapshot(s){
 requireValue(s&&typeof s==='object','Retry scene');
 const flags=dense(s.flags,256,'Retry flags').map(v=>{requireValue(typeof v==='boolean','Retry flag');return v;});
 requireValue(typeof s.retreatLocked==='boolean','Retry retreat lock');
 // Header death conditions are source data, not an execution continuation.
 exactKeys(s.deathConditions,['victoryEnabled','victoryDefinition','defeatEnabled','defeatDefinition'],'Retry death conditions');
 const deathConditions={};
 for(const side of ['victory','defeat']){requireValue(typeof s.deathConditions[side+'Enabled']==='boolean','Retry death condition gate');deathConditions[side+'Enabled']=s.deathConditions[side+'Enabled'];deathConditions[side+'Definition']=integer(s.deathConditions[side+'Definition'],0,65535,'Retry death definition');}
 return {flags,groupStart:integer(s.groupStart,0,65535,'Retry group'),sceneMode:integer(s.sceneMode,0,65535,'Retry scene mode'),deathConditions,retreatLocked:s.retreatLocked};
}
function deploymentSnapshot(d){
 requireValue(d&&Array.isArray(d.rows)&&d.rows.length<=45,'Retry deployment rows');
 const seen=new Set(),rows=d.rows.map(r=>{
  const slot_index=integer(r.slot_index,0,44,'Retry deployment slot');requireValue(!seen.has(slot_index),'Duplicate retry deployment slot');seen.add(slot_index);
  const row={definition_index:integer(r.definition_index,0,511,'Retry deployment definition'),slot_index,source_coordinate_bytes:bytes(r.source_coordinate_bytes,2,'Retry deployment coordinates')};
  if(r.orientation!==undefined)row.orientation=integer(r.orientation,0,1,'Retry deployment orientation');
  return row;
 });
 requireValue(Array.isArray(d.selection)&&d.selection.length<=15,'Retry deployment selection');dense(d.selection,d.selection.length,'Retry deployment selection');
 const selection=d.selection.map(v=>v===null?null:integer(v,0,511,'Retry deployment selection'));
 requireValue(typeof d.confirmed==='boolean','Retry deployment confirmation');
 return {rows,selection,confirmed:d.confirmed};
}
function entitySnapshot(e){return {definitionIndex:integer(e?.definitionIndex,0,511,'Retry entity definition'),entityControlClass:integer(e.entityControlClass,0,31,'Retry entity control'),classIndex:integer(e.classIndex,0,255,'Retry class'),itemSlots:bytes(e.itemSlots,13,'Retry item slots')};}
function entityMap(entities){requireValue(Array.isArray(entities),'Retry entities');const map=new Map();for(const e of entities){const id=integer(e?.definitionIndex,0,511,'Retry entity definition');requireValue(!map.has(id),'Duplicate retry entity');map.set(id,e);}return map;}
export function captureRetryAnchor({contextId,battleStageId,constructorProfileId,descriptorDefinitions,entities,campaign,scene,deployment}){
 identity(contextId,'Retry context');
 requireValue(Array.isArray(descriptorDefinitions)&&descriptorDefinitions.length<=45,'Retry descriptor scope');
 dense(descriptorDefinitions,descriptorDefinitions.length,'Retry descriptor scope');
 const definitions=descriptorDefinitions.map(d=>d===null?null:integer(d,0,511,'Retry descriptor definition'));
 const current=entityMap(entities),ids=[...new Set(definitions.filter(d=>d!==null))];
 const anchor={version:1,contextId,descriptorDefinitions:definitions,entities:ids.map(d=>{requireValue(current.has(d),'Missing descriptor entity at anchor');return entitySnapshot(current.get(d));}),campaign:campaignSnapshot(campaign),scene:sceneSnapshot(scene),deployment:deploymentSnapshot(deployment)};
 if(battleStageId!==undefined)anchor.battleStageId=identity(battleStageId,'Retry stage');
 if(constructorProfileId!==undefined)anchor.constructorProfileId=identity(constructorProfileId,'Retry constructor');
 return anchor;
}
export function validateRetryAnchor(anchor,expected={}){
 requireValue(anchor?.version===1,'Missing or unsupported source retry anchor');
 exactKeys(anchor,['version','contextId','battleStageId','constructorProfileId','descriptorDefinitions','entities','campaign','scene','deployment'],'Unexpected retry anchor fields');
 exactKeys(anchor.deployment,['rows','selection','confirmed'],'Unexpected retry deployment fields');
 for(const row of anchor.deployment?.rows??[])exactKeys(row,['definition_index','slot_index','source_coordinate_bytes','orientation'],'Unexpected retry deployment row fields');
 exactKeys(anchor.campaign,['currency','campaignLifespan','warehouseCounts','cityAvailabilityBytes','sourceCampaignByte33','sourceCampaignWord16'],'Unexpected retry campaign fields');
 exactKeys(anchor.scene,['flags','groupStart','sceneMode','deathConditions','retreatLocked'],'Unexpected retry scene fields');
 for(const e of anchor.entities??[])exactKeys(e,['definitionIndex','entityControlClass','classIndex','itemSlots'],'Unexpected retry entity fields');
 const normalized=captureRetryAnchor({...anchor,entities:anchor.entities});
 requireValue(normalized.entities.length===anchor.entities.length,'Retry entities outside descriptor scope');
 for(const k of ['contextId','battleStageId','constructorProfileId'])if(expected[k]!==undefined)requireValue(anchor[k]===expected[k],'Retry '+k+' mismatch');
 return normalized;
}
export function restoreRetryAnchor({anchor,entities,campaign,scene,expected}){
 const saved=validateRetryAnchor(anchor,expected),current=entityMap(entities),restore=new Map(saved.entities.map(e=>[e.definitionIndex,e]));
 for(const id of restore.keys())requireValue(current.has(id),'Missing current descriptor entity; cannot fabricate retry state');
 return {entities:entities.map(e=>({...clone(e),...(restore.has(e.definitionIndex)?clone(restore.get(e.definitionIndex)): {})})),campaign:{...clone(campaign),...clone(saved.campaign)},scene:{...clone(scene),...clone(saved.scene)},deployment:clone(saved.deployment)};
}
