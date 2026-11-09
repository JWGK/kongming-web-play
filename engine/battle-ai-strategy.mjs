/** Source AI candidate scoring (42974/431E0/43288/43350).
 * Predictive scores are deliberately not actual strategy damage/hit rolls.
 * This module never draws RNG or changes units. Source tie/byte order retained.
 */
import {UnsupportedRuleError} from './abilities.mjs';
import {learnedStrategies} from './strategies.mjs';
import {enumerateTargets} from './targeting.mjs';
import {scoreAISupportStrategy,applyAIStrategyAreaScore} from './battle-ai-support-score.mjs';
const REVIEWED=new Set([0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,43,44,45,46,47,48,49,50,51,52,53]);
export const implementedAIStrategyIds=()=>Object.freeze([...REVIEWED].sort((a,b)=>a-b));
const CARDINAL=[[0,-1],[1,0],[0,1],[-1,0]];
const integer=(n,a,b,label)=>{if(!Number.isSafeInteger(n)||n<a||n>b)throw new RangeError(label);return n;};
const classGroup=c=>c===17?7:c<=20?Math.floor(c/3):c<=28?Math.floor((c-21)/2)+7:({29:11,30:12,31:13,39:14}[c]??15);
const supportClass=c=>[6,10].includes(classGroup(c))||c===29||c===38;
export function aiStrategyIntelligenceFeasible(actorIQ,targetIQ,divisor){
 integer(actorIQ,0,500,'actor intelligence');integer(targetIQ,0,500,'target intelligence');integer(divisor,1,5,'AI divisor');
 // 431E0 uses raw equipment-adjusted intelligence, not the spell caster multiplier.
 return actorIQ>Math.floor(targetIQ/divisor)&&100-Math.floor(Math.floor(100*targetIQ/actorIQ)/divisor)>49;
}
export function aiStrategyAreaKind(id){
 if([3,4,5,9,10,11,15,16,17,19,27,29,31].includes(id))return 1;
 if([37,38,47,49,51].includes(id))return 2;
 return 0;
}
function areaUnits(actor,target,units,id){
 const kind=aiStrategyAreaKind(id);if(!kind)return [];
 return CARDINAL.flatMap(([dx,dy])=>{const u=units.find(u=>u.state15===2&&u.position?.x===target.position.x+dx&&u.position?.y===target.position.y+dy);return u&&((u.slotIndex<15)===(actor.slotIndex<15))===(kind===2)?[u]:[];});
}
/** 367C0 then 36860. The latter reads the action-context strategy byte, not
 * its unused element argument. Caller must supply the reviewed saved context.
 */
export function predictAIElementalDamage({actor,target,strategyIndex,rules,board,strategyContextIndex}){
 integer(strategyIndex,0,17,'AI elemental strategyIndex');
 const element=Math.floor(strategyIndex/6),tier=rules.strategies[strategyIndex].rangeCode;
 integer(tier,0,2,'AI elemental tier');integer(strategyContextIndex,0,255,'AI action-context strategy byte');
 const contextElement=strategyContextIndex<=5?0:strategyContextIndex<=11?1:strategyContextIndex<=17?2:strategyContextIndex<=19?3:0;
 const raw=(element===0?[25,50,100]:[30,60,120])[tier]+Math.floor(integer(actor.stats.知力,0,500,'actor intelligence')*[2,3,4][tier]/5);
 const terrain=board.terrain[target.position.x+target.position.y*board.width];
 integer(terrain,0,16,'AI primary target terrain');integer(board.weatherProfile,0,2,'weatherProfile');
 let damage=Math.floor(raw*rules.terrainElementPercentages[contextElement][terrain]/100);
 damage=Math.floor(damage*rules.weatherElementPercentages[board.weatherProfile][contextElement]/100);
 const c=target.classIndex;
 if(c===34){if(contextElement===0)damage*=4;else if(contextElement===2)damage=Math.floor(damage/8);}
 else if([18,19,20,27,28,29,32,33,38,39].includes(c))damage=Math.floor(damage*2/3);
 if(target.status26&8)damage=Math.floor(damage/2);
 return damage;
}
export function scoreAIStrategy({actor,target,strategyIndex,units,board,rules,configurationScale=1,aggression=false,strategyContextIndex}){
 const id=integer(strategyIndex,0,55,'strategyIndex');if(!REVIEWED.has(id))throw new UnsupportedRuleError('ai_strategy_score_unreviewed_family');
 integer(configurationScale,0,2,'configurationScale');
 // Difficulty rejection precedes collection and family scoring in 433B0.
 if(configurationScale===0&&((id>=23&&id<=33)||id===51||id===52))return 0;
 if(configurationScale===0&&id<=5&&(actor.classIndex<=5||actor.classIndex===35))return 0;
 if(configurationScale===1&&(id===51||id===52))return 0;
 const areaTargets=areaUnits(actor,target,units,id);let score=0;
 const iq=()=>aiStrategyIntelligenceFeasible(actor.stats.知力,target.stats.知力,id<=17?5:id<=25?4:id<=29?3:4);
 if(id<=17){
  if(Math.floor(id/6)===0&&board.weatherProfile===2)return 0;
  if(!iq())return 0;
  score=predictAIElementalDamage({actor,target,strategyIndex:id,rules,board,strategyContextIndex})>=target.troops?80:20;
  if(id%6>=3)score=applyAIStrategyAreaScore(score,areaTargets,0);
 }else if(id<=19){
  // Original dispatcher has no wind-score branch; legal execution is separate.
  score=0;
 }else if(id<=25){score=target.strategyPoints>0&&iq()?17:0;
 }else if(id<=29){
  const field=id<=27?'status24':'status25';if((target[field]&0xbf)===4)return 0;
  score=iq()?(id<=27?18:19):0;
  if(id===27||id===29)score=applyAIStrategyAreaScore(score,areaTargets,0);
 }else if(id<=33||id===52){
  if(Math.floor(100*target.troops/target.stats.最大兵数)<=39)return 0;
  const bit=id<=31?16:id===32?2:id===33?1:4;
  if(id<=31){score=iq()?22:0;if(id===31)score=applyAIStrategyAreaScore(score,areaTargets,0);}
  else if(id===32)score=target.stats.auxiliary>7?23:0;
  else if(id===33)score=25;
  else score=supportClass(target.classIndex)?24:0;
  if(target.status26&bit)return 0;
 }else{
  score=scoreAISupportStrategy({actor,target,strategyIndex:id,configurationScale,aggression,areaTargets});
  if(score===null)throw new UnsupportedRuleError('ai_strategy_score_unreviewed_family');
 }
 // 43A22 common named-unit bonus comes AFTER area and self adjustments.
 if(score>0&&target.definitionIndex<=235)score+=target.slotIndex===0||target.slotIndex===15?10:6;
 return score;
}
export function chooseAIStrategyAtPosition({actor,units,position=actor.position,board,rules,configurationScale=1,aggression=false,strategyContextIndex}){
 let best={score:0,strategyIndex:255,targetSlot:255};
 const bySlot=new Map(units.map(u=>[u.slotIndex,u]));
 // Ascending learning-table ID, then the existing original geometry order.
 const candidates=learnedStrategies({unit:actor,rules}).filter(s=>s.usable).sort((a,b)=>a.strategyIndex-b.strategyIndex);
 for(const s of candidates){
  if(!REVIEWED.has(s.strategyIndex))throw new UnsupportedRuleError('ai_strategy_score_unreviewed_family');
  const sideMask=s.strategyIndex<=33||s.strategyIndex===52?0:1;
  for(const targetSlot of enumerateTargets({actor,units,position,rangeCode:s.rangeCode|128,sideMask,width:board.width,height:board.height})){
   let score=Math.min(255,scoreAIStrategy({actor,target:bySlot.get(targetSlot),strategyIndex:s.strategyIndex,units,board,rules,configurationScale,aggression,strategyContextIndex}));
   if(score!==0&&targetSlot===actor.followSlot)score+=10;
   // Native compares the full follow bonus, THEN stores its low byte.
   if(score>best.score)best={score:score&255,strategyIndex:s.strategyIndex,targetSlot};
  }
 }
 return Object.freeze(best);
}
