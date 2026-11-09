/** Source F7F0/18A70/16FC0 availability: persistent low-five control 0 or 6.
 * This is a partition of known entity history, not a historical recruitment flag.
 */
import {persistentEntityFields} from './campaign-entities.mjs';
const clone=structuredClone,available=e=>[0,6].includes(e.entityControlClass);
export function partitionKnownCampaignEntities(persistentState,overrides,entities=[]){
 if(overrides?.version!==2||overrides.unobserved!=='unknown')throw new TypeError('Explicit prior entity observations required');
 const p=clone(persistentState),o=clone(overrides),map=new Map();
 for(const e of [...p.party,...o.entries]){if(map.has(e.definitionIndex))throw new TypeError('Duplicate persistent entity identity');map.set(e.definitionIndex,clone(e));}
 for(const e of entities){if(!map.has(e.definitionIndex))o.origins[e.definitionIndex]='observed-current-battle';map.set(e.definitionIndex,persistentEntityFields(e));}
 const all=[...map.values()].sort((a,b)=>a.definitionIndex-b.definitionIndex);p.party=all.filter(available);o.entries=all.filter(e=>!available(e));o.origins=Object.fromEntries(o.entries.map(e=>[e.definitionIndex,o.origins[e.definitionIndex]??'observed-current-battle']));
 return {persistentState:p,campaignEntityOverrides:o};
}
/** Mechanical operation only, not source-event admission. Callers must prove the
 * operation and (separately) any first writer before calling. Missing history is
 * never inferred from a definition ID. Initializers return a reviewed row; they
 * do not run for known records. No receipts or save fields are introduced. */
export function applyAuthorizedCampaignEntityOperation(carry,effect,{initializeMissing}={}){
 const out=clone(carry),p=out.persistentState,o=out.campaignEntityOverrides;
 let e=p.party.find(e=>e.definitionIndex===effect.definitionIndex)??o.entries.find(e=>e.definitionIndex===effect.definitionIndex);
 if(!e){
  if(!initializeMissing)throw new TypeError('Unknown prior story entity history');
  e=persistentEntityFields(initializeMissing());
  if(e.definitionIndex!==effect.definitionIndex)throw new TypeError('Reviewed initializer identity mismatch');
  o.entries.push(e);o.origins[e.definitionIndex]='source-initial-supported-prefix';
 }
 if(effect.levelDelta!==undefined)e.level=Math.min(99,e.level+effect.levelDelta);
 else if(effect.control!==undefined)e.entityControlClass=effect.control;
 else if(effect.classIndex!==undefined)e.classIndex=effect.classIndex;
 else throw new TypeError('Missing source entity operation');
 Object.assign(out,partitionKnownCampaignEntities(p,o));return out;
}
export function applyReviewedStoryEntityMutation(carry,effect,{sourceInitialEntityTemplates}={}){
 const keys=Object.keys(effect??{}).sort().join(','),{definitionIndex:d,levelDelta,control}=effect??{};
 if(!['control,definitionIndex','definitionIndex,levelDelta'].includes(keys)||!(control===6&&[5,7,47].includes(d)||Number.isInteger(levelDelta)&&levelDelta==={5:5,7:1,47:4}[d]))throw new TypeError('Unreviewed source entity mutation');
 if(!carry.persistentState||carry.campaignEntityOverrides?.version!==2)throw new TypeError('Known persistent entity partition required');
 return applyAuthorizedCampaignEntityOperation(carry,effect,{initializeMissing:()=>{
  if(d!==5)throw new TypeError('Missing observed recruited entity history');
  const t=sourceInitialEntityTemplates?.find(t=>t.definitionIndex===5);
  if(!t)throw new TypeError('Reviewed initial Ma Su template required');return t;
 }});
}
