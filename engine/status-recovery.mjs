/** ROM 033730/033840 round-boundary status recovery. Pure tactical effects;
 * original presentation frames (033E24/04A1DC) are emitted, not emulated.
 * Call order and conditional RNG consumption are significant.
 */
import {drawOriginalRandom, applyBattleStatusScalar} from './combat.mjs';

function integer(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(name);
  return value;
}

/** 033678 -> E2A0 -> DD88. The group is a current-class group, not personality. */
export function statusRecoveryThreshold(classIndex, classGroup, mode) {
  integer(classIndex, 0, 255, 'classIndex');
  integer(classGroup, 0, 255, 'classGroup');
  integer(mode, 0, 1, 'threshold mode');
  if ([0, 1, 3, 4].includes(classGroup)) return mode ? 3 : 2;
  if ([2, 5, 7, 8].includes(classGroup)) return mode ? 2 : 3;
  if (classGroup === 6) return mode ? 10 : 1;
  if ([10, 11].includes(classGroup) ||
      (classGroup === 9 && [32, 33, 38].includes(classIndex))) return mode ? 4 : 1;
  return mode ? 1 : 4;
}

/** Dependencies are explicit: refreshUnit(u) returns equipment-aware pre-status
 * stats; getClassGroup(classIndex) supplies the decoded DD88 mapping.
 * drawRandom is injectable for exact branch tests, defaulting to original LCG.
 * This function neither performs poison damage nor heals resources.
 */
export function recoverRoundStatuses(unit, {
  rngState, refreshUnit, getClassGroup, drawRandom = drawOriginalRandom,
} = {}) {
  integer(rngState, 0, 0xffffffff, 'rngState');
  if (!unit || typeof unit !== 'object') throw new TypeError('unit required');
  if (typeof refreshUnit !== 'function' || typeof getClassGroup !== 'function' ||
      typeof drawRandom !== 'function') throw new TypeError('explicit recovery adapters required');
  let next = structuredClone(unit), seed = rngState;
  const effects = [], draws = [];
  for (const key of ['state15', 'status24', 'status25', 'status26', 'statusCounter27']) {
    integer(next[key], 0, 255, key);
  }
  integer(next.slotIndex, 0, 44, 'slotIndex');
  integer(next.classIndex, 0, 255, 'classIndex');
  if (next.state15 !== 2) return {unit: next, rngState: seed, effects, draws};

  function apply(kind, proposed) {
    const before = next[kind === 0 ? 'status24' : kind === 1 ? 'status25' : 'status26'];
    if (kind === 0) next.status24 = (0x40 | proposed) & 255;
    else if (kind === 1) next.status25 = (0x40 | proposed) & 255;
    else if (proposed & 0x80) next.status26 &= (~proposed & 255);
    else next.status26 = (next.status26 | 0x40 | proposed) & 255;
    effects.push({type: 'status_recovery', slotIndex: next.slotIndex, kind,
      proposed, before, after: next[kind === 0 ? 'status24' : kind === 1 ? 'status25' : 'status26']});
  }

  function attempt(kind, proposed, old) {
    proposed &= 255;
    // Exact 033762–033772 bytes compare (proposed & 0x80) to 0x10.
    // This is unreachable; do not silently "repair" it to a different mask.
    if (next.slotIndex < 15 && (proposed & 0x80) === 0x10 && next.statusCounter27 > 4) {
      apply(kind, proposed); return;
    }
    const special = kind === 3 && (proposed & 8) !== 0 && old <= 2;
    if (special && !(proposed & 8) && old > 1) return;
    const refreshed = refreshUnit(structuredClone(next));
    const defense = integer(refreshed?.stats?.防御力, 0, 0x1fffff, 'refreshed defense');
    const intelligence = integer(refreshed?.stats?.知力, 0, 0x1fffff, 'refreshed intelligence');
    const total = (applyBattleStatusScalar(defense, next.status25) + intelligence) >>> 0;
    const quotient = Math.floor(total / 100);
    const bound = (special ? 20 + quotient : 20 - quotient) >>> 0;
    const random = drawRandom(seed, bound);
    integer(random?.state, 0, 0xffffffff, 'returned RNG state');
    integer(random?.value, 0, Math.max(0, bound - 1), 'returned RNG value');
    const group = integer(getClassGroup(next.classIndex), 0, 255, 'class group');
    const threshold = statusRecoveryThreshold(next.classIndex, group, special ? 0 : 1);
    draws.push({kind, proposed, old, bound, value: random.value, threshold,
      seedBefore: seed, seedAfter: random.state});
    seed = random.state;
    if (random.value <= threshold) apply(kind, proposed);
  }

  for (const [kind, field] of [[0, 'status24'], [1, 'status25']]) {
    const old = next[field];
    if (old & 0x40) next[field] = old & ~0x40;
    else if (old > 2) attempt(kind, old - 1, old);
    else if (old <= 1) attempt(kind, old + 1, old);
  }
  const beforeTransient=next.status26;next.status26 &= ~0x80;
  if(beforeTransient&0x80)effects.push({type:'status_expired',slotIndex:next.slotIndex,field:'status26',before:beforeTransient,after:next.status26,reason:'round_boundary'});
  if (next.status26 & 0x40) {
    next.status26 &= ~0x40;
  } else {
    for (const bit of [1, 2, 4, 8, 16, 32]) {
      if (!(next.status26 & bit)) {
        if (bit === 16) next.statusCounter27 = 0;
        continue;
      }
      attempt(3, 0x80 | bit, 2);
      if (bit === 16) {
        // 033E24 is presentation-only; counter increment occurs even if the
        // recovery just removed the bit, then is zeroed if the bit is absent.
        effects.push({type: 'status_refresh', slotIndex: next.slotIndex});
        next.statusCounter27 = (next.statusCounter27 + 1) & 255;
        if (!(next.status26 & 16)) next.statusCounter27 = 0;
      }
    }
  }
  next = refreshUnit(next);
  return {unit: next, rngState: seed, effects, draws};
}
