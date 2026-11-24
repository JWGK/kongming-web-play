// Original table SHA-256 433fb95a41316d3533f26340cbaef4d8b4727c81a3daf92d628a4447a1d35070.
// Reference data does not grant an item or add it to a chapter's stock.
const definitions = [
  {
    definitionId: 60, nameJa: "連弩", family: 9,
    primaryEffectType: 1, primaryMagnitude: 15,
    secondaryEffectType: 0, secondaryMagnitude: 0,
    buyPrice: 500, sellPrice: 375
  },
  {
    definitionId: 90, nameJa: "方士服", family: 16,
    primaryEffectType: 6, primaryMagnitude: 20,
    secondaryEffectType: 11, secondaryMagnitude: 0,
    buyPrice: 2550, sellPrice: 1912
  },
  {
    definitionId: 139, nameJa: "大山嵐の書", family: 23,
    primaryEffectType: 15, primaryMagnitude: 11,
    secondaryEffectType: 0, secondaryMagnitude: 0,
    buyPrice: 700, sellPrice: 525
  },
  {
    definitionId: 145, nameJa: "大洪水の書", family: 23,
    primaryEffectType: 15, primaryMagnitude: 17,
    secondaryEffectType: 0, secondaryMagnitude: 0,
    buyPrice: 700, sellPrice: 525
  },
];
const byId = new Map(definitions.map(row => [row.definitionId, Object.freeze(row)]));

export function supplementalItemDefinition(definitionId) {
  return byId.get(definitionId);
}
