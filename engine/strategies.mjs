/** Original elemental strategy and troop-healing arithmetic; Japanese labels retained.
 * Action legality uses the shared original target geometry, never Manhattan guesses.
 */
import {protectionBookTargets} from './protection-book-targeting.mjs';
import {calculateStrategyPointSupport,calculateProtectionSupport} from './support-strategies.mjs';
import {applyFamily26RankPromotion} from './rank-promotion.mjs';
import {drawOriginalRandom,calculatePhysicalExperience,calculateHealingExperience,applyExperience} from './combat.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
import {battleFacingPair} from './battle-facing.mjs';
import {enumerateTargets} from './targeting.mjs';
import {captureActionPresentation,presentationForTarget} from './action-presentation.mjs';
const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
function int(v,min,max,label){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(label);return v;}
function rulesOf(r){if(r?.purpose!=='private_static_strategy_rules'||r.sourceSha256!==SHA||r.strategies?.length!==56)throw new TypeError('Validated strategy rules required');return r;}
function strategy(r,index){rulesOf(r);return r.strategies[int(index,0,55,'strategyIndex')];}
export function learnedStrategies({unit,rules}){
 const c=int(unit.classIndex,0,39,'classIndex'),lv=int(unit.level,0,255,'Lv'),sp=int(unit.strategyPoints,0,0x7fffffff,'策略値');
 return Object.freeze(rulesOf(rules).strategies.filter(s=>s.requiredLevelByClass[c]>0&&s.requiredLevelByClass[c]<=lv).map(s=>Object.freeze({strategyIndex:s.strategyIndex,nameJa:s.nameJa,spCost:s.spCost,rangeCode:s.rangeCode,usable:(unit.status26&4)===0&&sp>=s.spCost})));
}
export function strategyTargets({actor,units,strategyIndex,rules,width,height,itemMode=false,itemInstanceId=null}){
 const s=strategy(rules,strategyIndex);
 if(itemMode&&strategyIndex===51)return protectionBookTargets({itemInstanceId,actor,units,width,height});
 const friendly=strategyIndex>=34&&strategyIndex<=51||strategyIndex===53;
 // Source callers use explicit side masks; unimplemented families cannot
 // inherit a universal friendly flag merely from their numerical index.
 if(!(strategyIndex<=19||[23,24,25,26,27,28,29,30,31,32,33,41,43,44,45,46,47,48,49,50,51,52,53].includes(strategyIndex)||(itemMode&&strategyIndex===43)||(strategyIndex>=34&&strategyIndex<=40)))throw new UnsupportedRuleError('strategy_target_family');
 // 21E6C -> 36DA4 has no selected target: actor-centred self + eight-neighbour healing.
 if(strategyIndex===37||strategyIndex===38)return Object.freeze([actor.slotIndex]);
 return enumerateTargets({actor,units,rangeCode:128|s.rangeCode,sideMask:([43,44,45].includes(strategyIndex)&&!itemMode)||strategyIndex===50?3:friendly?1:0,width,height});
}
function effectiveStrategyInt(unit,healing=false){
 const n=int(unit.stats?.知力,0,500,'知力'),c=int(unit.classIndex,0,39,'classIndex');
 if([18,19,20,27,29,32,33].includes(c)||(!healing&&c===28))return n*2;
 if([28,38,39].includes(c))return Math.floor(n*3/2)+(healing&&c===28?int(unit.stats?.武力,0,969,'武力'):0);
 return n;
}
export function calculateElementalStrategyHit({actor,target,strategyIndex,rules,terrainId,weatherProfile,rngState,itemMode=false,shipSplash=false}){
 const s=strategy(rules,strategyIndex);if(strategyIndex>19)throw new UnsupportedRuleError('non_elemental_strategy');
 const element=strategyIndex<6?0:strategyIndex<12?1:strategyIndex<18?2:3;
 const tier=s.rangeCode;int(tier,0,2,'elemental tier');const shipWater=shipSplash&&[40,41,42].includes(target.classIndex)&&terrainId===17;int(terrainId,0,shipWater?17:16,'terrainId');int(weatherProfile,0,2,'weatherProfile');
 const effectiveInt=effectiveStrategyInt(actor),targetInt=int(target.stats?.知力,0,500,'target 知力')&255;
 let hit=true,draws=[],seed=int(rngState,0,0xffffffff,'rngState'),raw=0,threshold=null;
 if(itemMode){const bound=[16,26,51][tier],base=[35,75,150][tier];const r=drawOriginalRandom(seed,bound);seed=r.state;draws=[r.value];raw=base+r.value;}
 else{threshold=Math.min(100,Math.max(0,2*effectiveInt-targetInt));const r=drawOriginalRandom(seed,100);seed=r.state;draws=[r.value];hit=r.value<threshold;if(hit)raw=[element===2?30:25,element===2?60:50,element===2?120:100][tier]+Math.floor(effectiveInt*[2,3,4][tier]/5);}
 // 368C2 uses a 17-word stride without clamping terrain17; exact adjacent
 // ROM words at8B294+4*(element*17+17), not an invented water immunity.
 const terrainPercent=shipWater?[75,50,100,100][element]:rules.terrainElementPercentages[element][terrainId];
 let damage=Math.floor(raw*terrainPercent/100);
 damage=Math.floor(damage*rules.weatherElementPercentages[weatherProfile][element]/100);
 // Native cardinal splash reads occupied ships; primary target selection still excludes them.
 const c=int(target.classIndex,0,shipSplash?42:39,'target class');
 if(c===34){if(element===0)damage*=4;else if(element===2)damage=Math.floor(damage/8);}
 else if([18,19,20,27,28,29,32,33,38,39].includes(c))damage=Math.floor(damage*2/3);
 if(int(target.status26,0,255,'target status26')&8)damage=Math.floor(damage/2);
 return Object.freeze({hit,hitThreshold:threshold,effectiveCasterIntelligence:effectiveInt,targetIntelligenceLowByte:targetInt,damageBeforeCallerModifiers:damage,randomDraws:Object.freeze(draws),rngStateAfterCalculation:seed,stage:'elemental_strategy_core'});
}
export function calculateTroopHealing({actor,target,strategyIndex,rules,itemMode=false}){
 strategy(rules,strategyIndex);if(strategyIndex<34||strategyIndex>40)throw new UnsupportedRuleError('non_troop_healing_strategy');
 int(target.troops,0,0x7fffffff,'兵数');const targetMax=int(target.stats?.最大兵数,0,0x7fffffff,'最大兵数');
 if(target.state15!==2||target.troops>=targetMax)return Object.freeze({applied:false,recovered:0,remainingTroops:target.troops,reason:'not_on_grid_or_full'});
 const mode=rules.healingModes[strategyIndex-34];let amount;
 if(itemMode){const intelligence=int(actor.stats?.知力,0,500,'知力');amount=mode===0?100+Math.floor(intelligence/10):mode===1?300+Math.floor(intelligence/5):mode===2?500+Math.floor(2*intelligence/5):targetMax;}
 else{const intelligence=effectiveStrategyInt(actor,true),lv=int(actor.level,0,255,'Lv'),max=int(actor.stats?.最大兵数,0,0x7fffffff,'actor 最大兵数');
  if(mode===0)amount=Math.max(25+Math.floor(lv*intelligence/100),Math.floor(max/5));
  else if(mode===1)amount=Math.max(50+Math.floor(lv*intelligence/50),Math.floor(max/2));
  else if(mode===2)amount=Math.max(60+Math.floor(lv*intelligence/100),Math.floor(max/5));
  else if(mode===4)amount=Math.max(50+Math.floor(lv*intelligence/50),Math.floor(max/5));
  else amount=targetMax;
 }
 const recovered=Math.min(amount,targetMax-target.troops);
 return Object.freeze({applied:true,calculatedRecovery:amount,recovered,remainingTroops:target.troops+recovered,experienceHook:Object.freeze({kind:'troop_healing',actorSlot:actor.slotIndex,amount:recovered})});
}

/** 0x1FC1C: status success is draw >= clamp(floor(50*targetIQ/actorIQ)).
 * Protection bit0x08 requires two successive successes; failed first draw stops.
 */
export function calculateStatusStrategyCheck({actor,target,rngState,itemMode=false}){
 if(itemMode)return {success:true,failureThreshold:null,randomDraws:[],rngStateAfterCalculation:int(rngState,0,0xffffffff,'rngState')};
 const a=int(actor.stats?.知力,1,500,'caster 知力'),b=int(target.stats?.知力,0,500,'target 知力');
 const failureThreshold=Math.min(100,Math.max(0,Math.floor(50*b/a))),draws=[];let seed=int(rngState,0,0xffffffff,'rngState'),success=true;
 for(let i=0;i<((target.status26&8)?2:1);i++){const r=drawOriginalRandom(seed,100);seed=r.state;draws.push(r.value);if(r.value<failureThreshold){success=false;break;}}
 return {success,failureThreshold,randomDraws:draws,rngStateAfterCalculation:seed};
}
/** 0x351E8/35270: same level-based normal reward as combat, quarter on failure. */
export function calculateSupportExperience({actor,target,success=true}){
 if(actor.slotIndex>=15)return 0;
 const normal=target.level<actor.level?4:Math.min(16,2*(target.level-actor.level)+6);
 return success?normal:Math.floor(normal/4);
}
const FIRST_CLASS_SKILLS=new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,43,44,45,46,47,48,49,50,51,52,53]);
// Eight legal route classes, thirty distinct all-level learning IDs. A supplied
// rule scope permits legacy six-class callers to retain their original subset.
export function implementedFirstBattleStrategyIds(rules){const ids=[...FIRST_CLASS_SKILLS].sort((a,b)=>a-b);if(!rules)return Object.freeze(ids);rulesOf(rules);const scope=rules.firstBattleLearnableStrategyIds??rules.strategies.filter(s=>(rules.firstBattleClasses??[0,3,6,9,18,21]).some(c=>s.requiredLevelByClass[c]>0)).map(s=>s.strategyIndex);return Object.freeze(ids.filter(id=>scope.includes(id)));}
/** Apply one original first-battle-class strategy to a cloned canonical roster.
 * Scenario death/removal hooks stay with battle-state; no counters for strategies.
 */
export function resolveStrategyAction({units,actorSlot,targetSlot,strategyIndex,board,rules,rngState,configurationScale=1,refreshUnit,itemUse=null,statsRules,itemInstances,warehouseCounts,physicalProfile=null}){
 if(!Array.isArray(units)||!board?.terrain||board.terrain.length!==board.width*board.height)throw new TypeError('Explicit canonical units and board required');
 const updated=structuredClone(units),bySlot=new Map(updated.map(u=>[u.slotIndex,u]));
 if(bySlot.size!==updated.length)throw new TypeError('Duplicate slots');
 const actor=bySlot.get(actorSlot),target=bySlot.get(targetSlot);
 for(const u of [actor,target])if(!u||u.state15!==2||!u.position||u.troops<=0)throw new RangeError('Actor and target must be alive and on-grid');
 const itemMode=itemUse!==null;let s;
 if(itemMode){
  const map={128:0,129:1,130:2,131:3,134:6,135:7,136:8,137:9,138:10,140:12,141:13,142:14,143:15,144:16,146:18,147:19,148:23,149:24,150:25,151:26,152:27,153:28,154:29,155:30,156:31,157:32,158:33,159:34,160:35,161:36,162:37,164:41,165:43,166:44,167:45,168:46,169:47,170:48,171:49,173:51};
  if(['taohuashui','panshegu','fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile))map[132]=4;if(['panshegu','fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile))map[133]=5;if(['fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile))map[174]=52;if(['jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile))map[163]=38;
  const index=int(itemUse.inventoryIndex,3,12,'item inventory index'),slot=actor.itemSlots?.[index];
  const instance=actor.statsSource?.itemInstances?.find(x=>x.slotId===slot);
  if(!instance||instance.definitionId!==itemUse.definitionId||map[itemUse.definitionId]!==strategyIndex)throw new TypeError('Verified carried item dispatch required');
  s={...strategy(rules,strategyIndex),spCost:0};
 }else{s=learnedStrategies({unit:actor,rules}).find(x=>x.strategyIndex===strategyIndex);if(!s?.usable)throw new RangeError('Strategy not learned, sealed or insufficient 策略値');}
 if(!FIRST_CLASS_SKILLS.has(strategyIndex)&&!(itemMode&&strategyIndex===43))throw new UnsupportedRuleError('strategy_action_family');
 if(!strategyTargets({actor,units:updated,strategyIndex,rules,width:board.width,height:board.height,itemMode,itemInstanceId:itemUse?actor.itemSlots[itemUse.inventoryIndex]:null}).includes(targetSlot))throw new RangeError('Target outside original strategy range or side');
 const originalBySlot=new Map(units.map(u=>[u.slotIndex,u]));
 let presentation=captureActionPresentation({actor:originalBySlot.get(actorSlot),target:originalBySlot.get(targetSlot),board});
 const events=[];let changedWarehouse;let seed=int(rngState,0,0xffffffff,'rngState');
 function reward(amount){if(!amount)return;const previousLevel=actor.level,previousExperience=actor.experience,growth=applyExperience(actor,amount);actor.level=growth.level;actor.experience=growth.experience;
  if(growth.levelsGained){if(typeof refreshUnit!=='function')throw new TypeError('Level-up requires validated stats refresh');Object.assign(actor,refreshUnit(structuredClone(actor)));events.push({type:'levelUp',slotIndex:actorSlot,previousLevel,level:actor.level});}
  events.push({type:'experienceChange',slotIndex:actorSlot,previousLevel,previousExperience,level:actor.level,experience:actor.experience,total:amount});}
 function noEffect(reason){return {units:updated,rngState:seed,events,applied:false,reason};}
 function face(){const pair=battleFacingPair(actor,target,{physicalProfile});Object.assign(actor,pair.actor);Object.assign(target,pair.target);}
 function areaTargets(primary,friendly,area){const result=[primary];if(area)for(const [dx,dy]of rules.targetingOffsets.cardinal){const u=updated.find(u=>u.state15===2&&u.position?.x===primary.position.x+dx&&u.position?.y===primary.position.y+dy&&u.troops>0&&(((u.slotIndex<15)===(actorSlot<15))===friendly));if(u)result.push(u);}return result;}
 function present(targets){presentation=captureActionPresentation({actor:originalBySlot.get(actorSlot),target:originalBySlot.get(targetSlot),targets:targets.map(u=>originalBySlot.get(u.slotIndex)),board});}
 if(strategyIndex<20){
  face();const targets=areaTargets(target,false,strategyIndex===19||(strategyIndex<18&&strategyIndex%6>=3));present(targets);
  for(const victim of targets){const before=victim.troops,terrainId=board.terrain[victim.position.y*board.width+victim.position.x];
   const r=calculateElementalStrategyHit({actor,target:victim,strategyIndex,rules,terrainId,weatherProfile:board.weatherProfile,rngState:seed,itemMode,shipSplash:victim!==target});seed=r.rngStateAfterCalculation;
   let loss=r.damageBeforeCallerModifiers;int(configurationScale,0,2,'configurationScale');if(victim.slotIndex<15){if(configurationScale===0)loss=Math.floor(loss*8/10);else if(configurationScale===2)loss=Math.floor(loss*12/10);}loss=Math.min(before,loss);victim.troops-=loss;
   events.push({type:'strategyHit',actorSlot,targetSlot:victim.slotIndex,strategyIndex,nameJa:s.nameJa,beforeTroops:before,afterTroops:victim.troops,troopLoss:loss,...r,presentation:presentationForTarget(presentation,victim.slotIndex)});
   reward(calculatePhysicalExperience({attackerSlot:actorSlot,defenderSlot:victim.slotIndex,attackerLevel:actor.level,defenderLevel:victim.level,troopLoss:loss,defenderTroops:before}).total);
   if(victim.troops===0)events.push({type:'deathCandidate',slotIndex:victim.slotIndex,bySlot:actorSlot});
  }
 }else if(strategyIndex>=34&&strategyIndex<=40){
  const group=strategyIndex===37||strategyIndex===38;
  const targets=group?enumerateTargets({actor,units:updated,rangeCode:128,sideMask:1,width:board.width,height:board.height}).map(slot=>bySlot.get(slot)):[target];
  if(!targets.some(u=>u.troops<u.stats.最大兵数))return noEffect('not_on_grid_or_full');
  present(targets);
  for(const victim of targets){const r=calculateTroopHealing({actor,target:victim,strategyIndex,rules,itemMode});if(!r.applied)continue;
   const beforeTroops=victim.troops;victim.troops=r.remainingTroops;events.push({type:'troopHealing',actorSlot,targetSlot:victim.slotIndex,strategyIndex,nameJa:s.nameJa,beforeTroops,afterTroops:victim.troops,...r,presentation:presentationForTarget(presentation,victim.slotIndex)});reward(calculateHealingExperience({attackerSlot:actorSlot,attackerLevel:actor.level,recoveredTroops:r.recovered}));
  }
 }else if([43,44,45].includes(strategyIndex)){
  const before=target.strategyPoints,support=calculateStrategyPointSupport({target,strategyIndex,itemMode});if(!support.applied)return noEffect(support.reason);
  target.strategyPoints=support.remainingStrategyPoints;
  events.push({type:'strategyPointHealing',actorSlot,targetSlot,strategyIndex,nameJa:s.nameJa,beforeStrategyPoints:before,afterStrategyPoints:target.strategyPoints,recovered:support.recovered,presentation});
  reward(calculateSupportExperience({actor,target}));
 }else if([23,24,25,26,27,28,29,30,31,32,33,52].includes(strategyIndex)){
  // Seal uses its own map-only caller and does not call the facing helper.
  if(![33,52].includes(strategyIndex))face();
  const field=[26,27].includes(strategyIndex)?'status24':'status25';
  if([23,24,25].includes(strategyIndex)&&target.strategyPoints===0)return noEffect('target_has_no_strategy_points');
  if([26,27,28,29].includes(strategyIndex)&&(target[field]&0xbf)===4)return noEffect([26,27].includes(strategyIndex)?'attack_status_at_lower_limit':'defense_status_at_lower_limit');
  if([30,31].includes(strategyIndex)&&(target.status26&16))return noEffect('target_already_confused');
  if(strategyIndex===33&&(target.status26&1))return noEffect('target_already_slowed');
  if(strategyIndex===32&&(target.status26&2))return noEffect('target_already_attack_speed_reduced');
  if(strategyIndex===52&&(target.status26&4))return noEffect('target_already_sealed');
  if(strategyIndex===33)face();
  const targets=areaTargets(target,false,[27,29,31].includes(strategyIndex));present(targets);
  for(const victim of targets){
   if(victim!==target&&(([27,29].includes(strategyIndex)&&(victim[field]&0xbf)===4)||(strategyIndex===31&&(victim.status26&16))))continue;
   const r=calculateStatusStrategyCheck({actor,target:victim,rngState:seed,itemMode});seed=r.rngStateAfterCalculation;
   let effect={};if(r.success){
    if([23,24,25].includes(strategyIndex)){let amount;if(itemMode){const draw=drawOriginalRandom(seed,strategyIndex===25?11:strategyIndex===24?6:4);seed=draw.state;r.randomDraws.push(draw.value);r.rngStateAfterCalculation=seed;amount=(strategyIndex===25?20:strategyIndex===24?10:5)+draw.value;}else amount=Math.floor(victim.stats.最大策略値*(strategyIndex===25?3:strategyIndex===24?2:1)/4);if(victim.status26&8)amount=Math.floor(amount/2);amount=Math.min(victim.strategyPoints,amount)&255;const before=victim.strategyPoints;victim.strategyPoints-=amount;effect={beforeStrategyPoints:before,afterStrategyPoints:victim.strategyPoints,strategyPointLoss:amount};}
    if([26,27,28,29].includes(strategyIndex)){const before=victim[field];victim[field]=(((before&0xbf)+1)|64)&255;effect={field,before,after:victim[field]};}
    if([30,31,32,33,52].includes(strategyIndex)){const before=victim.status26;victim.status26|=strategyIndex===52?0x44:strategyIndex===32?0x42:strategyIndex===33?0x41:0x50;effect={field:'status26',before,after:victim.status26};}
   }
   if(r.success&&strategyIndex===32){if(typeof refreshUnit!=='function')throw new TypeError('Attack-speed reduction requires derived-stat refresh');Object.assign(victim,refreshUnit(structuredClone(victim)));}
   events.push({type:'strategyStatus',actorSlot,targetSlot:victim.slotIndex,strategyIndex,nameJa:s.nameJa,...r,...effect,presentation:presentationForTarget(presentation,victim.slotIndex)});reward(calculateSupportExperience({actor,target:victim,success:r.success}));
  }
 }else if(strategyIndex===51){
  const primary=calculateProtectionSupport({target});if(!primary.applied)return noEffect(primary.reason);
  const targets=areaTargets(target,true,true);present(targets);
  for(const victim of targets){const support=calculateProtectionSupport({target:victim,secondary:victim!==target});if(!support.applied)continue;const before=support.before;victim.status26=support.after;events.push({type:'strategyStatus',actorSlot,targetSlot:victim.slotIndex,strategyIndex,nameJa:s.nameJa,success:true,field:'status26',before,after:victim.status26,randomDraws:[],presentation:presentationForTarget(presentation,victim.slotIndex)});reward(calculateSupportExperience({actor,target:victim}));}
 }else if(strategyIndex===53){
  const change=applyFamily26RankPromotion({entity:target,itemInstances,warehouseCounts,rules:statsRules});if(!change.applied)return noEffect(change.reason);
  const previousClassIndex=target.classIndex,beforeTroops=target.troops,beforeStrategyPoints=target.strategyPoints;Object.assign(target,change.entity);if(typeof refreshUnit!=='function')throw new TypeError('Rank strategy requires stats refresh');Object.assign(target,refreshUnit(structuredClone(target)));changedWarehouse=change.warehouseCounts;
  events.push({type:'classChanged',actorSlot,targetSlot,definitionIndex:target.definitionIndex,strategyIndex,nameJa:s.nameJa,previousClassIndex,classIndex:target.classIndex,equipmentChanges:change.equipmentChanges,beforeTroops,afterTroops:target.troops,beforeStrategyPoints,afterStrategyPoints:target.strategyPoints,source:'battle_strategy',presentation});reward(calculateSupportExperience({actor,target}));
 }else if([46,47,48,49].includes(strategyIndex)){
  const field=strategyIndex<=47?'status24':'status25';
  // Primary at the upper limit cancels the entire action, even for an area buff.
  if((target[field]&0xbf)===0)return noEffect(field==='status24'?'attack_status_at_upper_limit':'defense_status_at_upper_limit');
  const targets=areaTargets(target,true,strategyIndex===47||strategyIndex===49);present(targets);
  for(const victim of targets){if((victim[field]&0xbf)===0)continue;
   const before=victim[field];victim[field]=(((before&0xbf)-1)|64)&255;
   events.push({type:'strategyStatus',actorSlot,targetSlot:victim.slotIndex,strategyIndex,nameJa:s.nameJa,success:true,field,before,after:victim[field],randomDraws:[],presentation:presentationForTarget(presentation,victim.slotIndex)});reward(calculateSupportExperience({actor,target:victim}));
  }
 }else if(strategyIndex===50){
  if(targetSlot===actorSlot)return noEffect('cannot_reactivate_self');
  if(!(target.flags16&0xc0))return noEffect('target_has_not_moved_or_acted');
  const before=target.flags16;target.flags16&=0x3f;
  events.push({type:'strategyStatus',actorSlot,targetSlot,strategyIndex,nameJa:s.nameJa,success:true,field:'flags16',before,after:target.flags16,randomDraws:[],presentation});reward(calculateSupportExperience({actor,target}));
 }else if(strategyIndex===41){
  const changes=[];for(const bit of [16,32,2,1,4,8])if(target.status26&bit)changes.push({field:'status26',bit});
  for(const field of ['status24','status25'])if((target[field]&0xbf)!==2)changes.push({field});
  if(!changes.length)return noEffect('no_status_to_cleanse');
  for(const change of changes){const before=target[change.field];target[change.field]=change.bit?before&~change.bit:2;events.push({type:'statusCleansed',actorSlot,targetSlot,strategyIndex,nameJa:s.nameJa,field:change.field,before,after:target[change.field],presentation});reward(calculateSupportExperience({actor,target}));}
  if(typeof refreshUnit!=='function')throw new TypeError('Status cleanse requires validated stats refresh');Object.assign(target,refreshUnit(structuredClone(target)));
 }
 actor.strategyPoints-=s.spCost;actor.flags16|=128;
 return {units:updated,rngState:seed,events,applied:true,...(changedWarehouse?{warehouseCounts:changedWarehouse}:{}),rngScope:'original_algorithm_game_logic_draws_excluding_visual_animation_draws'};
}
