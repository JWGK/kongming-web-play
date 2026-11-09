/** Explicit browser allowlist. Never ship private extraction reports verbatim. */
import {refreshUnit} from './battle-stats.mjs';
import {normalizeScenarioInventory} from './scenario-events.mjs';
const copy=x=>structuredClone(x);
const pick=(x,keys)=>Object.fromEntries(keys.filter(k=>Object.hasOwn(x,k)).map(k=>[k,copy(x[k])]));
const UNIT=['slotIndex','definitionIndex','nameJa','classIndex','level','position','state15','flags16','control17','facing18','priority20','followSlot','aiDestination','status24','status25','status26','statusCounter27','troops','strategyPoints','experience','lastLearnedStrategyMarker','itemSlots','entityControlClass'];
function unit(u){const out=pick(u,UNIT);if(u.definitionIndex!==null){out.statsSource={baseFields:copy(u.statsSource.baseFields),sourceField08:u.statsSource.sourceField08,itemInstances:u.statsSource.itemInstances.map(i=>pick(i,['slotId','definitionId']))};out.stats=pick(u.stats,['武力','統率力','知力','攻撃力','防御力','最大兵数','最大策略値','攻撃速度','auxiliary','firstWeapon']);}return out;}
function snapshot(x){return {...pick(x,['rawTurn','turnLimit','weather','terminalCode','configurationScale','controlConfigurationByte','scenarioFlags','currency','warehouseCounts','discoveryBytes']),units:x.units.map(unit)};}
export function normalizeBattleData(data){
 const out=pick(data,['schemaVersion','purpose','sourceRomSha256','board','terrainDefense','movementProfiles','weatherThresholds','classGroups','weatherNames','terrainEffectNames']);
 out.rulesVersion='bowangpo-engine-1';out.constructor=snapshot(data.constructor);out.canonical=snapshot(data.canonical);
 out.deploymentRows=data.deploymentRows.map(r=>({definition_index:r.definition_index,slot_index:r.slot_index,source_coordinate_bytes:copy(r.source_coordinate_bytes),orientation:r.orientation??((parseInt(r.source_record_hex.slice(16,18),16)>>2)&1)}));
 out.scenario=normalizeScenarioInventory(data.scenario);
 out.statsRules={...pick(data.statsRules,['schema_version','purpose','universalApplicableFamilies','scopeClassIndices','scopeItemDefinitionIds']),source_rom:{sha256:data.statsRules.source_rom.sha256},classes:data.statsRules.classes.map(r=>pick(r,['classIndex','nameJa','coefficients','troopsBase','troopsPerLevel','strategyBase','strategyPerLevel','attackSpeedBase','allowedWeaponFamilies','forbiddenOriginalSlots','armorFamily'])),itemDefinitions:data.statsRules.itemDefinitions.map(r=>pick(r,['definitionId','nameJa','family','primaryEffectType','primaryMagnitude','secondaryEffectType','secondaryMagnitude','buyPrice','sellPrice']))};
 if(data.statsRules.townScope)out.statsRules.townScope=pick(data.statsRules.townScope,['cities','shopCityId','weapons','tools']);
 return out;
}
export function normalizeStrategyRules(rules){return {...pick(rules,['schemaVersion','purpose','sourceSha256','physicalRangeCodes','targetingOffsets','terrainElementPercentages','weatherElementPercentages','weatherTypeToProfile','healingModes','firstBattleClasses','firstBattleLearnableStrategyIds']),strategies:rules.strategies.map(r=>pick(r,['strategyIndex','nameJa','rangeCode','spCost','requiredLevelByClass']))};}

export function normalizeVariantCatalog(catalog,statsRules){
 const row=r=>pick(r,['row_index','definition','x','y','condition_enabled','direction_source','hidden','control_mode','class_source','level_source']);
 return {...pick(catalog,['schemaVersion','purpose','sourceRomSha256','movementProfiles','playerDefinitionPool']),
  entityTemplates:catalog.entityTemplates.map(u=>unit(refreshUnit(u,statsRules))),
  variants:catalog.variants.map(v=>({...pick(v,['id','scenarioBlock','entryFlags','branchFlags','seal','strategy','mapIndex','requiresPreparation']),friendlyRows:v.friendlyRows.map(row),enemyRows:v.enemyRows.map(row),scenario:normalizeScenarioInventory(v.scenario)}))};
}
