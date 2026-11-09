/** Bounded tactical state reducer, not a full game/turn interpreter.
 * Without an event inventory only the original one-step route can commit.
 * An optional verified event inventory enables predicate-safe first-board routes.
 * Private inventory declarations are validated, not authenticated.
 */
import {UnsupportedRuleError} from './abilities.mjs';
import {createMovementCalculator} from './movement.mjs';
import {createPostWaitEventGuard,originalMovementPath} from './movement-events.mjs';
const SHA='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const MOVEMENT_SHA='30062bbdebe44d8da7e336980954c0dae151025132ba5fb231c3654dadccc7cf';
const CONTEXT='map0-turn2-zhuge-north-one-step';
const ORIGIN={x:5,y:22}, DESTINATION={x:5,y:21};
const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value) {
  if (value && typeof value==='object') {
    Object.values(value).forEach(freeze);Object.freeze(value);
  }
  return value;
}
function equal(a,b) {
  if (a===b) return true;
  if (!a || !b || typeof a!=='object' || typeof b!=='object' || Array.isArray(a)!==Array.isArray(b)) return false;
  const aa=Object.keys(a).sort(),bb=Object.keys(b).sort();
  return aa.length===bb.length && aa.every((k,i)=>k===bb[i] && equal(a[k],b[k]));
}
function requireRule(condition,reason) {if (!condition) throw new UnsupportedRuleError(reason);}
function point(value,width,height) {
  if (!value || Object.keys(value).sort().join(',')!=='x,y' ||
      !Number.isSafeInteger(value.x) || !Number.isSafeInteger(value.y) ||
      value.x<0 || value.y<0 || value.x>=width || value.y>=height)
    throw new RangeError('Destination must be an in-bounds integer {x,y}');
  return {x:value.x,y:value.y};
}
function affiliation(unit) {
  return unit.slot_index>=15 ? '敵軍' : unit.control_mode_byte_17===7 ? '自軍' : '友軍';
}
function remaining(units) {
  return units.filter(u=>u.slot_index<15 && u.state_byte_15===2 && u.control_mode_byte_17===7 &&
    !(u.flags_byte_16&128) && !(u.status_byte_26&16)).map(u=>u.slot_index);
}

/** initialState(), permission(state,slot), range(state), destinationStatus(state,
 * {x,y}), reduce(state,action). Returned state is immutable and JSON serializable.
 * Reloading initialState starts a NEW experiment, not original post-wait undo.
 */
export function createMovementActionReducer(actionInventory,movementInventory,eventInventory=undefined) {
  requireRule(actionInventory?.schema_version==='1.0.0' &&
    actionInventory?.purpose==='private_first_board_zhuge_movement_actions' &&
    actionInventory?.source_rom?.sha256===SHA && actionInventory?.movement_inventory_sha256===MOVEMENT_SHA &&
    actionInventory?.context_id===CONTEXT && actionInventory?.supported_slot===0 &&
    actionInventory?.player_phase_evidence==='natural_call_08047e18_to_080357d0' &&
    actionInventory?.turn_counter_raw===1 && actionInventory?.displayed_turn===2 &&
    actionInventory?.global_control_byte_055c===0 && actionInventory?.wait_confirmation_enabled===false,
    'movement_action_inventory');
  requireRule(equal(actionInventory.supported_route,{origin:ORIGIN,destination:DESTINATION,
    path:[ORIGIN,DESTINATION],final_facing_byte_18:0,post_wait_event_scan_return:0}), 'unverified_action_route');
  const calculate=createMovementCalculator(movementInventory);
  requireRule(equal(actionInventory.board,movementInventory.board) && actionInventory.board.width===15 &&
    actionInventory.board.height===24 && actionInventory.units?.length===16 && movementInventory.units.length===16,
    'changed_action_board');
  const units=clone(actionInventory.units),board=clone(actionInventory.board);
  const extra=['state_byte_15','control_mode_byte_17','facing_byte_18','affiliation_ja'];
  for (let i=0;i<units.length;i++) {
    const u=units[i],movement=clone(u);
    extra.forEach(k=>delete movement[k]);
    requireRule(equal(movement,movementInventory.units[i]) && u.state_byte_15===2 &&
      Number.isInteger(u.control_mode_byte_17) && u.control_mode_byte_17>=0 && u.control_mode_byte_17<=255 &&
      Number.isInteger(u.facing_byte_18) && u.facing_byte_18>=0 && u.facing_byte_18<=3 &&
      u.affiliation_ja===affiliation(u), 'changed_action_unit');
    const expectedControl=u.slot_index>=15 ? 1 : [0,3,6].includes(u.slot_index) ? 7 : 4;
    requireRule(u.control_mode_byte_17===expectedControl, 'changed_action_control');
  }
  const z=units[0];
  requireRule(z.slot_index===0 && z.definition_index===0 && z.class_index===18 &&
    z.flags_byte_16===0x30 && z.facing_byte_18===1 && equal(z.position,ORIGIN) &&
    equal(remaining(units),[0,3,6]), 'changed_zhuge_context');
  const calculatedOccupancy=Array(360).fill(255);
  units.forEach(u=>{const p=point(u.position,15,24),i=p.x+15*p.y;
    requireRule(calculatedOccupancy[i]===255,'duplicate_action_occupancy');calculatedOccupancy[i]=u.slot_index;});
  requireRule(equal(calculatedOccupancy,board.occupancy),'changed_action_occupancy');
  // Validate that the reviewed path is still a legal empty range destination.
  const initialRange=calculate({board:{...board,occupants:units},mover:z});
  requireRule(initialRange.destinations.some(p=>p.x===5 && p.y===21),'action_route_not_legal');
  freeze(units);freeze(board);
  const eventGuard=eventInventory===undefined?null:createPostWaitEventGuard(eventInventory);
  const stateContext=eventGuard?'map0-turn2-zhuge-event-guarded':CONTEXT;
  const poseKey=u=>[u.position.x,u.position.y,u.facing_byte_18,u.flags_byte_16&0x30].join(',');
  const allowedMoved=new Set(),allowedCancelled=new Set();
  if(eventGuard) {
    // This derived finite set validates serialized snapshots, not destination
    // authorization. Authorization is recalculated by range + event predicates.
    for(const orientation of [0x20,0x30]) for(const p of initialRange.destinations) {
      const mover={...z,flags_byte_16:orientation};
      const route=originalMovementPath(initialRange,{...board,occupants:units},mover,p);
      const after={...mover,position:{x:p.x,y:p.y},flags_byte_16:route.orientationFlags,
        facing_byte_18:route.finalFacing};
      const occupants=units.map(u=>u.slot_index===0?after:u);
      if(!eventGuard({mover:after,occupants}).safe)continue;
      allowedMoved.add(poseKey(after));allowedCancelled.add(poseKey({...after,position:ORIGIN}));
    }
    requireRule(allowedMoved.size>0,'no_verified_event_safe_destinations');
  }

  function make(stage='player_input',outcome='initial',cursor=null,pose=null) {
    const current=clone(units),grid=clone(board),mover=current[0];
    if(pose) {
      mover.position=clone(pose.position);mover.flags_byte_16=pose.flags_byte_16;
      mover.facing_byte_18=pose.facing_byte_18;
    } else {
      if(outcome!=='initial') mover.facing_byte_18=0;
      if(outcome==='pending_move' || outcome==='finished_wait') {
        mover.position=clone(DESTINATION);mover.flags_byte_16=outcome==='pending_move'?0x70:0xf0;
      }
    }
    grid.occupancy[335]=255;grid.occupancy[mover.position.x+15*mover.position.y]=0;
    return freeze({schemaVersion:'1.0.0',contextId:stateContext,stage,outcome,
      turn:{phase:'player_input',counterRaw:1,displayed:2},board:grid,units:current,
      selectedSlot:stage==='player_input'?null:0,cursor,
      pendingOrigin:stage==='postmove_action_menu'?clone(ORIGIN):null,
      remainingSelfSlots:remaining(current),supportedPostmoveCommands:stage==='postmove_action_menu'?['wait','cancel']:[]});
  }
  function validate(state) {
    const stage=state?.stage,outcome=state?.outcome;
    requireRule(['player_input','destination_selection','postmove_action_menu'].includes(stage),'unknown_action_stage');
    requireRule(stage==='postmove_action_menu' ? outcome==='pending_move' :
      stage==='destination_selection' ? ['initial','cancelled_move'].includes(outcome) :
      ['initial','cancelled_move','finished_wait'].includes(outcome),'unknown_action_outcome');
    const cursor=stage==='destination_selection'?point(state.cursor,15,24):null;
    let pose=null;
    if(eventGuard) {
      pose=state.units?.[0];requireRule(!!pose,'missing_action_mover');point(pose.position,15,24);
      const flags=pose.flags_byte_16;
      if(outcome==='initial') {
        requireRule(equal(pose.position,ORIGIN) && pose.facing_byte_18===1 && flags===0x30,'changed_initial_pose');
      } else if(outcome==='cancelled_move') {
        requireRule([0x20,0x30].includes(flags) && allowedCancelled.has(poseKey(pose)),'unknown_cancelled_pose');
      } else {
        const bits=outcome==='pending_move'?0x40:0xc0;
        requireRule([0x20|bits,0x30|bits].includes(flags) && allowedMoved.has(poseKey(pose)),'unknown_moved_pose');
      }
    }
    requireRule(equal(state,make(stage,outcome,cursor,pose)),'changed_or_unknown_action_state');
  }
  function permission(state,slot) {
    validate(state);
    const unit=state.units.find(u=>u.slot_index===slot);
    requireRule(!!unit,'unknown_action_slot');
    const affiliationJa=affiliation(unit);
    const originalCommandPermission=affiliationJa!=='自軍' ? 'inspection_only' :
      unit.flags_byte_16&128 ? 'finished' : 'available';
    const implemented=slot===0;
    const canSelectForAction=state.stage==='player_input' && implemented && originalCommandPermission==='available';
    const reason=originalCommandPermission==='finished'?'action_finished':
      originalCommandPermission==='inspection_only'?'not_player_controlled':
      !implemented?'unit_action_context_not_verified':state.stage!=='player_input'?'action_in_progress':null;
    return freeze({slot,affiliationJa,originalCommandPermission,
      actionImplementationSupported:implemented,canSelectForAction,reason});
  }
  function range(state) {
    validate(state);
    return calculate({board:{...state.board,occupants:state.units},mover:state.units[0]});
  }
  function eventCheck(state,route,target) {
    const after={...state.units[0],position:{x:target.x,y:target.y},
      flags_byte_16:route.orientationFlags|0xc0,facing_byte_18:route.finalFacing};
    return eventGuard({mover:after,occupants:state.units.map(u=>u.slot_index===0?after:u)});
  }
  function destinationStatus(state,target) {
    validate(state);const p=point(target,15,24),r=range(state),cost=r.costs[p.x+15*p.y];
    const isEmptyDestination=r.destinations.some(v=>v.x===p.x && v.y===p.y);
    const atOrigin=equal(state.units[0].position,ORIGIN);
    let route=null,event=null,routeVerified=false;
    if(eventGuard && isEmptyDestination && atOrigin) {
      route=originalMovementPath(r,{...state.board,occupants:state.units},state.units[0],p);
      event=eventCheck(state,route,p);routeVerified=event.safe;
    } else if(!eventGuard) routeVerified=equal(p,DESTINATION) && atOrigin;
    const commitSupported=state.stage==='destination_selection' && isEmptyDestination && routeVerified;
    return freeze({position:p,cost:cost===255?null:cost,inRange:cost!==255,isEmptyDestination,
      commitSupported,reason:!isEmptyDestination?'not_legal_empty_destination':
        event && !event.safe?event.reason:!routeVerified?'destination_event_context_not_verified':
        state.stage!=='destination_selection'?'not_selecting_destination':null,
      path:route?.path??null,directions:route?.directions??null,
      finalFacingByte18:route?.finalFacing??null,orientationFlagsByte16:route?.orientationFlags??null,eventCheck:event});
  }
  function reduce(state,action) {
    validate(state);
    requireRule(action && typeof action==='object','missing_movement_action');
    const expectedKeys={select_unit:['type','slot'],preview_destination:['type','destination'],
      confirm_destination:['type'],cancel:['type'],wait:['type']}[action.type];
    requireRule(expectedKeys && equal(Object.keys(action).sort(),expectedKeys.sort()),'unknown_movement_action');
    if (action.type==='select_unit') {
      const p=permission(state,action.slot);
      requireRule(p.canSelectForAction,p.reason || 'selection_not_available');
      return make('destination_selection',state.outcome,clone(ORIGIN),eventGuard?state.units[0]:null);
    }
    if (action.type==='preview_destination') {
      requireRule(state.stage==='destination_selection','not_selecting_destination');
      return make(state.stage,state.outcome,point(action.destination,15,24),eventGuard?state.units[0]:null);
    }
    if (action.type==='confirm_destination') {
      requireRule(state.stage==='destination_selection','not_selecting_destination');
      const status=destinationStatus(state,state.cursor);
      requireRule(status.commitSupported,status.reason || 'unsupported_destination');
      return make('postmove_action_menu','pending_move',null,eventGuard?{position:state.cursor,
        flags_byte_16:status.orientationFlagsByte16|0x40,facing_byte_18:status.finalFacingByte18}:null);
    }
    if (action.type==='cancel') {
      requireRule(state.stage!=='player_input','no_pending_action_to_cancel');
      return make('player_input',state.stage==='postmove_action_menu'?'cancelled_move':state.outcome,null,
        eventGuard?{...state.units[0],position:ORIGIN,flags_byte_16:state.units[0].flags_byte_16&~0x40}:null);
    }
    requireRule(state.stage==='postmove_action_menu','wait_requires_verified_pending_move');
    if(eventGuard) {
      const check=eventGuard({mover:state.units[0],occupants:state.units});
      requireRule(check.safe,check.reason);
    }
    return make('player_input','finished_wait',null,eventGuard?{...state.units[0],
      flags_byte_16:state.units[0].flags_byte_16|0x80}:null);
  }
  return Object.freeze({initialState:()=>make(),permission,range,destinationStatus,reduce,
    destinations:state=>Object.freeze(range(state).destinations.map(p=>destinationStatus(state,{x:p.x,y:p.y})))});
}
