/**
 * Controller adapter for the Root4 camp's existing town inventory menu.
 * The caller is the source owner; the item inspection hook must use its
 * pinned campaign rules, not user-supplied catalog rows or inferred equipment.
 */
import {townItemOptions,chooseTownTradeOption,chooseTownInventoryOption} from './town-menu-core.mjs?v=0.73.57-qishan-camp';

const WAREHOUSE='warehouse', EMPTY=255;
const option=(id,labelJa,extra={})=>({id,labelJa,enabled:true,...extra});

export const campItemMenuStages=Object.freeze(['owners','inventoryView','itemActions','equipmentSlots',
  'equipmentChoices','equipmentOwners','exchangeOwners','exchangeItems','useConfirm','useResult']);

export function createCampInventoryView({persistentState, inspectItem, validatePersistentState, mutable=false}) {
  if(typeof inspectItem!=='function'||typeof validatePersistentState!=='function')
    throw new RangeError('Current validated camp item services required');
  validatePersistentState(persistentState);
  const {party,warehouseCounts}=persistentState;
  const members=new Map(party.map(a=>[a.definitionIndex,a]));
  const labels=new Map();
  function inspect(slot,owner=null){
    const key=String(owner)+':'+slot;
    if(labels.has(key))return labels.get(key);
    const row=inspectItem(slot,owner);
    if(row?.itemSlotId!==slot||typeof row.nameJa!=='string'||
       !Number.isInteger(row.category)||row.category<0||row.category>3)
      throw new RangeError('Exact reviewed camp item definition required');
    labels.set(key,Object.freeze({...row}));
    return labels.get(key);
  }
  function inventory(owner){
    if(owner===WAREHOUSE) return warehouseCounts.flatMap((count,slot)=>
      count>0?[{...inspect(slot),count}]:[]);
    const member=members.get(owner);
    if(!member)throw new RangeError('Current camp party member required');
    return member.itemSlots.flatMap((slot,index)=>
      slot!==EMPTY?[{...inspect(slot,owner),inventoryIndex:index}]:[]);
  }
  function project(menu) {
    if(!campItemMenuStages.includes(menu.stage))return null;
    const menuOptions=mutable||menu.stage==='owners'?townItemOptions({...menu,persistentState},option,{inspect,inventory}):[];
    const options=(menuOptions??[]).filter(row=>!(
      (menu.stage==='exchangeOwners'&&row.id==='owner:warehouse'&&menu.transaction.owner===WAREHOUSE)
    )).map(row=>{
      if(menu.stage==='equipmentOwners'&&!inspect(menu.transaction.itemSlotId,Number(row.id.slice(6))).eligible)
        return {...row,enabled:false,reason:'目前兵種不能裝備。'};
      return row;
    });
    return {menuOptions:options,
      ...(menu.stage==='inventoryView'?{inventory:inventory(menu.transaction.owner)}:{}),
      ...(menu.stage==='useConfirm'?{promptJa:'使用 '+inspect(menu.transaction.itemSlotId,menu.transaction.owner).nameJa+'？'}:{})};
  }
  function chooseOwner(menu,id,go) {
    if(menu.stage!=='owners'||menu.transaction?.type!=='manage'||
       !project(menu).menuOptions.some(row=>row.id===id&&row.enabled))
      return false;
    return chooseTownTradeOption(menu,{id},go);
  }
  function chooseItem(menu,id,go,operate){
    if(!mutable||!campItemMenuStages.includes(menu.stage)||menu.stage==='owners')return false;
    const row=project(menu).menuOptions.find(r=>r.id===id&&r.enabled);
    if(!row)return false;
    if(menu.stage==='useConfirm'){
      const {owner,inventoryIndex}=menu.transaction;
      if(id==='use:yes'){
        const r=operate({type:'use',definitionIndex:owner,inventoryIndex});
        if(!r.applied)throw new RangeError(r.reason);
        menu.notice=r.notice;
      }
      menu.transaction={type:'manage',owner};
      go('inventoryView');return true;
    }
    return chooseTownInventoryOption(menu,row,go,operate);
  }

  return Object.freeze({inspect,inventory,project,chooseOwner,chooseItem});
}
