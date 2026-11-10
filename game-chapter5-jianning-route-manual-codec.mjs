/** Bounded representation only. Decoded data never grants source/owner authority. */
import {validateBattleSettings} from './assets/first-battle/settings/settings.mjs';
import {isChapter5JianningRouteSourceApi} from './game-chapter5-jianning-route-source.mjs';
import {createXipingOperationBudget} from './entry/xiping-budget.mjs';
export const JIANNING_ROUTE_MANUAL_PREFIX='KONGMING-JIANNING-ROUTE-MANUAL/1\n';
export const JIANNING_ROUTE_MANUAL_LIMIT=524288;
export const JIANNING_ROUTE_MANUAL_SITES=Object.freeze([[5,1,0,8,2],[5,1,1,0,6],[5,1,2,4,2]].map(Object.freeze));
const VERSION='chapter5-jianning-route-manual/1';
const need=(value,message)=>{if(!value)throw new RangeError(message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
const counter=value=>value===null||Number.isInteger(value)&&value>=0&&value<=65535;
export const isChapter5JianningRouteManualStorageLike=text=>typeof text==='string'&&text.startsWith(JIANNING_ROUTE_MANUAL_PREFIX);
/** Reject accessors, aliases, cycles, prototypes and lossy JSON before callbacks/cloning. */
function plain(value){
 const seen=new Set();let nodes=0;
 const visit=(v,depth)=>{need(++nodes<=50000&&depth<=32,'Bounded route manual data');if(v===null||typeof v==='boolean'||typeof v==='string')return;
  if(typeof v==='number'){need(Number.isSafeInteger(v)&&!Object.is(v,-0),'Exact route integer');return;}
  need(v&&typeof v==='object'&&!seen.has(v),'Plain acyclic route data');seen.add(v);
  const array=Array.isArray(v);need(Object.getPrototypeOf(v)===(array?Array.prototype:Object.prototype)||!array&&Object.getPrototypeOf(v)===null,'Plain route prototype');
  const keys=Reflect.ownKeys(v);need(keys.every(k=>typeof k==='string'),'No symbolic route fields');
  if(array)need(keys.length===v.length+1&&keys.every(k=>k==='length'||String(Number(k))===k&&Number(k)>=0&&Number(k)<v.length),'Dense route array');
  for(const k of keys){if(array&&k==='length')continue;need(!['__proto__','constructor','prototype','entryWugong','entrySource','entryChangan','entrySiege','entrySelection','entryRoute','entryDefense','entryRoute','confirmedPreparation','sourceBattleExit','retryHistory'].includes(k),'No hidden ancestry or prototype fields');const d=Object.getOwnPropertyDescriptor(v,k);need(d&&Object.hasOwn(d,'value')&&d.enumerable,'Own route data field');visit(d.value,depth+1);}
 };
 visit(value,0);
}
export const JIANNING_ROUTE_MANUAL_POLICY=Object.freeze({role:'source-manual',version:'chapter5-jianning-route-manual/1',channel:'manual',sites:JIANNING_ROUTE_MANUAL_SITES,marker:1});
export function createChapter5JianningRouteManualCodec({sourceApi}={}){
 need(isChapter5JianningRouteSourceApi(sourceApi),'Captured factory-issued route source API');const identity=sourceApi.inspectionConfigurationIdentity();need(identity.manualPersistenceEnabled===true&&identity.role==='source-manual','Persistence-enabled strict route source policy');const validateSource=sourceApi.inspectManualSnapshot;const configurationIdentity=Object.freeze([identity,sourceApi,validateSource,JIANNING_ROUTE_MANUAL_POLICY]);
 function admit(payload){
  plain(payload);need(exact(payload,'saveCursor,settings,source,turns,version')&&payload.version===VERSION,'Exact route manual envelope');
  need(JIANNING_ROUTE_MANUAL_SITES.some(site=>same(site,payload.saveCursor)),'Exact original route manual site');
  need(counter(payload.turns),'Projected route manual turns');validateBattleSettings(payload.settings);
  need(payload.source&&typeof payload.source==='object'&&!Array.isArray(payload.source),'Flat route source snapshot');
  need(createXipingOperationBudget().measureValue(payload).chars+JIANNING_ROUTE_MANUAL_PREFIX.length<=JIANNING_ROUTE_MANUAL_LIMIT,'Bounded route manual record');
  const frozen=freeze(structuredClone(payload));
  const valid=validateSource(frozen.source,Object.freeze({saveCursor:frozen.saveCursor}));
  if(valid&&typeof valid.then==='function'){Promise.resolve(valid).catch(()=>{});throw new TypeError('Synchronous return semantic admission');}
  need(valid===true,'Complete semantic route source admission');return frozen;
 }
 function encode(payload){const admitted=admit(payload),body=createXipingOperationBudget().stringify(admitted);need(body.length+JIANNING_ROUTE_MANUAL_PREFIX.length<=JIANNING_ROUTE_MANUAL_LIMIT,'Bounded route manual record');return JIANNING_ROUTE_MANUAL_PREFIX+body;}
 function decode(text,options={}){
  const channel=Object.getOwnPropertyDescriptor(options,'expectedChannel');need(channel&&Object.hasOwn(channel,'value')&&channel.value==='manual','Explicit route manual channel');
  need(isChapter5JianningRouteManualStorageLike(text)&&text.length<=JIANNING_ROUTE_MANUAL_LIMIT,'Bounded exact route manual record');
  const body=text.slice(JIANNING_ROUTE_MANUAL_PREFIX.length),budget=createXipingOperationBudget(),payload=budget.parse(body);
  need(budget.stringify(payload)===body,'Canonical route manual record');
  const turns=Object.getOwnPropertyDescriptor(options,'expectedTurns');if(turns){need(Object.hasOwn(turns,'value')&&counter(turns.value)&&payload.turns===turns.value,'Exact inner/outer return turns');}
  return admit(payload);
 }
 return Object.freeze({encode,decode,configurationIdentity});
}
