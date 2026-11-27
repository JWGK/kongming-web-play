// Common town actions, regardless of which campaign owns the current scene.
// Hosts still supply their verified facility policy, items, party and saves.
const townActions = Object.freeze([
  ['menu:load','ロード','loadSlots'],
  ['menu:info','情報','info'],
  ['menu:items','道具','owners'],
  ['menu:save','セーブ','saveSlots']
]);
const slots = ['saveSlots','loadSlots'];
const shopMenu = [['shop:buy','買う'],['shop:sell','売る']];
const fallbackInfo = [
  {id:'info:party',labelJa:'武将',enabled:true},
  {id:'info:hint',labelJa:'ヒント',enabled:true},
  {id:'info:history',labelJa:'ヒストリー',enabled:false,reason:'この版では通史パネルは未実装です。'},
  {id:'info:factions',labelJa:'勢力分布',enabled:false,reason:'この版では勢力分布パネルは未実装です。'}
];
const equipmentStages = [
  'itemActions','equipmentSlots','equipmentOwners','useConfirm',
  'exchangeOwners','exchangeItems','equipmentChoices'
];

export function canOpenTownMenu(state, allowInsideFacility=false) {
  return state?.stage === 'town' || state?.stage === 'world' ||
    (allowInsideFacility && state?.stage === 'facility');
}

export function openTownMenu(state, go, allowInsideFacility=false) {
  if (!canOpenTownMenu(state, allowInsideFacility)) return false;
  state.returnStage = state.stage;
  go('townMenu');
  return true;
}

// null distinguishes a scene-specific stage from an empty reviewed option list.
export function townMenuOptions(state, option, readSlot, profile={}) {
  if (state.stage === 'townMenu') return townActions.map(([id,label])=>option(id,label));
  if (slots.includes(state.stage)) return Array.from({length:5}, (_,i)=>{
    const slot=i+1, record=readSlot(slot);
    return option(`slot:${slot}`,record?.labelJa||`${slot}: データがありません`,{
      slot,occupied:!!record,enabled:state.stage==='saveSlots'||!!record&&record.valid!==false
    });
  });
  if (state.stage === 'shop') return shopMenu.map(([id,label])=>option(id,label));
  if (state.stage === 'info') {
    const options=(state.returnStage==='world'?profile.worldInfoOptions:undefined)
      ?? profile.infoOptions ?? fallbackInfo;
    return options.map(({id,labelJa,enabled,reason})=>option(id,labelJa,{
      enabled,...(options===fallbackInfo?(reason?{reason}:{}):{reason:reason??null})
    }));
  }
  return null;
}

export function chooseTownMenuOption(state, id, go) {
  if (state.stage === 'townMenu') {
    const action = townActions.find(([key])=>key===id);
    if (!action) return false;
    if (id==='menu:items') state.transaction={type:'manage'};
    go(action[2]);
    return true;
  }
  if (state.stage !== 'info' || !['info:party','info:hint'].includes(id)) return false;
  go(id==='info:party'?'partyInfo':'hint');
  return true;
}

export function backWithinTownMenu(state, go, {menuOnly=false, inShop=()=>false}={}) {
  if (state.stage === 'townMenu') {
    if (menuOnly) return false;
    go(state.returnStage||'town');
    state.returnStage=null;
  } else if (slots.includes(state.stage)||state.stage==='info') {
    state.transaction=null;
    go('townMenu');
  } else if (['partyInfo','hint'].includes(state.stage)) {
    go('info');
  } else if (['buyItems','sellItems','owners','transactionConfirm'].includes(state.stage)) {
    state.transaction=null;
    go(inShop()?'shop':'townMenu');
  } else if (state.stage==='inventoryView') {
    state.transaction={type:'manage'};
    go('owners');
  } else if (equipmentStages.includes(state.stage)) {
    state.transaction={type:'manage',owner:state.transaction.owner};
    go('inventoryView');
  } else return false;
  return true;
}

export function townPartyInfo(state, services, fallback, validate=value=>value) {
  if (state.stage!=='partyInfo') return undefined;
  return services?.stats ? validate(services.stats(state.persistentState)) : fallback(state.persistentState.party);
}

// Source-order profiles can project the same four entries in the native order.
export const nativeTownMenuOrder=Object.freeze(['menu:info','menu:items','menu:save','menu:load']);

const townStats=new Map([
  ['武力','武力'],['統率力','統率'],['統率','統率'],['知力','智力'],['智力','智力'],
  ['最大兵数','最大兵力'],['最大兵數','最大兵力'],['最大兵力','最大兵力'],
  ['最大策略値','最大策略值'],['最大策略值','最大策略值'],
  ['攻撃力','攻擊力'],['攻擊力','攻擊力'],['防御力','防禦力'],['防禦力','防禦力']
]);

export function appendTownPartyInfo(node, party, document, {name, className}={}) {
  const element=(tag,text)=>{
    const el=document.createElement(tag);
    if(text!==undefined)el.textContent=text;
    return el;
  };
  node.append(element('h3','武將'));
  for(const actor of party) {
    const card=element('article');
    const displayName=name?.(actor)||actor.nameJa||'未解讀';
    const level=Number.isSafeInteger(actor.level)?`　Lv ${actor.level}`:'';
    card.append(element('h4',displayName+level));
    const classLabel=className?.(actor.classIndex);
    const metadata=[classLabel,Number.isSafeInteger(actor.experience)?`經驗值 ${actor.experience}`:null]
      .filter(Boolean);
    if(metadata.length)card.append(element('p',metadata.join('　')));
    const values=new Map();
    for(const [key,value] of Object.entries(actor.stats??actor.baseFields??{})) {
      const label=townStats.get(key);
      if(label&&Number.isFinite(value)&&!values.has(label))values.set(label,value);
    }
    if(values.size)card.append(element('p',`${actor.stats?'能力':'基礎值'}：${[...values].map(([label,value])=>`${label} ${value}`).join('　')}`));
    node.append(card);
  }
}

export function townItemOptions(state, option, {stock, inspect, inventory, checkUseEligibility=true}) {
  const {stage,transaction,persistentState:{currency,party}}=state;
  const findOwner=id=>party.find(actor=>actor.definitionIndex===id);
  if(stage==='buyItems') return stock().map(id=>{
    const item=inspect(id);
    return option(`buy:${id}`,`${item.nameJa}　${item.buyPrice}`,{
      itemSlotId:id,price:item.buyPrice,enabled:currency>=item.buyPrice,
      reason:currency<item.buyPrice?'所持金が足りません。':null
    });
  });
  if(['owners','exchangeOwners','equipmentOwners'].includes(stage))return [
    ...(stage==='equipmentOwners'?[]:[option('owner:warehouse','倉庫')]),
    ...party.map(actor=>option(`owner:${actor.definitionIndex}`,actor.nameJa))
  ];
  if(stage==='sellItems')return inventory(transaction.owner).map(item=>
    option(`sell:${item.inventoryIndex??item.itemSlotId}`,`${item.nameJa}　${item.sellPrice}`,item));
  if(stage==='transactionConfirm'||stage==='useConfirm') {
    const group=stage==='useConfirm'?'use':'transaction';
    return [option(group+':yes','はい'),option(group+':no','いいえ')];
  }
  if(stage==='inventoryView')return [
    ...inventory(transaction.owner).map(item=>option(`item:${item.inventoryIndex??item.itemSlotId}`,
      item.nameJa+(item.count?' ×'+item.count:''),item)),
    ...(transaction.owner==='warehouse'?[]:[option('manage:equipment','装備')])
  ];
  if(stage==='itemActions'){
    const item=checkUseEligibility?inspect(transaction.itemSlotId,transaction.owner==='warehouse'?null:transaction.owner)
      :inspect(transaction.itemSlotId);
    if(item.category<3)return [option('item:equip','装備')];
    return [
      ...(item.townUsable&&transaction.owner!=='warehouse'?[option('item:use','使用',
        checkUseEligibility&&item.townUseEligible===false?{enabled:false,reason:'現在の兵種には使用できません。'}:{})]:[]),
      option('item:exchange','交換')
    ];
  }
  if(stage==='equipmentSlots')return ['武器','防具','補助'].map((label,index)=>{
    const slot=findOwner(transaction.owner).itemSlots[index];
    return option(`equipment:${index}`,`${label}　${slot===255?'－':inspect(slot).nameJa}`,{inventoryIndex:index});
  });
  if(stage==='equipmentChoices')return [option('equip:none','－'),
    ...inventory('warehouse').filter(item=>item.category===transaction.category&&inspect(item.itemSlotId,transaction.owner).eligible)
      .map(item=>option(`equip:${item.itemSlotId}`,`${item.nameJa} ×${item.count}`,item))];
  if(stage==='exchangeItems'){
    const owner=transaction.targetOwner;
    return owner==='warehouse'?[option('exchange:empty','－'),
      ...inventory(owner).filter(item=>item.category===3)
        .map(item=>option(`exchange:${item.itemSlotId}`,`${item.nameJa} ×${item.count}`,item))]
      :findOwner(owner).itemSlots.slice(3).map((slot,i)=>option(`exchange:${i+3}`,slot===255?'－':inspect(slot).nameJa,
        {inventoryIndex:i+3,itemSlotId:slot}));
  }
  return [];
}

export function townSlotRequest(state, option) {
  if(!slots.includes(state.stage))return null;
  return {type:state.stage==='saveSlots'?'save':'load',kind:'slot',slot:option.slot,occupied:option.occupied};
}

// The caller first resolves the option from the current enabled menu. Actual
// trade / item decisions still go to the host's validated operation service.
export function chooseTownTradeOption(state, option, go) {
  const {id}=option;
  if(state.stage==='shop') {
    const buy=id==='shop:buy';
    state.transaction={type:buy?'buy':'sell'};
    go(buy?'buyItems':'owners');
  } else if(state.stage==='buyItems') {
    state.transaction.itemSlotId=Number(id.slice(4));
    go('owners');
  } else if(state.stage==='owners') {
    state.transaction.owner=id==='owner:warehouse'?'warehouse':Number(id.slice(6));
    const {type}=state.transaction;
    go(type==='buy'?'transactionConfirm':type==='sell'?'sellItems':'inventoryView');
  } else if(state.stage==='sellItems') {
    Object.assign(state.transaction,{itemSlotId:option.itemSlotId,inventoryIndex:option.inventoryIndex??null});
    go('transactionConfirm');
  } else return false;
  return true;
}

// Shared no-shop equipment and trade choices. A caller supplies the currently
// enabled row and its own transactional, validated operation service.
export function chooseTownInventoryOption(state, row, go, operate) {
  const {id}=row, tx=state.transaction;
  if(tx?.type!=='manage')return false;
  const backTo=stage=>{state.transaction={type:'manage',owner:tx.owner};go(stage);};
  const ownerFromId=()=>id==='owner:warehouse'?'warehouse':Number(id.slice(6));
  const endpoint=(owner,slot,index)=>owner==='warehouse'?{ownerDefinitionIndex:null,itemSlotId:slot}:
    {ownerDefinitionIndex:owner,inventoryIndex:index};
  if(state.stage==='inventoryView'){
    if(id==='manage:equipment')backTo('equipmentSlots');
    else {Object.assign(tx,{itemSlotId:row.itemSlotId,inventoryIndex:row.inventoryIndex??null});go('itemActions');}
  }else if(state.stage==='itemActions'){
    if(id==='item:use')go('useConfirm');
    else if(id==='item:exchange')go('exchangeOwners');
    else if(id==='item:equip')go(tx.owner==='warehouse'?'equipmentOwners':'equipmentSlots');
    else return false;
  }else if(state.stage==='equipmentSlots'){
    tx.category=row.inventoryIndex;go('equipmentChoices');
  }else if(state.stage==='equipmentChoices'){
    const r=operate(id==='equip:none'?{type:'unequip',definitionIndex:tx.owner,inventoryIndex:tx.category}:
      {type:'equip',definitionIndex:tx.owner,itemSlotId:row.itemSlotId});
    if(!r.applied&&r.reason!=='empty_inventory_slot')throw new RangeError(r.reason);
    backTo('equipmentSlots');
  }else if(state.stage==='equipmentOwners'){
    const r=operate({type:'equip',definitionIndex:ownerFromId(),itemSlotId:tx.itemSlotId});
    if(!r.applied)throw new RangeError(r.reason);
    backTo('inventoryView');
  }else if(state.stage==='exchangeOwners'){
    tx.targetOwner=ownerFromId();go('exchangeItems');
  }else if(state.stage==='exchangeItems'){
    const from=endpoint(tx.owner,tx.itemSlotId,tx.inventoryIndex);
    const to=endpoint(tx.targetOwner,id==='exchange:empty'?255:row.itemSlotId,row.inventoryIndex);
    const r=operate({type:'exchange',from,to});
    if(!r.applied)throw new RangeError(r.reason);
    backTo('inventoryView');
  }else return false;
  return true;
}
