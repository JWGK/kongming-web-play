// This validation only recalculates stats from the party's held items.
// Stock inventory validation has already checked the slot and instance bytes.
import {extendReplayStats} from './benefits.mjs';

const checkedDefinitions = new WeakMap();

export function partyStatRules(rules, inventory) {
  const rows = rules.itemDefinitions;
  let known = Object.isFrozen(rows) && checkedDefinitions.get(rows);
  if (!known) {
    known = new Map(rows.map(row => [row.definitionId, row.family]));
    if (Object.isFrozen(rows)) checkedDefinitions.set(rows, known);
  }
  const hasBookFamily = rules.universalApplicableFamilies?.includes(25);
  for (const actor of inventory.party) {
    for (const slot of actor.itemSlots) {
      if (slot === 255) continue;
      const id = inventory.itemInstances[slot].definitionId;
      const family = known.get(id);
      if (family === undefined || (family === 25 && !hasBookFamily)) {
        return extendReplayStats(rules, inventory);
      }
    }
  }
  return rules;
}

// A story event can remove an officer from the active roster while preserving
// their inventory. The field constructor still materializes those known actors.
export function observedStatRules(rules, inventory, observations) {
  if (!observations?.length) return rules;
  return partyStatRules(rules, {...inventory, party: observations});
}
