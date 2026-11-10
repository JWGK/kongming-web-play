/** Operation-owned accounting. New-stage parse/stringify/clone allocations are
 * preflighted. Opaque unchanged native validators keep their own limits; their
 * intermediate allocations are conservatively composed, not observed here. */
const TEXT_LIMIT=2_000_000,DEPTH_LIMIT=64,NODE_LIMIT=1_000_000;
const capacityErrors=new WeakSet();
export function xipingCapacityError(message){const error=new RangeError(message);error.code='xiping-capacity-exceeded';capacityErrors.add(error);return error;}
export const isXipingCapacityError=error=>capacityErrors.has(error);
const capacityMessages=new Set(['Stage nesting capacity','Stage node capacity','Expanded stage text size capacity','Xiping controller materialization budget','Bounded Xiping text required','One predecessor transform per Xiping operation','Bounded reviewed predecessor codec metrics required','Xiping source validation budget']);
const need=(v,m)=>{if(!v)throw capacityMessages.has(m)?xipingCapacityError(m):new RangeError(m);};
function utf8(text) {
 let n=0; for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<text.length&&text.charCodeAt(i+1)>=0xdc00&&text.charCodeAt(i+1)<=0xdfff){n+=4;i++;}else n+=3;}return n;
}
/** Iterative grammar/lexical pass BEFORE JSON.parse, including values in strings
 * only as characters, not hidden recursive JSON. Root depth is zero. */
function lexical(text) {
 let i=0,nodes=0,maxDepth=0; const frames=[];
 const ws=()=>{while(i<text.length&&[32,9,10,13].includes(text.charCodeAt(i)))i++;};
 const fail=()=>{throw new SyntaxError('Invalid stage JSON lexical structure');};
 function string(){if(text[i++]!=='"')fail();while(i<text.length){const c=text.charCodeAt(i++);if(c===34)return;if(c<32)fail();if(c===92){if(i>=text.length)fail();const e=text[i++];if(e==='u'){for(let k=0;k<4;k++){const h=text.charCodeAt(i++);if(!((h>=48&&h<=57)||(h>=65&&h<=70)||(h>=97&&h<=102)))fail();}}else if(!'"\\/bfnrt'.includes(e))fail();}}fail();}
 function value(depth){need(depth<=DEPTH_LIMIT,'Stage nesting capacity');need(++nodes<=NODE_LIMIT,'Stage node capacity');maxDepth=Math.max(maxDepth,depth);ws();const c=text[i];if(c==='{'||c==='['){i++;frames.push({kind:c,state:'first',depth});return;}if(c==='"'){string();return;}for(const literal of ['true','false','null'])if(text.startsWith(literal,i)){i+=literal.length;return;}
  const start=i;if(text[i]==='-')i++;if(text[i]==='0')i++;else {if(!(text[i]>='1'&&text[i]<='9'))fail();while(text[i]>='0'&&text[i]<='9')i++;}if(text[i]==='.'){i++;const before=i;while(text[i]>='0'&&text[i]<='9')i++;if(i===before)fail();}if(text[i]==='e'||text[i]==='E'){i++;if(text[i]==='+'||text[i]==='-')i++;const before=i;while(text[i]>='0'&&text[i]<='9')i++;if(i===before)fail();}if(i===start)fail();
 }
 value(0);while(frames.length){const f=frames[frames.length-1];ws();if(f.kind==='['){if(f.state==='first'&&text[i]===']'){i++;frames.pop();continue;}if(f.state==='after'){if(text[i]===']'){i++;frames.pop();continue;}if(text[i++]!==',')fail();f.state='value';}else{f.state='after';value(f.depth+1);}}else{if(f.state==='first'&&text[i]==='}'){i++;frames.pop();continue;}if(f.state==='after'){if(text[i]==='}'){i++;frames.pop();continue;}if(text[i++]!==',')fail();f.state='key';}else{string();ws();if(text[i++]!==':')fail();f.state='after';value(f.depth+1);}}}ws();if(i!==text.length)fail();return {nodes,maxDepth};
}
/** Exact JSON.stringify UTF-16 / UTF-8 count. Private JSON values only; no clone,
 * escaping buffer or whole text is allocated until the reservation succeeds. */
function jsonCost(value) {
 let chars=0,bytes=0,nodes=0,maxDepth=0;
 const add=(c,b=c)=>{chars+=c;bytes+=b;need(chars<=TEXT_LIMIT,'Expanded stage text size capacity');};
 function quoted(s){add(2);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c===34||c===92||[8,9,10,12,13].includes(c))add(2);else if(c<32)add(6);else if(c>=0xd800&&c<=0xdbff&&i+1<s.length&&s.charCodeAt(i+1)>=0xdc00&&s.charCodeAt(i+1)<=0xdfff){add(2,4);i++;}else if(c>=0xd800&&c<=0xdfff)add(6);else add(1,c<128?1:c<2048?2:3);}}
 function visit(v,d){need(d<=DEPTH_LIMIT,'Stage nesting capacity');need(++nodes<=NODE_LIMIT,'Stage node capacity');maxDepth=Math.max(maxDepth,d);if(v===null){add(4);return;}if(typeof v==='string'){quoted(v);return;}if(typeof v==='boolean'){add(v?4:5);return;}if(typeof v==='number'){add(Number.isFinite(v)?String(v).length:4);return;}need(typeof v==='object','Private JSON value required');add(2);if(Array.isArray(v)){for(let i=0;i<v.length;i++){if(i)add(1);visit(v[i],d+1);}}else{let first=true;for(const key of Object.keys(v)){if(!first)add(1);first=false;quoted(key);add(1);visit(v[key],d+1);}}}
 visit(value,0);return {chars,bytes,nodes,maxDepth};
}

/** One Xiping-only component. Prior full Q authentication is separately composed; its 160 MiB contract never
 * resets. One independent 32 MiB origin representation reservation is composed
 * by xiping-predecessor; it is not charged against this 32 MiB source stage. */
export function createXipingOperationBudget(){let materialized=0,sourceBytes=0,sourceCalls=0,originCalls=0,originMetrics=null,ownedSourceInputBytes=0,ownedSourceCalls=0,ownedReplayWork=0;const calls=[];
 const spend=count=>{need(Number.isSafeInteger(count)&&count>=0,'Valid Xiping work charge required');need(materialized+count<=32*1024*1024,'Xiping controller materialization budget');materialized+=count;};
 const bounded=text=>{need(typeof text==='string','Xiping text required');need(text.length<=TEXT_LIMIT,'Bounded Xiping text required');return text;};
 return Object.freeze({originTransform(fn){need(++originCalls===1,'One predecessor transform per Xiping operation');const result=fn();need(result&&result.metrics&&Number.isSafeInteger(result.metrics.accountedBytes)&&result.metrics.accountedBytes<=32*1024*1024,'Bounded reviewed predecessor codec metrics required');originMetrics={...result.metrics};return result;},work:spend,measureText(text){bounded(text);return {chars:text.length,bytes:utf8(text)};},measureValue:jsonCost,reserveValue(value){const c=jsonCost(value);spend(c.bytes);return c;},materialize(text){bounded(text);spend(utf8(text));return text;},parse(text){bounded(text);lexical(text);spend(utf8(text));return JSON.parse(text);},stringify(value){const c=jsonCost(value);spend(c.bytes);const text=JSON.stringify(value);need(text.length===c.chars,'Xiping serializer accounting mismatch');return text;},clone(value){spend(jsonCost(value).bytes);return structuredClone(value);},

 reserveOwnedSources(d){need(d&&Number.isInteger(d.sourceCalls)&&d.sourceCalls>=0&&Number.isInteger(d.sourceInputBytes)&&d.sourceInputBytes>=0&&Array.isArray(d.sourceLabels)&&d.sourceLabels.length===d.sourceCalls,'Exact private source reservation');sourceCalls+=d.sourceCalls;sourceBytes+=d.sourceInputBytes;ownedSourceCalls+=d.sourceCalls;ownedSourceInputBytes+=d.sourceInputBytes;ownedReplayWork+=d.work;need(sourceCalls<=16&&sourceBytes<=16*1024*1024,'Xiping source validation budget');calls.push(...d.sourceLabels);},
 source(label,text,fn){bounded(text);sourceCalls++;sourceBytes+=utf8(text);need(sourceCalls<=16&&sourceBytes<=16*1024*1024,'Xiping source validation budget');calls.push(label);const result=fn();need(!result?.then,'Synchronous Xiping source validation required');return result;},
 diagnostics:()=>Object.freeze({component:'xiping-controller-v1',stageMaterializedBytes:materialized,wrapperMaterializedBytes:0,aggregateMaterializedBytes:materialized,aggregateChargedAndReservedBytes:materialized,aggregateReservedLimit:32*1024*1024,sourceInputBytes:sourceBytes,sourceCalls,ownedPrefixReservation:{stageReplayBytes:ownedReplayWork,sourceInputBytes:ownedSourceInputBytes,sourceCalls:ownedSourceCalls},actualSourceCalls:sourceCalls-ownedSourceCalls,predecessorCalls:originCalls,originRepresentation:{component:'xiping-exact-q-origin-v1',actualMaterializedBytes:originMetrics?.accountedBytes??0,aggregateReservedLimit:32*1024*1024,transforms:originCalls,metrics:originMetrics},sourceLabels:[...calls],reservedPredecessorTransformBytes:32*1024*1024,sourceValidatorIntermediateWork:'unchanged-native-guards-not-instrumented'})});
}
let currentOperation=null;
export function runXipingControllerOperation(fn){need(currentOperation===null,'Reentrant Xiping stage operation');const operation=createXipingOperationBudget();currentOperation=operation;try{const result=fn(operation);need(!result?.then,'Synchronous Xiping operation required');return result;}finally{currentOperation=null;}}

export function assertXipingOperationBudget(budget){need(currentOperation===budget&&budget!==null,'Current owned Xiping operation required');return budget;}
