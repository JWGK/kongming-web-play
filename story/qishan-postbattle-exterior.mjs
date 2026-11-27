import {createDetachedTownSession} from './settled-town-session.mjs?v=0.73.90-wei-river-towns';
import {qishanDecisiveStocks} from './qishan-decisive-exterior.mjs?v=0.73.90-wei-river-towns';

const chapter='chapter4-post-qishan-source';
const early=Object.freeze([7,8]), camp=Object.freeze([17]);
const scopes=new Map([
  ['4:3:0:1:0',[7,8197,early,5,6,'exit:8']],
  ['4:3:1:1:0',[7,8198,early,6,0,'exit:16']],
  ['4:3:1:3:0',[7,8198,early,6,0,'exit:16']],
  ['4:3:1:5:0',[7,8198,early,6,0,'exit:16']],
  ['4:3:1:13:0',[7,8198,early,6,0,'exit:16']],
  ['4:3:2:7:0',[7,8198,early,6,0,'exit:9']],
  ['4:3:3:6:0',[17,8200,camp,8,null,null]],
]);
const scopesFor=cursor=>Array.isArray(cursor)&&cursor.length===5&&
  cursor.every(v=>Number.isSafeInteger(v)&&!Object.is(v,-0))?scopes.get(cursor.join(':')):null;
const owned=new WeakSet(),profiles=new WeakSet();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exactMask=cities=>Array.from({length:8},(_,i)=>cities.reduce((mask,n)=>mask|(n>>3===i?128>>(n&7):0),0));
export function qishanPostBattleExteriorOrigin({chapterId,cursor,stage,room,campaign}={}){
  const t=scopesFor(cursor);
  if(chapterId!==chapter||!t||stage!=='hub'||room?.inputEnabled!==true||room.currentCity!==t[0]||
     room.sceneMode!==t[1]||!Number.isInteger(room.bgmId)||room.bgmId<0||room.bgmId>255||
     !same(campaign?.persistentState?.cityAvailabilityBytes,exactMask(t[2])))return null;
  const origin=Object.freeze({city:t[0],cities:t[2],returnFacility:t[3],hookFacility:t[4],hook:t[5],
    context:Object.freeze({root:4,section:3,block:cursor[2]}),bgmId:room.bgmId});
  owned.add(origin);return origin;
}
export function isQishanPostBattleVisit(visit,chapterId,cursor){
  if(chapterId!==chapter||typeof visit!=='string')return false;
  const m=/^(town|world):(7|8|17)$/.exec(visit);
  return !!m&&scopesFor(cursor)?.[2].includes(Number(m[2]))===true;
}
export function qishanPostBattleVisitLabel(visit){
  const m=typeof visit==='string'&&/^(town|world):(7|8|17)$/.exec(visit);
  return m?({7:'成都',8:'漢中',17:'祁山'})[m[2]]+(m[1]==='world'?'城外大地圖':''):null;
}
export function allowsQishanPostBattleHandoff(origin,activeOptions,event){
  return owned.has(origin)&&origin.hook===event&&typeof event==='string'&&Array.isArray(activeOptions)&&
    activeOptions.some(row=>row.id===event&&row.enabled===true);
}

const tools=Object.freeze([164,175,186,187,188,189,190,191,192,193]);
export const qishanPostBattleStocks=Object.freeze({
  7:Object.freeze({weapons:Object.freeze([23,17,13,33,35,38,41,66,75,81,88,93,99]),tools}),
  8:Object.freeze({weapons:Object.freeze([22,16,13,33,39,41,66,75,84,88,93,99]),tools}),
  17:qishanDecisiveStocks,
});
const assets=Object.freeze({
  bank:['assets/chapter4-post-qishan/hanzhong-town-bank3.json',15754,'744604f1727458bfd60f235f10f1e1fab59ebab6ba0950b6d882b3d587547560'],
  1:['assets/chapter4-post-qishan/hanzhong-1-bank3.png',48433,'85ba49ba2a0300ea0373ef551692b220aa1c826c7c0f980b984e8e281fde2723'],
  2:['assets/chapter4-post-qishan/hanzhong-2-bank3.png',71685,'eb70981f3c69f54233b78b8ce1c1acfeee35f3c12f02caa4e3bf897ef2628975'],
});
export async function bindQishanPostBattleCities({base,fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  const get=async ([file,size,expected])=>{
    const r=await fetch('./'+file);
    if(!r.ok)throw new RangeError('Missing Hanzhong component '+file);
    const bytes=new Uint8Array(await r.arrayBuffer());
    const hash=bytes.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join(''):'';
    if(hash!==expected)throw new RangeError('Changed Hanzhong component '+file);
    return bytes;
  };
  const [raw]=await Promise.all([assets.bank,assets[1],assets[2]].map(get));
  const bank=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  const towns=base.townData;
  const cities=towns.cities.filter(row=>early.includes(row.id));
  const exits=towns.sourceExits.filter(row=>early.includes(row.city));
  const city8=cities.find(row=>row.id===8);
  const exit=exits.find(row=>row.city===8);
  if(bank.version!==1||bank.sourceBank!==3||bank.city!==8||cities.length!==2||exits.length!==2||
     !same([...city8.facilities,exit].map(row=>[row.kind,row.sourcePosition.x,row.sourcePosition.y]),
       [[0,13,7],[1,23,11],[2,19,9],[3,11,10],[4,3,12],[6,5,8],[9,12,15]]))
    throw new RangeError('Exact native Chengdu and Hanzhong scope');
  for(const id of early)for(const kind of ['weapons','tools'])
    if(!same(towns.stocks['city'+id+'-'+kind],qishanPostBattleStocks[id][kind]))throw new RangeError('Changed native shop rows');
  const scenes={...towns.scenes},labels={...base.npcLabels},pages={...base.pageTranslations};
  const facilities=towns.facilities.filter(row=>early.includes(row.city)).map(row=>{
    const id=row.facility;
    if(row.city!==8||![1,2].includes(id))return row;
    const key='city-8-facility-'+id,frame=bank.frames[key];
    if(!frame||frame.asset!==assets[id][0]||frame.sha256!==assets[id][2]||frame.nativeWidth!==240||frame.nativeHeight!==160||
      !same(frame.npcs.map(row=>row.npcDefinition),id===1?[15,20,28,32,45,55,63,70]:[0,48,52,64,72]))
      throw new RangeError('Changed native Hanzhong actor rows');
    scenes[key]=Object.freeze({...scenes[key],asset:frame.asset,nativeWidth:240,nativeHeight:160,staticCheckpoint:true,cleanScene:true});
    for(const npc of frame.npcs){
      labels[npc.id]=npc.speakerNameZhHant;
      for(const page of npc.pages)pages[page.sourcePageId]=Object.freeze({
        textJa:page.textZhHant,runs:page.runsZhHant,speakerNameJa:npc.speakerNameZhHant,
      });
    }
    return Object.freeze({...row,npcs:Object.freeze(frame.npcs)});
  });
  return Object.freeze({townData:Object.freeze({...towns,cities:Object.freeze(cities),sourceExits:Object.freeze(exits),
    facilities:Object.freeze(facilities),scenes:Object.freeze(scenes)}),
    npcLabels:Object.freeze(labels),pageTranslations:Object.freeze(pages)});
}

export const isQishanPostBattleTownProfile=profile=>profiles.has(profile);

function openPostBattleTown({origin,campaign,activeOptions,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!owned.has(origin)||!same(campaign?.persistentState?.cityAvailabilityBytes,exactMask(origin.cities))||
    !same(townData?.cities?.map(row=>row.id).sort((a,b)=>a-b),origin.cities))
    throw new RangeError('Exact original city mask and scope required');
  const facilityRoutes=[Object.freeze({city:origin.city,facility:origin.returnFacility,event:'origin'})];
  if(allowsQishanPostBattleHandoff(origin,activeOptions,origin.hook))
    facilityRoutes.push(Object.freeze({city:origin.city,facility:origin.hookFacility,event:origin.hook}));
  const shops=origin.cities.flatMap(city=>[['weapons',3,'武器屋',1021],['tools',4,'道具屋',1022]].map(([kind,facility,speakerNameJa,nativeActorDefinition])=>
    Object.freeze({city,kind,facility,stockKey:'city'+city+'-'+kind,sceneKey:'shop-city'+city+'-'+kind,
      speakerDefinition:null,speakerNameJa,nativeActorDefinition})));
  const profile=Object.freeze({id:'qishan-postbattle-exterior',context:origin.context,cityIds:origin.cities,initialCity:origin.city,
    bgmId:origin.bgmId,hintsJa:Object.freeze([origin.city===7?'成都':'祁山']),facilityRoutes:Object.freeze(facilityRoutes),shops:Object.freeze(shops)});
  profiles.add(profile);
  const carry=structuredClone({targetContext:origin.context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!same(value,carry))throw new RangeError('Cannot replace original towns carry');
  },itemServicesFactory(value){
    const adapter=itemServicesFactory(value);
    if(typeof observeOperation!=='function')return adapter;
    return Object.freeze({...adapter,operate(input){
      const result=adapter.operate(input);
      if(result.applied===true)observeOperation(structuredClone(input.action),result);
      return result;
    }});
  },getSave:readSave,onRequest:request,onEnterFacility(next,event){return route(event,next);}});
  engine.start(carry);return engine;
}
export function createQishanPostBattleTownSession(options){
  if(!owned.has(options?.origin))throw new RangeError('Original towns origin required');
  return createDetachedTownSession(openPostBattleTown,options,options.origin.cities);
}

export function checkQishanPostBattleTrade(entry,chapterId){
  const a=entry?.action,keys=a&&Object.keys(a).sort().join(','),scope=scopesFor(entry?.cursor);
  const uint=(v,max)=>Number.isSafeInteger(v)&&!Object.is(v,-0)&&v>=0&&v<=max;
  const owner=v=>v===null||uint(v,511);
  let valid=chapterId===chapter&&!!scope&&uint(a?.itemSlotId,254);
  if(a?.type==='buy')valid=valid&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&scope[2].includes(a.cityId)&&
    ['weapons','tools'].includes(a.shop)&&qishanPostBattleStocks[a.cityId][a.shop].includes(a.itemSlotId)&&owner(a.targetDefinitionIndex);
  else if(a?.type==='sell')valid=valid&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&
    owner(a.ownerDefinitionIndex)&&(a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  else valid=false;
  if(!valid)throw new RangeError('Invalid native Chengdu/Hanzhong/Qishan trade journal');
  return a;
}
export function replayQishanPostBattleTrade(entry,campaign,itemServicesFactory){
  const action=checkQishanPostBattleTrade(entry,chapter);
  if(!same(campaign?.persistentState?.cityAvailabilityBytes,exactMask(scopesFor(entry.cursor)[2])))
    throw new RangeError('Only current original city scope is allowed');
  const service=itemServicesFactory(campaign);
  const result=service.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||service.validatePersistentState(result.persistentState)===false||
     (result.rngState??campaign.rngState)!==campaign.rngState)throw new RangeError('Native trade must replay without RNG changes');
  return {...campaign,persistentState:result.persistentState};
}
