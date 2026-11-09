/** Early-campaign source lifespan binding. These chapters have no scripted
 * lifespan adjustment; repeated fresh entry follows the verified retry ledger.
 * This validates a browser lifecycle, not native loaded-history byte parity. */
import {enterFreshBattle,validateLifespan} from './campaign-lifespan.mjs';
export function isEarlyCampaignLifespan(value,ceiling){return value===null||Number.isInteger(value)&&value>=0&&value<=ceiling&&value%2===0;}
export function retryLifecycleLifespan(state,initialLifespan){
 let expected=enterFreshBattle(initialLifespan);
 if(state.retryHistory!==undefined){
  if(!Array.isArray(state.retryHistory)||!state.retryAnchor)throw new TypeError('Retry lifecycle requires its explicit source anchor');
  for(const row of state.retryHistory){
   if(!row||Object.keys(row).sort().join(',')!=='anchorLifespan,lifespanAfter,reason'||!['manual_retreat','defeat_retry'].includes(row.reason)||row.anchorLifespan!==expected||row.lifespanAfter!==enterFreshBattle(expected))throw new TypeError('Invalid ordered retry lifespan lifecycle');
   expected=row.lifespanAfter;
  }
 }
 if(Object.hasOwn(state,'campaignLifespan')&&state.campaignLifespan!==expected)throw new TypeError('Tactical/campaign lifespan mismatch');
 return expected;
}
export function synchronizeRetryCampaign(state,campaign,battleBlock){
 if(state.retryHistory===undefined)return campaign;
 // A previously untracked first-battle save stays explicitly unknown.
 if(!Object.hasOwn(campaign,'initialLifespan'))campaign.initialLifespan=null;
 campaign.lifespan=retryLifecycleLifespan(state,campaign.initialLifespan);
 if(state.terminal===null&&state.phase!=='settled'){campaign.outcome=null;campaign.block=battleBlock;}
 return campaign;
}
