import { createMovementCalculator, movementPathTo } from './engine/movement.mjs';
import { UnsupportedRuleError } from './engine/abilities.mjs';

/** Bound the broader calculator to this unchanged, canonical inspection board. */
export function createMovementPreview(battle, inventory) {
  const calculate = createMovementCalculator(inventory);
  if (inventory.units.length !== battle.units.length || battle.units.length !== 16) throw new UnsupportedRuleError('preview_unit_inventory');
  const contexts = new Map();
  for (const context of inventory.units) {
    const id = `unit-${context.slot_index}`;
    const unit = battle.units.find(unit => unit.id === id);
    if (!unit || contexts.has(id) || unit.currentClassIndex !== context.class_index ||
      unit.position.x !== context.position?.x || unit.position.y !== context.position?.y) throw new UnsupportedRuleError('preview_changed_board');
    contexts.set(id, structuredClone(context));
  }
  const board = {
    width: battle.width, height: battle.height,
    terrain: battle.terrainRows.flat(),
    occupants: inventory.units.map(context => ({ slot_index: context.slot_index, position: { ...context.position } })),
  };
  return function forUnit(id) {
    const context = contexts.get(id);
    if (!context) throw new UnsupportedRuleError('preview_unknown_unit');
    return calculate({ board, mover: context });
  };
}
export function emptyMovementState() { return { sourceId: null, range: null, destination: null, path: null, notice: '' }; }
export function reduceMovement(state, action, preview, battle) {
  if (['cancel', 'reset', 'tab'].includes(action.type)) return emptyMovementState();
  if (action.type === 'start') {
    if (!action.unitId) return { ...emptyMovementState(), notice: '部隊を選んでから「移動範囲」を押してください。' };
    try {
      const range = preview(action.unitId);
      if (range.isActionPermission !== false || range.isMovementCommit !== false) throw new UnsupportedRuleError('preview_action_permission');
      return { sourceId: action.unitId, range, destination: null, path: null, notice: '' };
    } catch {
      return { ...emptyMovementState(), notice: 'この条件の移動範囲は未対応です。推測した範囲は表示しません。' };
    }
  }
  if (action.type === 'unit' && state.sourceId && action.unitId !== state.sourceId) {
    return { ...emptyMovementState(), notice: '部隊を切り替えました。「移動範囲」を押すと再計算します。' };
  }
  if (action.type === 'cell' && state.range) {
    const unit = battle.units.find(unit => unit.position.x === action.position.x && unit.position.y === action.position.y);
    if (unit && unit.id !== state.sourceId) return { ...emptyMovementState(), notice: '部隊を切り替えました。「移動範囲」を押すと再計算します。' };
    let path;
    try { path = movementPathTo(state.range, action.position); } catch { path = null; }
    return { ...state, destination: path ? { ...action.position } : null, path, notice: path ? '' : unit?.id === state.sourceId ? 'ここは計算の起点です。空き終点候補を選んでください。' : 'このマスは今回の空き終点候補ではありません。' };
  }
  return state;
}
export function movementCellKind(state, x, y) {
  if (!state.range) return 'none';
  const index = y * state.range.width + x;
  if (index === state.range.origin) return 'origin';
  if (state.range.costs[index] === 255) return 'none';
  return state.range.destinations.some(cell => cell.x === x && cell.y === y) ? 'destination' : 'transit';
}
