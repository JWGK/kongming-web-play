/** Pure native family26 one-step promotion. Callers own item consumption, action flags, derived-stat refresh and presentation. No RNG, healing or implicit rank skipping. */
import {equipmentEligibility} from './battle-stats.mjs';
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
function dense(v,n,label){if(!Array.isArray(v)||v.length!==n)throw new TypeError(label);for(let i=0;i<n;i++)if(!Object.hasOwn(v,i))throw new TypeError(`${label} must be dense`);return v;}
export {rankPromotionEligibility,rankPromotionCarryEligibility} from './rank-promotion-eligibility.mjs';
import {rankPromotionEligibility} from './rank-promotion-eligibility.mjs';
export function applyFamily26RankPromotion({entity,itemInstances,warehouseCounts,rules,equipmentEligibilityFn=equipmentEligibility}){
 const eligibility=rankPromotionEligibility({classIndex:entity?.classIndex,level:entity?.level});
 const destinationClass=eligibility.destinationClass;
 dense(entity.itemSlots,13,'13 item slots').forEach(v=>integer(v,0,255,'Item slot'));
 integer(entity.lastLearnedStrategyMarker,0,255,'Learned strategy marker');
 dense(itemInstances,255,'255 item instances');dense(warehouseCounts,255,'255 warehouse counters');
 for(let i=0;i<255;i++){
  const row=itemInstances[i];if(row?.slotId!==i)throw new TypeError('Explicit ordered item instance mapping required');
  integer(row.definitionId,0,255,'Item definition');integer(warehouseCounts[i],0,255,'Warehouse counter');
  if(row.bytes!==undefined){dense(row.bytes,4,'Item instance bytes').forEach(v=>integer(v,0,255,'Instance byte'));if(row.bytes[0]!==row.definitionId)throw new TypeError('Item definition/bytes mismatch');}
 }
 if(typeof equipmentEligibilityFn!=='function')throw new TypeError('Equipment eligibility callback required');
 const next=structuredClone(entity),counts=[...warehouseCounts],equipmentChanges=[];
 if(!eligibility.eligible)return {applied:false,...eligibility,entity:next,warehouseCounts:counts,equipmentChanges};
 next.classIndex=destinationClass;
 for(let inventoryIndex=0;inventoryIndex<3;inventoryIndex++){
  const itemSlotId=next.itemSlots[inventoryIndex];if(itemSlotId===255)continue;
  const definitionId=itemInstances[itemSlotId].definitionId;
  const result=equipmentEligibilityFn({classIndex:destinationClass,itemSlotId,itemDefinitionId:definitionId,rules});
  if(typeof result?.eligible!=='boolean')throw new TypeError('Explicit equipment eligibility result required');
  if(result.eligible)continue;
  const warehouseBefore=counts[itemSlotId],transferred=warehouseBefore<99;
  if(transferred)counts[itemSlotId]++;
  // Native removes incompatible equipment regardless of warehouse insertion.
  next.itemSlots[inventoryIndex]=255;
  equipmentChanges.push({inventoryIndex,itemSlotId,definitionId,transferred,lost:!transferred,reason:transferred?'transferred_to_warehouse':'warehouse_full',warehouseBefore,warehouseAfter:counts[itemSlotId]});
 }
 next.lastLearnedStrategyMarker=0;
 return {applied:true,...eligibility,entity:next,warehouseCounts:counts,equipmentChanges};
}
