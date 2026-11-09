/** Native3310C–33280 resource recovery, isolated for chapter expansion.
 * Family25 items are scanned in all13 carried positions (331F6); their primary
 * magnitudes sum to a percent capped100 (33224), added to terrainHP recovery.
 * No RNG, item consumption, status recovery, music aura or turn scheduling here.
 */
const HP_DIV=Object.freeze({7:6,8:5,9:7,12:3,13:4}),SP_DIV=Object.freeze({7:6,8:5,12:4});
function integer(n,min,max,label){if(!Number.isSafeInteger(n)||n<min||n>max)throw new RangeError(label);return n;}
export function calculatePeriodicResourceRecovery(unit,{terrainId,itemDefinitions}={}){
 integer(terrainId,0,22,'terrain');
 const beforeTroops=integer(unit?.troops,0,0x7fffffff,'troops'),beforeStrategyPoints=integer(unit?.strategyPoints,0,0x7fffffff,'strategy points');
 const maximumTroops=integer(unit?.stats?.最大兵数,0,65535,'maximum troops'),maximumStrategyPoints=integer(unit?.stats?.最大策略値,0,65535,'maximum strategy points');
 if(!Array.isArray(unit.itemSlots)||unit.itemSlots.length!==13||!Array.isArray(unit.statsSource?.itemInstances)||!Array.isArray(itemDefinitions))throw new TypeError('Explicit13 carried positions and resolved item definitions required');
 const instances=new Map(unit.statsSource.itemInstances.map(i=>[i.slotId,i.definitionId])),definitions=new Map(itemDefinitions.map(d=>[d.definitionId,d]));
 if(instances.size!==unit.statsSource.itemInstances.length||definitions.size!==itemDefinitions.length)throw new TypeError('Duplicate item mapping');
 let summedPercent=0;const itemContributions=[];
 unit.itemSlots.forEach((slotId,inventoryIndex)=>{integer(slotId,0,255,'item slot');const definitionId=instances.get(slotId),item=definitions.get(definitionId);if(!item)throw new TypeError('Unresolved carried item');if(item.family!==25)return;const percent=integer(item.primaryMagnitude,0,63,'periodic recovery percent');summedPercent+=percent;itemContributions.push(Object.freeze({inventoryIndex,slotId,definitionId,percent}));});
 const itemPercent=Math.min(summedPercent,100),terrainTroops=HP_DIV[terrainId]?Math.floor(maximumTroops/HP_DIV[terrainId])+1:0,terrainStrategyPoints=SP_DIV[terrainId]?Math.floor(maximumStrategyPoints/SP_DIV[terrainId])+1:0,itemTroops=Math.floor(maximumTroops*itemPercent/100);
 // Native only runs the relevant setters when a recovery source exists.
 const troops=HP_DIV[terrainId]||itemContributions.length?Math.min(maximumTroops,beforeTroops+terrainTroops+itemTroops):beforeTroops;
 const strategyPoints=SP_DIV[terrainId]?Math.min(maximumStrategyPoints,beforeStrategyPoints+terrainStrategyPoints):beforeStrategyPoints;
 return Object.freeze({beforeTroops,troops,beforeStrategyPoints,strategyPoints,terrainTroops,terrainStrategyPoints,itemTroops,itemPercent,itemContributions:Object.freeze(itemContributions)});
}
