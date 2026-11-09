/** Exact map18 additions only. Static source373B4→3911A→37470 maps
 * classes36/37 to group0/cue36; visible movement34BDC..34C28 uses cue10.
 * PCM, all prior class admissions, and global playback rules stay unchanged. */
import {firstBattleMovementCueId as previousMovement,firstBattleMapImpactCueId as previousImpact} from './source-sfx.mjs';
export {FIRST_BATTLE_SOURCE_SFX_IDS,sourceSamplePlayback} from './source-sfx.mjs';
export function firstBattleMovementCueId(classIndex){return classIndex===36||classIndex===37?10:previousMovement(classIndex);}
export function firstBattleMapImpactCueId(classIndex){return classIndex===36||classIndex===37?36:previousImpact(classIndex);}
