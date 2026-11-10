/** Bounded representation only. Decoded data never grants source/owner authority. */
import {validateBattleSettings} from './assets/first-battle/settings/settings.mjs';
import {createXipingOperationBudget} from './entry/xiping-budget.mjs';
export const JIANNING_RETURN_MANUAL_PREFIX='KONGMING-JIANNING-RETURN-MANUAL/1\n';
export const JIANNING_RETURN_MANUAL_LIMIT=524288;
export const JIANNING_RETURN_MANUAL_SITES=Object.freeze([[5,1,5,0,13]].map(Object.freeze));
const VERSION='chapter5-jianning-return-manual/1';
const need=(value,message)=>{if(!value)throw new RangeError(message);};
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys;
const counter=value=>value===null||Number.isInteger(value)&&value>=0&&value<=65535;
export const isChapter5JianningReturnManualStorageLike=text=>typeof text==='string'&&text.startsWith(JIANNING_RETURN_MANUAL_PREFIX);
/** Reject accessors, aliases, cycles, prototypes and lossy JSON before callbacks/cloning. */
function plain(value){
 const seen=new Set();let nodes=0;
 const visit=(v,depth)=>{need(++nodes<=50000&&depth<=32,'Bounded return manual data');if(v===null||typeof v==='boolean'||typeof v==='string')return;
  if(typeof v==='number'){need(Number.isSafeInteger(v)&&!Object.is(v,-0),'Exact return integer');return;}
  need(v&&typeof v==='object'&&!seen.has(v),'Plain acyclic return data');seen.add(v);
  const array=Array.isArray(v);need(Object.getPrototypeOf(v)===(array?Array.prototype:Object.prototype)||!array&&Object.getPrototypeOf(v)===null,'Plain return prototype');
  const keys=Reflect.ownKeys(v);need(keys.every(k=>typeof k==='string'),'No symbolic return fields');
  if(array)need(keys.length===v.length+1&&keys.every(k=>k==='length'||String(Number(k))===k&&Number(k)>=0&&Number(k)<v.length),'Dense return array');
  for(const k of keys){if(array&&k==='length')continue;need(!['__proto__','constructor','prototype','entryWugong','entrySource','entryChangan','entrySiege','entrySelection','entryReturn','entryDefense','entryRoute','confirmedPreparation','sourceBattleExit','retryHistory'].includes(k),'No hidden ancestry or prototype fields');const d=Object.getOwnPropertyDescriptor(v,k);need(d&&Object.hasOwn(d,'value')&&d.enumerable,'Own return data field');visit(d.value,depth+1);}
 };
 visit(value,0);
}
export function createChapter5JianningReturnManualCodec({validateSource}={}){
 need(typeof validateSource==='function','Fixed semantic return source validator');
 function admit(payload){
  plain(payload);need(exact(payload,'saveCursor,settings,source,turns,version')&&payload.version===VERSION,'Exact return manual envelope');
  need(JIANNING_RETURN_MANUAL_SITES.some(site=>same(site,payload.saveCursor)),'Exact original return manual site');
  need(counter(payload.turns),'Projected return manual turns');validateBattleSettings(payload.settings);
  need(payload.source&&typeof payload.source==='object'&&!Array.isArray(payload.source),'Flat return source snapshot');
  need(createXipingOperationBudget().measureValue(payload).chars+JIANNING_RETURN_MANUAL_PREFIX.length<=JIANNING_RETURN_MANUAL_LIMIT,'Bounded return manual record');
  const frozen=freeze(structuredClone(payload));
  const valid=validateSource(frozen.source,Object.freeze({saveCursor:frozen.saveCursor}));
  if(valid&&typeof valid.then==='function'){Promise.resolve(valid).catch(()=>{});throw new TypeError('Synchronous return semantic admission');}
  need(valid===true,'Complete semantic return source admission');return frozen;
 }
 function encode(payload){const admitted=admit(payload),body=createXipingOperationBudget().stringify(admitted);need(body.length+JIANNING_RETURN_MANUAL_PREFIX.length<=JIANNING_RETURN_MANUAL_LIMIT,'Bounded return manual record');return JIANNING_RETURN_MANUAL_PREFIX+body;}
 function decode(text,options={}){
  const channel=Object.getOwnPropertyDescriptor(options,'expectedChannel');need(channel&&Object.hasOwn(channel,'value')&&channel.value==='manual','Explicit return manual channel');
  need(isChapter5JianningReturnManualStorageLike(text)&&text.length<=JIANNING_RETURN_MANUAL_LIMIT,'Bounded exact return manual record');
  const body=text.slice(JIANNING_RETURN_MANUAL_PREFIX.length),budget=createXipingOperationBudget(),payload=budget.parse(body);
  need(budget.stringify(payload)===body,'Canonical return manual record');
  const turns=Object.getOwnPropertyDescriptor(options,'expectedTurns');if(turns){need(Object.hasOwn(turns,'value')&&counter(turns.value)&&payload.turns===turns.value,'Exact inner/outer return turns');}
  return admit(payload);
 }
 return Object.freeze({encode,decode});
}
