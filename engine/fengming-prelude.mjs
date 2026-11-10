/** Bounded source effects only; the story VM owns cursor advancement/once-only.
 * Unknown retired rows retain only their absolute control write. Never synthesize
 * their level/class/stats/resources. Known rows and auxiliary fields are cloned.
 */
import {partitionKnownCampaignEntities,applyAuthorizedCampaignEntityOperation} from './campaign-available-entities.mjs';
import {addNativeLifespan} from './fengming-lifespan.mjs';
import {acquireScenarioWarehouseItem} from './scenario-inventory.mjs';
import {completeCampaignRecord} from './campaign-records.mjs';
const clone=structuredClone,need=(x,m)=>{if(!x)throw new TypeError(m);};
const retired={75:2,76:3,77:47,78:58,103:58},levels={79:56,80:8,81:21,82:9};
const upbringing=[[4,5,11],[5,8,7],[9,6,6],[7,7,7]],classes=[20,1,7,29],fields=['武力','統率力','知力'];
function flags(c){const a=c.sceneFlagBytes;need(Array.isArray(a)&&a.length===32&&a.every(n=>Number.isInteger(n)&&n>=0&&n<=255),'Exact source flags required');return n=>!!(a[n>>3]&(128>>(n&7)));}
function gate(f,c){return c===103||c===88?f(191)&&!f(195):f(195);}
function key(c){need(c&&Object.keys(c).sort().join(',')==='block,commandIndex,record,root,section'&&c.root===3&&c.section===1&&['block','record','commandIndex'].every(k=>Number.isInteger(c[k])&&c[k]>=0),'Exact Fengming source cursor required');return `${c.block}:${c.record}:${c.commandIndex}`;}
export function validateFengmingSparseControls(value){
 need(value?.version===1&&Object.keys(value).sort().join(',')==='entries,version'&&Array.isArray(value.entries),'Exact Fengming sparse controls required');const ids=new Set();
 let previous=-1;for(const r of value.entries){need(r&&Object.keys(r).sort().join(',')==='control,definitionIndex,flag191,flag195,sourceCursor'&&r.control===4&&typeof r.flag191==='boolean'&&typeof r.flag195==='boolean','Invalid sparse control fields');const k=key(r.sourceCursor),c=r.sourceCursor.commandIndex;need(r.sourceCursor.block===0&&r.sourceCursor.record===2&&retired[c]===r.definitionIndex&&gate(n=>n===191?r.flag191:r.flag195,c)&&!ids.has(r.definitionIndex)&&r.definitionIndex>previous,'Unreviewed sparse retirement');ids.add(r.definitionIndex);previous=r.definitionIndex;}
 return clone(value);
}
export function applyFengmingPreludeEffect(carry,{sourceCursor,opcode,argumentBytes}={}, {itemDefinitions}={}){
 const k=key(sourceCursor),out=clone(carry),f=flags(out),p=out.persistentState,o=out.campaignEntityOverrides;
 need(p&&Array.isArray(p.party)&&o?.version===2&&o.unobserved==='unknown','Known source entity partition required');
 if(out.sourceSparseEntityControls!==undefined)validateFengmingSparseControls(out.sourceSparseEntityControls);
 let expected,kind,d,value;
 const c=sourceCursor.commandIndex;
 if(sourceCursor.block===0&&sourceCursor.record===2){
  need(gate(f,c),'Fengming source branch flags mismatch');
  if(Object.hasOwn(retired,c)){d=retired[c];value=4;kind='control';expected=[36,[d,0,4]];}
  else if(Object.hasOwn(levels,c)){d=levels[c];value=5;kind='level';expected=[57,[d,0,5]];}
  else if(c===83){kind='lifespan';value=5;expected=[43,[1,5,0]];}
  else if([43,47,88].includes(c)){kind='grant';value=c===43?57:8;expected=[27,[value]];}
 }else if(k==='1:0:41'){d=18;value=0;kind='control';expected=[36,[18,0,0]];}
 else if(k==='1:0:42'){d=18;value=12;kind='level';expected=[57,[18,0,12]];}
 else if(k==='1:0:22'){kind='record';value=174;expected=[43,[7,174,0]];}
 else if(sourceCursor.block===1&&sourceCursor.record>=4&&sourceCursor.record<=8){
  const choice=sourceCursor.record===4?0:sourceCursor.record-5,offset=sourceCursor.record===4?1:0;d=17;
  if(c===1+offset){kind='upbringing';value=choice;expected=[20,[214+choice,0]];}
  else if(c===2+offset){kind='class';value=classes[choice];expected=[58,[17,0,value]];}
  else if(c===3+offset){kind='level';value=5;expected=[57,[17,0,5]];}
 }
 need(expected&&((opcode===undefined&&argumentBytes===undefined)||(opcode===expected[0]&&JSON.stringify(argumentBytes)===JSON.stringify(expected[1]))),'Unreviewed Fengming source effect');
 if(kind==='lifespan'){out.lifespan=addNativeLifespan(out.lifespan,value);return out;}
 if(kind==='grant'){const r=acquireScenarioWarehouseItem({itemInstanceId:value,itemInstances:p.itemInstances,itemDefinitions,warehouseCounts:p.warehouseCounts,discoveryBytes:p.discoveryBytes});p.warehouseCounts=r.warehouseCounts;p.discoveryBytes=r.discoveryBytes;return out;}
 if(kind==='record'){out.nativeRecordState=completeCampaignRecord(out.nativeRecordState,value);if(!out.unlockedRecords.includes(value))out.unlockedRecords.push(value);out.records.push({recordId:value,elapsedNative:null,elapsedNativeRestored:false});return out;}
 const entity=p.party.find(e=>e.definitionIndex===d)??o.entries.find(e=>e.definitionIndex===d);
 if(!entity){
  need(kind==='control'&&value===4&&sourceCursor.block===0,'Unknown prior entity history: source first-writer proof required');
  out.sourceSparseEntityControls??={version:1,entries:[]};const entries=out.sourceSparseEntityControls.entries,row={definitionIndex:d,control:4,sourceCursor:clone(sourceCursor),flag191:f(191),flag195:f(195)},at=entries.findIndex(e=>e.definitionIndex===d);if(at<0)entries.push(row);else entries[at]=row;entries.sort((a,b)=>a.definitionIndex-b.definitionIndex);validateFengmingSparseControls(out.sourceSparseEntityControls);return out;
 }
 if(kind==='control')return applyAuthorizedCampaignEntityOperation(out,{definitionIndex:d,control:value});
 else if(kind==='level'){need(Number.isInteger(entity.level)&&entity.level>=1&&entity.level<=99,'Known current entity level required');return applyAuthorizedCampaignEntityOperation(out,{definitionIndex:d,levelDelta:value});}
 else if(kind==='class')return applyAuthorizedCampaignEntityOperation(out,{definitionIndex:d,classIndex:value});
 else if(kind==='upbringing'){
  for(let i=0;i<3;i++){need(Number.isInteger(entity.baseFields?.[fields[i]])&&entity.baseFields[fields[i]]>=0&&entity.baseFields[fields[i]]<=255,'Known current upbringing stats required');entity.baseFields[fields[i]]=(entity.baseFields[fields[i]]+upbringing[value][i])&255;}
  const flag=214+value;out.sceneFlagBytes[flag>>3]|=128>>(flag&7);
 }
 Object.assign(out,partitionKnownCampaignEntities(p,o));return out;
}

/** Browser graph API: source cursor only; no raw operand payload is projected. */
export function applyFengmingPreludeAtCursor(carry,sourceCursor,options={}){return applyFengmingPreludeEffect(carry,{sourceCursor},options);}
