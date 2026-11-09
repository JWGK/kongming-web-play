/** Native family26 DE0C gate and F5FC one-step rank mapping. Not family27. */
const RANKS=Object.freeze({0:[15,1],1:[30,2],3:[15,4],4:[30,5],6:[15,7],7:[30,8],9:[15,10],10:[30,11],12:[15,13],13:[30,14],15:[15,16],17:[30,22],18:[15,19],19:[30,20],21:[15,17],23:[15,24],25:[15,26],27:[15,28]});
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
export function rankPromotionEligibility({classIndex,level}){
 integer(classIndex,0,42,'Current class');integer(level,0,255,'Level');
 const rank=RANKS[classIndex],nativeResult=!rank?2:level<rank[0]?1:0;
 return {eligible:nativeResult===0,nativeResult,reason:nativeResult===2?'class_has_no_next_rank':nativeResult===1?'level_below_promotion_requirement':null,requiredLevel:rank?.[0]??null,destinationClass:rank?.[1]??null};
}
/** E7F2 uses a fixed45, not the actual level, for carried-item applicability. */
export function rankPromotionCarryEligibility({classIndex}){return rankPromotionEligibility({classIndex,level:45}).eligible;}
