/** Canonical common interior-exit text. This is a presentation projection only:
 * no choice, state, save, availability, scene or transition ownership changes.
 * Exact native bytes and legacy graph provenance are independently audited. */
import {legacyInteriorExitBindings} from './native-interior-exit-legacy.mjs';
const source='「外に出るかな？',legacy='外に出ようかな？';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const guard=(ok,message)=>{if(!ok)throw new RangeError(message);};
const keys=(value,names)=>value&&same(Object.keys(value).sort(),names.split(',').sort());
export function nativeInteriorExitDialogue(){return{speakerDefinition:0,textJa:source,runs:[{kind:'text',text:source}]};}
/** The explicit legacy adapter leaves all source graphs and serialized IDs intact.
 * Unknown or changed candidates are not reclassified by Japanese substring. */
export function createNativeInteriorExitGraphAdapter(data){
 const binding=legacyInteriorExitBindings[data.graphId],admitted=new Set();
 const candidates=Object.entries(data.nodes).filter(([,n])=>n.dialogue?.textJa===legacy);
 if(!binding){guard(candidates.length===0,'Unreviewed legacy interior-exit graph');return()=>null;}
 guard(data.chapterId===binding.chapterId&&same(data.sourceContext??null,binding.sourceContext),'Changed interior-exit graph identity');
 for(const [id,[phase,yes,no,context]] of Object.entries(binding.nodes)){
  const n=data.nodes[id],yesNode=data.nodes[yes],noNode=data.nodes[no];
  guard(keys(n,Object.hasOwn(n??{},'screen')?'back,dialogue,options,phase,screen,type':'back,dialogue,options,phase,type')&&n.type==='choice'&&n.phase===phase&&n.back===no,'Changed interior-exit node');
  guard(same(data.phases[phase]?.context??null,context)&&yesNode?.type==='town'&&noNode?.type==='hub'&&yesNode.phase===phase&&noNode.phase===phase,'Changed interior-exit context or targets');
  guard(keys(n.dialogue,'runs,speakerDefinition,textJa')&&n.dialogue.speakerDefinition===0&&n.dialogue.textJa===legacy&&same(n.dialogue.runs,[{kind:'text',text:legacy}]),'Changed interior-exit dialogue');
  guard(Array.isArray(n.options)&&n.options.length===2&&n.options.every(o=>keys(o,'id,labelJa,next'))&&same(n.options,[{id:'exit:yes',labelJa:'出る',next:yes},{id:'exit:no',labelJa:'出ない',next:no}]),'Changed interior-exit options');
  admitted.add(id);
 }
 guard(candidates.length===admitted.size&&candidates.every(([id])=>admitted.has(id)),'Unreviewed additional interior-exit node');
 return id=>admitted.has(id)?nativeInteriorExitDialogue():null;
}
/** Explicit per-localizer compatibility alias; called AFTER substring tokens are
 * compiled so this cannot introduce generic replacements in unrelated text. */
export function projectNativeInteriorExitLocale({exact,runVariants,sourceRuns}){
 if(!exact.has(legacy))return;
 const target=exact.get(legacy);
 guard(['要不要出去看看？','要到外面去嗎？'].includes(target),'Unreviewed interior-exit translation');
 const runs=[{kind:'text',text:target}],key=JSON.stringify([{kind:'text',text:source}]);
 guard(!exact.has(source)||exact.get(source)===target,'Conflicting canonical interior-exit translation');
 guard(!sourceRuns.has(source)||same(sourceRuns.get(source),runs),'Conflicting canonical interior-exit source runs');
 guard(!runVariants.has(key)||same(runVariants.get(key),runs),'Conflicting canonical interior-exit run variant');
 exact.set(source,target);sourceRuns.set(source,runs);runVariants.set(key,runs);
}
