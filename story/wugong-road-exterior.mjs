import {createDetachedTownSession} from './settled-town-session.mjs?v=0.73.90-wei-river-towns';
import {changanRoadStocks,loadChanganRoadTownData} from './changan-road-exterior.mjs?v=0.73.93-changan-road-towns';

const chapter='chapter5-wugong-source', selection='chapter5-wugong-selection', aftermath='chapter5-changan-return';
const contexts=Object.freeze({
  [chapter]:Object.freeze({root:5,section:0,block:5}),
  [selection]:Object.freeze({root:5,section:0,block:11}),
  [aftermath]:Object.freeze({root:5,section:0,block:13}),
});
const mask=Object.freeze([0,0,0x43,0,0,0,0,0]), cities=Object.freeze([17,22,23]);
// 0x1cad37 also enables the story landmark 武功 (52). Original world
// A-confirm at 0x26b6c rejects targets above city 25 even with that bit set.
const afterMask=Object.freeze([0,0,0x43,0,0,0,8,0]);
const maskFor=id=>id===aftermath?afterMask:mask;
const scope=new WeakSet(),dataOwner=new WeakSet(),profileOwner=new WeakSet();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const uint=(x,limit)=>Number.isSafeInteger(x)&&!Object.is(x,-0)&&x>=0&&x<=limit;
function site(cursor,chapterId=chapter){
  return Array.isArray(cursor)&&cursor.length===5&&cursor.every(n=>uint(n,63))&&
    (chapterId===chapter?(cursor.join(':')==='5:0:5:1:0'?'outdoor':cursor.join(':')==='5:0:5:2:0'?'council':null):
     chapterId===selection&&cursor.join(':')==='5:0:11:1:0'||chapterId===aftermath&&cursor.join(':')==='5:0:13:2:0'?'council':null);
}
export function wugongRoadOrigin({chapterId,cursor,stage,room,campaign}={}){
  const at=site(cursor,chapterId);
  // Native city gate 0x1c8de5, input release 0x1c8e36 and 0x1c8f12.
  if(!at||stage!=='hub'||room?.currentCity!==23||room.sceneMode!==(at==='outdoor'?23:8192)||
     room.inputEnabled!==true||!uint(room.bgmId,255)||!same(campaign?.persistentState?.cityAvailabilityBytes,maskFor(chapterId)))return null;
  const value=Object.freeze({site:at,city:23,bgmId:room.bgmId,chapterId});
  scope.add(value);
  return value;
}
export const isWugongRoadTownProfile=p=>profileOwner.has(p);
export function isWugongRoadVisit(value,chapterId,cursor){
  return !!site(cursor,chapterId)&&typeof value==='string'&&/^(town|world):(17|22|23)$/.test(value);
}
export function wugongRoadVisitLabel(value){
  const m=typeof value==='string'&&/^(town|world):(17|22|23)$/.exec(value);
  return m?({17:'祁山',22:'五丈原',23:'郿城'})[m[2]]+(m[1]==='world'?'城外大地圖':''):null;
}
export const wugongRoadStocks=Object.freeze({...changanRoadStocks,
  23:Object.freeze({
    weapons:Object.freeze([9,29,37,43,56,61,71,82,96,102,107,114]),
    tools:Object.freeze([152,154,156,157,158,161,162,166,169,171,175,177,179,181]),
  }),
});
const expectedGeometry=[[0,11,8],[1,22,10],[3,3,13],[4,12,11],[9,21,14]];
const npcIds=[2,23,38,54];
const art=Object.freeze({
  city:'assets/chapter4-wuzhang/title-23.png',
  gathering:'assets/chapter5-section2-town/city23-facility1-canonical.png',
});
const pins=Object.freeze([
  ['assets/chapter5-section2-town/source.json',284756,'a52bb1573949f69de781ff5ec650619e1a799091c97d43c27a0f986d0fad01ff'],
  ['chapter5-section2-town-locale.tc.json',112535,'0ce7ffbc6ba875fda9f741550932c0b502dc1b75fc28ba1822ddf7d942f64271'],
  [art.gathering,48888,'f12ecb499a0e0e793420d4f5a87e37d7b1679a437108b38cc39770b5c2dd78e2'],
]);
const freeze=Object.freeze;
const still=asset=>freeze({asset,cleanScene:true,staticCheckpoint:true,nativeWidth:240,nativeHeight:160});
export async function loadWugongRoadTownData({fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  const read=async ([p,size,expected])=>{
    const response=await fetch('./'+p);
    if(!response.ok)throw new RangeError('Missing original Map38 component '+p);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const hash=bytes.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''):'';
    if(hash!==expected)throw new RangeError('Changed original Map38 component '+p);
    return bytes;
  };
  const [base,[sourceBytes,localeBytes]]=await Promise.all([loadChanganRoadTownData({fetch,subtle}),Promise.all(pins.map(read))]);
  const utf=new TextDecoder('utf-8',{fatal:true});
  const source=JSON.parse(utf.decode(sourceBytes)).commonTownServices,loc=JSON.parse(utf.decode(localeBytes));
  const city=source.cities.find(x=>x.id===23), gathering=source.commonFacilities.find(x=>x.city===23&&x.facility===1);
  if(source.root!==5||source.bank!==4||!same(city.facilities.map(x=>[x.kind,x.x,x.y]),expectedGeometry)||
     !same(gathering.npcs.map(x=>x.npcDefinition),npcIds)||
     !Object.entries(wugongRoadStocks[23]).every(([kind,rows])=>same(city.stocks[kind].itemDefinitionIds,rows)))
    throw new RangeError('Exact original Map38 city and residents required');
  const toPlace=x=>freeze({id:({0:'council',1:'gathering',3:'weapons',4:'tools',9:'exit'})[x.kind],
    labelJa:x.labelJa,kind:x.kind,sourcePosition:freeze({x:x.x,y:x.y})});
  const settlement=freeze({id:23,nameJa:'郿城',facilities:freeze(city.facilities.filter(r=>r.kind!==9).map(toPlace))});
  const exit=freeze({city:23,...toPlace(city.facilities.find(r=>r.kind===9))});
  const pageTranslations={},npcLabels={};
  const residents=gathering.npcs.map((n,sourceOrder)=>{
    const id='city23-facility1-npc-'+n.npcDefinition;
    const speaker=loc.commonLabels[n.speakerNameJa]??({2:'老人',23:'相士',38:'賣肉商',54:'鐵匠'})[n.npcDefinition];
    npcLabels[id]=speaker;
    const pages=n.pages.map(p=>{
      const localized=loc.byPageId[p.id],runs=loc.byPageRuns[p.id];
      if(typeof localized!=='string'||!Array.isArray(runs))throw new RangeError('Exact existing zh-Hant Map38 page required');
      pageTranslations[p.id]=freeze({textJa:localized,runs:freeze(runs),speakerNameJa:speaker});
      return freeze({textJa:p.textJa,runs:p.sourceRuns,speakerDefinition:null,speakerNameJa:n.speakerNameJa,sourcePageId:p.id});
    });
    return freeze({id,npcDefinition:n.npcDefinition,sourceOrder,speakerNameJa:n.speakerNameJa,speakerDefinition:null,pages:freeze(pages)});
  });
  const facilities=[...base.facilities,...settlement.facilities.map(p=>freeze({city:23,facility:p.kind,id:'city:23:facility:'+p.kind,
    npcs:freeze(p.kind===1?residents:[])}))];
  const scenes=freeze({...base.scenes,'city-23':still(art.city),'city-23-facility-1':still(art.gathering),
    'shop-city23-weapons':base.scenes['shop-city17-weapons'],'shop-city23-tools':base.scenes['shop-city17-tools']});
  const stocks=freeze({...base.stocks,'city23-weapons':wugongRoadStocks[23].weapons,'city23-tools':wugongRoadStocks[23].tools});
  const townData=freeze({...base,contentVersion:'rom-acf30794-root5-map38-bank4-city17-city22-city23',
    cities:freeze([...base.cities,settlement]),sourceExits:freeze([...base.sourceExits,exit]),
    facilities:freeze(facilities),scenes,stocks});
  dataOwner.add(townData);
  return freeze({townData,pageTranslations:freeze(pageTranslations),npcLabels:freeze(npcLabels)});
}
function open({origin,campaign,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!scope.has(origin)||!dataOwner.has(townData)||!same(campaign?.persistentState?.cityAvailabilityBytes,maskFor(origin.chapterId)))
    throw new RangeError('Only original Map38 city mask and issued shared profile allowed');
  const shops=cities.flatMap(city=>Object.keys(wugongRoadStocks[city]).map(kind=>{
    const weapons=kind==='weapons';
    return freeze({city,kind,facility:weapons?3:4,stockKey:'city'+city+'-'+kind,sceneKey:'shop-city'+city+'-'+kind,
      speakerDefinition:null,speakerNameJa:weapons?'武器屋':'道具屋',nativeActorDefinition:weapons?1021:1022});
  }));
  const context=contexts[origin.chapterId];
  const profile=freeze({id:origin.chapterId===aftermath?'changan-return-exterior':origin.chapterId===selection?'changan-siege-exterior':'wugong-road-exterior',context,cityIds:cities,initialCity:23,bgmId:origin.bgmId,
    hintsJa:freeze(['郿城']),facilityRoutes:freeze([freeze({city:23,facility:0,event:origin.site==='outdoor'?'exit:1':'origin'})]),shops:freeze(shops)});
  profileOwner.add(profile);
  const carry=structuredClone({targetContext:context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!same(value,carry))throw new RangeError('Cannot replace original Map38 carry');
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
export const createWugongRoadTownSession=options=>createDetachedTownSession(open,options,cities);
export function checkWugongRoadTrade(entry,chapterId){
  const a=entry?.action, keys=a&&Object.keys(a).sort().join(',');
  const owner=n=>n===null||uint(n,511);
  let valid=!!site(entry?.cursor,chapterId)&&uint(a?.itemSlotId,254);
  if(a?.type==='buy')valid=valid&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&cities.includes(a.cityId)&&
    ['weapons','tools'].includes(a.shop)&&wugongRoadStocks[a.cityId][a.shop]?.includes(a.itemSlotId)===true&&owner(a.targetDefinitionIndex);
  else if(a?.type==='sell')valid=valid&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&
    owner(a.ownerDefinitionIndex)&&(a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  else valid=false;
  if(!valid)throw new RangeError('Invalid native Map38 trade journal entry');
  return a;
}
export function replayWugongRoadTrade(entry,campaign,itemServicesFactory,chapterId=chapter){
  const action=checkWugongRoadTrade(entry,chapterId);
  if(!same(campaign?.persistentState?.cityAvailabilityBytes,maskFor(chapterId)))throw new RangeError('Only native three-city travel scope');
  const service=itemServicesFactory(campaign);
  const result=service.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||service.validatePersistentState(result.persistentState)===false||
    (result.rngState??campaign.rngState)!==campaign.rngState)
    throw new RangeError('Native Map38 transaction requires unchanged RNG');
  return {...campaign,persistentState:result.persistentState};
}
