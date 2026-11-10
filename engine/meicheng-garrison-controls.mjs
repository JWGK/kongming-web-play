/** Fixed block13 absolute control writes. The source owner grants execution;
 * this helper never reconstructs unknown actor stats or historical authority. */
import {partitionKnownCampaignEntities} from './campaign-available-entities.mjs';
const IDS=Object.freeze([6,7,14,10,8,21,9,11,18,15,16,20,19,30]);
const need=(v,m)=>{if(!v)throw new TypeError(m);};
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===keys;
function site(cursor){need(Array.isArray(cursor)&&cursor.length===5&&cursor.every(Number.isInteger)&&cursor[0]===5&&cursor[1]===0&&cursor[2]===13&&cursor[3]>=2&&cursor[3]<=15&&cursor[4]===7,'Exact Meicheng control9 source cursor');return cursor[3]-2;}
function flag(c,n){const a=c?.sceneFlagBytes;need(Array.isArray(a)&&a.length===32&&a.every(v=>Number.isInteger(v)&&v>=0&&v<=255),'Exact Meicheng scene flags');return !!(a[n>>3]&(128>>(n&7)));}
function bind(c,index){need(flag(c,160+index),'Applied garrison flag required');const gate={6:111,14:110,20:113}[IDS[index]];need(gate===undefined||!flag(c,gate),'Original garrison actor must be present');}
function known(c){need(c?.persistentState&&Array.isArray(c.persistentState.party)&&c.campaignEntityOverrides?.version===2&&c.campaignEntityOverrides.unobserved==='unknown'&&Array.isArray(c.campaignEntityOverrides.entries),'Explicit known actor partition required');const rows=[...c.persistentState.party,...c.campaignEntityOverrides.entries];need(new Set(rows.map(r=>r.definitionIndex)).size===rows.length,'Disjoint known actor identities');return rows;}
/** Structure plus optional current block13/14 campaign binding. No history claim. */
export function validateMeichengGarrisonControls(value,campaign){
 need(exact(value,'entries,version')&&value.version===1&&Array.isArray(value.entries)&&value.entries.length<=6,'Exact bounded Meicheng sparse controls');
 const rows=campaign?known(campaign):null;let previous=-1;
 for(const row of value.entries){need(exact(row,'control,definitionIndex,sourceCursor')&&row.control===9,'Only reviewed garrison control9');const index=site(row.sourceCursor);need(row.definitionIndex===IDS[index]&&row.definitionIndex>previous,'Ordered unique source-bound garrison identities');previous=row.definitionIndex;
  if(campaign){bind(campaign,index);need(!rows.some(r=>r.definitionIndex===row.definitionIndex),'Sparse garrison row cannot replace known actor');}
 }
 return structuredClone(value);
}
export function applyMeichengGarrisonControl(campaign,{sourceCursor}={}){
 const index=site(sourceCursor);bind(campaign,index);const out=structuredClone(campaign),rows=known(out);
 if(Object.hasOwn(out,'sourceMeichengGarrisonControls'))validateMeichengGarrisonControls(out.sourceMeichengGarrisonControls,out);
 const d=IDS[index],row=rows.find(r=>r.definitionIndex===d);
 if(row){row.entityControlClass=9;Object.assign(out,partitionKnownCampaignEntities(out.persistentState,out.campaignEntityOverrides));}
 else {out.sourceMeichengGarrisonControls??={version:1,entries:[]};const entries=out.sourceMeichengGarrisonControls.entries;if(!entries.some(r=>r.definitionIndex===d))entries.push({definitionIndex:d,control:9,sourceCursor:[...sourceCursor]});entries.sort((a,b)=>a.definitionIndex-b.definitionIndex);validateMeichengGarrisonControls(out.sourceMeichengGarrisonControls,out);}
 return out;
}
