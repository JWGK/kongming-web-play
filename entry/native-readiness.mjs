import {nativeZeroGraphSaveTarget} from './native-zero-save.mjs';
/** Exact legacy 00→15 readiness pairs. Presentation and choice routing only;
 * serialized graph IDs, phases, carry, and original source assets stay unchanged. */
const rows=[["n-d45630c64e7c12","n-3f829baa3a8069","p-d341cbd356bae2","n-40a1da4b601b68","n-2361bf50cefdf1","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-67391abd46c8bf","n-8b4b1b21190481","p-8d711c87a06305","n-9a878742fd3878","n-f7dd451f4b2c04","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-8bd79aa6e5494e","n-c4d8667b6e4ab7","p-c98ff65a314b68","n-bfd33bf61a498a","n-9c43c9fbe8231b","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-d06f6f4238a114","n-34c9ffc10df06f","p-d3e73cf0f6b025","n-20dde3c4c9e026","n-5b7d2dc31feba8","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-b4f0582a72fbeb","n-81df1e3fb6a1e3","p-9217a0346c5257","n-9f199990c44c69","n-3670258d631b6a","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-6a2c8297328eac","n-e8af43c9802c2f","p-479aace10e9747","n-5e5d8ee43cc7a3","n-c0badbdc1d98fa","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-ee4b42007be76b","n-31705d0e5d2cc4","p-5d76d141891b10","n-502e19f9123dfa","n-71be9279f8080b","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-e5e4a27bcfc7f8","n-46d73dec2ff757","p-e920ebbe940cbc","n-23ecc2f5159519","n-540fbcc40543e5","assets/section2-story/scene-fc3011dbe267384f1fc9.png"],["n-ffeb692c2c6394","n-66be5bb7741d41","p-0df7ef4f316c81","n-f1918f59e100e4","n-f8921fac1ffe1e","assets/section2-story/scene-fc3011dbe267384f1fc9.png"]];
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),guard=(ok,m)=>{if(!ok)throw new RangeError(m);};
const keys=(v,n)=>v&&same(Object.keys(v).sort(),n.split(',').sort());
const text='「準備は\n　よろしいですか？';
const jingnanRows=[['b2-r24-0','b2-r24-1','b2-r24-0-phase','b2-r24-2','b2-g2-hub','assets/map5-story/scene-bc2652b581ba604bc0db.png']];
export function createNativeReadinessGraphAdapter(data){
 const jingnan=data.graphId==='root1-section1-prebattle-v1';if(!jingnan&&data.graphId!=='root1-yizhou-prebattle-v1')return()=>null;
 const bindings=jingnan?jingnanRows:rows,chapter=jingnan?'jingnan':'yizhou',sourceContext=jingnan?{root:1,section:1,block:0}:{root:1,section:1,block:5},context={root:1,section:jingnan?1:2,block:2},body=jingnan?'「孔明、では\n　出陣いたそうか？':text,bodyRuns=jingnan?[{kind:'text',text:'「'},{kind:'control',value:2},{kind:'text',text:'孔明'},{kind:'control',value:1},{kind:'text',text:'、では\n　出陣いたそうか？'}]:[{kind:'text',text}];
 guard(data.chapterId===chapter&&same(data.sourceContext,sourceContext),'Changed readiness graph identity');
 const bound=new Map();
 for(const[pageId,choiceId,phase,yes,no,asset]of bindings){
  const p=data.nodes[pageId],c=data.nodes[choiceId],save=data.nodes[yes],hub=data.nodes[no],screen={asset,cleanScene:true,staticCheckpoint:true};
  guard(keys(p,'type,phase,pages,next,screen')&&p.type==='pages'&&p.phase===phase&&p.next===choiceId&&p.pages.length===1&&same(p.screen,screen),'Changed readiness page');
  guard(keys(p.pages[0],'textJa,runs,speakerDefinition,screen')&&p.pages[0].textJa===body&&p.pages[0].speakerDefinition===(jingnan?1:6)&&same(p.pages[0].runs,bodyRuns)&&same(p.pages[0].screen,screen),'Changed readiness dialogue');
  guard(keys(c,jingnan?'type,phase,promptJa,options':'type,phase,promptJa,options,screen')&&c.type==='choice'&&c.phase===(jingnan?'b2-r24-1-phase':phase)&&c.promptJa==='よろしいですか？'&&(jingnan||same(c.screen,screen)),'Changed readiness choice');
  guard(same(c.options,[{id:'confirm:yes',labelJa:'はい',next:yes},{id:'confirm:no',labelJa:'いいえ',next:no}]),'Changed readiness options');
  guard(same(data.phases[phase]?.context,context)&&save?.type==='manualSave'&&hub?.type==='hub'&&save.phase===(jingnan?'b2-r24-2-phase':phase)&&hub.phase===(jingnan?'b2-g2-phase':phase)&&[c.phase,save.phase,hub.phase].every(id=>same(data.phases[id],data.phases[phase])),'Changed readiness phase or targets');
  guard(nativeZeroGraphSaveTarget(data,yes)===no,'Changed readiness original zero-save binding');
  const projection=Object.freeze(structuredClone({dialogue:p.pages[0],options:c.options,cancelTarget:no,promptJa:c.promptJa}));bound.set(pageId,projection);bound.set(choiceId,projection);
 }
 const candidates=Object.entries(data.nodes).filter(([,n])=>n.type==='pages'&&n.pages?.some(p=>p.textJa===body));
 guard(candidates.length===bindings.length&&candidates.every(([id])=>bound.has(id)),'Unreviewed readiness page');
 const targets=new Set(bindings.flatMap(r=>[r[3],r[4]])),choices=Object.entries(data.nodes).filter(([,n])=>n.type==='choice'&&n.options?.some(o=>o.id==='confirm:yes'&&targets.has(o.next)));
 guard(choices.length===bindings.length&&choices.every(([id])=>bound.has(id)),'Unreviewed readiness choice');
 // Native mode2 waits after the final body page before opening the widget.
 // Keep legacy page advancement; only the subsequent choice retains dialogue.
 const choiceIds=new Set(bindings.map(row=>row[1]));
 return id=>choiceIds.has(id)?structuredClone(bound.get(id)):null;
}
