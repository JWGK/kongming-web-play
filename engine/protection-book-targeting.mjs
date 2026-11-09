/** Source book173 only: 24382 passes GLOBAL mutable item instance to22954.
 * Native range lookup is instance-indexed, unlike learned strategy51.
 * 41CA0 adds friendly self before shape checks; out-of-shape bytes give only
 * self, while FF exits before adding self. Generic unknown geometry stays closed.
 */
import {enumerateTargets} from './targeting.mjs';
const groups={"129":[1,4,7,10,13,16,18,19,24,27,29,31,37,38,47,49,51,113,138,139,140,155,159,193,195,232,235],"130":[2,5,8,11,14,17,25,114],"131":[21,34,35,36,42,43,44,45,53,54,116],"132":[39,40,55,56,62,68,117],"none":[118,119],"self_only":[20,22,57,58,59,60,61,63,64,65,66,67,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,115,120,121,122,160,161,162,178,179,180,199,202,218,219,220,239]};
export function protectionBookTargetMode(itemInstanceId){
 if(!Number.isInteger(itemInstanceId)||itemInstanceId<0||itemInstanceId>254)throw new RangeError('Explicit global item instance required');
 if(groups.none.includes(itemInstanceId))return Object.freeze({mode:'none'});
 if(groups.self_only.includes(itemInstanceId))return Object.freeze({mode:'self_only'});
 for(const code of[129,130,131,132])if(groups[code].includes(itemInstanceId))return Object.freeze({mode:'normal',rangeCode:code});
 return Object.freeze({mode:'normal',rangeCode:128});
}
export function protectionBookTargets({itemInstanceId,actor,units,width,height}){
 const p=protectionBookTargetMode(itemInstanceId);if(p.mode==='none')return Object.freeze([]);
 return enumerateTargets({actor,units:p.mode==='self_only'?units.filter(u=>u.slotIndex===actor.slotIndex):units,width,height,rangeCode:p.rangeCode??128,sideMask:1});
}
