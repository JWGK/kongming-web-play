/** Pure Jianning bindings. Actual board09 materialization belongs to native engine.
 * Empty units below are unmaterialized placeholders, never suspend snapshots. */
import {chapter5JianningProfile,validateChapter5JianningRuntimeData,sameChapter5Jianning as same} from './chapter5-jianning-source.mjs';
import {validateChapter5JianningPreparation as validatePreparation} from '../game-chapter5-jianning-preparation.mjs';
import {disputeCurrentEntities} from '../game-qishan-dispute-preparation.mjs';
import {refreshUnit} from './battle-stats.mjs';
const clone=structuredClone,need=(v,m)=>{if(!v)throw new TypeError(m);};

// Cache only successful derivations of this exact immutable plain-data graph.
// Mutable callers retain all original validation. Returned values never alias caches.
const preparationSpecs=new WeakMap(),actorBindings=new WeakMap(),immutableData=new WeakSet();
function cacheableData(data){
 if(immutableData.has(data))return true;
 const seen=new Set();let count=0;
 function visit(value,depth=0){
  if(++count>1000000||depth>64)return false;
  if(value===null||typeof value==='boolean'||typeof value==='string')return true;
  if(typeof value==='number')return Number.isFinite(value)&&!Object.is(value,-0);
  if(typeof value!=='object'||seen.has(value)||!Object.isFrozen(value))return false;
  seen.add(value);const array=Array.isArray(value);
  if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))return false;
  const descriptors=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(descriptors);
  if(array&&keys.length!==value.length+1)return false;
  for(const key of keys){const d=descriptors[key];if(typeof key!=='string'||!Object.hasOwn(d,'value'))return false;
   if(array&&key==='length')continue;
   if(!d.enumerable||!visit(d.value,depth+1))return false;
  }return true;
 }
 if(!visit(data))return false;immutableData.add(data);return true;
}
export function validateChapter5JianningPreparation(value,campaign,id){validatePreparation(value,campaign,id);return clone(value);}
export function chapter5JianningPreparationSpec(data){const cached=preparationSpecs.get(data);if(cached)return clone(cached);validateChapter5JianningRuntimeData(data);const p=data.nextBattleContext.confirmedPreparation;need(p?.confirmed===true&&p.resetDescriptorCount===45&&p.contextId===data.nextBattleContext.contextId&&p.profileId===data.nextBattleContext.profileId,'Exact confirmed Jianning descriptor identity');const result={requiredDefinitions:clone(p.requiredDefinitions),optionalDefinitions:clone(p.optionalDefinitions),capacity:p.capacity,maxParticipants:p.maxParticipants};if(cacheableData(data))preparationSpecs.set(data,clone(result));return result;}
export function validateChapter5JianningSelection(data,selection){chapter5JianningPreparationSpec(data);need(same(selection,data.nextBattleContext.confirmedPreparation.selectionSlots),'Jianning selection was confirmed once before battle');return true;}
export function chapter5JianningActorBindings(data,{enemyDefined=true}={}){
 const mode=!!enemyDefined,cached=actorBindings.get(data)?.get(mode);if(cached)return clone(cached);
 chapter5JianningPreparationSpec(data);const p=data.nextBattleContext.confirmedPreparation,campaign={...clone(p.entryCampaign),sourceContext:{root:5,section:1,block:2},targetContext:{root:5,section:1,block:p.block}};validatePreparation(p,campaign,p.contextId);
 const known=disputeCurrentEntities(p.entryCampaign),bindings=[];let slot=0;
 for(const d of p.descriptorProjection){if(d===null||d.definitionIndex===65535)continue;need(d.definitionIndex!==1024&&slot<15&&known.some(e=>e.definitionIndex===d.definitionIndex&&[0,6].includes(e.entityControlClass)),'Observed selected Jianning friendly only');bindings.push({descriptorIndex:d.descriptorIndex,slotIndex:slot++,definitionIndex:d.definitionIndex,sourceX:d.sourceX,sourceY:d.sourceY,directionSource:d.directionSource,hidden:d.hidden,enemy:false});}
 if(enemyDefined){slot=15;for(const r of data.variant.enemyRows){need(slot<45&&!r.condition_enabled&&!r.hidden,'Exact visible Jianning enemy');bindings.push({descriptorIndex:15+r.row_index,slotIndex:slot++,definitionIndex:r.definition,sourceX:r.x,sourceY:r.y,directionSource:r.direction_source,hidden:r.hidden,enemy:true,controlMode:r.control_mode});}}
 if(cacheableData(data)){let modes=actorBindings.get(data);if(!modes){modes=new Map();actorBindings.set(data,modes);}modes.set(mode,clone(bindings));}
 return bindings;
}
export function chapter5JianningRosterDefinitions(data,selection,options){validateChapter5JianningSelection(data,selection);const roster=Array(45).fill(null);for(const row of chapter5JianningActorBindings(data,options))roster[row.slotIndex]=row.definitionIndex;return roster;}
export function chapter5JianningRuntimeRows(data,options){return chapter5JianningActorBindings(data,options).map(r=>({definition_index:r.definitionIndex,slot_index:r.slotIndex,source_coordinate_bytes:[r.sourceX,r.sourceY],orientation:r.directionSource===1?1:0}));}
export function defineChapter5JianningEnemies(data,registry){
 validateChapter5JianningRuntimeData(data);need(Array.isArray(registry)&&new Set(registry.map(x=>x.definitionIndex)).size===registry.length,'Distinct current registry');const out=clone(registry),profile=chapter5JianningProfile(data.nextBattleContext.contextId);
 for(const row of data.variant.enemyRows){const index=out.findIndex(e=>e.definitionIndex===row.definition),prior=index<0?profile.enemyEntityTemplates.find(e=>e.definitionIndex===row.definition):out[index];need(prior,'Reviewed source22 enemy recipe');const next=refreshUnit({...clone(prior),classIndex:row.class_source,level:row.level_source},data.statsRules);if(index<0)out.push(next);else out[index]=next;}return out;
}
export function constructChapter5JianningUnmaterialized(data,{enemyDefined=false,registry}={}){
 const p=data.nextBattleContext?.confirmedPreparation,known=disputeCurrentEntities(p?.entryCampaign);need(Array.isArray(registry)&&Array.isArray(data.emptyUnits)&&data.emptyUnits.length===45,'Exact retained registry and empty45');const units=clone(data.emptyUnits);
 for(const r of chapter5JianningActorBindings(data,{enemyDefined})){const template=registry.find(e=>e.definitionIndex===r.definitionIndex);need(template,'Actual retained friendly or source22 enemy');if(!r.enemy){const original=known.find(e=>e.definitionIndex===r.definitionIndex);for(const key of ['level','classIndex','experience','lastLearnedStrategyMarker','itemSlots'])need(same(template[key],original[key]),'No replacement friendly levels, equipment or growth history');}
  const unit={...clone(template),slotIndex:r.slotIndex,state15:1,position:null,flags16:32,control17:r.enemy?[3,1,2,0,0,4,4][r.controlMode]:0,facing18:0,priority20:0,followSlot:255,aiDestination:{x:0,y:0},status24:2,status25:2,status26:0,statusCounter27:0,troops:0,strategyPoints:0};delete unit.lastFieldPosition;units[r.slotIndex]=unit;
 }return {units,rows:chapter5JianningRuntimeRows(data,{enemyDefined})};
}
