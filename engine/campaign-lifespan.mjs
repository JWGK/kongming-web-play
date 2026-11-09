/** GBA RAM 02011800, not a defeat counter. Static ROM acf30794 evidence:
 * default config1 (02EE5C), initial100 (01765C), fresh battle -2 (0480B8).
 * null means an older browser save never tracked this source field. Never
 * reconstruct unknown prior history. No later route condition is implemented.
 */
export const INITIAL_CAMPAIGN_LIFESPAN=100;
export function validateLifespan(value,{prebattle=false}={}){
 if(value===null)return value;
 if(!Number.isInteger(value)||value<0||value>200||(prebattle&&value!==100))throw new TypeError('Invalid source campaign lifespan');
 return value;
}
export function savedLifespan(campaign,{prebattle=false}={}){
 return validateLifespan(Object.hasOwn(campaign??{},'lifespan')?campaign.lifespan:null,{prebattle});
}
export function enterFreshBattle(value){
 validateLifespan(value);
 // Source subtract is guarded only by nonzero. Only even first-level values
 // are reachable here; later script adjustments/odd underflow are out of scope.
 if(value!==null&&value%2)throw new RangeError('Unreviewed odd lifespan battle entry');
 return value===null?null:value===0?0:value-2;
}
