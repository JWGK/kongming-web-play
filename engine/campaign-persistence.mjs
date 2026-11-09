/** Mutable party/inventory handoff, separate from immutable scenario deployment.
 * Validates structure and supported active rules, not save authenticity.
 */
import {refreshUnit} from './battle-stats.mjs';
const clone=structuredClone,MAIN=['武力','統率力','知力'];
function requireValue(ok,message){if(!ok)throw new TypeError(message);}
function int(v,a,b,label){requireValue(Number.isSafeInteger(v)&&v>=a&&v<=b,label);return v;}
function bytes(v,n,label,max=255){requireValue(Array.isArray(v)&&v.length===n&&Array.from({length:n},(_,i)=>Object.hasOwn(v,i)).every(Boolean),label);return v.map(x=>int(x,0,max,label));}
/** Includes all eleven party members and all 255 original mutable item slots.
 * Inactive/unowned items are preserved without pretending their active effects
 * are implemented. Every actually carried item must pass the stat rule adapter.
 */
export function normalizePersistentParty(value,data){
 requireValue(value&&typeof value==='object','Persistent party required');
 const pool=data.playerDefinitionPool,templates=new Map(data.entityTemplates.map(u=>[u.definitionIndex,u]));
 requireValue(Array.isArray(value.party)&&value.party.length===pool.length,'Complete persistent party required');
 requireValue(Array.isArray(value.itemInstances)&&value.itemInstances.length===255,'255 mutable item instances required');
 const instances=value.itemInstances.map((row,i)=>{requireValue(row?.slotId===i,'Ordered item-instance slots required');const raw=bytes(row.bytes,4,'Item instance bytes'),definitionId=int(row.definitionId,0,255,'Item definition');requireValue(raw[0]===definitionId,'Item definition/bytes mismatch');return {slotId:i,definitionId,bytes:raw};});
 const seen=new Set(),party=value.party.map(row=>{const d=int(row.definitionIndex,0,511,'Party definition'),t=templates.get(d);requireValue(pool.includes(d)&&!seen.has(d),'Changed persistent party identity');seen.add(d);requireValue(row.nameJa===t.nameJa,'Changed party name');const classIndex=int(row.classIndex,0,data.reviewedShipActorClasses?.includes(row.classIndex)&&data.ownedDefinitionPool!==undefined&&!data.ownedDefinitionPool.includes(d)?42:39,'Party class');const rawOnly=data.persistentOnlyEntities?.find(e=>e.definitionIndex===d);if(rawOnly)requireValue(data.ownedDefinitionPool!==undefined&&!data.ownedDefinitionPool.includes(d)&&classIndex===rawOnly.classIndex&&rawOnly.allowedControlClasses.includes(row.entityControlClass),'Persistent-only entity cannot become an active party member');else requireValue(data.movementProfiles.some(p=>p.classIndex===classIndex),'Unsupported persistent class');const baseFields=Object.fromEntries(MAIN.map(k=>[k,int(row.baseFields?.[k],0,255,'Persistent base '+k)]));const itemSlots=bytes(row.itemSlots,13,'Persistent item slots');return {definitionIndex:d,nameJa:t.nameJa,classIndex,level:int(row.level,1,99,'Persistent level'),experience:int(row.experience,0,99,'Persistent experience'),lastLearnedStrategyMarker:int(row.lastLearnedStrategyMarker,0,255,'Persistent learned marker'),entityControlClass:int(row.entityControlClass,0,31,'Persistent entity control'),itemSlots,baseFields};});
 const normalized={currency:int(value.currency,0,50000,'Persistent currency'),party,itemInstances:instances,warehouseCounts:bytes(value.warehouseCounts,255,'Persistent warehouse'),discoveryBytes:bytes(value.discoveryBytes,32,'Persistent discovery'),cityAvailabilityBytes:bytes(value.cityAvailabilityBytes,8,'City availability')};
 // Calculate without healing. The original battle constructor later initializes
 // troops/SP from the resulting maxima, independent of town inventory order.
 for(const p of party)if(!data.persistentOnlyEntities?.some(e=>e.definitionIndex===p.definitionIndex))refreshUnit(persistentUnit(templates.get(p.definitionIndex),p,normalized),data.statsRules);
 return normalized;
}
function persistentUnit(template,row,persistent){
 const used=[...new Set([...row.itemSlots,255])].sort((a,b)=>a-b);
 const itemInstances=used.map(slotId=>({slotId,definitionId:slotId===255?255:persistent.itemInstances[slotId].definitionId}));
 return {...clone(template),classIndex:row.classIndex,level:row.level,experience:row.experience,lastLearnedStrategyMarker:row.lastLearnedStrategyMarker,entityControlClass:row.entityControlClass,itemSlots:[...row.itemSlots],statsSource:{...clone(template.statsSource),baseFields:{...row.baseFields},itemInstances}};
}
/** Overlay only persistent entities/resources; deployment/control/HP remain the
 * source constructor's responsibility. Does not mutate either argument. */
export function applyPersistentParty(data,value){
 const persistent=normalizePersistentParty(value,data),rows=new Map(persistent.party.map(p=>[p.definitionIndex,p]));
 const out=clone(data);out.entityTemplates=out.entityTemplates.map(t=>rows.has(t.definitionIndex)?refreshUnit(persistentUnit(t,rows.get(t.definitionIndex),persistent),out.statsRules):t);
 out.constructor.currency=persistent.currency;out.constructor.warehouseCounts=[...persistent.warehouseCounts];out.constructor.discoveryBytes=[...persistent.discoveryBytes];
 return {data:out,persistentState:persistent};
}
/** Merge all present battle entities into the full party; never discard optional
 * members who were not deployed. Native context flags remain a separate ledger. */
export function synchronizePersistentParty(previous,state){
 const out=clone(previous),units=new Map(state.units.filter(u=>u.definitionIndex!==null&&u.slotIndex<15).map(u=>[u.definitionIndex,u]));
 out.party=out.party.map(p=>{const u=units.get(p.definitionIndex);if(!u)return p;for(const row of u.statsSource.itemInstances){if(row.slotId===255)continue;const i=out.itemInstances[row.slotId];i.definitionId=row.definitionId;i.bytes[0]=row.definitionId;}
 return {...p,classIndex:u.classIndex,level:u.level,experience:u.experience,lastLearnedStrategyMarker:u.lastLearnedStrategyMarker??p.lastLearnedStrategyMarker,entityControlClass:u.entityControlClass,itemSlots:[...u.itemSlots],baseFields:{...u.statsSource.baseFields}};});
 out.currency=state.currency;out.warehouseCounts=[...state.warehouseCounts];out.discoveryBytes=[...state.discoveryBytes];return out;
}
