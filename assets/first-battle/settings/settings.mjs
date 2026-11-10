/** Original in-battle menu selections. Presentation only: never changes the
 * battle engine, action order, path, RNG or outcomes. Detailed battle animation
 * remains intentionally unavailable in the current release.
 */
export const ORIGINAL_GBA_TICK_RATE = 16777216 / 280896;
export const NATIVE_DEFAULT_BATTLE_SETTINGS = Object.freeze({
 battleAnimation:'on',enemyMovement:'on',gameSpeed:'normal',
});
export const DEFAULT_BATTLE_SETTINGS = Object.freeze({
 battleAnimation:'off',enemyMovement:'on',gameSpeed:'normal',
});
export const BATTLE_SETTING_ROWS = Object.freeze([
 Object.freeze({id:'battleAnimation',labelJa:'戦闘アニメ',choices:Object.freeze([
  Object.freeze({value:'on',labelJa:'見る',enabled:false,reason:'Battle animations are deferred.'}),
  Object.freeze({value:'off',labelJa:'見ない',enabled:true}),
 ])}),
 Object.freeze({id:'enemyMovement',labelJa:'敵の移動',choices:Object.freeze([
  Object.freeze({value:'on',labelJa:'見る',enabled:true}),
  Object.freeze({value:'off',labelJa:'見ない',enabled:true}),
 ])}),
 Object.freeze({id:'gameSpeed',labelJa:'ゲームスピード',choices:Object.freeze([
  Object.freeze({value:'normal',labelJa:'普通',enabled:true}),
  Object.freeze({value:'fast',labelJa:'速い',enabled:true}),
 ])}),
]);
export function validateBattleSettings(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  Object.keys(value).sort().join(',')!=='battleAnimation,enemyMovement,gameSpeed')
  throw new TypeError('Exactly the three reviewed battle settings are required');
 if(value.battleAnimation!=='off')throw new RangeError('Battle animations are deferred; select 見ない');
 if(!['on','off'].includes(value.enemyMovement)||!['normal','fast'].includes(value.gameSpeed))
  throw new RangeError('Unknown original menu selection');
 return Object.freeze({...value});
}
/** Native menu reader: internal speed values other than1 are displayed as速い.
 * This reader is research/compatibility metadata, not permission to enable ON.
 */
export function decodeOriginalBattleConfig(word){
 if(!Number.isInteger(word)||word<0||word>0xffffffff)throw new RangeError('Unsigned config word required');
 return Object.freeze({battleAnimation:(word&0xf0)===0x20?'on':'off',
  enemyMovement:(word&0x1000)?'on':'off',gameSpeed:(word&15)===1?'normal':'fast'});
}
/** Preserve unrelated bits exactly as the native menu commit does. */
export function encodeBattleSettings(settings,priorWord=0x1821){
 const s=validateBattleSettings(settings);
 if(!Number.isInteger(priorWord)||priorWord<0||priorWord>0xffffffff)throw new RangeError('Unsigned config word required');
 return ((priorWord&0xffffef00)|(s.enemyMovement==='on'?0x1000:0)|(s.gameSpeed==='normal'?1:3))>>>0;
}
export function battleMovementSpeed(settings){
 const s=validateBattleSettings(settings),fast=s.gameSpeed==='fast';
 const speedIndex=fast?3:1,pixelsPerTick=fast?8:2,authoredTicksPerCell=fast?2:8;
 return Object.freeze({speedIndex,pixelsPerTick,authoredTicksPerCell,
  authoredMillisecondsPerCell:authoredTicksPerCell*1000/ORIGINAL_GBA_TICK_RATE});
}
/** The original predicate uses the runtime slot byte, not allegiance metadata,
 * class, entityControlClass, control17, turn phase or the action's AI owner.
 * OFF suppresses intermediate redraw; it retains waits, step sound and the final
 * position update. Original viewport culling is a separate caller responsibility.
 */
export function shouldRenderMovementSteps(settings,slotIndex){
 const s=validateBattleSettings(settings);
 if(!Number.isInteger(slotIndex)||slotIndex<0||slotIndex>44)throw new RangeError('Runtime slot0..44 required');
 return slotIndex<15||s.enemyMovement==='on';
}
/** Exact pre-movement camera gate; callers may force focus (including scripts).
 * Do not apply this as a global rule to story transitions or all camera motion.
 */
export function shouldFollowMovementCamera(settings,{forced=false}={}){
 const s=validateBattleSettings(settings);
 if(typeof forced!=='boolean')throw new TypeError('Explicit forced-camera boolean required');
 return s.enemyMovement==='on'||forced;
}
export const BATTLE_SETTINGS_CUES=Object.freeze({open:0,cancel:1,selectionChanged:45});
