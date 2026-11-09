/** Deterministic source support-candidate scores, before the caller's named-unit
 * bonus. These are AI estimates, not action effects; no resources or RNG change.
 * Canonical units supply current native stats, level, slot and status bytes. */
const HP_MODES=Object.freeze([0,1,3,2,3,0,1]);
const integer=(value,min,max,label)=>{if(!Number.isSafeInteger(value)||value<min||value>max)throw new RangeError(label);return value;};
const word=(value,label)=>integer(value,0,0xffffffff,label);
const byte=(value,label)=>integer(value,0,255,label);
const udiv=(a,b)=>b===0?0:Math.floor((a>>>0)/(b>>>0));
const classGroup=c=>c===17?7:c<=20?Math.floor(c/3):c<=28?Math.floor((c-21)/2)+7:({29:11,30:12,31:13,39:14}[c]??15);
const supportClass=c=>[6,10].includes(classGroup(c))||c===29||c===38;
const maxHP=u=>word(u.stats?.最大兵数,'AI maximum troops');
const maxSP=u=>word(u.stats?.最大策略値,'AI maximum SP');
const status=(u,field)=>byte(u[field],`AI ${field}`)&0xbf;

/** Native area list excludes the primary target and is already side-filtered.
 * Defense kind 3 deliberately rewards stage ZERO, unlike attack kind 2. */
export function applyAIStrategyAreaScore(base,areaTargets,kind){
 integer(base,0,0x7fffffff,'AI base score');integer(kind,0,3,'AI area kind');
 if(!Array.isArray(areaTargets))throw new TypeError('Explicit AI area targets required');
 let delta=areaTargets.length?0:-4;
 for(const unit of areaTargets){
  if(kind===0||(kind===1&&word(unit.troops,'AI troops')!==maxHP(unit))||
   (kind===2&&status(unit,'status24')!==0)||(kind===3&&status(unit,'status25')===0))delta+=10;
 }
 return Math.max(base+delta,0);
}

function healingScore(actor,target,mode,sp){
 if(target.state15!==2)return 0;
 const maximum=sp?maxSP(target):maxHP(target),current=word(sp?target.strategyPoints:target.troops,'AI current resource');
 let recovered,score=sp?28:30;
 if(sp){
  const nominal=mode===0?20:mode===1?40:80;
  // The estimator calls the non-mutating SP helper and receives its byte result.
  const raw=((current+nominal)>>>0)>maximum?((maximum-current)>>>0):nominal;
  recovered=Math.min(raw,255);
 }else{
  // Native entity getter here reads LEVEL, not equipment-adjusted intelligence.
  const nominal=mode===3?maximum:200+byte(actor.level,'AI actor level')+200*mode;
  recovered=Math.min(nominal,maximum-current);
 }
 if(((current+recovered)>>>0)>=maximum)score+=2;
 if(udiv(Math.imul(5,(maximum-current)>>>0),recovered)<=3)score-=4;
 if(udiv(Math.imul(10,current),maximum)<=2)score+=4;
 if(target.slotIndex===actor.slotIndex)score++;
 return score;
}

/** Families outside this helper return null for the caller's other dispatcher.
 * Difficulty-wide rejection of strategy 51 belongs to the outer dispatcher. */
export function scoreAISupportStrategy({actor,target,strategyIndex,configurationScale=1,aggression=false,areaTargets=[]}){
 const id=integer(strategyIndex,0,255,'AI strategy index');
 if(!((id>=34&&id<=41)||(id>=43&&id<=51)||id===53))return null;
 if(!actor||!target)throw new TypeError('Explicit AI actor and target required');
 byte(actor.slotIndex,'AI actor slot');byte(target.slotIndex,'AI target slot');
 integer(configurationScale,0,2,'AI configuration scale');
 if(id<=40||(id>=43&&id<=45)){
  const sp=id>=43,maximum=sp?maxSP(target)&255:maxHP(target),current=sp?word(target.strategyPoints,'AI SP')&255:word(target.troops,'AI troops');
  // The SP gate, unlike the estimator below, reads only each low byte.
  if(maximum===0||udiv(Math.imul(10,current),maximum)>4)return 0;
  const score=healingScore(actor,target,HP_MODES[id-(sp?43:34)],sp);
  if(sp&&(target.classIndex===28||target.slotIndex===actor.slotIndex))return 0;
  if(score===0)return 0;
  return id===37||id===38?applyAIStrategyAreaScore(score,areaTargets,1):score;
 }
 if(id>=46&&id<=49){
  if((actor.slotIndex<=14)!==(target.slotIndex<=14)||!aggression)return 0;
  const attack=id<=47,stage=status(target,attack?'status24':'status25');
  if(stage===0)return 0;
  let score=0;
  if(stage===1||stage===2){
   if(attack&&configurationScale===2&&supportClass(integer(target.classIndex,0,42,'AI target class')))return 0;
   score=attack?12:11;
  }else if(stage===3||stage===4)score=(attack?29:27)+(stage===4?2:0);
  if(id===47||id===49)score=applyAIStrategyAreaScore(score,areaTargets,attack?2:3);
  if(score!==0&&target.slotIndex===actor.slotIndex)score--;
  return score;
 }
 if(id===41){
  const bits=byte(target.status26,'AI status26');
  return bits&16?32:bits&32?31:bits&2?27:bits&1?26:0;
 }
 if(id===51)return aggression&&!(byte(target.status26,'AI status26')&8)?13:0;
 // The original dispatcher never assigns a positive base to reactivation (50)
 // or class change (53); their legal player effects remain separate.
 return 0;
}
