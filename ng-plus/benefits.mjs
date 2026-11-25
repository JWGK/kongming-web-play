import { replayItemDefinition } from './item-catalog.mjs';

const warehouseSize = 255;
const emptySlot = 255;

function checkCarry({ currency, warehouseCounts }) {
  if (!Number.isInteger(currency) || currency < 0 || currency > 50000 ||
      !Array.isArray(warehouseCounts) || warehouseCounts.length !== warehouseSize) {
    throw new RangeError('Invalid completed campaign inventory');
  }
  for (const count of warehouseCounts) {
    if (!Number.isInteger(count) || count < 0 || count > 255) {
      throw new RangeError('Invalid warehouse count');
    }
  }
}

// The ending controller supplies the current campaign after the replay code succeeds.
export function readReplayCarry(campaign) {
  const flags = campaign?.sceneFlagBytes;
  if (!Array.isArray(flags) || flags.length !== 32 || !(flags[28] & 2)) {
    throw new RangeError('A completed campaign is required for replay');
  }
  const inventory = campaign.persistentState;
  checkCarry(inventory);
  return Object.freeze({
    currency: inventory.currency,
    warehouseCounts: Object.freeze([...inventory.warehouseCounts])
  });
}

// The installed free-roam snapshot already includes Zhao Yun's opening level award.
export function applyReplayBenefits(freshPersistentState, carry) {
  checkCarry(carry);
  const state = structuredClone(freshPersistentState);
  const kongming = state.party.find(unit => unit.definitionIndex === 0);
  const zhaoYun = state.party.find(unit => unit.definitionIndex === 6);
  if (kongming?.level !== 1 || kongming.classIndex !== 18 || kongming.itemSlots[5] !== emptySlot ||
      zhaoYun?.level !== 5 || zhaoYun.classIndex !== 6 || zhaoYun.itemSlots[0] !== 19 ||
      zhaoYun.itemSlots[2] !== emptySlot) {
    throw new RangeError('Expected the original first Xinye inventory');
  }
  for (const id of [0, 120, 127]) {
    if (state.itemInstances[id]?.definitionId !== id || state.itemInstances[id]?.bytes?.[0] !== id) {
      throw new RangeError('Expected original replay gift instances');
    }
  }
  state.currency = carry.currency;
  state.warehouseCounts = [...carry.warehouseCounts];
  kongming.level = 50;
  kongming.itemSlots[5] = 127; // 孫子兵法書
  zhaoYun.level = 50;
  zhaoYun.itemSlots[0] = 0;    // 倚天劍
  zhaoYun.itemSlots[2] = 120;  // 赤兔馬
  return state;
}

// A chapter may normally cover only items found by that point in the first run.
// Resolve occupied slots using the live instance mapping, including exchanged items.
function carriedDefinitions(state) {
  const ids = new Set();
  const addSlot = slot => {
    if (slot !== emptySlot) ids.add(state.itemInstances[slot]?.definitionId);
  };
  for (let slot = 0; slot < state.warehouseCounts.length; slot++) {
    if (state.warehouseCounts[slot] > 0) addSlot(slot);
  }
  for (const actor of state.party) {
    for (const slot of actor.itemSlots) addSlot(slot);
  }
  return [...ids].sort((a, b) => a - b).map(replayItemDefinition).filter(Boolean);
}

const catalogCache = new WeakMap();
const townCache = new WeakMap();

function cachedScope(cache, original, key, build) {
  const previous = cache.get(original);
  if (previous?.key === key) return previous.scope;
  const scope = build();
  cache.set(original, { key, scope });
  return scope;
}

export function replayDescriptionRules(rules, id) {
  const item = replayItemDefinition(id);
  return item ? extendStatsForItems(rules, [item]) : rules;
}

export function extendReplayStats(rules, persistentState) {
  return extendStatsForItems(rules, carriedDefinitions(persistentState));
}

function extendStatsForItems(rules, carried) {
  const ids = new Set(rules.itemDefinitions.map(item => item.definitionId));
  const extra = carried.filter(row => !ids.has(row.definitionId));
  const families = rules.universalApplicableFamilies ?? [0, 23, 24, 63];
  const addFamily25 = !families.includes(25) && carried.some(row => row.family === 25);
  if (!extra.length && !addFamily25) return rules;
  const key = [addFamily25, ...extra.map(row => row.definitionId)].join(',');
  return cachedScope(catalogCache, rules, key, () => {
    const itemDefinitions = [...rules.itemDefinitions, ...extra];
    const addedBooks = extra.filter(row => row.family === 25).map(row => row.definitionId);
    return {
      ...rules,
      itemDefinitions,
      ...(addedBooks.length ? { replayAddedBookIds: [...(rules.replayAddedBookIds ?? []), ...addedBooks] } : {}),
      scopeItemDefinitionIds: itemDefinitions.map(row => row.definitionId),
      universalApplicableFamilies: addFamily25 ? [...families, 25] : families
    };
  });
}

export function extendReplayTownData(townData, persistentState) {
  const ids = new Set(townData.items.map(item => item.definitionId));
  const extra = carriedDefinitions(persistentState).filter(row => !ids.has(row.definitionId));
  if (!extra.length) return townData;
  const key = extra.map(row => row.definitionId).join(',');
  return cachedScope(townCache, townData, key, () => ({
    ...townData,
    items: [...townData.items, ...extra.map(({ definitionId, nameJa, buyPrice, sellPrice }) =>
      ({ definitionId, nameJa, buyPrice, sellPrice }))]
  }));
}
