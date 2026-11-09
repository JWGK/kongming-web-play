/** Event-time result metadata only. Never calculate gameplay rewards or damage
 * from current units: one exchange may already contain multiple later hits.
 */
import {statusChangePresentation} from './status-presentation.mjs';
export function experienceResultMetadata(effect,{definitionIndex}={}){
 const {previousLevel,previousExperience,level,experience,total}=effect;
 for(const [k,v]of Object.entries({previousLevel,previousExperience,level,experience,total}))if(!Number.isSafeInteger(v)||v<0)throw new TypeError(`Missing event-time EXP ${k}`);
 const eligible=definitionIndex===undefined?previousLevel<99:definitionIndex<=235&&previousLevel<99;
 return Object.freeze({awardedExperience:eligible?total:0,nominalExperience:total,experienceApplied:eligible&&total>0,atLevelCap:level>=99,remainingExperience:level>=99?null:100-experience,remainingToNextLevel:level>=99?null:100-experience,levelsGained:level-previousLevel});
}
export function battleResultPresentation(effect){
 const actorSlot=effect.actorSlot??effect.attackerSlot??effect.slotIndex,targetSlot=effect.targetSlot??effect.defenderSlot??effect.slotIndex;
 if(['physicalHit','strategyHit'].includes(effect.type))return Object.freeze({kind:'damage',resource:'troops',actorSlot,targetSlot,amount:effect.beforeTroops-effect.afterTroops,outcome:effect.missed===true||effect.hit===false?'miss':effect.beforeTroops===effect.afterTroops?'zero':'damage'});
 if(effect.type==='poison_damage'||effect.type==='scripted_unit_modifier'&&effect.kind===2&&Number.isInteger(effect.beforeTroops))return Object.freeze({kind:'damage',resource:'troops',actorSlot:null,targetSlot,amount:effect.beforeTroops-(effect.afterTroops??effect.troops),outcome:effect.beforeTroops===(effect.afterTroops??effect.troops)?'zero':'damage',source:effect.type});
 if(effect.type==='resource_recovery')return Object.freeze({kind:'resourceRecovery',actorSlot:effect.sourceSlot??null,targetSlot,troopsRecovered:effect.troops-effect.beforeTroops,strategyPointsRecovered:effect.strategyPoints-effect.beforeStrategyPoints,source:effect.source??'terrain'});
 if(effect.type==='strategyStatus'&&effect.field==='flags16'&&effect.success&&((effect.before&192)!==(effect.after&192)))return Object.freeze({kind:'reactivation',actorSlot,targetSlot});
 if(effect.type==='strategyStatus'&&Number.isInteger(effect.strategyPointLoss))return Object.freeze({kind:'damage',resource:'strategyPoints',actorSlot,targetSlot,amount:effect.beforeStrategyPoints-effect.afterStrategyPoints,outcome:effect.strategyPointLoss===0?'zero':'damage'});
 if(effect.type==='troopHealing')return Object.freeze({kind:'healing',resource:'troops',actorSlot,targetSlot,amount:effect.afterTroops-effect.beforeTroops});
 if(effect.type==='strategyPointHealing')return Object.freeze({kind:'healing',resource:'strategyPoints',actorSlot,targetSlot,amount:effect.afterStrategyPoints-effect.beforeStrategyPoints});
 if(effect.type==='itemConsumed'&&effect.presentationFeedback!=='preceding_strategy_effect'&&Number.isInteger(effect.effect?.recovered))return Object.freeze({kind:'healing',resource:'troops',actorSlot,targetSlot,amount:effect.effect.recovered});
 if(effect.type==='experienceChange')return Object.freeze({kind:'experience',actorSlot,...experienceResultMetadata(effect,{definitionIndex:effect.definitionIndex})});
 if(effect.type==='warehouse_item')return Object.freeze({kind:'itemAcquired',definitionId:effect.definitionId??effect.itemInstanceId,quantity:effect.acquired?(effect.quantity??1):0,acquired:effect.acquired===true,destination:'warehouse'});
 if(['action_no_effect'].includes(effect.type)||['strategyStatus','physicalStatus'].includes(effect.type)&&effect.success===false)return Object.freeze({kind:'noEffect',actorSlot,targetSlot,reason:effect.reason??(effect.type==='physicalStatus'?'physical_status_failed':'strategy_failed'),actionApplied:effect.actionApplied??true});
 const status=statusChangePresentation(effect);if(status)return Object.freeze({kind:'status',actorSlot,targetSlot,...status});
 return null;
}
