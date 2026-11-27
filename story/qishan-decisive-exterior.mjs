import {createDetachedTownSession} from './settled-town-session.mjs';

// The city17 camp immediately before Map33, not Map32's city42 camp.
// Native 4:1:7 sets only city 17 (0x1b0ee1), then releases input at
// 0x1b1061. Its actual F4 room exit (0x1ef3d4) has no FE source override.
const cursorKey='4:1:7:1:0';
const chapter='qishan-map33-source';
const kind17=Object.freeze([[1,21,9],[3,4,12],[4,19,13],[8,12,8],[9,11,17]].map(row=>Object.freeze(row)));
const cityMask=Object.freeze([0,0,0x40,0,0,0,0,0]);
const validatedOrigins=new WeakSet();
const shopStocks=Object.freeze({
  weapons:Object.freeze([14,11,30,39,42,51,54,68,78,82,95,101,106,112,121]),
  tools:Object.freeze([164,175,186,187,188,189,190,191,192,193]),
});
const allowedNpcIds=Object.freeze([3,18,44,60,64,74]);
const atCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&
  cursor.every(v=>Number.isSafeInteger(v)&&!Object.is(v,-0))&&cursor.join(':')===cursorKey;
const sound=bgm=>Number.isInteger(bgm)&&bgm>=0&&bgm<=255;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function qishanDecisiveExteriorOrigin({chapterId,cursor,stage,room}={}){
  if(chapterId!==chapter||!atCursor(cursor)||stage!=='hub'||room?.currentCity!==17||
     room.sceneMode!==0x2008||room.inputEnabled!==true||!sound(room.bgmId))return null;
  const origin=Object.freeze({chapterId,city:17,cursor:Object.freeze([...cursor]),bgmId:room.bgmId});
  validatedOrigins.add(origin);
  return origin;
}
export function isQishanDecisiveExteriorCarry(origin,campaign){
  return validatedOrigins.has(origin)&&same(campaign?.persistentState?.cityAvailabilityBytes,cityMask);
}
export function isQishanDecisiveVisit(visit,chapterId,cursor){
  return chapterId===chapter&&atCursor(cursor)&&(visit==='town'||visit==='world');
}

const inputs=Object.freeze({
  prior:['high-post-chencang-town.json',37225,'436b501a45cba8537b93d111c8455c55863cacd7c39e85fc0fba40112e79861a'],
  bank:['assets/qishan-map33/qishan-town-bank3.json',7080,'126b1f0b11ca4bb84dc6a508723f5076e7c3f81cad820679c7b200ff807d0497'],
  still:['assets/qishan-map33/qishan-1-bank3.png',48532,'b313a39a86acb8ac8a7c6138808b288331e20974d39f19ad91ffa7819d0a3878'],
});
// Same already-reviewed Chapter 3 city data for geography and shop
// inventory, never its Chapter 3 NPCs or the additional Nan'an route.
export async function loadQishanDecisiveTownData({fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  const get=async ([path,size,expected])=>{
    const r=await fetch('./'+path);
    if(!r.ok)throw new RangeError('Missing original Qishan component '+path);
    const bytes=new Uint8Array(await r.arrayBuffer());
    const hash=bytes.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join(''):'';
    if(hash!==expected)throw new RangeError('Changed original Qishan component '+path);
    return bytes;
  };
  const utf=new TextDecoder('utf-8',{fatal:true});
  const [priorAsset,bankAsset]=await Promise.all(Object.values(inputs).map(get));
  const prior=JSON.parse(utf.decode(priorAsset)),bank=JSON.parse(utf.decode(bankAsset));
  const city=prior.cities.find(row=>row.id===17),exit=prior.sourceExits.find(row=>row.city===17);
  const f='city-17-facility-1',frame=bank.frames[f];
  const coords=[...city.facilities,exit].map(row=>[row.kind,row.sourcePosition.x,row.sourcePosition.y]);
  if(!same(coords,kind17)||!Object.entries(shopStocks).every(([name,values])=>same(prior.stocks['city17-'+name],values))||
    bank.version!==1||bank.sourceBank!==3||bank.city!==17||!same(Object.keys(bank.frames),[f])||
    !same(frame.npcs.map(row=>row.npcDefinition),allowedNpcIds)||frame.asset!==inputs.still[0]||
    frame.sha256!==inputs.still[2]||frame.nativeWidth!==240||frame.nativeHeight!==160)
    throw new RangeError('Expected Map33 native city17 scope');
  const locales={},npcLabels={};
  for(const row of frame.npcs){
    npcLabels[row.id]=row.speakerNameZhHant;
    for(const page of row.pages) locales[page.sourcePageId]=Object.freeze({
      textJa:page.textZhHant,runs:page.runsZhHant,speakerNameJa:row.speakerNameZhHant,
    });
  }
  const facilities=prior.facilities.filter(x=>x.city===17).map(row=>Object.freeze({...row,
    // The mode2 shop branch calls 0x2a698 instead of the generic actor
    // loader; its two authoring-only weapons rows are not interactive here.
    npcs:Object.freeze(row.facility===1?frame.npcs:[])}));
  const scenes=Object.freeze({...prior.scenes,[f]:Object.freeze({...prior.scenes[f],asset:frame.asset,
    nativeWidth:240,nativeHeight:160,staticCheckpoint:true,cleanScene:true})});
  return Object.freeze({
    townData:Object.freeze({...prior,cities:Object.freeze([city]),sourceExits:Object.freeze([exit]),facilities:Object.freeze(facilities),
      stocks:Object.freeze(Object.fromEntries(Object.entries(shopStocks).map(([shop,values])=>['city17-'+shop,values]))),scenes}),
    pageTranslations:Object.freeze(locales),npcLabels:Object.freeze(npcLabels),
  });
}

const issuedProfiles=new WeakSet();
export const isQishanDecisiveTownProfile=profile=>issuedProfiles.has(profile);
export const qishanDecisiveStocks=shopStocks;

function openQishanDecisiveTown({origin,campaign,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!isQishanDecisiveExteriorCarry(origin,campaign))throw new RangeError('Exact original city17 scope and travel mask required');
  if(typeof sharedFactory!=='function'||typeof itemServicesFactory!=='function'||typeof route!=='function'||
     townData?.cities?.length!==1||townData.cities[0].id!==17)
    throw new TypeError('Exact city17 town data and bridge required');
  const context=Object.freeze({root:4,section:1,block:7});
  const profile=Object.freeze({id:'qishan-decisive-exterior',context,cityIds:Object.freeze([17]),initialCity:17,
    bgmId:origin.bgmId,hintsJa:Object.freeze(['祁山']),facilityRoutes:Object.freeze([Object.freeze({city:17,facility:8,event:'origin'})]),
    shops:Object.freeze([['weapons',3,'武器屋',1021],['tools',4,'道具屋',1022]].map(([kind,facility,speakerNameJa,nativeActorDefinition])=>
      Object.freeze({city:17,kind,facility,stockKey:'city17-'+kind,sceneKey:'shop-city17-'+kind,
        speakerDefinition:null,speakerNameJa,nativeActorDefinition})))});
  issuedProfiles.add(profile);
  const carry=structuredClone({targetContext:context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!same(value,carry))throw new RangeError('Cannot replace original city17 carry');
  },itemServicesFactory(value){
    const adapter=itemServicesFactory(value);
    if(typeof observeOperation!=='function')return adapter;
    return Object.freeze({...adapter,operate(input){
      const result=adapter.operate(input);
      if(result.applied===true)observeOperation(structuredClone(input.action),result);
      return result;
    }});
  },getSave:readSave,onRequest:request,onEnterFacility(next,event){return route(event,next);}});
  engine.start(carry);
  return engine;
}
export function createQishanDecisiveTownSession(options){
  return createDetachedTownSession(openQishanDecisiveTown,options,17);
}

export function checkQishanDecisiveTrade(entry,chapterId){
  const a=entry?.action, keys=a&&Object.keys(a).sort().join(',');
  const uint=(v,max)=>Number.isSafeInteger(v)&&!Object.is(v,-0)&&v>=0&&v<=max;
  const owner=v=>v===null||uint(v,511);
  let valid=chapterId===chapter&&atCursor(entry?.cursor)&&uint(a?.itemSlotId,254);
  if(a?.type==='buy')valid=valid&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&a.cityId===17&&
    ['weapons','tools'].includes(a.shop)&&shopStocks[a.shop].includes(a.itemSlotId)&&owner(a.targetDefinitionIndex);
  else if(a?.type==='sell')valid=valid&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&
    owner(a.ownerDefinitionIndex)&&(a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  else valid=false;
  if(!valid)throw new RangeError('Invalid native city17 trade journal entry');
  return a;
}

export function replayQishanDecisiveTrade(entry,campaign,itemServicesFactory){
  const action=checkQishanDecisiveTrade(entry,chapter);
  if(!same(campaign?.persistentState?.cityAvailabilityBytes,cityMask))throw new RangeError('Only native city17 trade scope is admitted');
  const service=itemServicesFactory(campaign);
  const result=service.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||service.validatePersistentState(result.persistentState)===false||
     (result.rngState??campaign.rngState)!==campaign.rngState)
    throw new RangeError('Native city17 trade must replay without an RNG change');
  return {...campaign,persistentState:result.persistentState};
}
