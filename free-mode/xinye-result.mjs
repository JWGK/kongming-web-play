// Local session result only. This receipt does not grant storage access or an S rank.
const ready = s => s?.scenarioId === 'free-xinye-6:0:0' && s.rulesVersion === 'free-xinye-engine-1' &&
  s.phase === 'settled' && s.terminal === 'victory' && s.settlement?.outcome === 'victory' &&
  s.scenario?.vm === null && s.scenario?.groupStart === 9 && s.pendingEffects.length === 0 &&
  s.freeModeExit?.contextId==='6:0:0' && s.freeModeExit.recordIndex===9 &&
  s.freeModeExit.returnCode===7 && s.freeModeExit.outcome==='victory';
const freeze = obj => {
  if(obj && typeof obj==='object' && !Object.isFrozen(obj)){
    Object.values(obj).forEach(freeze);
    Object.freeze(obj);
  }
  return obj;
};

// Only the owning live reducer may supply the state. Raw saves and UI fields
// are not used as evidence. Result data is deliberately narrow: no campaign
// clock, story flags, unlock bits, and no invented ranking.
export function createXinyeResultClaim({inspect}={}) {
  if(typeof inspect !== 'function') throw new TypeError('Expected owning tactical reader');
  let accepted=false, revoked=false;
  function accept() {
    if(accepted||revoked) return null;
    const state=inspect();
    if(!ready(state)) return null;
    const {activeSlots,rawTurns,currency,bonusExperience}=state.settlement;
    if(bonusExperience!==50||rawTurns!==state.rawTurn||currency!==state.currency) return null;
    const allies=activeSlots.filter(i=>i<15).map(i=>{
      const u=state.units[i];
      return {slotIndex:i,definitionIndex:u.definitionIndex,level:u.level,experience:u.experience,
        classIndex:u.classIndex,lastLearnedStrategyMarker:u.lastLearnedStrategyMarker,itemSlots:[...u.itemSlots]};
    });
    accepted=true;
    return freeze({kind:'local-xinye-victory-exit',contextId:'6:0:0',sourceRecord:9,returnCode:7,
      rawTurns,currency,allies,warehouseCounts:[...state.warehouseCounts],discoveryBytes:[...state.discoveryBytes]});
  }
  return Object.freeze({canAccept:()=>!accepted&&!revoked&&ready(inspect()),accept,revoke(){revoked=true;}});
}
