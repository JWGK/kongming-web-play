/** Exact map19 additions only. Static source373B4→3911A→37470 maps
 * class34 to group0/cue36; visible movement34BDC..34C28 uses cue10.
 * PCM, all prior class admissions, and global playback rules stay unchanged. */
import {firstBattleMovementCueId as previousMovement,firstBattleMapImpactCueId as previousImpact} from './source-sfx-map18.mjs';
export {FIRST_BATTLE_SOURCE_SFX_IDS,sourceSamplePlayback} from './source-sfx-map18.mjs';
export function firstBattleMovementCueId(classIndex){return classIndex===34?10:previousMovement(classIndex);}
export function firstBattleMapImpactCueId(classIndex){return classIndex===34?36:previousImpact(classIndex);}
