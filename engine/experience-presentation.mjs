/** F1DC/F38A: EXP level notices and exact threshold learning scan.
 * Pure presentation/last-notice metadata; never recalculates EXP, stats or RNG.
 */
const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
function integer(v,min,max,label){if(!Number.isInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
export function experienceProgressionEffects({unit,previousLevel,level,rules}){
 if(rules?.purpose!=='private_static_strategy_rules'||rules.sourceSha256!==SHA||rules.strategies?.length!==56)throw new TypeError('Validated learning table required');
 integer(previousLevel,0,99,'previous level');integer(level,previousLevel,99,'level');integer(unit?.classIndex,0,39,'class index');integer(unit?.slotIndex,0,44,'slot index');integer(unit?.definitionIndex,0,511,'definition index');
 const effects=[];let lastLearnedStrategyMarker=unit.lastLearnedStrategyMarker;
 if(unit.definitionIndex>235&&level!==previousLevel)throw new RangeError('Ineligible EXP level gain');
 const ordered=[...rules.strategies].sort((a,b)=>a.strategyIndex-b.strategyIndex);
 if(ordered.some((s,i)=>s.strategyIndex!==i))throw new TypeError('56 ordered unique learning rows required');
 for(let attained=previousLevel+1;attained<=level;attained++){
  effects.push(Object.freeze({type:'levelUp',slotIndex:unit.slotIndex,definitionIndex:unit.definitionIndex,classIndex:unit.classIndex,previousLevel:attained-1,level:attained,source:'experience',cueId:3}));
  for(const row of ordered)if(row.requiredLevelByClass[unit.classIndex]===attained){
   lastLearnedStrategyMarker=0x80|row.strategyIndex;
   effects.push(Object.freeze({type:'strategyLearned',slotIndex:unit.slotIndex,definitionIndex:unit.definitionIndex,classIndex:unit.classIndex,level:attained,strategyIndex:row.strategyIndex,nameJa:row.nameJa,textKey:'strategy_learned',parameters:Object.freeze({strategyName:row.nameJa}),cueId:3}));
  }
 }
 return Object.freeze({effects:Object.freeze(effects),lastLearnedStrategyMarker});
}
