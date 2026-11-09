/** One ROM-verified ordinary physical-hit calculation, NOT full battle orchestration.
 * Supported: 軽騎兵 vs 軽騎兵, terrain0, neutral statuses/config, no special
 * on-hit weapon effect. Critical/evasion/auxiliary mitigation and other branches
 * are explicitly unsupported, never silently disabled.
 */
import {UnsupportedRuleError} from './abilities.mjs';
import {enumerateTargets,physicalRangeCode} from './targeting.mjs';

function integer(value,min,max,label){
  if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError(`${label} must be an integer in ${min}..${max}`);
  return value;
}
function requireValue(value,expected,rule){
  if(value!==expected)throw new UnsupportedRuleError(rule);
}

/** Original LCG at0x4C0EC and bounded remainder at0x4C124; pure, no global RNG. */
export function drawOriginalRandom(seed,bound){
  integer(seed,0,0xffffffff,'RNG state');integer(bound,0,0x7fffffff,'RNG bound');
  if(bound<=1)return Object.freeze({value:0,state:seed});
  const state=(Math.imul(seed,0x41c64e6d)+0x3039)>>>0;
  return Object.freeze({value:((state>>>16)&0x7fff)%bound,state});
}

export function calculateNormalPhysicalHit(input){
  if(!input||typeof input!=='object')throw new TypeError('Explicit hit context is required');
  const {attacker,defender,caller}=input;
  if(!attacker||!defender||!caller)throw new TypeError('Both units and caller context are required');
  for(const [side,unit] of [['attacker',attacker],['defender',defender]]){
    requireValue(unit.classIndex,6,`${side}_class_matchup`);
    requireValue(unit.cachedClassIndex,unit.classIndex,`${side}_cached_class_mismatch`);
    integer(unit.level,0,255,`${side} Lv`);
    requireValue(unit.statusByte,2,`${side}_battle_status`);
    requireValue(unit.flags26,0,`${side}_condition_flags`);
    requireValue(unit.auxiliary,5,`${side}_auxiliary_rule`);
  }
  requireValue(input.terrainId,0,'terrain_defense_rule');
  requireValue(caller.actionType,1,'non_physical_action');
  requireValue(caller.actionVariant,0,'counter_or_variant_path');
  requireValue(caller.mode,0,'caller_mode');
  requireValue(caller.configurationScale,1,'side_configuration_scaling');
  // The wrapper does not skip FF: it resolves object255 -> definition255.
  // This bounded path requires that captured mapping and its type0 explicitly.
  requireValue(attacker.weapon?.slotId,255,'on_hit_weapon_path');
  requireValue(attacker.weapon?.definitionId,255,'sentinel_item_mapping');
  requireValue(attacker.weapon?.primaryEffectType,0,'on_hit_weapon_effect');

  const attack=integer(attacker.攻撃力,0,500,'攻撃力');
  const defense=integer(defender.防御力,0,969,'防御力')+1; // ROM terrain0 byte at0x8A802.
  const troops=integer(defender.兵数,1,0x7fffffff,'current 兵数');
  const maximum=integer(defender.最大兵数,1,0x7fffffff,'maximum 兵数');
  if(troops>maximum)throw new UnsupportedRuleError('troops_above_effective_maximum');
  const seed=integer(input.rngState,0,0xffffffff,'RNG state');
  // Same category1 matchup is neutral. Both auxiliary values5 => evade threshold100.
  const first=drawOriginalRandom(seed,100);
  const criticalThreshold=Math.min(15,Math.max(1,5+Math.floor(attacker.level/10)));
  const second=drawOriginalRandom(first.state,100);
  if(second.value<criticalThreshold)throw new UnsupportedRuleError('critical_hit_path');
  const third=drawOriginalRandom(second.state,100);
  if(third.value<5)throw new UnsupportedRuleError('auxiliary_mitigation_path');
  // Keep the original boundary behavior: no universal final minimum-one clamp.
  const damageBeforeTroopCap=defense>=2*attack?1:Math.floor((2*attack-defense)/2);
  const troopLoss=Math.min(troops,damageBeforeTroopCap);
  return Object.freeze({
    stage:'normal_physical_hit_calculation',supportScope:'observed_neutral_light_cavalry_unarmed_path',
    attackAfterModifiers:attack,defenseAfterTerrain:defense,damageBeforeTroopCap,troopLoss,
    remainingTroops:troops-troopLoss,
    randomDraws:Object.freeze([first.value,second.value,third.value]),criticalThreshold,
    rngStateAfterDamageCalculation:third.state,
    completeAttackOrchestration:false,
    warning:'Animation and later attack stages can consume additional original RNG; this is not the post-complete-attack RNG state.',
  });
}

/** General ROM-derived core. Historical calculateNormalPhysicalHit above stays
 * a strict fixture adapter; these functions implement the wider battle path. */
export function applyBattleStatusScalar(value,statusByte){
  integer(value,0,0x1fffff,'battle scalar');integer(statusByte,0,255,'status byte');
  switch(statusByte & ~0x40){
    case 0:return Math.floor(value*15/10);
    case 1:return Math.floor(value*12/10);
    case 3:return Math.floor(value*4/5);
    case 4:return Math.floor(value*2/3);
    default:return value;
  }
}

export function physicalMatchupCategory(classIndex){
  integer(classIndex,0,42,'classIndex');
  // DD88 group, NOT the different E8A4 growth profile.
  const group=classIndex===17?7:classIndex<=20?Math.floor(classIndex/3):
    classIndex<=28?Math.floor((classIndex-21)/2)+7:
    ({29:11,30:12,31:13,39:14}[classIndex]??15);
  return [0,2,1,3,2,1,3,0,0,0,3,3,0,1,1,3][group];
}

function combatUnit(unit,label){
  if(!unit?.stats)throw new TypeError(`${label} requires validated stats`);
  integer(unit.classIndex,0,42,`${label} class`);integer(unit.level,0,255,`${label} Lv`);
  integer(unit.status24,0,255,`${label} status24`);integer(unit.status25,0,255,`${label} status25`);
  integer(unit.status26,0,255,`${label} status26`);
  integer(unit.stats.攻撃力,0,500,`${label} 攻撃力`);
  integer(unit.stats.防御力,0,969,`${label} 防御力`);
  integer(unit.stats.auxiliary,0,255,`${label} battle 攻撃速度`);
  return unit;
}

/** 32DD4: complete scalar core, including unsigned thresholds and byte wrap.
 * mode0 is the original evaluator path, mode1 is the actual-hit path.
 * Inputs A/D are equipment-aware BEFORE battle status. Terrain is explicit.
 */
export function calculatePhysicalDamage({attacker,defender,terrainDefense,rngState,mode=1}={}){
  combatUnit(attacker,'attacker');combatUnit(defender,'defender');
  integer(terrainDefense,0,255,'terrain defense');integer(mode,0,1,'core mode');
  let attack=applyBattleStatusScalar(attacker.stats.攻撃力,attacker.status24);
  let defense=applyBattleStatusScalar(defender.stats.防御力,defender.status25)+terrainDefense;
  const a=physicalMatchupCategory(attacker.classIndex),d=physicalMatchupCategory(defender.classIndex);
  if(a===0&&d===1)defense=Math.floor(defense*120/100);
  if(a===0&&d===2)attack=Math.floor(attack*130/100);
  if(a===1&&d===0)attack=Math.floor(attack*120/100);
  if(a===1&&d===2)defense=Math.floor(defense*130/100);
  if(a===2&&d===0)defense=Math.floor(defense*115/100);
  if(a===2&&d===1)attack=Math.floor(attack*140/100);
  const speedA=attacker.stats.auxiliary,speedD=defender.stats.auxiliary;
  const evadeThreshold=(100-((speedD-speedA)&255)*Math.floor(defender.level/8))>>>0;
  const criticalThreshold=Math.max(1,Math.min(15,speedA+Math.floor(attacker.level/10)));
  let randomState=integer(rngState,0,0xffffffff,'RNG state');const randomDraws=[];
  const draw=bound=>{const r=drawOriginalRandom(randomState,bound);randomState=r.state;randomDraws.push(r.value);return r.value;};
  const missed=draw(100)>=evadeThreshold&&mode!==0&&!(defender.status26&0x10);
  if(missed)return Object.freeze({damage:0,missed:true,critical:false,mitigated:false,
    attackAfterModifiers:attack,defenseAfterModifiers:defense,evadeThreshold,criticalThreshold,
    randomDraws:Object.freeze(randomDraws),rngStateAfterCalculation:randomState});
  let damage=defense>=2*attack?1:Math.floor((2*attack-defense)/2);
  const critical=draw(100)<criticalThreshold&&mode===1;
  if(critical)damage=Math.floor(6*attack/5);
  const mitigated=draw(100)<speedD;
  if(mitigated){const k=defense>attack?0:(defense-attack)&255;damage=Math.floor(255*damage/(255+k));}
  if([9,10,11,36].includes(defender.classIndex))damage=Math.floor(3*damage/4);
  else if([30,31,35].includes(defender.classIndex))damage=Math.floor(damage/2);
  else if(defender.classIndex===34)damage=1;
  return Object.freeze({damage,missed:false,critical,mitigated,
    attackAfterModifiers:attack,defenseAfterModifiers:defense,evadeThreshold,criticalThreshold,
    randomDraws:Object.freeze(randomDraws),rngStateAfterCalculation:randomState});
}

// Class15 additionally reviewed for the next battle; its on-hit path is inert
// unless the weapon effect is15, which remains rejected below.
const FIRST_BATTLE_CLASSES=Object.freeze([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,35,39]);

/** Reviewed map18 physical status helper (3889C), not a learned strategy.
 * Current first-instance definition70; exact new-profile69 adds poison32.
 * Other effect15 items and older-profile69 stay closed.
 * The caller invokes this after damage calculation and BEFORE committing HP.
 * Native division by zero returns0 here, unlike the learned-strategy API.
 */
export function calculateMap18PhysicalStatusProc({attacker,defender,rngState,actionVariant=0,physicalProfile=null}={}){
  integer(actionVariant,0,1,'action variant');let state=integer(rngState,0,0xffffffff,'RNG state');
  let status26=integer(defender?.status26,0,255,'target status26');const attempts=[];
  if(actionVariant===1)return Object.freeze({status26,rngState:state,attempts:Object.freeze(attempts)});
  integer(attacker?.classIndex,0,39,'actor class');
  const actorIQ=integer(attacker.stats?.知力,0,500,'actor intelligence'),targetIQ=integer(defender.stats?.知力,0,500,'target intelligence');
  const targetState=integer(defender.state15,0,255,'target state'),targetDefinition=integer(defender.definitionIndex,0,65535,'target definition');
  const weapon=attacker.stats.firstWeapon;
  if(!weapon||!Number.isInteger(weapon.definitionId)||weapon.definitionId<0||weapon.definitionId>255||
    !([0,1,2,6,14].includes(weapon.primaryEffectType)||((weapon.definitionId===70&&weapon.primaryEffectType===15&&weapon.primaryMagnitude===31)||(['nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&weapon.definitionId===69&&weapon.primaryEffectType===15&&weapon.primaryMagnitude===57))))
    throw new UnsupportedRuleError('non_map18_on_hit_weapon');
  function attempt(source,bit){
    if(status26&bit){attempts.push(Object.freeze({source,bit,skipped:'already_present',randomDraws:Object.freeze([])}));return;}
    // The source quotient is unsigned, then clamped using signed comparisons.
    // Validated IQ0..500 gives a numerator <=25000, hence no signed wrap here.
    const failureThreshold=Math.min(100,Math.max(0,actorIQ===0?0:Math.floor(50*targetIQ/actorIQ))),randomDraws=[];
    let success=true;for(let i=0,n=status26&8?2:1;i<n;i++){
      const draw=drawOriginalRandom(state,100);state=draw.state;randomDraws.push(draw.value);
      if(draw.value<failureThreshold){success=false;break;}
    }
    const before=status26,applied=success&&targetDefinition<=512&&targetState===2;
    if(applied)status26|=64|bit;
    attempts.push(Object.freeze({source,bit,status26Before:before,status26After:status26,applied,success,failureThreshold,randomDraws:Object.freeze(randomDraws),rngStateAfterCalculation:state}));
  }
  if(attacker.classIndex===36)attempt('class',16);else if(attacker.classIndex===37)attempt('class',32);
  // No second passive family/class eligibility test exists in this native helper.
  if(weapon.primaryEffectType===15)attempt('weapon',weapon.definitionId===69?32:16);
  return Object.freeze({status26,rngState:state,attempts:Object.freeze(attempts)});
}


/** Actual physical caller38A4C for the first-battle class/item roster.
 * Critical/mitigation/evasion, terrain, status and configuration branches work.
 * Exotic non-roster class36/37/type15 weapon side-effects are not silently omitted.
 */
export function calculateFirstBattleHit({attacker,defender,terrainDefense,rngState,
  actionVariant=0,callerMode=0,configurationScale=1,physicalProfile=null}={}){
  for(const unit of [attacker,defender]){
    combatUnit(unit,'unit');integer(unit.slotIndex,0,44,'slotIndex');
    if(!FIRST_BATTLE_CLASSES.includes(unit.classIndex)&&!((['fengming','nanan-tianshui','jicheng','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&[34,36,37,38].includes(unit.classIndex))||(['qishan','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&[33,38].includes(unit.classIndex))||(physicalProfile==='mandu'&&[36,37].includes(unit.classIndex))||(['taohuashui','panshegu'].includes(physicalProfile)&&[34,36,37].includes(unit.classIndex))))throw new UnsupportedRuleError('non_first_battle_physical_class');
  }
  integer(actionVariant,0,1,'action variant');integer(callerMode,0,255,'caller mode');
  integer(configurationScale,0,2,'configuration scale');
  const weapon=attacker.stats.firstWeapon;
  // 3889C branches on special classes36/37 and effect type15, not item ID.
  // Passive stats already require the trusted current-definition catalog.
  if(!weapon||!Number.isInteger(weapon.definitionId)||weapon.definitionId<0||weapon.definitionId>255||!([0,1,2,6,14].includes(weapon.primaryEffectType)||(['mandu','taohuashui','panshegu','fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&((weapon.definitionId===70&&weapon.primaryEffectType===15&&weapon.primaryMagnitude===31)||(['nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)&&weapon.definitionId===69&&weapon.primaryEffectType===15&&weapon.primaryMagnitude===57)))))
    throw new UnsupportedRuleError('non_first_battle_on_hit_weapon');
  const troops=integer(defender.troops,1,0x7fffffff,'current 兵数');
  const maximum=integer(defender.stats.最大兵数,1,0x7fffffff,'maximum 兵数');
  const core=calculatePhysicalDamage({attacker,defender,terrainDefense,rngState,mode:1});
  let damage=core.damage;
  if(callerMode===0&&actionVariant===1)damage=Math.floor(damage/2);
  const statusProc=['mandu','taohuashui','panshegu','fengming','nanan-tianshui','jicheng','qishan','xiping','jieting','hanzhong-retreat','chencang','second-chencang'].includes(physicalProfile)?calculateMap18PhysicalStatusProc({attacker,defender,rngState:core.rngStateAfterCalculation,actionVariant,physicalProfile}):null;
  if(defender.slotIndex<=14){
    if(configurationScale===0)damage=Math.floor(damage*8/10);
    else if(configurationScale===2)damage=Math.floor(damage*12/10);
  }
  const troopLoss=Math.min(troops,damage);
  const remainingTroops=Math.min(maximum,troops-troopLoss); //32CBC setter cap
  return Object.freeze({...core,damageAfterCallerModifiers:damage,troopLoss,remainingTroops,
    deathCandidate:remainingTroops===0,actionVariant,...(statusProc?{statusProc,rngStateAfterCalculation:statusProc.rngState}:{})});
}

/** 38B84 rewards; ally/enemy classification is by battle slot, not control17. */
export function calculatePhysicalExperience({attackerSlot,defenderSlot,attackerLevel,defenderLevel,troopLoss,defenderTroops}={}){
  integer(attackerSlot,0,44,'attacker slot');integer(defenderSlot,0,44,'defender slot');
  integer(attackerLevel,0,255,'attacker Lv');integer(defenderLevel,0,255,'defender Lv');
  integer(troopLoss,0,0x7fffffff,'troop loss');integer(defenderTroops,1,0x7fffffff,'defender troops');
  if(troopLoss>defenderTroops)throw new RangeError('loss exceeds current troops');
  if(attackerSlot>14)return Object.freeze({normal:0,defeat:0,total:0});
  let normal=defenderLevel<attackerLevel?4:Math.min(16,2*(defenderLevel-attackerLevel)+6);
  let defeat=0;
  if(troopLoss===defenderTroops)defeat=defenderSlot===15?48:
    attackerLevel<defenderLevel?32:Math.floor(64/(attackerLevel-defenderLevel+2));
  if(troopLoss===0)normal=Math.floor(normal/4);
  return Object.freeze({normal,defeat,total:normal+defeat});
}

/** F1DC/EADC persistent level/EXP update only. No invented HP/SP restoration. */
export function applyExperience({definitionIndex,level,experience},reward){
  integer(definitionIndex,0,511,'definition index');integer(level,0,99,'Lv');
  integer(experience,0,255,'experience');integer(reward,0,0x7fffffff,'EXP reward');
  const total=experience+reward;
  if(total===0||definitionIndex>235||level>=99)return Object.freeze({level,experience,levelsGained:0});
  const nextLevel=Math.min(99,level+Math.floor(total/100));
  return Object.freeze({level:nextLevel,experience:total%100,levelsGained:nextLevel-level});
}

/** 395B4 and39744: RNG is consumed whenever cached actor speed>=target speed,
 * including when the preceding hit has already defeated the target. */
export function checkExtraStrike({attackerSpeed,defenderSpeed,defenderTroops,rngState}={}){
  integer(attackerSpeed,0,255,'attacker speed');integer(defenderSpeed,0,255,'defender speed');
  integer(defenderTroops,0,0x7fffffff,'defender troops');integer(rngState,0,0xffffffff,'RNG state');
  if(attackerSpeed<defenderSpeed)return Object.freeze({extraStrike:false,draw:null,state:rngState});
  const r=drawOriginalRandom(rngState,15);
  return Object.freeze({extraStrike:r.value<attackerSpeed-defenderSpeed+1&&defenderTroops!==0,draw:r.value,state:r.state});
}

/** Full first-battle physical exchange: hit, optional extra, counter, optional
 * counter extra. Death/removal/scenario execution remains the state owner's job.
 * RNG comprises game-logic draws; original animation-only draws are not replayed.
 */
export function resolvePhysicalAttack({units,attackerSlot,defenderSlot,board,rngState,
  configurationScale=1,refreshUnit,physicalProfile=null}={}){
  if(!Array.isArray(units)||!board||!Array.isArray(board.terrain)||!Array.isArray(board.terrainDefense))
    throw new TypeError('Explicit units and validated terrain/defense tables required');
  integer(board.width,1,255,'width');integer(board.height,1,255,'height');
  if(board.terrain.length!==board.width*board.height)throw new TypeError('Terrain geometry mismatch');
  integer(attackerSlot,0,44,'attacker slot');integer(defenderSlot,0,44,'defender slot');
  if(attackerSlot===defenderSlot)throw new RangeError('An attack requires different units');
  let updated=structuredClone(units);const bySlot=new Map(updated.map(u=>[u.slotIndex,u]));
  if(bySlot.size!==updated.length)throw new TypeError('Duplicate battle slots');
  const actor=bySlot.get(attackerSlot),target=bySlot.get(defenderSlot);
  for(const u of [actor,target])if(!u||u.state15!==2||!u.position||u.troops<=0)throw new RangeError('Both attack units must be alive and on-grid');
  const legal=(a,d)=>enumerateTargets({actor:a,units:updated.filter(u=>u.definitionIndex!==null),
    rangeCode:physicalRangeCode(a.classIndex),sideMask:0,width:board.width,height:board.height}).includes(d.slotIndex);
  if(!legal(actor,target))throw new RangeError('Target outside original physical range or side');
  let state=integer(rngState,0,0xffffffff,'RNG state');const events=[];
  const terrainFor=u=>{
    const {x,y}=u.position;integer(x,0,board.width-1,'unit x');integer(y,0,board.height-1,'unit y');
    const id=integer(board.terrain[y*board.width+x],0,board.terrainDefense.length-1,'terrain id');
    return integer(board.terrainDefense[id],0,255,'terrain defense');
  };
  function hit(a,d,variant,kind){
    const before=d.troops;
    const result=calculateFirstBattleHit({attacker:a,defender:d,terrainDefense:terrainFor(d),
      rngState:state,actionVariant:variant,callerMode:0,configurationScale,physicalProfile});
    state=result.rngStateAfterCalculation;
    if(result.statusProc)d.status26=result.statusProc.status26; // pre-HP native setter, including lethal/missed hits
    d.troops=result.remainingTroops;
    events.push({type:'physicalHit',kind,attackerSlot:a.slotIndex,defenderSlot:d.slotIndex,
      beforeTroops:before,afterTroops:d.troops,
      attackerPosition:{...a.position},defenderPosition:{...d.position},
      attackerBeforeTroops:a.troops,attackerMaximumTroops:a.stats.最大兵数,defenderMaximumTroops:d.stats.最大兵数,
      attackerDefinitionIndex:a.definitionIndex,defenderDefinitionIndex:d.definitionIndex,
      attackerClassIndex:a.classIndex,defenderClassIndex:d.classIndex,
      attackerTerrainId:board.terrain[a.position.y*board.width+a.position.x],defenderTerrainId:board.terrain[d.position.y*board.width+d.position.x],...result});
    for(const p of result.statusProc?.attempts??[])if(!p.skipped)events.push({type:'physicalStatus',actorSlot:a.slotIndex,targetSlot:d.slotIndex,field:'status26',before:p.status26Before,after:p.status26After,...p});
    if(result.statusProc&&result.deathCandidate)d.status26=0; // 33BB8 removal clears transient corpse status
    const reward=calculatePhysicalExperience({attackerSlot:a.slotIndex,defenderSlot:d.slotIndex,
      attackerLevel:a.level,defenderLevel:d.level,troopLoss:result.troopLoss,defenderTroops:before});
    const growth=applyExperience(a,reward.total);
    const previousLevel=a.level,previousExperience=a.experience;
    a.level=growth.level;a.experience=growth.experience;
    if(growth.levelsGained){
      if(typeof refreshUnit!=='function')throw new TypeError('Level-up requires the validated stat refresh adapter');
      const refreshed=refreshUnit(structuredClone(a));
      if(!refreshed?.stats||refreshed.slotIndex!==a.slotIndex||refreshed.level!==a.level)throw new TypeError('Invalid level-up refresh result');
      Object.assign(a,refreshed);
    }
    if(reward.total)events.push({type:'experienceChange',slotIndex:a.slotIndex,previousLevel,
      previousExperience,level:a.level,experience:a.experience,...reward});
    if(growth.levelsGained)events.push({type:'levelUp',slotIndex:a.slotIndex,previousLevel,level:a.level});
    if(result.deathCandidate)events.push({type:'deathCandidate',slotIndex:d.slotIndex,bySlot:a.slotIndex});
    return result;
  }
  function extra(a,d,speedA,speedD,variant,kind){
    const decision=checkExtraStrike({attackerSpeed:speedA,defenderSpeed:speedD,defenderTroops:d.troops,rngState:state});
    state=decision.state;events.push({type:'extraStrikeCheck',attackerSlot:a.slotIndex,defenderSlot:d.slotIndex,...decision});
    if(decision.extraStrike)hit(a,d,variant,kind);
  }
  // Speeds are cached by38FE0 at exchange construction, before possible levelup.
  const speedA=actor.stats.auxiliary,speedD=target.stats.auxiliary;
  hit(actor,target,0,'initial');extra(actor,target,speedA,speedD,0,'extra');
  const counterEligible=target.troops>0&&target.state15!==4&&!(target.status26&0x10)&&legal(target,actor);
  events.push({type:'counterCheck',attackerSlot:target.slotIndex,defenderSlot:actor.slotIndex,eligible:counterEligible});
  if(counterEligible){
    // Counter construction refreshes caches after any initial-actor level gain.
    const counterSpeed=target.stats.auxiliary,receiverSpeed=actor.stats.auxiliary;
    hit(target,actor,1,'counter');extra(target,actor,counterSpeed,receiverSpeed,1,'counterExtra');
  }
  return {units:updated,rngState:state,events,counterEligible,applied:true,
    rngScope:'original_algorithm_game_logic_draws_excluding_visual_animation_draws'};
}

/** 352D4: healing action EXP, including the original uint8 truncation. */
export function calculateHealingExperience({attackerSlot,attackerLevel,recoveredTroops}={}){
  integer(attackerSlot,0,44,'healer slot');integer(attackerLevel,0,255,'healer Lv');
  integer(recoveredTroops,0,0x7fffffff,'recovered troops');
  if(attackerSlot>14)return 0;
  return Math.max(10,(Math.floor((Math.imul(3,recoveredTroops)>>>1)/(attackerLevel+1))+5)&255);
}
