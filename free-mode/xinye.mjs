import {createBattleAI} from '../engine/battle-ai.mjs';
import {createXinyeFreeScenarioInventory} from './xinye-scenario.mjs';
import {createFreeXinyeTacticalCandidate} from '../engine/battle-state.mjs';
import original from './xinye-source.mjs';
import {xinyeZhHant} from './xinye-locale.mjs';
import {createXinyeResultClaim} from './xinye-result.mjs';
import {matchesScenarioDescriptor} from '../engine/scenario-events.mjs';
import {constructVariantUnits, preparationSpec} from '../engine/battle-variants.mjs';
import {readCampaignRecordBits} from '../engine/campaign-records.mjs';
import {projectXinyeVictoryExperience} from './xinye-xp.mjs';
import {refreshUnit} from '../engine/battle-stats.mjs';

const pin = original.source.romSha256;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
};
const expect = (ok, why) => { if (!ok) throw new RangeError(why); };
const integer = (x, min, max) => Number.isInteger(x) && x >= min && x <= max;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const source = freeze(original);
const {constructor: ctor, map, reward} = source;
export const xinyeFreeStage = freeze({
  id:0, context:'6:0:0', title:'新野城', source:source.source, unlock:source.unlock,
  victory:'全滅敵軍', turnLimit:ctor.allyHeader[1], fixedLeader:0, optionalCapacity:14,
  fieldAsset:'assets/next-battle/map/map-1.png', openingBgm:4, victoryBgm:13, defeatBgm:14,
  currencyGrant:reward.victoryCurrencyGrant, currencyCap:reward.currencyCap, experienceGrant:reward.victoryParameterByte,
});
const rowMap = new Map(source.records.map(row => [row.record,row]));
const texts = new Map(source.dialogues.map(d => [d.reference, d.pages.map((p, i) => ({
  speakerDefinition:p.speakerSource, nameJa:p.speakerNameJa, textJa:p.textJa,
  text:xinyeZhHant[d.reference][i], sourceOffset:p.offset,
}))]));
for (const label of source.labels) texts.set(label.reference, [{
  textJa:label.page.textJa, text:xinyeZhHant[label.reference][0], sourceOffset:label.page.offset,
}]);
for (const rows of texts.values()) { expect(rows.every(row=>typeof row.text === 'string'),'Missing Xinye localized text'); freeze(rows); }
export const xinyeText = ref => texts.get(ref) ?? null;

// Only use a verified, already-selected manual save's native ledger. This helper
// does not authenticate raw saves, create System5 data, or infer unlocks from progress.
export function hasXinyeFreeUnlock(nativeRecordState) {
  try { return readCampaignRecordBits(nativeRecordState,'unlockSlots',0,1); }
  catch { return false; }
}

function engineRow(row, enemy) {
  return {
    row_index:row.row, definition:row.definition, x:row.x, y:row.y,
    allocation_selector:enemy?0:row.allocation, condition_enabled:row.condition!==0,
    condition_flag:row.flag, direction_source:row.direction, hidden:row.hidden,
    ...enemy&&{control_mode:row.control, target_argument_u16:row.target, class_source:row.cls,
      level_source:row.level, trailing_bytes:[...row.aux]},
  };
}
function enemyTemplate(row, statsRules) {
  const actor = source.actorDefinitions[row.definition];
  expect(actor?.id===row.definition, 'Unknown source enemy');
  const [strength, leadership, intelligence] = actor.base;
  return refreshUnit({
    definitionIndex:actor.id, nameJa:actor.nameJa, classIndex:row.cls, level:row.level,
    experience:0, lastLearnedStrategyMarker:0, entityControlClass:ctor.control9.includes(row.definition)?9:1,
    itemSlots:Array(13).fill(255), status24:2, status25:2, status26:0,
    statsSource:{baseFields:{武力:strength,統率力:leadership,知力:intelligence},
      sourceField08:actor.sourceField08,itemInstances:[{slotId:255,definitionId:255}]},
  },statsRules);
}
// Data consumed by the published variant constructor. Inputs have to come from
// the actual selected-save owner later; this detached constructor never loads/writes storage.
export function createXinyePreparation({base,nextCatalog,statsRules,movementProfiles,party}={}) {
  expect(base?.sourceRomSha256===pin && nextCatalog?.sourceRomSha256===pin && statsRules?.source_rom?.sha256===pin,'Wrong stock source identity');
  expect(nextCatalog.board.width===map.width && nextCatalog.board.height===map.height &&
    same(nextCatalog.board.terrain,map.rows.flat()),'Stock Map 1 terrain mismatch');
  expect(Array.isArray(party)&&party.length>0&&party.length<=236&&party.every(p=>integer(p?.definitionIndex,0,235)),'Invalid carried allies');
  const partyIds=party.map(a=>a.definitionIndex);
  expect(new Set(partyIds).size===partyIds.length,'Duplicate ally definition');
  const blocked=new Set([...ctor.control9,...source.enemy.map(a=>a.definition)]);
  const allowed=party.filter(a=>!blocked.has(a.definitionIndex)&&[0,6].includes(a.entityControlClass));
  expect(allowed.some(a=>a.definitionIndex===0),'Missing deployed 孔明');
  const empty=base.constructor.units.find(u=>u.definitionIndex===null);
  expect(empty,'Stock empty slot required');
  const data={
    purpose:base.purpose,sourceRomSha256:pin, board:structuredClone(nextCatalog.board),
    nextBattleContext:{contextId:'6:0:0',mapIndex:1,sceneMode:map.scene},
    variant:{id:'6:0:0',scenarioBlock:0,entryFlags:Array(256).fill(false),friendlyRows:source.ally.map(a=>engineRow(a,false)),
      enemyRows:source.enemy.map(a=>engineRow(a,true))},
    statsRules:structuredClone(statsRules),movementProfiles:structuredClone(movementProfiles),
    playerDefinitionPool:allowed.map(a=>a.definitionIndex),
    entityTemplates:[...structuredClone(allowed),...source.enemy.map(a=>enemyTemplate(a,statsRules))],
    emptyUnits:Array.from({length:45},(_,slotIndex)=>({...structuredClone(empty),slotIndex})),
  };
  const spec=freeze(preparationSpec(data));
  function deploy(selectedIds) {
    expect(Array.isArray(selectedIds)&&selectedIds.length<=14&&Array.from({length:selectedIds.length},(_,i)=>Object.hasOwn(selectedIds,i)&&spec.optionalDefinitions.includes(selectedIds[i])).every(Boolean),'Invalid ally selection');
    const {units,rows}=constructVariantUnits(data,selectedIds);
    return freeze({stage:xinyeFreeStage,board:structuredClone(data.board),units,rows,selectedIds:[...selectedIds]});
  }
  function tacticalSetup(selectedIds,{persistentState,cacheStatsRules}={}) {
    const deployment=deploy(selectedIds);
    const {currency,warehouseCounts,discoveryBytes,itemInstances}=persistentState??{};
    expect(integer(currency,0,50000)&&warehouseCounts?.length===255&&discoveryBytes?.length===32&&
      itemInstances?.length===255, 'Validated Xinye persistent state required');
    expect(cacheStatsRules?.source_rom?.sha256===pin, 'Free Xinye cache definition source required');
    const drawDefinitions=new Set(reward.tilePrizes.idsInOrder.map(id=>itemInstances[id]?.definitionId));
    const cacheItemDefinitions=structuredClone(statsRules.itemDefinitions);
    for(const definitionId of drawDefinitions) {
      if(cacheItemDefinitions.some(d=>d.definitionId===definitionId))continue;
      const definition=cacheStatsRules.itemDefinitions.find(d=>d.definitionId===definitionId);
      expect(definition, 'Unverified Free Xinye cache item definition');
      cacheItemDefinitions.push(structuredClone(definition));
    }
    const [retreatLocked,turnLimit,,,victoryEnabled,a,b,,defeatEnabled,c,d]=ctor.allyHeader;
    const header={turn_limit:turnLimit,scene_boolean_01c6:!!retreatLocked,
      death_conditions:{victoryEnabled:!!victoryEnabled,victoryDefinition:a|(b<<8),
        defeatEnabled:!!defeatEnabled,defeatDefinition:c|(d<<8)}};
    const tacticalData={...data,rulesVersion:'free-xinye-engine-1',scenario:createXinyeFreeScenarioInventory(),
      terrainDefense:structuredClone(base.terrainDefense),weatherThresholds:structuredClone(base.weatherThresholds),
      classGroups:structuredClone(base.classGroups),
      constructor:{...structuredClone(base.constructor),units:structuredClone(deployment.units),
        turnLimit,currency,warehouseCounts:[...warehouseCounts],discoveryBytes:[...discoveryBytes]},
      nextBattleContext:{...data.nextBattleContext,activeGroupStart:2,header,cacheItemDefinitions,itemInstances:structuredClone(itemInstances)},
    };
    const selected=[...deployment.selectedIds,...Array(spec.capacity-deployment.selectedIds.length).fill(null)];
    return freeze({tacticalData,selected});
  }
  function openTactical(selectedIds,{strategyRules,seed=0,...options}={}) {
    const {tacticalData,selected}=tacticalSetup(selectedIds,options);
    const {newGame,reduce,choices}=createFreeXinyeTacticalCandidate({data:tacticalData,strategyRules,
      adapters:{ai:createBattleAI({rules:tacticalData,strategyRules})}});
    let state=newGame({seed,deploymentSelection:selected});
    const result=createXinyeResultClaim({inspect:()=>state});
    return Object.freeze({
      result,
      inspect:()=>state,
      choices:()=>choices(state),
      dispatch(command) {
        expect(['advance','acknowledge','select_unit','preview_destination','confirm_destination','cancel','wait','end_player_phase','attack','begin_strategy_targeting','strategy','begin_item_targeting','item','transfer_item'].includes(command?.type),
          'Free Xinye command not enabled in this candidate');
        state=reduce(state,command);
        return state;
      },
    });
  }
  return Object.freeze({spec,deploy,tacticalSetup,openTactical});
}

function makeQuery(event) {
  switch (event.kind) {
    case 'opening': case 'return': return {kind:'generic'};
    case 'turn_start': case 'postdeath': return {kind:event.kind,value:event.value};
    case 'coordinate': return {kind:event.kind,selector:event.selector,x:event.x,y:event.y};
    case 'victory': case 'defeat': return {kind:event.kind};
    default: throw new RangeError('Unknown Xinye source signal');
  }
}
const cases={opening:[1],turn_start:[2,3],victory:[4],defeat:[5],coordinate:[6,8],postdeath:[7],return:[9]};
const descriptor = row => ({type_raw:row.typeRaw, selector:row.selector, argument_b:row.argB, argument_c:row.argC});
export function resolveXinyeCacheBucket(bucket) {
  expect(integer(bucket,0,reward.tilePrizes.rngUpperExclusive-1),'Invalid source prize bucket');
  return reward.tilePrizes.idsInOrder[bucket];
}
// Trusted tactical signals only. The host is responsible for applying effects
// before committing and supplying source RNG. No campaign balances/ranks are written.
export function createXinyeFreeEventRun() {
  const plans=new WeakMap();
  let state=freeze({phase:'unopened',flags:[false,false,false],reinforcements:[],outcome:null});
  function plan(event) {
    const signal=makeQuery(event);
    const prior=state, {kind}=event;
    if (kind==='opening' ? prior.phase!=='unopened' : kind==='return' ? prior.phase!=='terminal' : prior.phase!=='active') return null;
    const row=cases[kind].filter(r=>kind!=='turn_start'||!prior.reinforcements.includes(r)).map(r=>rowMap.get(r))
      .find(r=>matchesScenarioDescriptor(descriptor(r),signal));
    if (!row) return null;
    const flags=[...prior.flags], steps=[];
    for (let i=0;i<row.commands.length;i++) {
      const c=row.commands[i], d=c.decoded;
      if (c.opcode===33) {
        if (!(d.allSet.every(f=>flags[f])&&d.allClear.every(f=>!flags[f]))) i+=d.skipCommands;
        continue;
      }
      if (c.opcode===20) flags[d.flag]=d.value;
      if (c.opcode===255) continue;
      if ([0,11,48].includes(c.opcode)) steps.push({...c,pages:xinyeText(d.reference)});
      else if (c.opcode===27) {
        expect(d.value===reward.tilePrizes.selector,'Unknown source item operation');
        steps.push({...c,draw:{upperExclusive:reward.tilePrizes.rngUpperExclusive,tableOffset:reward.tilePrizes.tableOffset}});
      } else steps.push(c);
    }
    if (!steps.length) return null;
    const ending=['victory','defeat'].includes(kind);
    const next=freeze({phase:ending?'terminal':kind==='return'?'closed':'active',flags,
      reinforcements:kind==='turn_start'?[...prior.reinforcements,row.record]:prior.reinforcements,
      outcome:ending?kind:prior.outcome});
    const ticket=freeze({record:row.record,steps,outcome:next.outcome});
    plans.set(ticket,{prior,next});
    return ticket;
  }
  function commit(ticket) {
    const value=plans.get(ticket);
    if (!value || value.prior!==state) return false;
    state=value.next; plans.delete(ticket); return true;
  }
  function projectVictory({currency,field,applyExperience}={}) {
    expect(state.outcome==='victory'&&['terminal','closed'].includes(state.phase),'No accepted Xinye victory');
    expect(integer(currency,0,reward.currencyCap),'Invalid current treasury');
    const nextCurrency=Math.min(reward.currencyCap,currency+reward.victoryCurrencyGrant);
    return freeze({currency:nextCurrency,gain:nextCurrency-currency,
      experience:projectXinyeVictoryExperience({context:'6:0:0',phase:1,terminal:4,field,applyExperience})});
  }
  return Object.freeze({plan,commit,projectVictory,get state(){return state;}});
}
