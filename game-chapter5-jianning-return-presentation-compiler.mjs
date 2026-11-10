/** Endpoint plans only. A later media adapter must render verified original assets.
 * No native animation timing, audio fidelity, save or publication claim. */
import {readChapter5JianningReturnSourceConfiguration} from './game-chapter5-jianning-return-config.mjs';
import {needJianningRoute as need,freezeJianningRoute as freeze} from './game-chapter5-jianning-route-validator.mjs';
const receipts=new WeakMap();
export function consumeChapter5JianningReturnPresentationReceipt(receipt,presentation,configuration){const r=receipts.get(receipt);need(r&&r.configuration===configuration&&r.presentation===presentation&&!r.consumed&&r.current(),'Current actually rendered one-use return receipt');r.consumed=true;return true;}
export function createChapter5JianningReturnPresentationCompiler({configuration,compileRoom,renderFrame}={}){
 const {locale}=readChapter5JianningReturnSourceConfiguration(configuration);need(typeof compileRoom==='function'&&typeof renderFrame==='function','Captured media compiler and actual renderer required');const tickets=new WeakMap();
 const current=t=>t.status!=='invalid'&&t.isCurrent(t.presentation,t.authority)===true;
 function get(ticket){const t=tickets.get(ticket);need(t,'Compiler-issued return presentation ticket');return t;}
 function compile(p){need(p?.version==='chapter5-jianning-return-presentation/1'&&p.displayProfile==='web-source-endpoint/1','Exact return endpoint presentation');const frame=compileRoom(p.afterRoom,{kind:p.kind,details:p.details,locale});need(frame&&typeof frame==='object'&&typeof frame.then!=='function','Synchronous captured media frame');return freeze({version:'chapter5-jianning-return-frame/1',frame,presentation:p,bgmId:p.afterRoom.bgmId,sourceCursor:p.sourceCursor});}
 function prepare(p,{authority,isCurrent}={}){need(authority&&typeof isCurrent==='function','Captured live presentation authority');const t={presentation:p,authority,isCurrent,status:'ready',paused:false,generation:0,receipt:null,error:null,plan:compile(p)};need(current(t),'Current source presentation only');const ticket=Object.freeze({});tickets.set(ticket,t);return ticket;}
 async function render(ticket){const t=get(ticket);need(current(t)&&!t.paused&&['ready','error'].includes(t.status),'Current unpaused return render or retry');const generation=++t.generation;t.status='rendering';try{need(await renderFrame(t.plan,{authority:t.authority})===true,'Actual endpoint render must confirm success');need(generation===t.generation&&current(t)&&!t.paused,'No stale or paused endpoint acknowledgement');t.status='rendered';const r=Object.freeze({});t.receipt=r;receipts.set(r,{configuration,presentation:t.presentation,consumed:false,current:()=>current(t)&&!t.paused&&t.status==='rendered'});return r;}catch(e){if(generation===t.generation)t.status=current(t)?'error':'invalid';t.error=e;throw e;}}
 function pause(ticket){const t=get(ticket);need(current(t),'Current presentation pause');t.paused=true;t.generation++;if(t.status==='rendering')t.status='ready';}
 function resume(ticket){const t=get(ticket);need(current(t)&&t.paused,'Current presentation resume');t.paused=false;return t.status;}
 function invalidate(ticket){const t=get(ticket);t.generation++;t.status='invalid';t.receipt=null;}
 function inspect(ticket){const t=get(ticket);return freeze({status:t.status,paused:t.paused,retryable:t.status==='error'&&current(t),hasReceipt:!!t.receipt&&current(t)&&!t.paused});}
 return Object.freeze({compile,prepare,render,retry:render,pause,resume,invalidate,inspect});
}
