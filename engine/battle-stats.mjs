/** First-battle passive stats. Pure, no ROM/emulator/I/O.
 * Inputs are resolved runtime base fields and explicit item-instance mappings.
 * Rule declarations are structurally checked, not cryptographically attested;
 * the trusted loader must use extract_battle_stats.py's validated inventory.
 * Active items, on-hit effects, healing and action execution belong elsewhere.
 */
import {rankPromotionCarryEligibility} from './rank-promotion-eligibility.mjs';
import {classChangeEligibility} from './class-transition-eligibility.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
const SOURCE_SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const CLASSES=new Set([0,3,6,9,18,21]);
const DEFINITIONS=new Set([4,5,6,19,34,80,159,160,180,255]);
const WEAPON_FAMILIES={0:[3],3:[7],6:[2,3],9:[1,2,3],18:[14],21:[4]};
const MAIN=['武力','統率力','知力'];
function integer(x,min,max,label){if(!Number.isSafeInteger(x)||x<min||x>max)throw new RangeError(`${label} must be an integer in ${min}..${max}`);return x;}
function dense(a,n,label){if(!Array.isArray(a)||a.length!==n)throw new TypeError(`${label} must contain ${n} entries`);for(let i=0;i<n;i++)if(!Object.hasOwn(a,i))throw new TypeError(`${label} must not be sparse`);return a;}
function unsupported(rule){throw new UnsupportedRuleError(rule);}

/** 0x032B2C. No upper clamp after battle-status multiplication. */
export function applyBattleScalarStatus(value,statusByte){
  integer(value,0,0xffffffff,'scalar');integer(statusByte,0,255,'status byte');
  const status=statusByte&~0x40;
  const [factor,divisor]=({0:[15,10],1:[12,10],3:[4,5],4:[2,3]})[status]??[1,1];
  return Math.floor((Math.imul(value,factor)>>>0)/divisor);
}

function eligible(item,profile,slotId,universals){
  if(universals.has(item.family))return true;
  // E79C→E2C4: mounts and carts use class-group category, not universal applicability.
  if(item.family===21||item.family===22){const c=profile.classIndex,g=c===17?7:c<=20?Math.floor(c/3):c<=28?Math.floor((c-21)/2)+7:({29:11,30:12,31:13,39:14}[c]??15);return item.family===21?[2,5,13,14].includes(g):[3,4,6,10].includes(g);}
  if(item.family===26)return rankPromotionCarryEligibility({classIndex:profile.classIndex});
  if(item.family===27)return classChangeEligibility({classIndex:profile.classIndex,destinationClass:item.primaryMagnitude}).eligible;
  if(item.family>=16&&item.family<=20){if(profile.armorFamily===undefined)unsupported('missing_armor_profile');return item.family===profile.armorFamily;}
  // Additional mount/promotion categories need their own proven predicates.
  if(item.family<1||item.family>15)unsupported('first_battle_item_family');
  return profile.allowedWeaponFamilies.includes(item.family)&&!profile.forbiddenOriginalSlots.includes(slotId)&&!(profile.classIndex===39&&item.family===14&&slotId===86); // E6DC: branch-specific original-slot exclusion.
}

export function createBattleStatsCalculator(rules){
  if(rules?.purpose!=='private_first_battle_passive_stats_rules'||rules?.schema_version!=='1.0.0'||rules?.source_rom?.sha256!==SOURCE_SHA)throw new TypeError('Validated first-battle stats rules required');
  const classScope=rules.scopeClassIndices??[...CLASSES],itemScope=rules.scopeItemDefinitionIds??[...DEFINITIONS];
  if(!Array.isArray(classScope)||!Array.isArray(itemScope)||new Set(classScope).size!==classScope.length||new Set(itemScope).size!==itemScope.length)throw new TypeError('Unique declared rule scope required');
  dense(rules.classes,classScope.length,'class profiles');dense(rules.itemDefinitions,itemScope.length,'item definitions');
  const classIds=new Set(classScope),itemIds=new Set(itemScope),universals=new Set(rules.universalApplicableFamilies??[0,23,24,63]);
  if(![0,23,24,63].every(x=>universals.has(x))||[...universals].some(x=>![0,23,24,25,63].includes(x)))throw new TypeError('Unreviewed universal applicability'); // E7D8–E828: family25 accepts every class.
  const profiles=new Map(),definitions=new Map();
  for(const row of rules.classes){
    const id=integer(row.classIndex,0,42,'classIndex');if(!classIds.has(id)||profiles.has(id))unsupported('first_battle_class_profile');
    const coefficients={};for(const k of MAIN)coefficients[k]=integer(row.coefficients?.[k],0,28,`${k} coefficient`);
    // Exact legacy normalized bundle omitted these already-verified predicates.
    // Only its original six classes have a fallback; expanded profiles must declare them.
    const allowed=row.allowedWeaponFamilies??WEAPON_FAMILIES[id],forbidden=row.forbiddenOriginalSlots??(CLASSES.has(id)?(id===21?[27]:[]):undefined);
    if(!Array.isArray(allowed)||!Array.isArray(forbidden))throw new TypeError('Explicit weapon applicability profile required');
    const p={classIndex:id,coefficients,allowedWeaponFamilies:allowed.map(x=>integer(x,1,15,'weapon family')),forbiddenOriginalSlots:forbidden.map(x=>integer(x,0,255,'forbidden slot'))};
    if(row.armorFamily!==undefined)p.armorFamily=integer(row.armorFamily,16,21,'armor family');
    for(const k of ['troopsBase','troopsPerLevel','strategyBase','strategyPerLevel'])p[k]=integer(row[k],0,255,k);
    p.attackSpeedBase=integer(row.attackSpeedBase,0,255,'attack speed base');profiles.set(id,Object.freeze(p));
  }
  for(const row of rules.itemDefinitions){
    const id=integer(row.definitionId,0,255,'definitionId');if(!itemIds.has(id)||definitions.has(id))unsupported('first_battle_item_definition');
    definitions.set(id,Object.freeze({definitionId:id,family:integer(row.family,0,63,'family'),
      primaryEffectType:integer(row.primaryEffectType,0,15,'primary effect type'),primaryMagnitude:integer(row.primaryMagnitude,0,63,'primary magnitude'),
      secondaryEffectType:integer(row.secondaryEffectType,0,15,'secondary effect type'),secondaryMagnitude:integer(row.secondaryMagnitude,0,15,'secondary magnitude')}));
  }
  return function calculate(unit){
    if(!unit||typeof unit!=='object')throw new TypeError('Explicit current unit required');
    const classIndex=integer(unit.classIndex,0,42,'classIndex');const profile=profiles.get(classIndex);if(!profile)unsupported('first_battle_stats_class');
    const level=integer(unit.level,0,255,'Lv');const source=unit.statsSource;
    if(!source?.baseFields||!Array.isArray(source.itemInstances))throw new TypeError('statsSource baseFields and explicit itemInstances required');
    const field08=integer(source.sourceField08,-32768,32767,'signed source field08');
    const base={};for(const k of MAIN)base[k]=integer(source.baseFields[k],0,255,`${k} current base`);
    const slots=dense(unit.itemSlots,13,'itemSlots').map((x,i)=>integer(x,0,255,`itemSlots[${i}]`));
    const instances=new Map();
    for(let i=0;i<source.itemInstances.length;i++){
      if(!Object.hasOwn(source.itemInstances,i))throw new TypeError('Item instances must not be sparse');
      const entry=source.itemInstances[i];const slot=integer(entry?.slotId,0,255,'slotId');const id=integer(entry.definitionId,0,255,'instance definitionId');
      if(instances.has(slot))throw new TypeError('Ambiguous repeated item slot');
      if(!definitions.has(id))unsupported('first_battle_instance_definition');instances.set(slot,id);
    }
    for(const slot of slots)if(!instances.has(slot))unsupported('missing_item_instance');
    const status24=integer(unit.status24,0,255,'status24'),status25=integer(unit.status25,0,255,'status25'),status26=integer(unit.status26,0,255,'status26');
    const baseClass={};for(const k of MAIN)baseClass[k]=base[k]+Math.floor(level*profile.coefficients[k]/10);baseClass.知力=Math.min(baseClass.知力,255);
    let attackAddition=0,defenseDelta=0,intelligenceAddition=0,speed=profile.attackSpeedBase;
    const breakdown=[];
    for(let position=0;position<13;position++){
      const slot=slots[position],item=definitions.get(instances.get(slot));const allowed=eligible(item,profile,slot,universals);
      let a=0,d=0,iq=0,sp=0,special=false;
      if(allowed){
        const effects=[[item.primaryEffectType,item.primaryMagnitude],[item.secondaryEffectType,item.secondaryMagnitude]];
        // Attack, defense and intelligence skip FF; speed scans first3 positions
        // without that skip and therefore resolves instance255 explicitly.
        if(slot!==255){
          special=item.primaryEffectType===14&&({4:[1,18,27,144],5:[2,28]}[slot]??[]).includes(field08);
          a=special?item.primaryMagnitude:effects.reduce((sum,[t,v])=>sum+(t===1?v:0),0);
          d=effects.reduce((sum,[t,v])=>sum+(t===6?v:t===8?-v:0),0);
          iq=effects.reduce((sum,[t,v])=>sum+(t===2?v:0),0);
        }
        if(position<3)for(const [t,v] of effects)if(t===4||t===5){const next=Math.min(speed+v,255);sp+=next-speed;speed=next;}
      }
      attackAddition+=a;defenseDelta+=d;intelligenceAddition+=iq;
      if(slot!==255)breakdown.push(Object.freeze({inventoryIndex:position,slotId:slot,definitionId:item.definitionId,eligible:allowed,personalPrimaryReplacesSecondary:special,attackAddition:a,defenseDelta:d,intelligenceAddition:iq,attackSpeedAddition:sp}));
    }
    const first=definitions.get(instances.get(slots[0]));
    const firstWeapon=Object.freeze({slotId:slots[0],definitionId:first.definitionId,primaryEffectType:first.primaryEffectType,primaryMagnitude:first.primaryMagnitude});
    const ds=baseClass.統率力+defenseDelta;
    const stats=Object.freeze({...baseClass,知力:Math.min(baseClass.知力+intelligenceAddition,500),
      攻撃力:Math.min(baseClass.武力+attackAddition,500),防御力:defenseDelta>0?Math.min(ds,500):Math.max(ds,0),
      最大兵数:profile.troopsBase+level*profile.troopsPerLevel,最大策略値:profile.strategyBase+level*profile.strategyPerLevel,
      攻撃速度:speed,auxiliary:status26&2?1:speed,firstWeapon});
    const battleStats=Object.freeze({攻撃力:applyBattleScalarStatus(stats.攻撃力,status24),防御力:applyBattleScalarStatus(stats.防御力,status25),攻撃速度:stats.auxiliary});
    return Object.freeze({stats,battleStats,baseClassStats:Object.freeze(baseClass),equipmentBreakdown:Object.freeze(breakdown),
      scalarStage:'equipment_aware_before_battle_status',auxiliaryStage:'battle_32C8C_after_status26',healsOrRestoresResources:false});
  };
}

export function calculateBattleStats(unit,rules){return createBattleStatsCalculator(rules)(unit);}

/** Pure refresh adapter. Deliberately preserves current troops/SP, even on Lv-up.
 * The action/state owner decides any separately verified healing or capacity clamp.
 */
export function refreshUnit(unit,rules){
  const result=calculateBattleStats(unit,rules);
  return {...unit,stats:result.stats};
}

/** E268/E830 item-category and class applicability for owned inventory UI. */
export function equipmentCategory(item){const f=integer(item?.family,0,63,'item family');return f<=15?0:f<=20?1:f<=22?2:3;}
export function equipmentEligibility({classIndex,itemSlotId,itemDefinitionId,rules}){
 createBattleStatsCalculator(rules);integer(classIndex,0,42,'classIndex');integer(itemSlotId,0,254,'item slot');
 const profile=rules.classes.find(p=>p.classIndex===classIndex),item=rules.itemDefinitions.find(i=>i.definitionId===itemDefinitionId);
 if(!profile||!item)unsupported('equipment_profile_or_item');
 return Object.freeze({category:equipmentCategory(item),eligible:eligible(item,profile,itemSlotId,new Set(rules.universalApplicableFamilies??[0,23,24,63]))});
}
