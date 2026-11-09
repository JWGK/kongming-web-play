/** Pure browser-compatible base + class-growth layer. No I/O, ROM or emulator.
 * Japanese semantic identifiers are preserved. Equipment and final attack/defense
 * are separate, explicitly unsupported layers rather than assumed zero effects.
 */
export const MAIN_ABILITIES = Object.freeze(['武力', '統率力', '知力']);
const SOURCE_SHA256 = 'acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';

export class UnsupportedRuleError extends Error {
  constructor(rule) {
    super(`Unsupported rule: ${rule}. No value has been guessed.`);
    this.name = 'UnsupportedRuleError';
    this.rule = rule;
  }
}

function integer(value, minimum, maximum, name) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer in ${minimum}..${maximum}`);
  }
  return value;
}

/** Build a calculator from the separately validated private growth inventory.
 * Import/transport/authenticity of that inventory belongs to a future data loader;
 * this gate checks format/provenance declarations, not cryptographic attestation.
 */
export function createAbilityCalculator(inventory) {
  if (inventory?.purpose !== 'private_static_class_growth_dispatch_inventory' ||
      inventory?.schema_version !== '1.0.0' ||
      inventory?.source_rom?.sha256 !== SOURCE_SHA256 ||
      !Array.isArray(inventory.classes) || inventory.classes.length !== 43) {
    throw new TypeError('Expected the validated Japanese class-growth inventory');
  }
  const profiles = new Map();
  for (const row of inventory.classes) {
    const index = integer(row.class_index, 0, 42, 'classIndex');
    if (profiles.has(index) || row.evidence_status !== 'static_code_confirmed' || typeof row.text_ja !== 'string') {
      throw new TypeError('Duplicate or unverified class profile');
    }
    const coefficients = {};
    for (const label of MAIN_ABILITIES) {
      // 0..28 bounds this inspected table, not arbitrary unverified modifiers.
      coefficients[label] = integer(row.coefficients?.[label], 0, 28, `${label} coefficient`);
    }
    profiles.set(index, Object.freeze({text_ja: row.text_ja, coefficients: Object.freeze(coefficients)}));
  }
  return function calculateBaseClassAbilities({base, level, classIndex} = {}) {
    integer(level, 0, 255, 'level');
    integer(classIndex, 0, 42, 'classIndex');
    if (!base || typeof base !== 'object') throw new TypeError('Japanese base abilities are required');
    const profile = profiles.get(classIndex);
    const copiedBase = {}, growthAddition = {}, values = {}, capped = {};
    for (const label of MAIN_ABILITIES) {
      copiedBase[label] = integer(base[label], 0, 255, `${label} base`);
      growthAddition[label] = Math.floor(level * profile.coefficients[label] / 10);
      const uncapped = copiedBase[label] + growthAddition[label];
      values[label] = label === '知力' ? Math.min(255, uncapped) : uncapped;
      capped[label] = values[label] !== uncapped;
    }
    return Object.freeze({
      layer: 'base_plus_class_growth', classIndex, classNameJa: profile.text_ja, level,
      base: Object.freeze(copiedBase), growthAddition: Object.freeze(growthAddition),
      values: Object.freeze(values), capped: Object.freeze(capped),
      equipmentApplied: false,
      isFinalAttackDefense: false,
    });
  };
}

/** Reserved equipment integration boundary; unknown effects must not become 0. */
export function applyEquipmentEffects(_baseClassResult, _equipmentContext) {
  throw new UnsupportedRuleError('equipment_effects');
}

/** Main abilities must never be mislabeled as final 攻撃力 / 防御力. */
export function calculateAttackDefense(_mainAbilities, _combatContext) {
  throw new UnsupportedRuleError('final_attack_defense');
}
