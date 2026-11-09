/** Reviewed source PCM for the original global battle-animation OFF release.
 * Action/result scheduling belongs to planOriginalAnimationOff; this module
 * does not invent mixer gain, envelopes, note timing, or sound interruptions.
 */
export const FIRST_BATTLE_SOURCE_SFX_IDS = Object.freeze([
  0,1,3,4,5,6,7,8,10,11,12,16,17,22,23,25,26,27,28,29,30,35,36,37,38,40,41,43,49,
]);
const classes = new Set([0,1,2,3,6,7,8,9,15,17,18,19,20,21,22,23,27,28,29]);
function requireClass(id) {
  if (!classes.has(id)) throw new RangeError('Unreviewed first-battle class');
}
export function firstBattleMovementCueId(classIndex) {
  requireClass(classIndex);
  return [6,7,8,15].includes(classIndex) ? 12 : classIndex === 9 ? 11 : 10;
}
export function firstBattleMapImpactCueId(classIndex) {
  requireClass(classIndex);
  return classIndex===23 ? 35 : [3,15].includes(classIndex) ? 17 : 36;
}
export function sourceSamplePlayback(manifest, cueId) {
  if (manifest?.schemaVersion !== 1 || !FIRST_BATTLE_SOURCE_SFX_IDS.includes(cueId))
    throw new RangeError('Unreviewed source sound cue');
  const cue = manifest.cues?.[String(cueId)];
  if (!cue || cue.logicalId !== cueId || cue.path !== `sfx-${cueId}.wav` ||
      cue.sourceSampleDecoded !== true || cue.originalMixedRecording !== false ||
      cue.sampleRate !== 5256 || cue.channels !== 1 || cue.loop !== false ||
      cue.playbackRate !== 1 || cue.originalMixCalibrated !== false)
    throw new TypeError('Reviewed source-PCM manifest required');
  return Object.freeze({cueId,path:cue.path,mode:'original-source-sample',
    sampleRate:5256,playbackRate:1,loop:false,sourceAmplitudeGain:1,
    originalMixCalibrated:false,addedEnvelope:false,addedReverb:false});
}
