/** Reviewed first-board post-wait predicate guard; never executes event scripts.
 * A matching event is a blocker, not a silently ignored side effect.
 */
import {UnsupportedRuleError} from './abilities.mjs';
const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const ACTION_SHA='b8ca823964196fbd01152a6fdbd5a4f4162d6f312bcc650323667590da7e18e5';
const MOVEMENT_SHA='30062bbdebe44d8da7e336980954c0dae151025132ba5fb231c3654dadccc7cf';
const OFFSETS=[[0,-1],[1,0],[0,1],[-1,0]];
function requireRule(ok,rule) {if(!ok) throw new UnsupportedRuleError(rule);}
function integer(n,min,max,label) {
  if(!Number.isSafeInteger(n)||n<min||n>max) throw new RangeError(label);
  return n;
}
function freeze(value) {
  if(value && typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}
function cell(position,width,height) {
  integer(position?.x,0,width-1,'x');integer(position?.y,0,height-1,'y');return position.x+width*position.y;
}

/** Source lookups are sequential first-accepted rows, not AND conditions.
 * Only reviewed positive, non-continuation rows are accepted. Types 7/9/12 are
 * false in these particular lookups; their other gameplay semantics are unknown.
 */
export function createPostWaitEventGuard(inventory) {
  requireRule(inventory?.schema_version==='1.0.0' && inventory?.purpose==='private_first_board_zhuge_event_guard' &&
    inventory?.source_rom?.sha256===SHA && inventory?.action_inventory_sha256===ACTION_SHA &&
    inventory?.movement_inventory_sha256===MOVEMENT_SHA &&
    inventory?.context_id==='map0-turn2-zhuge-event-guarded','movement_event_inventory');
  const s=inventory.scene;
  requireRule(s?.block_index===3 && s?.first_record_index===3 && s?.group===3 &&
    s?.resume_state===0 && s?.terminal_flag===0 && s?.random_interaction_enabled===false &&
    inventory?.evidence_status==='static_predicate_confirmed','changed_or_unknown_event_context');
  requireRule(Array.isArray(inventory.rows) && inventory.rows.length===8 &&
    Array.from({length:8},(_,i)=>Object.hasOwn(inventory.rows,i)).every(Boolean),'event_descriptor_count');
  const rows=inventory.rows.map((r,i)=>{
    requireRule(r.record_index===i+3 && r.group_raw===(i===0?131:3),'event_descriptor_group');
    integer(r.type_raw,0,255,'event type');
    // Type0 can call script evaluation. Type1 and high-bit inversion can accept
    // an otherwise false predicate. None exists in the captured group.
    requireRule([4,6,7,9,11,12].includes(r.type_raw),'unsupported_event_predicate_or_fallback');
    return Object.freeze({record_index:r.record_index,type_raw:r.type_raw,
      selector:integer(r.selector,0,65535,'event selector'),
      argument_b:integer(r.argument_b,0,65535,'event argument'),
      argument_c:integer(r.argument_c,0,65535,'event argument')});
  });
  function lookup(kind,selector,p,adjacentDefinition) {
    return rows.find(r=>{
      if(r.selector!==selector)return false;
      if(kind==='exact_cell')return r.type_raw===6 && r.argument_b===((p.x<<8)|p.y);
      if(kind==='rectangle')return r.type_raw===11 &&
        p.x>=(r.argument_b>>>8) && p.x<=(r.argument_c>>>8) &&
        p.y>=(r.argument_b&255) && p.y<=(r.argument_c&255);
      return r.type_raw===4 && r.argument_b===adjacentDefinition;
    });
  }
  return function inspectPostWait({mover,occupants,width=15,height=24}={}) {
    requireRule(width===15 && height===24,'changed_event_map');
    const slot=integer(mover?.slot_index,0,44,'event mover slot');
    const definition=integer(mover?.definition_index,0,511,'event mover definition');
    cell(mover.position,width,height);
    requireRule(mover.state_byte_15===2 && !(integer(mover.flags_byte_16,0,255,'event flags')&4),
      'unsupported_postwait_unit_state');
    requireRule(Array.isArray(occupants),'event_occupants_required');
    const byCell=new Map(),slots=new Set();
    for(const u of occupants) {
      const id=integer(u.slot_index,0,44,'occupant slot');
      integer(u.definition_index,0,511,'occupant definition');
      requireRule(!slots.has(id),'duplicate_event_slot');slots.add(id);
      if(u.position===null)continue;
      const at=cell(u.position,width,height);requireRule(!byCell.has(at),'duplicate_event_occupancy');byCell.set(at,u);
    }
    const selectors=slot<15?[definition,1024]:[definition],checks=[];
    function check(kind,adjacentDefinition=null) {
      for(const selector of selectors) {
        const row=lookup(kind,selector,mover.position,adjacentDefinition);
        checks.push({kind,selector,adjacentDefinition,matchedRecord:row?.record_index??null});
        if(row)return freeze({safe:false,reason:'event_dispatch_required',matchedRecord:row.record_index,
          lookup:kind,checks,dispatchExecuted:false});
      }
      return null;
    }
    for(const kind of ['exact_cell','rectangle']) {const result=check(kind);if(result)return result;}
    for(const [dx,dy] of OFFSETS) {
      const x=mover.position.x+dx,y=mover.position.y+dy;
      if(x<0||y<0||x>=width||y>=height)continue;
      const other=byCell.get(x+y*width);
      if(other){const result=check('adjacent_pair',other.definition_index);if(result)return result;}
    }
    // Generic12D30 runs between lookup stages. With no type0/1/inverted row,
    // every reviewed descriptor returns false and cannot dispatch a script.
    return freeze({safe:true,reason:null,matchedRecord:null,checks,
      genericLookup:'no_matching_type',randomInteraction:'disabled',dispatchExecuted:false});
  };
}

/** Original 0x4263C backtracking: from destination choose the strictly lowest
 * range-cost cardinal neighbor, first N/E/S/W on ties; exclude opponent-adjacent
 * predecessors except origin. Reverse and invert directions for forward motion.
 * This is distinct from movement.mjs's generic shortest-path tie choice.
 */
export function originalMovementPath(range,board,mover,destination) {
  requireRule(range?.layer==='normal_movement_range' && range.moverSlot===mover?.slot_index,
    'original_path_requires_normal_range');
  const {width,height}=range;requireRule(board?.width===width && board?.height===height,'path_board_size');
  requireRule(mover.status_byte_26===0 && !(integer(mover.flags_byte_16,0,255,'path flags')&4),
    'unsupported_original_path_flags');
  const target=cell(destination,width,height),origin=cell(mover.position,width,height);
  requireRule(range.origin===origin && range.movementPoints<=6 && range.costs.length===width*height,
    'unsupported_original_path_context');
  if(!range.destinations.some(p=>p.x===destination.x&&p.y===destination.y))return null;
  const occupancy=new Array(width*height).fill(255),slots=new Set();
  requireRule(Array.isArray(board.occupants),'path_occupants_required');
  for(const u of board.occupants) {
    const id=integer(u.slot_index,0,44,'path occupant');requireRule(!slots.has(id),'duplicate_path_slot');slots.add(id);
    if(u.position===null)continue;
    const i=cell(u.position,width,height);requireRule(occupancy[i]===255,'duplicate_path_occupancy');occupancy[i]=id;
  }
  requireRule(occupancy[origin]===mover.slot_index && occupancy[target]===255,'path_occupancy_mismatch');
  const neighbors=i=>OFFSETS.map(([dx,dy],direction)=>({x:i%width+dx,y:Math.floor(i/width)+dy,direction}))
    .filter(p=>p.x>=0&&p.y>=0&&p.x<width&&p.y<height).map(p=>({...p,index:p.x+p.y*width}));
  const opposing=i=>occupancy[i]!==255 && (occupancy[i]<15)!==(mover.slot_index<15);
  let here=target;const reverse=[];
  while(here!==origin) {
    requireRule(reverse.length<range.movementPoints,'invalid_original_path_gradient');
    let best=range.costs[here],chosen=null;
    for(const n of neighbors(here)) {
      if(n.index!==origin && neighbors(n.index).some(p=>opposing(p.index)))continue;
      if(range.costs[n.index]<best){best=range.costs[n.index];chosen=n;}
    }
    requireRule(chosen!==null,'invalid_original_path_gradient');
    reverse.push(chosen.direction);here=chosen.index;
  }
  const directions=reverse.reverse().map(d=>(d+2)%4),path=[{...mover.position}];
  let flags=integer(mover.flags_byte_16,0,255,'path flags');
  for(const d of directions) {
    const prior=path.at(-1),[dx,dy]=OFFSETS[d];path.push({x:prior.x+dx,y:prior.y+dy});
    // 34A84→33AB4: horizontal facing changes bit10; vertical leaves it intact.
    if(d===1)flags|=16;else if(d===3)flags&=~16;
  }
  return freeze({path,directions,finalFacing:directions.at(-1),orientationFlags:flags,
    originalTieOrderVerified:true});
}
