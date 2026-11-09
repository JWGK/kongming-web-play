/** Normal movement inspection, not a turn/action or movement-commit executor.
 * Data comes from the separately validated PRIVATE extract_movement.py result.
 * This validates declarations and input structure, not cryptographic authenticity.
 */
import {UnsupportedRuleError} from './abilities.mjs';
const SHA = 'acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const CLASSES = [0, 3, 6, 9, 18];
const TERRAINS = [0, 1, 2, 4, 7, 10];
const own = (array, index) => Object.hasOwn(array, index);
function int(value, min, max, label) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new RangeError(label + ' must be an integer in ' + min + '..' + max);
  return value;
}
function dense(array, length, label) {
  if (!Array.isArray(array) || array.length !== length ||
      Array.from({length}, (_, i) => !own(array, i)).some(Boolean))
    throw new TypeError(label + ' must be a complete array of length ' + length);
  return array;
}
function same(a, b) {
  return Array.isArray(a) && a.length === b.length && b.every((v,i) => own(a,i) && a[i] === v);
}
function neighbors(index, width, height) {
  const x = index % width, y = Math.floor(index / width);
  return [[x,y-1],[x+1,y],[x,y+1],[x-1,y]]
    .filter(([xx,yy]) => xx >= 0 && xx < width && yy >= 0 && yy < height)
    .map(([xx,yy]) => xx + yy*width);
}

/** Return a pure calculator for captured normal equipment/status contexts.
 * Inventory supports first-board classes 0/3/6/9/18 and terrain IDs 0/1/2/4/7/10.
 * Board positions may vary for inspection; budgets cannot be supplied or invented.
 */
export function createMovementCalculator(inventory) {
  if (inventory?.purpose !== 'private_first_board_normal_movement' ||
      inventory?.schema_version !== '1.0.0' || inventory?.source_rom?.sha256 !== SHA ||
      !same(inventory.supported_class_indices, CLASSES) ||
      !same(inventory.supported_terrain_ids, TERRAINS))
    throw new UnsupportedRuleError('movement_inventory');
  const profiles = new Map();
  dense(inventory.profiles, CLASSES.length, 'profiles').forEach(row => {
    const id = int(row.class_index, 0, 42, 'class index');
    if (!CLASSES.includes(id) || profiles.has(id) || row.evidence_status !== 'static_code_confirmed')
      throw new UnsupportedRuleError('movement_class');
    const costs = dense(row.terrain_costs, 23, 'terrain costs').map(v => {
      if (v !== 255) int(v, 1, 3, 'terrain entry cost');
      return v;
    });
    const points = int(row.base_points, 1, 6, 'base movement points');
    profiles.set(id, Object.freeze({costs: Object.freeze(costs), points}));
  });
  const contexts = new Map();
  const itemChecks = new Map();
  if (!Array.isArray(inventory.item_movement_checks)) throw new TypeError('Item movement checks required');
  for (const item of inventory.item_movement_checks) {
    const slot = int(item.slot_id,0,254,'item instance slot');
    const definition = int(item.definition_id,0,254,'item definition');
    const effects = dense(item.effect_types,2,'item effect types');
    if (itemChecks.has(slot) || effects.some(t => [3,5].includes(int(t,0,15,'effect type'))) ||
        item.movement_addition !== 0 || item.proof !== 'neither_primary_nor_secondary_is_type_3_or_5')
      throw new UnsupportedRuleError('movement_item_effect');
    itemChecks.set(slot,definition);
  }
  if (!Array.isArray(inventory.units) || !inventory.units.length)
    throw new TypeError('Verified current movement contexts are required');
  for (const unit of inventory.units) {
    const slot = int(unit.slot_index, 0, 44, 'unit slot');
    const definition = int(unit.definition_index, 0, 511, 'definition index');
    const profile = profiles.get(unit.class_index);
    if (contexts.has(slot) || !profile || unit.evidence_status !== 'static_current_context_confirmed' ||
        unit.status_byte_26 !== 0 || (int(unit.flags_byte_16,0,255,'unit flags') & 4) ||
        unit.equipment_movement_addition !== 0 || unit.movement_points !== profile.points)
      throw new UnsupportedRuleError('movement_context');
    const items = dense(unit.item_slots, 13, 'item slots').map(v => int(v,0,255,'item slot'));
    const definitions = dense(unit.item_definition_ids,13,'item definition IDs').map(v => int(v,0,255,'item definition'));
    if (items.some((slot,i) => slot === 255 ? definitions[i] !== 255 : itemChecks.get(slot) !== definitions[i]))
      throw new UnsupportedRuleError('movement_item_instance');
    contexts.set(slot, Object.freeze({definition, classIndex: unit.class_index,
      items: Object.freeze(items), definitions: Object.freeze(definitions), profile}));
  }

  return function calculateMovementRange({board, mover} = {}) {
    if (!board || !mover) throw new TypeError('Board and explicit current mover context required');
    const width = int(board.width,1,32,'width'), height = int(board.height,1,32,'height');
    if (width*height > 960) throw new RangeError('Map exceeds reviewed buffer capacity');
    const terrain = dense(board.terrain,width*height,'terrain').map(v => {
      if (!TERRAINS.includes(v)) throw new UnsupportedRuleError('movement_terrain');
      return v;
    });
    const slot = int(mover.slot_index,0,44,'mover slot');
    const context = contexts.get(slot);
    if (!context || mover.definition_index !== context.definition || mover.class_index !== context.classIndex ||
        mover.status_byte_26 !== 0 || (int(mover.flags_byte_16,0,255,'mover flags') & 4) ||
        mover.movement_points !== context.profile.points || mover.equipment_movement_addition !== 0 ||
        !same(mover.item_slots,context.items) || !same(mover.item_definition_ids,context.definitions))
      throw new UnsupportedRuleError('changed_or_unknown_movement_context');
    const occupancy = new Array(width*height).fill(255), slots = new Set();
    if (!Array.isArray(board.occupants)) throw new TypeError('Explicit occupant list required');
    for (const unit of board.occupants) {
      const id = int(unit.slot_index,0,44,'occupant slot');
      if (slots.has(id)) throw new TypeError('Duplicate occupant slot');
      slots.add(id);
      if (unit.position === null) continue;
      const x = int(unit.position?.x,0,width-1,'occupant x');
      const y = int(unit.position?.y,0,height-1,'occupant y');
      const index = x+y*width;
      if (occupancy[index] !== 255) throw new TypeError('Two units occupy one cell');
      occupancy[index] = id;
    }
    const x = int(mover.position?.x,0,width-1,'mover x');
    const y = int(mover.position?.y,0,height-1,'mover y');
    const origin = x+y*width;
    if (occupancy[origin] !== slot) throw new TypeError('Mover must occupy its declared origin');
    const costs = new Array(width*height).fill(255), parents = new Array(width*height).fill(-1);
    const points = context.profile.points;
    costs[origin] = 0;
    const frontier = context.profile.costs[terrain[origin]] === 255 ? [] : [[0,origin]];
    const opposing = index => occupancy[index] !== 255 && (occupancy[index] < 15) !== (slot < 15);
    while (frontier.length) {
      frontier.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
      const [spent, here] = frontier.shift();
      if (spent !== costs[here]) continue;
      const next = neighbors(here,width,height);
      // Arrival is allowed, further expansion is not. Origin is exempt.
      if (here !== origin && next.some(opposing)) continue;
      for (const target of next) {
        const entry = context.profile.costs[terrain[target]], total = spent+entry;
        if (entry === 255 || total > points || opposing(target)) continue;
        if (total < costs[target]) {
          costs[target] = total;
          parents[target] = here;
          frontier.push([total,target]);
        }
      }
    }
    const reachable = [], destinations = [];
    costs.forEach((cost,index) => {
      if (cost === 255) return;
      const cell = Object.freeze({x:index%width,y:Math.floor(index/width),cost});
      reachable.push(cell);
      // Same-partition occupied tiles can be crossed, but not selected as endpoints.
      if (occupancy[index] === 255) destinations.push(cell);
    });
    return Object.freeze({layer:'normal_movement_range', width,height,moverSlot:slot,origin,
      movementPoints:points,costs:Object.freeze(costs),parents:Object.freeze(parents),
      reachable:Object.freeze(reachable),destinations:Object.freeze(destinations),
      includesAlliedOccupiedTransit:true,isActionPermission:false,isMovementCommit:false,
      originalEqualCostPathChoiceVerified:false});
  };
}

/** One shortest legal path to an EMPTY destination, including origin.
 * Equal-cost tie choice is deterministic here, not claimed identical to the ROM.
 */
export function movementPathTo(range, {x,y} = {}) {
  if (range?.layer !== 'normal_movement_range') throw new TypeError('Movement range required');
  int(x,0,range.width-1,'target x'); int(y,0,range.height-1,'target y');
  if (!range.destinations.some(cell => cell.x === x && cell.y === y)) return null;
  let here = x+y*range.width;
  const path = [];
  while (here !== range.origin) {
    if (here < 0 || path.length >= range.costs.length) throw new TypeError('Invalid predecessor chain');
    path.push(Object.freeze({x:here%range.width,y:Math.floor(here/range.width)}));
    here = range.parents[here];
  }
  path.push(Object.freeze({x:range.origin%range.width,y:Math.floor(range.origin/range.width)}));
  return Object.freeze(path.reverse());
}

