/** Source persistent entity writes and 49DD8 faction transfer, independent of ownership. */
import {refreshUnit} from './battle-stats.mjs';
const clone=structuredClone;
export function synchronizeFieldEntityRegistry(registry,units){const out=clone(registry);for(const u of units)if(u.definitionIndex!==null&&u.state15!==0){const i=out.findIndex(e=>e.definitionIndex===u.definitionIndex);if(i<0)throw new TypeError('Unbound field entity');out[i]=clone(u);}return out;}
export function writeCampaignEntity({registry,units,definition,field,value,rules}){
 if(!['entityControlClass','classIndex','level'].includes(field))throw new TypeError('Unsupported persistent entity write');const entries=clone(registry),out=clone(units),e=entries.find(e=>e.definitionIndex===definition);if(!e)throw new TypeError('Unknown persistent entity history');const before=e[field];e[field]=value;if(field==='classIndex'||field==='level')Object.assign(e,refreshUnit(e,rules));for(const u of out)if(u.definitionIndex===definition){u[field]=value;if(field==='classIndex'||field==='level')Object.assign(u,refreshUnit(u,rules));}return {registry:entries,units:out,before,after:value};
}
export function transferFieldFaction({registry,units,definition,controlClass,rules,reviewedOperands}){
 // Current reviewed command is enemy ship244 -> friendly control7. Generalized
 // transfer directions await their own source occurrence/caller review.
 const extended=Array.isArray(reviewedOperands)&&reviewedOperands.some(a=>a.definition===definition&&a.controlClass===controlClass);if(!extended&&!((definition===244&&controlClass===7)||(definition===34&&controlClass===6)))throw new TypeError('Unreviewed faction transfer operand');
 const source=units.find(u=>u.definitionIndex===definition);if(!source||(!extended&&source.slotIndex<15))throw new TypeError('Expected source enemy ship');
 const target=units.find(u=>(u.slotIndex<15)!==(source.slotIndex<15)&&u.state15===0);if(!target)return {registry:clone(registry),units:clone(units),applied:false,reason:'no_free_faction_slot'};
 const r=writeCampaignEntity({registry,units,definition,field:'entityControlClass',value:controlClass,rules,reviewedOperands}),out=r.units,old=out[source.slotIndex];
 const next={...clone(old),slotIndex:target.slotIndex,followSlot:255,aiDestination:clone(old.position??old.aiDestination),control17:old.state15===2&&[0,6].includes(controlClass)?7:(target.slotIndex<15?(controlClass===0?7:3):target.control17),...((definition===34||extended)?{statusCounter27:target.statusCounter27}:{} )};
 out[target.slotIndex]=next;old.state15=0;old.position=null;
 const entries=synchronizeFieldEntityRegistry(r.registry,out);
 return {registry:entries,units:out,applied:true,fromSlot:source.slotIndex,toSlot:target.slotIndex,definitionIndex:definition,controlClass};
}
