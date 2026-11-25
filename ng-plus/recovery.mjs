// Ordinary long prologues setting flag 100 record Xu Shu's choice. The native
// replay starts with that flag set and jumps over the choice (first-battle Qpt).
export function usesReplayOpening(campaign) {
  if (!campaign) return false;
  if (campaign.replayCarry) return true;
  return !!(campaign.sceneFlagBytes?.[12] & 8) && Array.isArray(campaign.decisions) &&
    !campaign.decisions.some(row => row.choiceId === 'xushu-recommendation');
}

// GBA 0x3310c..0x33284 uses the earliest carried family-25 book. Preserve the
// 0.73.32 calculation for original tactical replays and their verified hashes.
export function resolveBookRecovery(stock, unit, terrainId, rules, campaign, replayOpening) {
  const options = { terrainId, itemDefinitions: rules.itemDefinitions };
  const result = stock(unit, options);
  if (result.itemContributions.length < 2) return result;
  if (!replayOpening && !usesReplayOpening(campaign) &&
      !result.itemContributions.some(row => rules.replayAddedBookIds?.includes(row.definitionId))) return result;
  const itemSlots = [...unit.itemSlots];
  for (const row of result.itemContributions.slice(1)) itemSlots[row.inventoryIndex] = 255;
  const rows = unit.statsSource.itemInstances;
  // A full bag has no empty slot, so its explicit live mapping may omit 255.
  const statsSource = rows.some(row => row.slotId === 255) ? unit.statsSource :
    { ...unit.statsSource, itemInstances: [...rows, { slotId: 255, definitionId: 255 }] };
  return stock({ ...unit, itemSlots, statsSource }, options);
}
