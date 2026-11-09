/** Reviewed scripted warehouse acquisition for explicit mutable instance IDs.
 * Discovery is indexed by instance, even when its current definition changed.
 * Full warehouse still sets discovery; caller owns the script one-shot flag.
 * Random-operand195 is deliberately not implemented here.
 */
export function acquireScenarioWarehouseItem({itemInstanceId,itemInstances,itemDefinitions,warehouseCounts,discoveryBytes}={}){
 const dense=(v,n)=>Array.isArray(v)&&v.length===n&&Array.from({length:n},(_,i)=>Object.hasOwn(v,i)).every(Boolean);
 const byte=v=>Number.isInteger(v)&&v>=0&&v<=255;
 if(!byte(itemInstanceId)||itemInstanceId>=255||itemInstanceId===195)throw new RangeError('Explicit nonrandom item instance required');
 if(!dense(itemInstances,255)||itemInstances.some((i,n)=>i?.slotId!==n||!byte(i.definitionId)))throw new TypeError('Complete ordered item instance pool required');
 if(!dense(warehouseCounts,255)||warehouseCounts.some(n=>!byte(n))||!dense(discoveryBytes,32)||discoveryBytes.some(n=>!byte(n)))throw new TypeError('Complete inventory resources required');
 const definitionId=itemInstances[itemInstanceId].definitionId,definition=itemDefinitions?.find(d=>d.definitionId===definitionId);if(!definition)throw new TypeError('Acquired item definition is unreviewed');
 const counts=[...warehouseCounts],discovery=[...discoveryBytes],previousCount=counts[itemInstanceId],acquired=previousCount<=98;discovery[itemInstanceId>>3]|=1<<(itemInstanceId&7);if(acquired)counts[itemInstanceId]++;
 return {warehouseCounts:counts,discoveryBytes:discovery,effect:{type:'warehouse_item',itemInstanceId,definitionId,nameJa:definition.nameJa,acquired,quantity:acquired?1:0,previousCount,count:counts[itemInstanceId],destination:'warehouse',reason:acquired?null:'warehouse_full'}};
}
