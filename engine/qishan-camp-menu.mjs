// Root4 camp menu projection. The actual owner publishes every selection.
// Inventory and persistence adapters must be bound before those entries admit actions.
import {campItemMenuStages} from './qishan-camp-inventory.mjs?v=0.73.57-qishan-camp';
import {openTownMenu, chooseTownMenuOption, backWithinTownMenu, townMenuOptions, nativeTownMenuOrder} from './town-menu-core.mjs?v=0.73.57-qishan-camp';

// Read the single source hint currently selected by camp opcode 0x30.
export function campMenuHint(configuration, block, reference){
  if(![1,2].includes(block) || !Number.isInteger(reference) ||
    configuration?.blocks?.[String(block)]?.finalHintReference!==reference)return null;
  const source=configuration.texts?.[String(reference)];
  return typeof source?.textZhHant==='string'&&source.textZhHant.length>0?source.textZhHant:null;
}
const infoOptions = hint => [
  {id:'info:party',labelJa:'武将',enabled:true},
  {id:'info:hint',labelJa:'ヒント',enabled:hint!==null,reason:hint===null?'未有營帳提示。':null},
  // Same browser availability policy as the earlier town-interior menu.
  {id:'info:records',labelJa:'ヒストリー',enabled:false,reason:'網頁版暫未支援戰歷。'},
];
const createState = () => ({stage:'town',returnStage:null,transaction:null});
const safeStages = new Set(['townMenu','info','partyInfo','hint','saveSlots','loadSlots',...campItemMenuStages]);
const option = (id,labelJa,extra={}) => ({id,labelJa,enabled:true,...extra});
const unavailable = (id, inventory,slotsBound) => !slotsBound&&['menu:save','menu:load'].includes(id) || id==='menu:items'&&!inventory;

export function campMenuCanOpen(core, room, pending){
  return !pending && core?.stage==='hub' && core.room?.inputEnabled===true &&
    room?.stage==='idle' && room.canChangeSettings===true &&
    room.hasPendingOperation===false && room.ambientPaused===false;
}

export function campMenuAction(current, action, canOpen, hint=null, inventory=null, operate=null,slotsBound=false) {
  if(action?.type==='open' && current===null && canOpen) {
    const state=createState();
    if(!openTownMenu(state, stage=>{state.stage=stage;}))throw new RangeError('Camp menu did not open');
    return Object.freeze(state);
  }
  if(!current||!safeStages.has(current.stage))throw new RangeError('Current camp menu required');
  const state={...current,transaction:current.transaction?{...current.transaction}:null};
  delete state.notice;
  const go=stage=>{state.stage=stage;};
  if(action?.type==='back'){
    if(!backWithinTownMenu(state,go))throw new RangeError('Unsupported camp back');
    return state.stage==='town'?null:freezeCampMenu(state);
  }
  if(action?.type==='choose' && typeof action.id==='string' && !unavailable(action.id,inventory,slotsBound) && (action.id!=='info:hint'||hint!==null) &&
     (chooseTownMenuOption(state,action.id,go)||inventory?.chooseOwner(state,action.id,go)||
       typeof operate==='function'&&inventory?.chooseItem(state,action.id,go,operate))&&safeStages.has(state.stage))
    return freezeCampMenu(state);
  throw new RangeError('Unsupported camp menu action or unavailable adapter');
}

function freezeCampMenu(state){
  if(state.transaction) Object.freeze(state.transaction);
  return Object.freeze(state);
}

export function campMenuView(current, campaign, hint=null, inventory=null,slotsBound=false){
  if(!current)return null;
  if(!safeStages.has(current.stage))throw new RangeError('Reviewed camp menu stage required');
  const itemView=inventory?.project(current);
  if(campItemMenuStages.includes(current.stage)&&!itemView)
    throw new RangeError('Current validated camp inventory required');
  const entries=townMenuOptions(current,option,()=>null,{infoOptions:infoOptions(hint)})??itemView?.menuOptions??[];
  let menuOptions=entries;
  if(current.stage==='townMenu') menuOptions=nativeTownMenuOrder.map(id=>{
    const entry=entries.find(row=>row.id===id);
    return unavailable(id,inventory,slotsBound)?{...entry,enabled:false,reasonZhHant:'呢個選項尚未接入營帳。'}:entry;
  });
  const party=campaign?.persistentState?.party;
  if(current.stage==='partyInfo' && !Array.isArray(party))throw new RangeError('Current camp party required');
  if(current.stage==='hint' && hint===null)throw new RangeError('Current native camp hint required');
  return {
    stage:current.stage,menuOptions,canBack:true,canAdvance:false,canOpenMenu:false,
    ...(current.stage==='partyInfo'?{party:structuredClone(party)}:{}),
    ...(current.stage==='hint'?{promptJa:hint}:{}),
    ...(itemView?.inventory?{inventory:itemView.inventory}:{}),
    ...(itemView?.promptJa||current.notice?{promptJa:itemView?.promptJa??current.notice}:{})
  };
}
