/** Active first-battle consumables. Passive equipment is in battle-stats.mjs. */
import {applyFamily26RankPromotion} from './rank-promotion.mjs';
import {applyFamily27ClassChange} from './class-change.mjs';
import {drawOriginalRandom,calculateHealingExperience,applyExperience} from './combat.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
import {calculateTroopHealing,strategyTargets,resolveStrategyAction} from './strategies.mjs';
import {enumerateTargets} from './targeting.mjs';
import {captureActionPresentation} from './action-presentation.mjs';
function int(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
const ITEM_STRATEGIES=Object.freeze({128:0,129:1,130:2,131:3,134:6,135:7,136:8,137:9,138:10,140:12,141:13,142:14,143:15,144:16,146:18,147:19,148:23,149:24,150:25,151:26,152:27,153:28,154:29,155:30,156:31,157:32,158:33,159:34,160:35,161:36,162:37,164:41,165:43,166:44,167:45,168:46,169:47,170:48,171:49,173:51});
const itemStrategies=physicalProfile=>['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?{...ITEM_STRATEGIES,132:4,133:5,163:38,174:52}:['fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?{...ITEM_STRATEGIES,132:4,133:5,174:52}:physicalProfile==='panshegu'?{...ITEM_STRATEGIES,132:4,133:5}:physicalProfile==='taohuashui'?{...ITEM_STRATEGIES,132:4}:ITEM_STRATEGIES;
export function implementedConsumableDefinitionIds({physicalProfile=null}={}){return Object.freeze([...Object.keys(itemStrategies(physicalProfile)).map(Number),...(['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?[177,179]:physicalProfile==='nanan-tianshui'?[179]:[]),175,176,178,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194].sort((a,b)=>a-b));}
export function consumableTargets({actor,units,width,height,inventoryIndex,rules,physicalProfile=null}){
 const dispatch=itemStrategies(physicalProfile);
 if(inventoryIndex!==undefined){int(inventoryIndex,3,12,'inventory index');const slot=actor.itemSlots?.[inventoryIndex],id=actor.statsSource?.itemInstances?.find(x=>x.slotId===slot)?.definitionId;
  if(id in dispatch)return strategyTargets({actor,units,width,height,rules,strategyIndex:dispatch[id],itemMode:true,itemInstanceId:slot});
  if(![...(['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?[177,179]:physicalProfile==='nanan-tianshui'?[179]:[]),175,176,178,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194].includes(id))return Object.freeze([]);
 }
 return enumerateTargets({actor,units,width,height,rangeCode:0x83,sideMask:1});
}
export function applyFirstBattleConsumable({actor,target,inventoryIndex,definitionId,rules,rngState,physicalProfile=null}){
 int(inventoryIndex,3,12,'consumable inventory index');const seed=int(rngState,0,0xffffffff,'rngState');
 if(!Array.isArray(actor.itemSlots)||actor.itemSlots.length!==13)throw new TypeError('Explicit13 item slots required');
 const itemSlot=int(actor.itemSlots[inventoryIndex],0,254,'item slot');
 const instance=actor.statsSource?.itemInstances?.find(x=>x.slotId===itemSlot);
 if(!instance||instance.definitionId!==definitionId)throw new TypeError('Explicit item-instance mapping mismatch');
 let effect,baseChange=null,nextSeed=seed;
 if(definitionId===159||definitionId===160){effect=calculateTroopHealing({actor,target,strategyIndex:definitionId===159?34:35,rules,itemMode:true});}
 else if([176,178,180,181,...(['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?[177,179]:physicalProfile==='nanan-tianshui'?[179]:[])].includes(definitionId)){
  const ability=({176:'統率力',177:'統率力',178:'武力',179:'武力',180:'知力',181:'知力'})[definitionId];
  const base=int(target.statsSource?.baseFields?.[ability],0,255,'base '+ability);
  if(int(target.stats?.[ability],0,ability==='知力'?500:1000,'effective '+ability)>=255)return Object.freeze({applied:false,reason:ability==='知力'?'effective_intelligence_at_seed_cap':'effective_ability_at_seed_cap',rngStateAfterCalculation:seed,itemConsumed:false});
  if(definitionId===179&&base===255)return Object.freeze({applied:false,reason:'base_ability_at_cap',rngStateAfterCalculation:seed,itemConsumed:false});
  const r=drawOriginalRandom(seed,6);nextSeed=r.state;const nominal=5+r.value;const after=Math.min(255,base+nominal);
  baseChange=Object.freeze({ability,before:base,after,nominalIncrease:nominal,increase:after-base});
  effect=Object.freeze({applied:true,baseChange});
 }else throw new UnsupportedRuleError('active_item_definition');
 if(!effect.applied)return Object.freeze({...effect,itemConsumed:false,rngStateAfterCalculation:seed});
 // Shared family23 caller searches ORIGINAL GLOBAL ID across slots0..12 (EEFC),
 // not the selected bag index or a remapped definition. Jicheng seeds use the same source24416 caller; older-family contracts stay unchanged.
 const consumedInventoryIndex=(['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)||[159,160].includes(definitionId))?actor.itemSlots.indexOf(itemSlot):inventoryIndex;
 const slots=[...actor.itemSlots];slots[consumedInventoryIndex]=255;
 return Object.freeze({applied:true,itemConsumed:true,consumedSlotId:itemSlot,consumedInventoryIndex,definitionId,actorItemSlots:Object.freeze(slots),actorFlags16:int(actor.flags16,0,255,'flags16')|128,targetTroops:[159,160].includes(definitionId)?effect.remainingTroops:target.troops,baseChange,effect,rngStateAfterCalculation:nextSeed,requiresStatsRefresh:baseChange!==null});
}

/** Apply a consumable to canonical state; item ownership, range and success gates. */
export function resolveConsumableAction({units,actorSlot,targetSlot,inventoryIndex,board,rules,rngState,refreshUnit,configurationScale=1,statsRules,itemInstances,warehouseCounts,physicalProfile=null}){
 const dispatch=itemStrategies(physicalProfile);
 if(!Array.isArray(units)||!board)throw new TypeError('Explicit units and board required');
 const updated=structuredClone(units),bySlot=new Map(updated.map(u=>[u.slotIndex,u]));
 if(bySlot.size!==updated.length)throw new TypeError('Duplicate slots');
 const actor=bySlot.get(actorSlot),target=bySlot.get(targetSlot);
 for(const u of [actor,target])if(!u||u.state15!==2||!u.position||u.troops<=0)throw new RangeError('Actor and target must be alive and on-grid');
 int(inventoryIndex,3,12,'consumable inventory index');const slot=actor.itemSlots?.[inventoryIndex];const definitionId=actor.statsSource?.itemInstances?.find(x=>x.slotId===slot)?.definitionId;
 if(definitionId===undefined)throw new TypeError('Missing item-instance mapping');
 if(!consumableTargets({actor,units:updated,width:board.width,height:board.height,inventoryIndex,rules,physicalProfile}).includes(targetSlot))throw new RangeError('Item target outside original item range or side');
 if([175,182,183,184,185,186,187,188,189,190,191,192,193,194].includes(definitionId)){
  const d=statsRules?.itemDefinitions.find(x=>x.definitionId===definitionId);if(d?.family!==(definitionId===175?26:27))throw new TypeError('Reviewed family27 item rules required');
  const r=definitionId===175?applyFamily26RankPromotion({entity:target,itemInstances,warehouseCounts,rules:statsRules}):applyFamily27ClassChange({entity:target,destinationClass:d.primaryMagnitude,itemInstances,warehouseCounts,rules:statsRules});if(!r.applied)return {units:updated,rngState,events:[],applied:false,reason:r.reason};
  const presentation=captureActionPresentation({actor,target,board}),previousClassIndex=target.classIndex,beforeTroops=target.troops,beforeStrategyPoints=target.strategyPoints;
  Object.assign(target,r.entity);actor.itemSlots[inventoryIndex]=255;actor.flags16|=128;
  if(typeof refreshUnit!=='function')throw new TypeError('Class change requires stats refresh');Object.assign(target,refreshUnit(structuredClone(target)));if(actor!==target)Object.assign(actor,refreshUnit(structuredClone(actor)));
  if(definitionId!==175){target.troops=Math.min(beforeTroops,target.stats.最大兵数);target.strategyPoints=Math.min(beforeStrategyPoints,target.stats.最大策略値);}
  return {units:updated,rngState,warehouseCounts:r.warehouseCounts,applied:true,events:[{type:'classChanged',actorSlot,targetSlot,definitionIndex:target.definitionIndex,previousClassIndex,classIndex:target.classIndex,equipmentChanges:r.equipmentChanges,beforeTroops,afterTroops:target.troops,beforeStrategyPoints,afterStrategyPoints:target.strategyPoints,definitionId,itemSlotId:slot,source:'battle_item',presentation},{type:'itemConsumed',actorSlot,targetSlot,inventoryIndex,definitionId,consumedSlotId:slot,itemConsumed:true,applied:true,presentationFeedback:'preceding_class_change',presentation}]};
 }
 if(definitionId in dispatch && ![159,160].includes(definitionId)){
  const result=resolveStrategyAction({units,actorSlot,targetSlot,strategyIndex:dispatch[definitionId],board,rules,rngState,refreshUnit,configurationScale,physicalProfile,itemUse:{inventoryIndex,definitionId}});
  if(!result.applied)return result;
  const nextActor=result.units.find(u=>u.slotIndex===actorSlot),consumedInventoryIndex=nextActor.itemSlots.indexOf(slot);
  if(consumedInventoryIndex<0)throw new TypeError('Selected global book instance missing after effect');
  nextActor.itemSlots[consumedInventoryIndex]=255;
  if(typeof refreshUnit!=='function')throw new TypeError('Consumed item requires validated passive-stat refresh');
  Object.assign(nextActor,refreshUnit(structuredClone(nextActor)));
  result.events.push({type:'itemConsumed',actorSlot,targetSlot,inventoryIndex,consumedInventoryIndex,definitionId,strategyIndex:dispatch[definitionId],presentationFeedback:'preceding_strategy_effect',consumedSlotId:slot,itemConsumed:true,applied:true,presentation:captureActionPresentation({actor,target,board})});
  return result;
 }
 const presentation=captureActionPresentation({actor,target,board});
 const r=applyFirstBattleConsumable({actor,target,inventoryIndex,definitionId,rules,rngState,physicalProfile});
 if(!r.applied)return {units:updated,rngState,events:[],applied:false,reason:r.reason};
 actor.itemSlots=[...r.actorItemSlots];actor.flags16=r.actorFlags16;target.troops=r.targetTroops;
 if(r.baseChange)target.statsSource.baseFields[r.baseChange.ability]=r.baseChange.after;
 if(typeof refreshUnit!=='function')throw new TypeError('Consumed item requires validated passive-stat refresh');
 Object.assign(actor,refreshUnit(structuredClone(actor)));if(actor!==target)Object.assign(target,refreshUnit(structuredClone(target)));
 const events=[{type:'itemConsumed',actorSlot,targetSlot,inventoryIndex,...r,presentation}];
 if([159,160].includes(definitionId)){const reward=calculateHealingExperience({attackerSlot:actorSlot,attackerLevel:actor.level,recoveredTroops:r.effect.recovered});
  const previousLevel=actor.level,previousExperience=actor.experience;const growth=applyExperience(actor,reward);actor.level=growth.level;actor.experience=growth.experience;
  if(growth.levelsGained){Object.assign(actor,refreshUnit(structuredClone(actor)));events.push({type:'levelUp',slotIndex:actorSlot,previousLevel,level:actor.level});}
  if(reward)events.push({type:'experienceChange',slotIndex:actorSlot,previousLevel,previousExperience,level:actor.level,experience:actor.experience,total:reward});
 }
 return {units:updated,rngState:r.rngStateAfterCalculation,events,applied:true,rngScope:'original_algorithm_game_logic_draws_excluding_visual_animation_draws'};
}

/** Original 渡す path 0x36680..0x36724, first empty bag index3..12. */
export function transferCarriedItem({units,actorSlot,targetSlot,inventoryIndex,board,refreshUnit}){
 if(!Array.isArray(units)||!board)throw new TypeError('Explicit units and board required');
 const updated=structuredClone(units),bySlot=new Map(updated.map(u=>[u.slotIndex,u]));
 const actor=bySlot.get(actorSlot),target=bySlot.get(targetSlot);
 if(actorSlot===targetSlot)throw new RangeError('Cannot transfer to self');
 for(const u of [actor,target])if(!u||u.state15!==2||!u.position||u.troops<=0||!Array.isArray(u.itemSlots)||u.itemSlots.length!==13)throw new RangeError('Alive on-grid units with inventory required');
 if(!enumerateTargets({actor,units:updated,width:board.width,height:board.height,rangeCode:1,sideMask:1}).includes(targetSlot))throw new RangeError('Transfer target outside original friendly range');
 int(inventoryIndex,3,12,'bag inventory index');const itemSlot=int(actor.itemSlots[inventoryIndex],0,254,'item slot');
 const targetIndex=target.itemSlots.findIndex((v,i)=>i>=3&&v===255);
 if(targetIndex<0)return {units:updated,events:[],applied:false,reason:'target_bag_full'};
 const instance=actor.statsSource?.itemInstances?.find(x=>x.slotId===itemSlot);if(!instance)throw new TypeError('Missing item instance');
 if(!Array.isArray(target.statsSource?.itemInstances))throw new TypeError('Target requires explicit item-instance mapping');
 const existing=target.statsSource.itemInstances.find(x=>x.slotId===itemSlot);
 if(existing&&existing.definitionId!==instance.definitionId)throw new TypeError('Conflicting item-instance identity');
 if(!existing)target.statsSource.itemInstances.push(structuredClone(instance));
 const presentation=captureActionPresentation({actor,target,board});
 target.itemSlots[targetIndex]=itemSlot;actor.itemSlots[inventoryIndex]=255;actor.flags16|=128;
 if(typeof refreshUnit!=='function')throw new TypeError('Transfer requires validated passive-stat refresh');
 Object.assign(actor,refreshUnit(structuredClone(actor)));Object.assign(target,refreshUnit(structuredClone(target)));
 return {units:updated,events:[{type:'itemTransferred',actorSlot,targetSlot,itemSlot,inventoryIndex,targetInventoryIndex:targetIndex,presentation}],applied:true};
}
