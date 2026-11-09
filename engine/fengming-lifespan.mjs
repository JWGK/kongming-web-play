/** Native u32 campaign counter, admitted from the Fengming source frontier.
 * Older campaign-lifespan.mjs validators/history are intentionally unchanged.
 * 480B8: nonzero raw subtract2; 10B0C -> 4C090: wrapped add/signed cap200.
 * 108DE/10778: explicit native save/load projects only the low16 bits.
 * These are pure projections, not an implicit save migration or retry rollback.
 */
export function validateNativeLifespan(value){
 if(value!==null&&(!Number.isInteger(value)||value<0||value>0xffffffff))throw new TypeError('Invalid native u32 campaign lifespan');
 return value;
}
export function enterNativeFreshBattle(value){
 validateNativeLifespan(value);return value===null?null:value===0?0:(value-2)>>>0;
}
export function addNativeLifespan(value,amount){
 validateNativeLifespan(value);
 if(!Number.isInteger(amount)||amount<0||amount>0xffff)throw new TypeError('Invalid source lifespan operand');
 if(value===null)return null;
 const sum=(value+amount)>>>0;return (sum|0)>200?200:sum;
}
export function projectNativeLifespan(value){validateNativeLifespan(value);return value===null?null:value&0xffff;}
/** Policy is explicit: ordinary browser tactical manual saves are raw extensions. */
export function projectFengmingSaveLifespan(value,{kind}={}){
 validateNativeLifespan(value);
 if(kind==='browser-tactical-manual')return value;
 if(!['native-story-manual','native-town-manual','native-suspend','native-retry-anchor'].includes(kind))throw new TypeError('Explicit reviewed lifespan save kind required');
 return projectNativeLifespan(value);
}
