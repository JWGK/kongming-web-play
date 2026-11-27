import {createDetachedTownSession} from './settled-town-session.mjs?v=0.73.90-wei-river-towns';

const chapter='chapter5-changan-source';
const context=Object.freeze({root:5,section:0,block:1});
const cities=Object.freeze([17,22]);
// Original scenario 0x1c80a2. The later enlarged masks follow an input lock.
const mask=Object.freeze([0,0,0x42,0,0,0,0,0]);
const exact=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const unsigned=(n,max)=>Number.isSafeInteger(n)&&!Object.is(n,-0)&&n>=0&&n<=max;
function site(cursor){
  return Array.isArray(cursor)&&cursor.length===5&&cursor.every(n=>unsigned(n,63))&&
    (cursor.join(':')==='5:0:1:1:0'?'outdoor':cursor.join(':')==='5:0:1:2:0'?'camp':null);
}
const origins=new WeakSet(), profiles=new WeakSet(), townDataIssued=new WeakSet();
export const isChanganRoadTownProfile=profile=>profiles.has(profile);
export function changanRoadOrigin({chapterId,cursor,stage,room,campaign}={}){
  const originSite=site(cursor);
  if(chapterId!==chapter||stage!=='hub'||!originSite||room?.currentCity!==22||
    room.sceneMode!==(originSite==='camp'?8200:22)||room.inputEnabled!==true||
    !unsigned(room.bgmId,255)||!exact(campaign?.persistentState?.cityAvailabilityBytes,mask))return null;
  const result=Object.freeze({site:originSite,city:22,bgmId:room.bgmId});
  origins.add(result);
  return result;
}
export function isChanganRoadVisit(value,chapterId,cursor){
  return chapterId===chapter&&!!site(cursor)&&typeof value==='string'&&/^(town|world):(17|22)$/.test(value);
}
export function changanRoadVisitLabel(value){
  const m=typeof value==='string'&&/^(town|world):(17|22)$/.exec(value);
  return m?((m[2]==='17'?'祁山':'五丈原')+(m[1]==='world'?'城外大地圖':'')):null;
}
export const changanRoadStocks=Object.freeze({
  17:Object.freeze({weapons:Object.freeze([14,11,30,39,42,51,54,68,78,82,95,101,106,112,121]),tools:Object.freeze([164,175,186,187,188,189,190,191,192,193])}),
  // City 22 has no weapon-room or stock: 0x8827b is all FF. Tool stock 0x88401.
  22:Object.freeze({tools:Object.freeze([132,138,144,147,162,164,166,169,171,173,174,175])}),
});
const kind17=[[1,21,9],[3,4,12],[4,19,13],[8,12,8],[9,11,17]];
// ROM hotspot records at 0x87740, 0x87750, 0x87754; scene room kind 8 is 0x25.
const kind22=[[4,8,8],[8,19,10],[9,14,17]];
const art={
  camp:'assets/chapter5-section2-town/city22-facility8-canonical.png',
  qishanHall:'assets/chapter5-changan/qishan-1-bank4.png',
  wuzhang:'assets/wuzhang-native-stills/7d2a4c72a965cee5d2275ea5.png',
};
const inputs=Object.freeze([
  ['high-post-chencang-town.json',37225,'436b501a45cba8537b93d111c8455c55863cacd7c39e85fc0fba40112e79861a'],
  [art.camp,60159,'6ddbbbc027d90a51e41b25a723e523e1ce739708ff062ed87c18881990b1ca70'],
  [art.qishanHall,49593,'6dd31ec0c17ed6c4ae0ed1705dceb0d58a40876351903ebb42654a1e8b4b9bcf'],
  [art.wuzhang,18302,'7d2a4c72a965cee5d2275ea50357ca2572d6073a4eda852932be9a3e87942992'],
]);
const freeze=Object.freeze;
const staticRoom=asset=>freeze({asset,cleanScene:true,staticCheckpoint:true,nativeWidth:240,nativeHeight:160});
const facility=(kind,x,y)=>freeze({
  id:({4:'tools',8:'camp',9:'exit'})[kind],
  labelJa:({4:'道具屋',8:'幕舎　',9:'出口　'})[kind],kind,sourcePosition:freeze({x,y}),
});
export async function loadChanganRoadTownData({fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  const checked=async ([path,size,expected])=>{
    const r=await fetch('./'+path);
    if(!r.ok)throw new RangeError('Missing original Map37 component '+path);
    const bytes=new Uint8Array(await r.arrayBuffer());
    const digest=bytes.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''):'';
    if(digest!==expected)throw new RangeError('Changed original Map37 component '+path);
    return bytes;
  };
  const [bytes]=await Promise.all(inputs.map(checked));
  const prior=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  const qishan=prior.cities.find(row=>row.id===17), qishanExit=prior.sourceExits.find(row=>row.city===17);
  if(!exact([...qishan.facilities,qishanExit].map(row=>[row.kind,row.sourcePosition.x,row.sourcePosition.y]),kind17)||
    !Object.entries(changanRoadStocks[17]).every(([shop,stock])=>exact(prior.stocks['city17-'+shop],stock)))
    throw new RangeError('Original Qishan layout and shops must remain exact');
  const wuzhang=freeze({id:22,nameJa:'五丈原',facilities:freeze(kind22.slice(0,2).map(row=>facility(...row)))});
  const wuzhangExit=freeze({city:22,...facility(...kind22[2])});
  // Chapter 5 bank4 has no generic resident rows for either destination.
  const facilities=[...kind17.slice(0,-1).map(row=>[17,row[0]]),...kind22.slice(0,-1).map(row=>[22,row[0]])]
    .map(([city,kind])=>freeze({city,facility:kind,id:'city:'+city+':facility:'+kind,npcs:freeze([])}));
  const scenes=freeze({...prior.scenes,
    'city-17-facility-1':staticRoom(art.qishanHall),
    'city-17-facility-8':staticRoom(art.camp),
    'city-22':staticRoom(art.wuzhang),
    'city-22-facility-8':staticRoom(art.camp),
    'city-22-facility-4':prior.scenes['city-17-facility-4'],
    'city-22-facility-9':prior.scenes.world,
    'shop-city22-tools':prior.scenes['shop-city17-tools'],
  });
  const stocks=freeze(Object.fromEntries(cities.flatMap(city=>Object.entries(changanRoadStocks[city]).map(([kind,rows])=>['city'+city+'-'+kind,rows]))));
  const townData=freeze({...prior,contentVersion:'rom-acf30794-root5-map37-bank4-city17-city22',sourceTextBank:4,
    cities:freeze([qishan,wuzhang]),sourceExits:freeze([qishanExit,wuzhangExit]),
    facilities:freeze(facilities),scenes,stocks,dialogues:freeze({}),hallActors:freeze([])});
  townDataIssued.add(townData);
  return townData;
}
function openTown({origin,campaign,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!origins.has(origin)||!townDataIssued.has(townData)||!exact(campaign?.persistentState?.cityAvailabilityBytes,mask))
    throw new RangeError('Exact Map37 origin, city mask and verified data required');
  const declaredShops=cities.flatMap(city=>Object.keys(changanRoadStocks[city]).map(kind=>{
    const weapons=kind==='weapons';
    return freeze({city,kind,facility:weapons?3:4,stockKey:'city'+city+'-'+kind,sceneKey:'shop-city'+city+'-'+kind,
      speakerDefinition:null,speakerNameJa:weapons?'武器屋':'道具屋',nativeActorDefinition:weapons?1021:1022});
  }));
  const profile=freeze({id:'changan-road-exterior',context,cityIds:cities,initialCity:22,bgmId:origin.bgmId,
    hintsJa:freeze(['五丈原']),facilityRoutes:freeze([freeze({city:22,facility:8,event:origin.site==='outdoor'?'exit:1':'origin'})]),
    shops:freeze(declaredShops)});
  profiles.add(profile);
  const carry=structuredClone({targetContext:context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!exact(value,carry))throw new RangeError('Cannot replace original Map37 carry');
  },itemServicesFactory(value){
    const adapter=itemServicesFactory(value);
    return freeze({...adapter,operate(input){
      const result=adapter.operate(input);
      if(result.applied===true&&typeof observeOperation==='function')observeOperation(structuredClone(input.action),result);
      return result;
    }});
  },getSave:readSave,onRequest:request,onEnterFacility(next,event){return route(event,next);}});
  engine.start(carry);
  return engine;
}
export function createChanganRoadTownSession(options){
  return createDetachedTownSession(openTown,options,cities);
}
export function checkChanganRoadTrade(entry,chapterId){
  const a=entry?.action,keys=a&&Object.keys(a).sort().join(',');
  const owner=n=>n===null||unsigned(n,511);
  let valid=chapter===chapterId&&!!site(entry?.cursor)&&unsigned(a?.itemSlotId,254);
  if(a?.type==='buy')valid=valid&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&cities.includes(a.cityId)&&
    ['weapons','tools'].includes(a.shop)&&changanRoadStocks[a.cityId][a.shop]?.includes(a.itemSlotId)===true&&owner(a.targetDefinitionIndex);
  else if(a?.type==='sell')valid=valid&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&
    owner(a.ownerDefinitionIndex)&&(a.ownerDefinitionIndex===null?a.inventoryIndex===null:unsigned(a.inventoryIndex,12));
  else valid=false;
  if(!valid)throw new RangeError('Invalid native Map37 trade journal entry');
  return a;
}
export function replayChanganRoadTrade(entry,campaign,itemServicesFactory){
  const action=checkChanganRoadTrade(entry,chapter);
  if(!exact(campaign?.persistentState?.cityAvailabilityBytes,mask))throw new RangeError('Only original Map37 travel scope is admitted');
  const service=itemServicesFactory(campaign);
  const result=service.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||service.validatePersistentState(result.persistentState)===false||
    (result.rngState??campaign.rngState)!==campaign.rngState)
    throw new RangeError('Native Map37 transaction must replay without replacing RNG');
  return {...campaign,persistentState:result.persistentState};
}
