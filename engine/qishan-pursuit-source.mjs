/** Exact root4 pursuit source binding. Data integrity is not source authority. */
import {validateSecondChencangRules} from './second-chencang-source.mjs';
import {source,statsDelta} from './qishan-pursuit-source-constants.mjs';
const stable=x=>x&&typeof x==='object'?(Array.isArray(x)?x.map(stable):Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])]))):x;
export const sameQishanPursuit=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
const need=(v,m)=>{if(!v)throw new TypeError(m);},clone=structuredClone;
export const QISHAN_PURSUIT_CONTEXTS=Object.freeze(['4:0:3','4:0:4']);
export const isQishanPursuitContext=id=>QISHAN_PURSUIT_CONTEXTS.includes(id);
const pin=id=>{need(isQishanPursuitContext(id),'Unknown pursuit context');return source.profiles.find(p=>p.contextId===id);};
export const qishanPursuitProfile=id=>clone(pin(id));
export function qishanPursuitSourceCursors(id){const p=pin(id);return clone({friendlyConstructorSourceCursor:p.friendlyConstructorSourceCursor,preparationSourceCursor:p.preparationSourceCursor,enemyConstructorSourceCursor:p.enemyConstructorSourceCursor});}
export function validateQishanPursuitBoard(b){need(b?.width===32&&b.height===24&&sameQishanPursuit(b.terrain,source.profiles[0].board.terrain),'Exact pursuit map31 required');}
export function validateQishanPursuitProfile(p){need(sameQishanPursuit(p,pin(p?.contextId)),'Exact pursuit profile required');return p;}
export function validateQishanPursuitAdditions(a){need(sameQishanPursuit(a,source.sourceInitialEntityTemplateAdditions),'Exact pursuit enemy recipes required');}
export function validateQishanPursuitStatsDelta(d){need(sameQishanPursuit(d,statsDelta),'Exact pursuit item delta required');}
export function validateQishanPursuitRules(stats,movement,strategy){const n=statsDelta.append.itemDefinitions.length;need(sameQishanPursuit(stats?.itemDefinitions?.slice(-n),statsDelta.append.itemDefinitions)&&sameQishanPursuit(stats?.scopeItemDefinitionIds?.slice(-n),statsDelta.append.itemDefinitions.map(x=>x.definitionId)),'Exact pursuit appended item rules required');return validateSecondChencangRules({...stats,itemDefinitions:stats.itemDefinitions.slice(0,-n),scopeItemDefinitionIds:stats.scopeItemDefinitionIds.slice(0,-n)},movement,strategy);}
export function validateQishanPursuitRuntimeData(d){const n=d?.nextBattleContext,p=pin(n?.contextId);need(d.rulesVersion==='qishan-pursuit-engine-1'&&n.mapIndex===31&&d.variant?.id===p.contextId&&d.variant.scenarioBlock===p.block,'Exact pursuit runtime identity');validateQishanPursuitBoard(d.board);need(sameQishanPursuit(d.scenario,p.scenario),'Exact pursuit scenario');for(const[k,v]of Object.entries(qishanPursuitSourceCursors(p.contextId)))need(sameQishanPursuit(n[k],v),'Exact pursuit constructor cursor');need(sameQishanPursuit(n.header,p.friendlyDeployment)&&sameQishanPursuit(d.variant.friendlyRows,p.friendlyDeployment.rows.filter(r=>r.definition!==65535&&r.allocation_selector===1))&&sameQishanPursuit(d.variant.enemyRows,p.enemyDeployment.rows.filter(r=>r.definition!==65535))&&n.activeGroupStart===2&&sameQishanPursuit(n.reviewedDuels,p.reviewedDuels),'Exact pursuit constructors/groups/duels');}
export function validateQishanPursuitEffect(id,record,command,e){const c=pin(id).scenario.scripts[record]?.commands[command];need(c&&c.opcode===e.opcode&&sameQishanPursuit(c.decoded,e.arguments),'Unreviewed pursuit source effect');}
export function qishanPursuitCompletionReceipt(id){const p=pin(id);return {sourceCursor:{root:4,section:0,block:p.block,record:p.block===3?11:10,commandIndex:17},pendingNextContext:{root:4,section:0,block:5},kind:'next-block-consumed',narrativeOutcome:'qishan-pursuit-victory',strategyBlock:p.block};}
export function isQishanPursuitCompletionCursor(id,v){const r=qishanPursuitCompletionReceipt(id);return v?.recordIndex===r.sourceCursor.record&&v.commandIndex===17&&v.status==='complete'&&v.transition?.kind==='set_block'&&v.transition.blockIndex===5&&v.returnCode===0;}
