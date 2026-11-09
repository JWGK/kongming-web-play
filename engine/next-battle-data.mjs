/** Source-reviewed section 0:2 deployment/data composition.
 * Enemy defaults: F4C0; class/level override:47020→3399C; refill:33A28.
 * Persistent party/resource overlay is shared with the accepted first battle.
 * The separate chapter engine owns source opening, transition and save binding.
 */
import {createScenarioEventInterpreter} from './scenario-events.mjs';
import {constructVariantUnits} from './battle-variants.mjs';
import {applyPersistentParty} from './campaign-persistence.mjs';
import {refreshUnit} from './battle-stats.mjs';
const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
export function createReviewedNextBattleData({base,firstCatalog,nextCatalog,statsRules,contextId,persistentState,preludeFlags}={}){
 if(base?.sourceRomSha256!==SHA||firstCatalog?.sourceRomSha256!==SHA||nextCatalog?.sourceRomSha256!==SHA||nextCatalog.purpose!=='reviewed_next_battle_catalog')throw new TypeError('Source-bound catalogs required');
 const v=nextCatalog.variants.find(v=>v.contextId===contextId);if(!v||!['0:2:1','0:2:2'].includes(contextId))throw new TypeError('Unsupported next context');createScenarioEventInterpreter(v.scenario);
 if(nextCatalog.board.width!==26||nextCatalog.board.height!==20||nextCatalog.board.terrain.length!==520)throw new TypeError('Wrong next geometry');
 if(!Array.isArray(preludeFlags)||preludeFlags.length!==256||!Array.from({length:256},(_,i)=>Object.hasOwn(preludeFlags,i)).every(Boolean)||preludeFlags.some(f=>typeof f!=='boolean')||!preludeFlags[v.entryFlag]||preludeFlags[v.entryFlag===10?11:10])throw new TypeError('Exact selected strategy flags required');
 const data=structuredClone(base);data.board=structuredClone(nextCatalog.board);data.statsRules=structuredClone(statsRules);data.scenario=structuredClone(v.scenario);
 delete data.canonical; // Never expose the first battle's reference snapshot as a new-map state.
 data.rulesVersion='xinye-engine-1';data.nextBattleContext={contextId,mapIndex:1,sceneMode:0x3001,activeGroupStart:2,header:structuredClone(v.friendlyDeployment),runtimeHostImplemented:true};
 data.playerDefinitionPool=[...firstCatalog.playerDefinitionPool];
 data.entityTemplates=[...firstCatalog.entityTemplates.filter(u=>data.playerDefinitionPool.includes(u.definitionIndex)),...v.enemyEntityTemplates].map(u=>refreshUnit(structuredClone(u),data.statsRules));
 data.movementProfiles=[...structuredClone(firstCatalog.movementProfiles),structuredClone(nextCatalog.movementProfile15)];
 data.emptyUnits=base.constructor.units.map((_,slotIndex)=>({...structuredClone(base.constructor.units.find(u=>u.definitionIndex===null)),slotIndex}));
 data.variant={id:contextId,scenarioBlock:Number(contextId.split(':')[2]),entryFlags:[...preludeFlags],friendlyRows:structuredClone(v.friendlyDeployment.rows.filter(r=>r.definition!==65535)),enemyRows:structuredClone(v.enemyDeployment.rows.filter(r=>r.definition!==65535))};
 const applied=applyPersistentParty(data,persistentState),out=applied.data,built=constructVariantUnits(out,[]);
 out.nextBattleContext.itemInstances=structuredClone(applied.persistentState.itemInstances);
 out.constructor.units=built.units;out.constructor.scenarioFlags=[...preludeFlags];out.constructor.turnLimit=v.friendlyDeployment.turn_limit;out.deploymentRows=built.rows;
 return {data:out,persistentState:applied.persistentState};
}
