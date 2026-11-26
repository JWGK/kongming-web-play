// 14188 checks 0xC3; FB88 draws one bucket from 37 via 4C124,
// then passes the byte at 08080E0E + bucket to the ordinary FC28
// acquisition handler. That handler indexes warehouse/discovery by instance,
// including setting discovery when the instance is full (FC5E..FCA8).
import source from './xinye-source.mjs';
import {drawOriginalRandom} from '../engine/combat.mjs';
import {acquireScenarioWarehouseItem} from '../engine/scenario-inventory.mjs';

export function drawXinyeCacheItem({rngState,selector,recordIndex,...inventory}) {
  const table=source.reward.tilePrizes;
  if(selector!==table.selector||![6,8].includes(recordIndex))throw new RangeError('Wrong Free Xinye cache cursor');
  const rng=drawOriginalRandom(rngState,table.rngUpperExclusive);
  return {rngState:rng.state,bucket:rng.value,
    ...acquireScenarioWarehouseItem({...inventory,itemInstanceId:table.idsInOrder[rng.value]})};
}
