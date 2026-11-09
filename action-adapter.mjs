import { createMovementActionReducer } from './engine/movement-actions.mjs';

/** Assemble the unchanged reducer's inputs from separately allowlisted data.
 * Canonical geometry is reused, not duplicated from private research records. */
export function createVerifiedActionTest(battle, movementInventory, actionData, eventInventory) {
  if (!eventInventory) throw new TypeError('The verified event guard is required; no fallback actions');
  if (!Array.isArray(actionData?.unitActions) || actionData.unitActions.length !== 16 || movementInventory.units.length !== 16) throw new TypeError('Expected sixteen reviewed action contexts');
  const occupancy = Array(battle.width * battle.height).fill(255);
  for (const context of movementInventory.units) {
    const unit = battle.units.find(unit => unit.id === `unit-${context.slot_index}`);
    if (!unit || unit.position.x !== context.position.x || unit.position.y !== context.position.y || unit.currentClassIndex !== context.class_index) throw new TypeError('Action board must be the canonical board');
    const index = unit.position.x + unit.position.y * battle.width;
    if (occupancy[index] !== 255) throw new TypeError('Duplicate action position');
    occupancy[index] = context.slot_index;
  }
  const board = { width: battle.width, height: battle.height, terrain: battle.terrainRows.flat(), occupancy };
  const { unitActions, ...metadata } = actionData;
  const units = movementInventory.units.map((unit, index) => {
    const extra = unitActions[index];
    if (extra.slot_index !== unit.slot_index) throw new TypeError('Action context ordering differs');
    return { ...unit, ...extra };
  });
  return createMovementActionReducer({ ...metadata, board, units }, { ...movementInventory, board }, eventInventory);
}
export function projectActionBoard(canonical, state) {
  if (!state) return canonical;
  return { ...canonical, units: canonical.units.map(unit => {
    const tactical = state.units.find(row => `unit-${row.slot_index}` === unit.id);
    if (!tactical) throw new TypeError('Incomplete action projection');
    return { ...unit, position: { ...tactical.position } };
  }) };
}
