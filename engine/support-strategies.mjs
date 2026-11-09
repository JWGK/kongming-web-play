/** Source-derived deterministic support effects. Selection, costs, EXP and presentation belong to caller. */
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
export function calculateStrategyPointSupport({target,strategyIndex,itemMode=false}){
 if(![43,44,45].includes(strategyIndex))throw new RangeError('SP support strategy');
 const current=integer(target.strategyPoints,0,0x7fffffff,'Current SP'),maximum=integer(target.stats?.最大策略値,0,0x7fffffff,'Maximum SP');
 integer(target.classIndex,0,42,'Class');
 if(!itemMode&&target.classIndex===28)return {applied:false,reason:'normal_support_excludes_class28',recovered:0,remainingStrategyPoints:current};
 if(current===maximum)return {applied:false,reason:'strategy_points_full',recovered:0,remainingStrategyPoints:current};
 // 21EF6 uses unsigned comparison and subtracts current from maximum if over cap.
 // The resulting stored current is maximum, including an already-over-max value.
 const nominalRecovery=[20,40,80][strategyIndex-43];
 const remainingStrategyPoints=Math.min(current+nominalRecovery,maximum);
 return {applied:true,nominalRecovery,recovered:remainingStrategyPoints-current,remainingStrategyPoints};
}
export function calculateProtectionSupport({target,secondary=false}){
 const before=integer(target.status26,0,255,'Status26');
 if(secondary){
  // Native 22AE0..AEC checks byte36, NOT the protection bit in byte38.
  if((integer(target.status24,0,255,'Status24')&0xbf)===0)return {applied:false,reason:'secondary_attack_status_zero',before,after:before};
 }else if(before&8)return {applied:false,reason:'already_protected',before,after:before};
 return {applied:true,before,after:before|0x48};
}
