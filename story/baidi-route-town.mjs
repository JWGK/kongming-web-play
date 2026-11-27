import {loadFinaleBaxiPalaceData,finaleBaxiPalaceStocks} from './finale-baxi-palace.mjs?v=0.73.97-finale-baxi';
import {createDetachedTownSession} from './settled-town-session.mjs?v=0.73.90-wei-river-towns';

const freeze=Object.freeze,same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const dataOwners=new WeakSet(),profiles=new WeakSet(),origins=new WeakSet();
const context=freeze({root:5,section:1,block:9});
const cities=freeze([7,25]);
const mask=freeze([1,0,0,64,0,0,0,0]); // Original opcode32 @ 0x1d3fd2.
const residents=freeze([13,21,28,35,42,45,55,61]);
const files=freeze({
  city:['assets/chapter5-baidi-departure/title25.png',36465,'ea207fdb6b03f03f890dc08b7f88fddab6900eefdac4371dfc4fb5fde6e01ec1'],
  gathering:['assets/chapter5-baidi-departure/baxi-1-bank4.png',50109,'cedc49bb4f1b33b133934ff607f9c8ffc5dbd7b16d25048a8b7ec90c62712c37'],
  text:['assets/chapter5-baidi-departure/baxi-bank4-town.tc.json',6325,'6ae6b1f0b6c3181ea9b931f4eb8e13e48de68a4a4d5ee426aaed1f37056c6acb'],
  hall:['assets/map12-story/scene-7c361ad5557e41063e51.png',43898,'e4fae0912a88e35e2819bb2b840860b0abd88cc9a365f14de81dadef854f95da'],
});
export const baidiRouteStocks=freeze({
  7:finaleBaxiPalaceStocks,
  25:freeze({tools:freeze([132,138,144,147,149,156,161,162,165,166])}), // Native 0x2a698 → row 0x8842e.
});
const staticRoom=asset=>freeze({asset,cleanScene:true,staticCheckpoint:true,nativeWidth:240,nativeHeight:160});
function checkCampaign(c){
  return same(c?.targetContext,context)&&same(c?.persistentState?.cityAvailabilityBytes,mask)&&(c?.sceneFlagBytes?.[23]&2)===2;
}
export const baidiVettedSites=freeze(['5:1:9:1:0','5:1:9:2:0']);
export function baidiRouteTownOrigin({view,campaign}={}){
  const cursor=view?.sourceCursor?.join(':');
  const location=baidiVettedSites.indexOf(cursor);
  if(location<0||view?.coreStage!=='hub'||view.chapterId!=='chapter5-baxi-return'||
    view.sourceChapterId!=='chapter5-baidi-departure'||view.room?.currentCity!==25||
    view.room.inputEnabled!==true||view.room.sceneMode!==(location===0?25:8192)||
    !Number.isInteger(view.room.bgmId)||view.room.bgmId<0||view.room.bgmId>255||!checkCampaign(campaign))return null;
  const origin=freeze({city:25,cursor,location,bgmId:view.room.bgmId});
  origins.add(origin);
  return origin;
}
export const isBaidiRouteTownProfile=profile=>profiles.has(profile);
export async function loadBaidiRouteTownData({fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}){
  async function read([path,size,expected]){
    const response=await fetch('./'+path);
    if(!response.ok)throw new RangeError('Missing original Ba Xi component '+path);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const sha=bytes.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''):'';
    if(sha!==expected)throw new RangeError('Changed original Ba Xi component '+path);
    return bytes;
  }
  const [earlier,[raw]]=await Promise.all([loadFinaleBaxiPalaceData({fetch,subtle}),
    Promise.all([files.text,files.city,files.gathering,files.hall].map(read))]);
  const bank=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(bank.version!==1||bank.city!==25||bank.facility!==1||bank.sourceBank!==4||
    !same(bank.npcs.map(n=>n.npcDefinition),residents))throw new RangeError('Exact Chapter 5 Ba Xi residents required');
  const pageTranslations={...earlier.pageTranslations},npcLabels={...earlier.npcLabels};
  const npcs=bank.npcs.map((n,sourceOrder)=>{
    const id='city25-facility1-npc-'+n.npcDefinition;
    npcLabels[id]=n.speakerNameZhHant;
    const pages=n.pages.map(p=>{
      pageTranslations[p.id]=freeze({textJa:p.textZhHant,runs:freeze(p.runsZhHant),speakerNameJa:n.speakerNameZhHant});
      return freeze({textJa:p.textJa,runs:freeze(p.sourceRuns),speakerDefinition:null,speakerNameJa:n.speakerNameJa,sourcePageId:p.id});
    });
    return freeze({id,sourceOrder,npcDefinition:n.npcDefinition,speakerNameJa:n.speakerNameJa,speakerDefinition:null,pages:freeze(pages)});
  });
  // Only these three buildings occur in original city 25; no armory,
  // tavern or villa exists here. Chengdu already uses its genuine layout.
  const place=(id,kind,labelJa,x,y)=>freeze({id,kind,labelJa,sourcePosition:freeze({x,y})});
  const baxi=freeze({id:25,nameJa:'巴西',facilities:freeze([
    place('hall',0,'議事廳',15,8),place('gathering',1,'集會所',15,12),place('tools',4,'道具店',4,9)
  ])});
  const base=earlier.townData;
  const townData=freeze({...base,contentVersion:'rom-acf30794-root5-baidi-route-bank4-chengdu-baxi',
    cities:freeze([...base.cities,baxi]),sourceExits:freeze([...base.sourceExits,freeze({city:25,...place('city-exit',9,'城門',6,14)})]),
    facilities:freeze([...base.facilities,...baxi.facilities.map(({kind})=>freeze({city:25,facility:kind,id:'city:25:facility:'+kind,
      npcs:freeze(kind===1?npcs:[])}))]),
    scenes:freeze({...base.scenes,'city-25':staticRoom(files.city[0]),'city-25-facility-0':staticRoom(files.hall[0]),
      'city-25-facility-1':staticRoom(files.gathering[0]),'shop-city25-tools':base.scenes['shop-city7-tools']}),
    stocks:freeze({...base.stocks,'city25-tools':baidiRouteStocks[25].tools}),
  });
  dataOwners.add(townData);
  return freeze({townData,pageTranslations:freeze(pageTranslations),npcLabels:freeze(npcLabels)});
}
function open({origin,campaign,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!origins.has(origin)||!dataOwners.has(townData)||!checkCampaign(campaign))throw new RangeError('Exact original Baidi route town scope required');
  const shops=cities.flatMap(city=>Object.keys(baidiRouteStocks[city]).map(kind=>{
    const weapon=kind==='weapons';
    return freeze({city,kind,facility:weapon?3:4,stockKey:'city'+city+'-'+kind,sceneKey:'shop-city'+city+'-'+kind,
      speakerDefinition:null,speakerNameJa:weapon?'武器屋':'道具屋',nativeActorDefinition:weapon?1021:1022});
  }));
  const profile=freeze({id:'original-baidi-route-baxi',context,cityIds:cities,initialCity:25,bgmId:origin.bgmId,hintsJa:freeze(['巴西']),
    facilityRoutes:freeze([freeze({city:25,facility:0,event:origin.location===0?'baixi-council':'origin'})]),shops:freeze(shops)});
  profiles.add(profile);
  const carry=structuredClone({targetContext:context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,lifespan:campaign.lifespan,
    sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!same(value,carry))throw new RangeError('Cannot replace the original Baidi route carry');
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
export const createBaidiRouteTownSession=options=>createDetachedTownSession(open,options,cities);

export function checkBaidiRouteTrade(entry){
  const a=entry?.action,keys=a&&Object.keys(a).sort().join(',');
  const uint=(n,limit)=>Number.isSafeInteger(n)&&!Object.is(n,-0)&&n>=0&&n<=limit;
  const owner=n=>n===null||uint(n,511);
  let ok=Array.isArray(entry?.cursor)&&entry.cursor.every(n=>uint(n,255))&&
    baidiVettedSites.includes(entry.cursor.join(':'))&&uint(a?.itemSlotId,254);
  if(a?.type==='buy')
    ok=ok&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&cities.includes(a.cityId)&&owner(a.targetDefinitionIndex)&&
      ['weapons','tools'].includes(a.shop)&&baidiRouteStocks[a.cityId][a.shop]?.includes(a.itemSlotId)===true;
  else if(a?.type==='sell')
    ok=ok&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&owner(a.ownerDefinitionIndex)&&
      (a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  else ok=false;
  if(!ok)throw new RangeError('Invalid original Baidi-route town trade');
  return a;
}
export function replayBaidiRouteTrade(entry,campaign,itemServicesFactory){
  const action=checkBaidiRouteTrade(entry);
  if(!checkCampaign(campaign))throw new RangeError('Exact source Ba Xi / Chengdu scope required for trade');
  const adapter=itemServicesFactory(campaign);
  const result=adapter.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||adapter.validatePersistentState(result.persistentState)===false||
    (result.rngState??campaign.rngState)!==campaign.rngState)throw new RangeError('Chengdu / Ba Xi trade must replay without changing campaign RNG');
  return {...campaign,persistentState:result.persistentState};
}
