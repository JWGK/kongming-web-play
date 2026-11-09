/** First-scenario movement using recovered 32BC4/32C20, 42880 and4263C rules.
 * Extends, but does not alter, the historical strict inspection API.
 */
import {equipmentEligibility} from './battle-stats.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
const OFFSETS=[[0,-1],[1,0],[0,1],[-1,0]];
const clone=x=>JSON.parse(JSON.stringify(x));
function int(x,a,b,n){if(!Number.isInteger(x)||x<a||x>b)throw new RangeError(n);return x;}
function guard(x,n){if(!x)throw new UnsupportedRuleError(n);}
export function occupancyOf(board,units){
  int(board?.width,1,40,'width');int(board?.height,1,32,'height');if(board.width>32&&(!((board.width===40&&(board.height===24||board.height===12||board.height===20||board.height===18))||(board.width===38&&(board.height===22||board.height===24))||(board.width===36&&(board.height===14||board.height===20||board.height===24))||(board.width===34&&board.height===24))))throw new TypeError('Unreviewed wide battlefield');
  if(board.terrain?.length!==board.width*board.height)throw new TypeError('Complete terrain required');
  const out=Array(board.width*board.height).fill(255),seen=new Set();
  for(const u of units){int(u.slotIndex,0,44,'slot');if(seen.has(u.slotIndex))throw new TypeError('Duplicate slot');seen.add(u.slotIndex);
    if(u.state15!==2){if(u.position!==null)throw new TypeError('Off-grid unit has a position');continue;}
    const x=int(u.position?.x,0,board.width-1,'x'),y=int(u.position?.y,0,board.height-1,'y'),i=x+y*board.width;
    if(out[i]!==255)throw new TypeError('Duplicate occupied position');out[i]=u.slotIndex;
  }
  // Source opcode01 may write dormant state4 occupancy during a concluding scene.
  if(board.scriptedDormantOccupancy!==undefined){if(!Array.isArray(board.scriptedDormantOccupancy))throw new TypeError('Explicit scripted occupancy required');for(const row of board.scriptedDormantOccupancy){const u=units.find(u=>u.slotIndex===row.slotIndex);if(u?.state15!==4)throw new TypeError('Dormant occupancy must remain removed');const x=int(row.position?.x,0,board.width-1,'dormant x'),y=int(row.position?.y,0,board.height-1,'dormant y');out[x+y*board.width]=u.slotIndex;}}
  return out;
}
export function createBattleMovement(rules){
  guard(rules?.purpose==='private_first_battle_state_rules'&&rules.sourceRomSha256==='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511','battle_movement_rules');
  const profiles=new Map(rules.movementProfiles.map(p=>[p.classIndex,clone(p)]));
  const items=new Map(rules.statsRules.itemDefinitions.map(i=>[i.definitionId,i]));
  function profile(u){const p=profiles.get(u.classIndex);guard(p&&p.costs.length===23,'battle_movement_class');return p;}
  function terrainCost(unit,terrain){int(terrain,0,22,'terrain');return profile(unit).costs[terrain];}
  function movementBudget(u){
    guard(!profile(u).scriptOnly,'scripted_actor_has_no_ordinary_movement');let value=profile(u).basePoints;
    // Native ED5C: all13 slots; eligible primary/secondary movement effects3/5.
    if(!Array.isArray(u.itemSlots)||u.itemSlots.length!==13)throw new TypeError('13 item slots required');
    const instances=new Map(u.statsSource.itemInstances.map(i=>[i.slotId,i.definitionId]));let addition=0;
    for(const slot of u.itemSlots){if(slot===255)continue;const id=instances.get(slot),d=items.get(id);guard(d,'unknown_movement_item');
      if(![d.primaryEffectType,d.secondaryEffectType].some(t=>t===3||t===5))continue;
      if(!equipmentEligibility({classIndex:u.classIndex,itemSlotId:slot,itemDefinitionId:id,rules:rules.statsRules}).eligible)continue;
      for(const [type,magnitude]of [[d.primaryEffectType,d.primaryMagnitude],[d.secondaryEffectType,d.secondaryMagnitude]])if(type===3||type===5)addition+=magnitude;
    }
    value=Math.min(255,value+(addition&255));
    int(u.status26,0,255,'status26');if(u.status26&128)value=(value+3)&255;if(u.status26&1)value>>=1;return value;
  }
  function range({board,units,mover}){
    const {width,height}=board,occupancy=occupancyOf(board,units),origin=mover.position.x+width*mover.position.y;
    guard(mover.state15===2&&occupancy[origin]===mover.slotIndex,'mover_not_on_board');
    const budget=movementBudget(mover),costs=Array(width*height).fill(255),neighbors=i=>OFFSETS.map(([dx,dy])=>[i%width+dx,Math.floor(i/width)+dy]).filter(([x,y])=>x>=0&&y>=0&&x<width&&y<height).map(([x,y])=>x+width*y);
    const enemy=i=>occupancy[i]!==255&&(occupancy[i]<15)!==(mover.slotIndex<15);
    costs[origin]=0;const frontier=terrainCost(mover,board.terrain[origin])===255?[]:[[0,origin]];
    while(frontier.length){frontier.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const [spent,i]=frontier.shift();if(spent!==costs[i])continue;
      if(i!==origin&&!(mover.flags16&4)&&neighbors(i).some(enemy))continue;
      for(const n of neighbors(i)){const entry=terrainCost(mover,board.terrain[n]),total=spent+entry;if(entry===255||enemy(n)||total>budget||total>=costs[n])continue;costs[n]=total;frontier.push([total,n]);}}
    const reachable=[],destinations=[];costs.forEach((cost,i)=>{if(cost===255)return;const p={x:i%width,y:Math.floor(i/width),cost};reachable.push(p);if(occupancy[i]===255)destinations.push(p);});
    return {width,height,origin,moverSlot:mover.slotIndex,movementPoints:budget,costs,reachable,destinations};
  }
  function path({board,units,mover,destination,range:given}){
    const r=given??range({board,units,mover}),{width,height}=r,target=destination.x+width*destination.y;
    if(target===r.origin)return {path:[{...mover.position}],directions:[],finalFacing:mover.facing18,orientationFlags:mover.flags16};
    if(!r.destinations.some(p=>p.x===destination.x&&p.y===destination.y))return null;
    const occ=occupancyOf(board,units),enemy=i=>occ[i]!==255&&(occ[i]<15)!==(mover.slotIndex<15);
    const neighbors=i=>OFFSETS.map(([dx,dy],direction)=>({x:i%width+dx,y:Math.floor(i/width)+dy,direction})).filter(p=>p.x>=0&&p.y>=0&&p.x<width&&p.y<height).map(p=>({...p,index:p.x+p.y*width}));
    const reversed=[];let here=target;
    while(here!==r.origin){guard(reversed.length<width*height,'movement_path_cycle');let best=r.costs[here],chosen=null;
      for(const n of neighbors(here)){if(n.index!==r.origin&&!(mover.flags16&4)&&neighbors(n.index).some(v=>enemy(v.index)))continue;if(r.costs[n.index]<best){best=r.costs[n.index];chosen=n;}}
      guard(chosen,'movement_path_gradient');reversed.push(chosen.direction);here=chosen.index;}
    const directions=reversed.reverse().map(d=>(d+2)%4),path=[{...mover.position}];let flags=mover.flags16;
    for(const d of directions){const [dx,dy]=OFFSETS[d],p=path.at(-1);path.push({x:p.x+dx,y:p.y+dy});if(d===1)flags|=16;else if(d===3)flags&=~16;}
    return {path,directions,finalFacing:directions.at(-1),orientationFlags:flags};
  }
  return Object.freeze({terrainCost,movementBudget,range,path});
}
