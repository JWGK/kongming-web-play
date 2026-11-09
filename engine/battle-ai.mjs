import {resolveNativeLeaderPosition} from './battle-native-position.mjs';
/** Original first-scenario AI: 42080/422D4/42434/4263C/42880/42D70/43C38/4470C.
 * This is a source-derived finite implementation, not a nearest-enemy heuristic.
 * ROM, disassembly, and reference snapshots are private research inputs only.
 */
import {UnsupportedRuleError} from './abilities.mjs';
import {createBattleMovement,occupancyOf} from './battle-movement.mjs';
import {calculatePhysicalDamage} from './combat.mjs';
import {targetingCoordinates,enumerateTargets,physicalRangeCode} from './targeting.mjs';
import {chooseAIStrategyAtPosition} from './battle-ai-strategy.mjs';

const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
// Class15 uses source range2/group5 and the ordinary influence/scoring paths.
const FIRST_CLASSES=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,35,39];
const same=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
const copy=p=>p?{x:p.x,y:p.y}:null;
const onGrid=u=>u.state15===2;
function int(v,a,b,n){if(!Number.isSafeInteger(v)||v<a||v>b)throw new RangeError(n);return v;}
function rule(ok,n){if(!ok)throw new UnsupportedRuleError(n);}
function lowTroops(u){return u.troops>0&&u.troops<=Math.floor(u.stats.最大兵数/5)*(u.definitionIndex<=235?2:1);}
function recoveryTerrain(t){return (t>=7&&t<=9)||t===12||t===13;}
function classGroup(c){return c===17?7:c<=20?Math.floor(c/3):c<=28?Math.floor((c-21)/2)+7:({29:11,30:12,31:13,39:14}[c]??15);}

/** 4786C sets priorities for EVERY slot in a partition, even inactive ones. */
export function assignAIPhasePriorities({units,board,allied}){
  if(typeof allied!=='boolean')throw new TypeError('Explicit allied partition required');
  occupancyOf(board,units);
  const ordered=units.filter(u=>(u.slotIndex<15)===allied).sort((a,b)=>a.slotIndex-b.slotIndex);
  const priorities=new Map(ordered.map(u=>[u.slotIndex,255]));let rank=0;
  const terrain=u=>u.position?board.terrain[u.position.x+board.width*u.position.y]:255;
  for(const predicate of [u=>recoveryTerrain(terrain(u)),u=>u.definitionIndex!==null&&lowTroops(u),()=>true])
    for(const u of ordered)if(priorities.get(u.slotIndex)===255&&predicate(u))priorities.set(u.slotIndex,rank++);
  return units.map(u=>priorities.has(u.slotIndex)?{...u,priority20:priorities.get(u.slotIndex)}:{...u});
}

export function createBattleAI({rules,strategyRules}){
  rule(rules?.purpose==='private_first_battle_state_rules'&&rules.sourceRomSha256===SHA,'ai_source_rules');
  const movement=createBattleMovement(rules);
  return Object.freeze({
    chooseAIAction:input=>chooseWithKnownOrInvariantContext({...input,rules,strategyRules,movement}),
    assignPhasePriorities:assignAIPhasePriorities,
  });
}
export function chooseAIAction(input){return createBattleAI({rules:input.rules,strategyRules:input.strategyRules}).chooseAIAction(input);}

/** Legacy saves did not record 02033518. Source 36890..368C0 maps all
 * 256 byte values to exactly four element contexts. Never guess the missing
 * byte: accept only a byte-for-byte identical complete plan (including source
 * scores/trace, path, flags and post-plan RNG) under all four representatives.
 * The caller retains its unknown/null state; these diagnostic evaluations are
 * pure and do not consume the live RNG four times.
 */
function chooseWithKnownOrInvariantContext(input){
  if(input.strategyContextIndex!==null&&input.strategyContextIndex!==undefined)return chooseWithContext(input);
  const plans=[0,6,12,18].map(strategyContextIndex=>chooseWithContext({...input,strategyContextIndex}));
  const exact=JSON.stringify(plans[0]);
  rule(plans.every(plan=>JSON.stringify(plan)===exact),'unknown_legacy_strategy_context_affects_AI');
  return plans[0];
}

function chooseWithContext({unit,units,board,rngState,rules,strategyRules,movement,configurationScale=1,strategyContextIndex,tacticalState}){
  if(!unit||!Array.isArray(units))throw new TypeError('Explicit actor and battle units required');
  int(rngState,0,0xffffffff,'rngState');int(configurationScale,0,2,'configurationScale');
  const actor=structuredClone(unit),bySlot=new Map(units.map(u=>[u.slotIndex,u]));
  rule(bySlot.get(actor.slotIndex)?.definitionIndex===actor.definitionIndex,'ai_actor_identity');
  int(actor.control17,0,4,'AI control0..4');
  // Maps38/39 independently pin definition133/class33 in 5:0:6/7/12; reuse the ordinary
  // existing class33 AI path, without admitting that class in adjacent contexts.
  const shipShadow=actor.classIndex===41&&!!(actor.flags16&4)&&rules.nextBattleContext?.contextId==='1:0:3';rule(FIRST_CLASSES.includes(actor.classIndex)||(['4:1:4','4:1:5'].includes(rules.nextBattleContext?.contextId)&&actor.classIndex===33)||(['5:0:2','5:0:3'].includes(rules.nextBattleContext?.contextId)&&actor.classIndex===33&&actor.definitionIndex===133)||(['5:0:6','5:0:7','5:0:12'].includes(rules.nextBattleContext?.contextId)&&actor.classIndex===33&&actor.definitionIndex===133)||(['3:2:3','3:2:4'].includes(rules.nextBattleContext?.contextId)&&[33,38].includes(actor.classIndex))||(rules.nextBattleContext?.contextId==='2:3:12'&&[36,37].includes(actor.classIndex))||(['3:0:2','3:0:5'].includes(rules.nextBattleContext?.contextId)&&[34,36,37].includes(actor.classIndex))||(['3:1:3','3:1:4','3:1:6','3:1:7','3:1:10','3:1:12','3:1:14','3:1:15'].includes(rules.nextBattleContext?.contextId)&&[34,36,37,38].includes(actor.classIndex))||shipShadow,'ai_non_first_battle_actor_class');
  for(const u of units)if(onGrid(u))rule([...FIRST_CLASSES,27,29].includes(u.classIndex)||(['4:1:4','4:1:5'].includes(rules.nextBattleContext?.contextId)&&u.classIndex===33)||(['5:0:2','5:0:3'].includes(rules.nextBattleContext?.contextId)&&u.classIndex===33&&u.definitionIndex===133)||(['5:0:6','5:0:7','5:0:12'].includes(rules.nextBattleContext?.contextId)&&u.classIndex===33&&u.definitionIndex===133)||(['3:2:3','3:2:4'].includes(rules.nextBattleContext?.contextId)&&[33,38].includes(u.classIndex))||(rules.nextBattleContext?.contextId==='2:3:12'&&[36,37].includes(u.classIndex))||(['3:0:2','3:0:5'].includes(rules.nextBattleContext?.contextId)&&[34,36,37].includes(u.classIndex))||(['3:1:3','3:1:4','3:1:6','3:1:7','3:1:10','3:1:12','3:1:14','3:1:15'].includes(rules.nextBattleContext?.contextId)&&[34,36,37,38].includes(u.classIndex))||(rules.nextBattleContext?.contextId==='1:0:3'&&[40,41,42].includes(u.classIndex)),'ai_non_first_battle_class');
  const occ=occupancyOf(board,units),{width,height}=board,size=width*height;
  const defense=board.terrainDefense??rules.terrainDefense;
  if(!Array.isArray(defense))throw new TypeError('Explicit terrain defense table required');
  const index=p=>p.x+width*p.y;
  const valid=p=>p&&p.x>=0&&p.y>=0&&p.x<width&&p.y<height;
  const neighbors=p=>DIRS.map(([dx,dy],direction)=>({x:(p.x+dx)&255,y:(p.y+dy)&255,direction})).filter(valid);
  const terrain=p=>valid(p)?board.terrain[index(p)]:255;
  const terrainDefense=p=>valid(p)?int(defense[terrain(p)],0,255,'terrain defense'):255;
  const occupying=p=>valid(p)?occ[index(p)]:255;
  const enemySlot=s=>s!==255&&(s<15)!==(actor.slotIndex<15);
  const zoc=p=>neighbors(p).some(n=>enemySlot(occupying(n)));
  const shadow=!!(actor.flags16&4),origin=copy(actor.position),trace=[];
  let seed=rngState,costs=Array(size).fill(255),influence=Array(size).fill(0),threat=Array(size).fill(255);
  let selected={position:null,target:255,strategy:255,score:0},excluded=null,aggression=false;
  const unitChanges={followSlot:actor.followSlot,control17:actor.control17,aiDestination:copy(actor.aiDestination)};

  function result(action={type:'wait'},path=[origin],directions=[]){
    let flags=actor.flags16;for(const d of directions){if(d===1)flags|=16;else if(d===3)flags&=~16;}
    return {slotIndex:actor.slotIndex,origin,destination:copy(path.at(-1)),path:path.map(copy),directions,
      finalFacing:directions.length?directions.at(-1):actor.facing18,orientationFlags:flags,
      action,markActed:action.type!=='skip',rngState:seed,unitChanges,trace,
      rngScope:'original_AI_logic_draws_excluding_visual_animation_draws'};
  }
  if(actor.followSlot!==255&&bySlot.get(actor.followSlot)?.state15!==2){
    actor.followSlot=255;actor.control17=1;unitChanges.followSlot=255;unitChanges.control17=1;
    trace.push({source:'42DB6',kind:'lost_follow_target_mode1'});
  }
  if(!onGrid(actor)||(actor.flags16&128))return result({type:'skip',reason:'inactive_or_acted'},origin?[origin]:[],[]);
  if(actor.status26&16)return result({type:'skip',reason:'status26_bit10'});
  const budget=shadow?100:movement.movementBudget(actor);
  const rangeCode=shipShadow?rules.nextBattleContext.shipScriptRangeCodes[actor.classIndex]:physicalRangeCode(actor.classIndex);

  // 42080 reverse attack geometry. Later slots overwrite earlier zone entries.
  for(const u of [...units].sort((a,b)=>a.slotIndex-b.slotIndex))if(onGrid(u)&&u.classIndex<=39&&enemySlot(u.slotIndex))
    for(const p of targetingCoordinates({position:u.position,rangeCode,sideMask:0,width,height,units}))threat[index(p)]=u.slotIndex;
  const retreat=lowTroops(actor)&&actor.control17!==2;
  if(retreat)for(let i=0;i<size;i++)if(recoveryTerrain(board.terrain[i]))influence[i]=50;

  // 422D4: bounded recursive destination preference, not Manhattan scoring.
  function addInfluence(p,weight){
    if(weight<=8||!valid(p))return;
    const i=index(p),s=occupying(p);
    if(terrainDefense(actor.position)!==255&&influence[i]===0&&(s===255||same(p,actor.position)))influence[i]=(influence[i]+weight)&255;
    if(actor.classIndex>=12&&actor.classIndex<=14)return;
    for(const n of neighbors(p))addInfluence(n,weight>10?weight-10:weight-1);
  }
  function physicalScore(target,position){
    const calc=calculatePhysicalDamage({attacker:actor,defender:target,terrainDefense:terrainDefense(target.position),rngState:seed,mode:0});
    seed=calc.rngStateAfterCalculation;
    const damage=calc.damage,max=target.stats.最大兵数;let score=0;
    if(damage>=target.troops)score=75;
    else if(Math.floor(damage*10/max)!==0)score=16;
    else if(Math.floor(target.troops*100/max)<=40)score=16;
    else if(actor.control17===1&&![27,28,29].includes(actor.classIndex))score=10;
    if(configurationScale===2&&(target.status26&16))score+=8;
    if(score&&target.definitionIndex<=235)score+=target.slotIndex===0||target.slotIndex===15?10:6;
    if(score<=74&&([6,10].includes(classGroup(actor.classIndex))||[29,38].includes(actor.classIndex)))score=0;
    if(configurationScale===2&&score&&targetingCoordinates({position:target.position,rangeCode:physicalRangeCode(target.classIndex),sideMask:0,width,height,units}).some(p=>same(p,position)))score--;
    trace.push({source:'42434',kind:'physical_score',position:copy(position),targetSlot:target.slotIndex,damage,score,rngState:seed});
    return score&255;
  }
  function scorePosition(p){
    const occupied=occupying(p);if(occupied!==255&&!same(p,actor.position))return;
    let physical=0,target=255,strategy=0,strategyChoice={strategyIndex:255,targetSlot:255};
    const i=index(p);
    if(!shadow){
      if(actor.control17!==4){
        if(threat[i]!==255||same(p,actor.position)){
          for(const slot of enumerateTargets({actor,units,position:p,rangeCode,sideMask:0,width,height})){
            const value=physicalScore(bySlot.get(slot),p);
            if(value>physical){physical=value;target=slot;}
          }
        }
        if(!(actor.status26&4)){
          strategyChoice=chooseAIStrategyAtPosition({actor,units,position:p,board,rules:strategyRules,configurationScale,aggression,strategyContextIndex});
          strategy=strategyChoice.score;
        }
      }
      influence[i]=(influence[i]+Math.max(physical,strategy))&255;
      const t=terrain(p),bonus=({7:5,8:6,9:4,12:8,13:7})[t]??((t===10||t===11)&&terrainDefense(actor.position)>5?terrainDefense(actor.position):0);
      influence[i]+=Math.min(bonus,255-influence[i]);
      if(same(p,actor.position)&&physical===0)influence[i]+=Math.min(1,255-influence[i]);
      // 43D38 tests allied adjacency around the ORIGINAL actor position.
      if(configurationScale===2&&neighbors(actor.position).some(n=>occupying(n)!==255&&!enemySlot(occupying(n)))&&influence[i]>0)influence[i]--;
    }
    if(excluded&&same(p,excluded))influence[i]=0;
    if(influence[i]>selected.score)selected={position:copy(p),target:strategy>physical?strategyChoice.targetSlot:target,strategy:strategy>physical?strategyChoice.strategyIndex:255,score:influence[i]};
  }

  /** 42880. Frontier order is cost layer, then y/x, then N/E/S/W.
   * Costs are assigned on first discovery; mode8 exits before candidate scoring.
   */
  function search(start,maxCost,mode,goal=null,respectZoc=true){
    if(same(start,goal))return 255;
    costs=Array(size).fill(255);if(!valid(start))return 255;costs[index(start)]=0;
    if(mode&4){selected={position:null,target:255,strategy:255,score:0};if(!shadow)scorePosition(start);}
    if(movement.terrainCost(actor,terrain(start))===255)return 255;
    let layer=0,changed=true,passes=0;
    while(changed&&layer<maxCost){
      if(++passes>size)throw new Error('Original AI flood failed to terminate');
      changed=false;let next=255,later=255;
      for(let y=0;y<height;y++){
        for(let x=0;x<width;x++){
          const p={x,y},value=costs[index(p)];
          if(value>layer&&value!==255&&value<later)later=value;
          if(value!==layer)continue;
          if(!same(p,start)&&respectZoc&&!shadow&&zoc(p))continue;
          for(const n of neighbors(p)){
            const i=index(n);if(costs[i]!==255)continue;
            const entry=movement.terrainCost(actor,terrain(n)),total=value+entry;
            if(entry===255||total>maxCost||enemySlot(occupying(n)))continue;
            costs[i]=total&255;changed=true;
            if(next>costs[i]&&(!respectZoc||shadow||!zoc(n)))next=Math.min(costs[i],later);
            if((mode&8)&&threat[i]!==255&&(bySlot.get(threat[i]).flags16&32))return threat[i];
            if((mode&2)&&same(n,goal))return 1;
            if(mode&4)scorePosition(n);
          }
        }
        if(!changed){if(later!==255){next=later;changed=true;}}
        else next=Math.min(next,later);
      }
      layer=next;
    }
    return 255;
  }

  /** 4263C follows strictly decreasing cost, picks N/E/S/W first minimum,
   * and charges the selected neighbor terrain. Reverse into a forward route.
   */
  function backtrack(source,destination,remaining,markStopped){
    let here=copy(destination),success=true,reverse=[];
    while(!same(here,source)&&success){
      rule(reverse.length<size,'ai_path_cycle');let best=costs[index(here)],chosen=null,price=0;
      for(const n of neighbors(here)){
        if(zoc(n)&&!same(n,source)&&!shadow)continue;
        const value=costs[index(n)];if(value>=best)continue;
        const entry=movement.terrainCost(actor,terrain(n));if(remaining<entry)continue;
        best=value;chosen=n;price=entry;
      }
      if(chosen){here=copy(chosen);remaining=(remaining-price)&255;reverse.push(chosen.direction);}
      else success=false;
    }
    if(!success&&markStopped)addInfluence(here,occupying(here)!==255?20:10);
    return {directions:reverse.reverse().map(d=>(d+2)%4),stopped:here,success};
  }
  function scoreReachable(respectZoc=true){search(actor.position,budget,4,null,respectZoc);}
  function towardGoal(goal,weight=10){
    addInfluence(goal,weight);
    let found=search(goal,255,2,actor.position,true);
    if(found!==1){found=search(goal,255,2,actor.position,false);if(found===255)return false;}
    backtrack(goal,actor.position,budget,true);scoreReachable(true);return true;
  }
  function pursuit(){
    let target=search(actor.position,budget,8,null,true);
    if(target!==255){aggression=true;scoreReachable();return;}
    target=search(actor.position,255,8,null,true);
    if(target===255){selected.position=copy(actor.position);return;}
    const goal=bySlot.get(target).position;
    let found=search(goal,255,2,actor.position,true);
    if(found!==1)found=search(goal,255,2,actor.position,false);
    if(found!==255){backtrack(goal,actor.position,budget,true);scoreReachable();}
    else selected.position=copy(actor.position);
  }
  if(retreat&&!shadow&&actor.slotIndex!==15){
    // Native42E34..42E52 reads descriptor coordinates even after33BCE removal.
    // Removed units remain absent from occupancy; legacy saves without the retained
    // coordinate are unknown, never replaced with an invented spawn position.
    const leader=bySlot.get(actor.slotIndex<15?0:15);
    const nativePosition=resolveNativeLeaderPosition({leader,rules,tacticalState,board});
    const leaderPosition=nativePosition.position;
    rule(leaderPosition&&Number.isInteger(leaderPosition.x)&&Number.isInteger(leaderPosition.y),'legacy_removed_leader_position_unknown');
    rule(nativePosition.sentinel||valid(leaderPosition),'ai_retreat_leader_coordinate_outside_reviewed_board');
    if(nativePosition.sentinel)trace.push({source:leader.slotIndex<15?'33A54/46F4A/42E9C':'33A54/47042/42E9C',kind:'hidden_leader_sentinel',definitionIndex:leader.definitionIndex,position:copy(leaderPosition)});
    if(!towardGoal(leaderPosition))pursuit();
    trace.push({source:'42E1C',kind:'retreat_to_leader'});
  }else switch(actor.control17){
    case 0:case 4:{
      let goal=actor.aiDestination;
      if(actor.followSlot!==255){const followed=bySlot.get(actor.followSlot);goal=followed.position;if([0,4].includes(followed.control17))excluded=copy(followed.aiDestination);}
      rule(valid(goal),'ai_destination_out_of_bounds');
      if(shadow){
        const found=search(actor.position,255,2,goal,true);
        if(found===1)selected.position=copy(goal);
        else {const second=search(actor.position,255,2,goal,false);selected.position=copy(second!==0?goal:actor.position);if(second===0)unitChanges.aiDestination=copy(actor.position);}
      }else{
        const contact=search(actor.position,budget,8,null,true);
        if(actor.followSlot!==255&&contact===actor.followSlot){addInfluence(goal,20);scoreReachable();}
        else if(!towardGoal(goal))pursuit();
      }
      break;
    }
    case 1:pursuit();break;
    case 2:search(actor.position,0,4,null,true);selected.position=copy(actor.position);break;
    case 3:if(search(actor.position,budget,8,null,true)!==255)scoreReachable();else selected.position=copy(actor.position);break;
  }
  trace.push({source:'42D70',kind:'selected',control17:actor.control17,budget,retreat,aggression,...selected});
  let path=[origin],directions=[];
  if(selected.position&&!same(selected.position,actor.position)){
    const route=backtrack(actor.position,selected.position,255,false);
    rule(route.success,'ai_selected_position_has_no_original_path');directions=route.directions;
    for(const d of directions){const [dx,dy]=DIRS[d],p=path.at(-1);path.push({x:p.x+dx,y:p.y+dy});}
    rule(same(path.at(-1),selected.position),'ai_path_endpoint_mismatch');
  }
  const finalPosition=path.at(-1);
  if(actor.followSlot===255&&[0,4].includes(actor.control17)&&same(finalPosition,actor.aiDestination)){
    actor.control17=3;unitChanges.control17=3;unitChanges.aiDestination=copy(finalPosition);
  }
  let action={type:'wait'};
  if(!shadow&&actor.control17!==4&&selected.strategy!==255){
    action={type:'strategy',strategyIndex:selected.strategy,targetSlot:selected.target};
  }else if(!shadow&&actor.control17!==4){
    const moved={...actor,position:finalPosition};
    const targets=enumerateTargets({actor:moved,units:units.map(u=>u.slotIndex===actor.slotIndex?moved:u),rangeCode,sideMask:0,width,height});
    // 41FDC prefers the remembered target when present; otherwise LAST enumerated.
    const target=targets.includes(selected.target)?selected.target:targets.at(-1);
    if(target!==undefined)action={type:'attack',targetSlot:target};
  }
  return result(action,path,directions);
}
