/** Reviewed native family27 eligibility; no inventory mutation. */
import {UnsupportedRuleError} from './abilities.mjs';
function integer(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
function classGroup(c){if(c===17)return 7;if(c<=20)return Math.floor(c/3);if(c<=28)return Math.floor((c-21)/2)+7;return ({29:11,30:12,31:13,39:14})[c]??15;}
export function classChangeEligibility({classIndex,destinationClass}){
 integer(classIndex,0,42,'Current class');integer(destinationClass,0,42,'Destination class');
 if(![0,3,6,9,12,15,18,21,23,25,27,29,39].includes(destinationClass))throw new UnsupportedRuleError('family27_destination_class');
 // DF5C checks same-family before the destination-specific source-family gate.
 const group=classGroup(classIndex),requiredGroup=({9:2,12:1,15:2,23:7,25:7,27:0,29:0,39:6})[destinationClass];
 const nativeResult=group===classGroup(destinationClass)?4:requiredGroup!==undefined?(group===requiredGroup?0:3):[12,13,15].includes(group)?3:0;
 return {eligible:nativeResult===0,nativeResult,reason:nativeResult===4?'same_class_family':nativeResult===3?'ineligible_current_class':null};
}
