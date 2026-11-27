import {createDetachedTownSession} from "./settled-town-session.mjs?v=0.73.90-wei-river-towns";
// Original Chengdu in the alternate lead-up to Map40. On free activity,
// script 5:1:6 permits only city 7 and uses chapter 5 common text bank 4.
const root = 'chapter5-kongming-return';
const key = '5:1:6:3:0';
const local = new WeakSet();
const issuedData = new WeakSet();
const mask = [1,0,0,0,0,0,0,0];
const eq = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const freeze = Object.freeze;
const sourcePositions = [[0,3,9],[1,3,14],[2,13,13],[3,9,11],[4,19,9],[5,11,7],[6,20,6],[9,23,14]];
const residents = {
  1:[1,5,7,15,17,21,27,32,53,56,57,71],
  2:[9,18,23,24,36,48,54,62],
};
export const finaleBaxiPalaceStocks=freeze({
  weapons:freeze([23,17,13,33,35,38,41,66,75,81,88,93,99]),
  tools:freeze([164,175,186,187,188,189,190,191,192,193]),
});
const assets=freeze({
  early:['assets/campaign-story/wuxifeng-town.json',25076,'ee2cb698472feee91f0100db3ab553e1749397029278329f4e804dbbf863098a'],
  source:['assets/chapter5-section2-town/source.json',284756,'a52bb1573949f69de781ff5ec650619e1a799091c97d43c27a0f986d0fad01ff'],
  locale:['chapter5-section2-town-locale.tc.json',112535,'0ce7ffbc6ba875fda9f741550932c0b502dc1b75fc28ba1822ddf7d942f64271'],
  1:['assets/chapter5-section2-town/city7-facility1-canonical.png',50825,'11d692c0fa90bb9139924d5865242f2d718606659870d8fd4b47a45e4e1b01a0'],
  2:['assets/chapter5-section2-town/city7-facility2-canonical.png',68871,'6a407ac09c55427c40c38d7b73585ed4d040b5276c1bfe6101f7bba29311aec9'],
});
export const isFinaleBaxiPalaceCursor=(chapter,cursor)=>chapter===root &&
  Array.isArray(cursor) && cursor.length===5 && cursor.every(n=>Number.isSafeInteger(n)&&!Object.is(n,-0)) &&
  cursor.join(':')===key;
export function finaleBaxiPalaceOrigin({chapterId,cursor,stage,room,campaign}={}) {
  if(!isFinaleBaxiPalaceCursor(chapterId,cursor) || stage!=='hub' || room?.currentCity!==7 ||
     room.sceneMode!==8197 || room.inputEnabled!==true || !Number.isInteger(room.bgmId) ||
     room.bgmId<0 || room.bgmId>255 || !eq(campaign?.persistentState?.cityAvailabilityBytes,mask) ||
     (campaign?.sceneFlagBytes?.[23]&2)!==2) return null;
  const origin=freeze({city:7,bgmId:room.bgmId,chapterId});
  local.add(origin);
  return origin;
}
export const isFinaleBaxiPalaceOrigin=value=>local.has(value);

export async function loadFinaleBaxiPalaceData({fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle}={}) {
  async function read([path,size,sha]) {
    const response=await fetch('./'+path);
    if(!response.ok)throw new RangeError('Missing authentic Chengdu asset: '+path);
    const b=new Uint8Array(await response.arrayBuffer());
    const hash=b.length===size?Array.from(new Uint8Array(await subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join(''):'';
    if(hash!==sha)throw new RangeError('Invalid authentic Chengdu asset: '+path);
    return b;
  }
  const raw=await Promise.all([assets.early,assets.source,assets.locale,assets[1],assets[2]].map(read));
  const decode=new TextDecoder('utf-8',{fatal:true});
  const [early,project,locale]=raw.slice(0,3).map(b=>JSON.parse(decode.decode(b)));
  const source=project.commonTownServices;
  const geometry=source.cities.find(r=>r.id===7);
  const earlier=early.cities.find(r=>r.id===7);
  if(source.bank!==4 || source.root!==5 || !eq(geometry?.facilities.map(r=>[r.kind,r.x,r.y]),sourcePositions) ||
     !eq(earlier?.facilities.map(r=>r.kind),[0,1,2,3,4,5,6]) ||
     !Object.entries(finaleBaxiPalaceStocks).every(([kind,rows])=>
       eq(rows,geometry.stocks[kind].itemDefinitionIds)&&eq(rows,early.stocks['city7-'+kind])))
    throw new RangeError('Exact original Chengdu layout and stock required');
  const pageTranslations={},npcLabels={};
  const places=earlier.facilities.map((r,i)=>freeze({...r,sourcePosition:freeze({x:sourcePositions[i][1],y:sourcePositions[i][2]})}));
  const scenes={world:early.scenes.world,'city-7':early.scenes['city-7']};
  for(const [name,row] of Object.entries(early.scenes))
    if(name.startsWith('city-7-facility-')||name.startsWith('shop-city7-')) scenes[name]=row;
  const facilities=places.map(({kind})=>{
    const stage=source.commonFacilities.find(r=>r.city===7&&r.facility===kind);
    if(residents[kind] && !eq(stage?.npcs.map(n=>n.npcDefinition),residents[kind]))
      throw new RangeError('Exact chapter 5 Chengdu residents required');
    const npcs=(residents[kind]?stage.npcs:[]).map((npc,sourceOrder)=>{
      const id='city7-facility'+kind+'-npc-'+npc.npcDefinition;
      const speaker=locale.commonLabels[npc.speakerNameJa];
      if(typeof speaker!=='string')throw new RangeError('Missing chapter 5 resident locale: '+id);
      npcLabels[id]=speaker;
      const pages=npc.pages.map(page=>{
        const text=locale.byPageId[page.id],runs=locale.byPageRuns[page.id];
        if(typeof text!=='string'||!Array.isArray(runs))throw new RangeError('Missing chapter 5 resident dialogue: '+page.id);
        pageTranslations[page.id]=freeze({textJa:text,runs:freeze(runs),speakerNameJa:speaker});
        return freeze({textJa:page.textJa,runs:page.sourceRuns,speakerDefinition:null,speakerNameJa:npc.speakerNameJa,sourcePageId:page.id});
      });
      return freeze({id,sourceOrder,speakerDefinition:null,npcDefinition:npc.npcDefinition,speakerNameJa:npc.speakerNameJa,pages:freeze(pages)});
    });
    if(residents[kind])scenes['city-7-facility-'+kind]=freeze({asset:assets[kind][0],staticCheckpoint:true,cleanScene:true,nativeWidth:240,nativeHeight:160});
    return freeze({city:7,facility:kind,id:'city:7:facility:'+kind,npcs:freeze(npcs)});
  });
  const townData=freeze({...early,contentVersion:'rom-acf30794-root5-map40-bank4-chengdu',sourceTextBank:4,scenes:freeze(scenes),
    cities:freeze([freeze({...earlier,facilities:freeze(places)})]),facilities:freeze(facilities),
    sourceExits:freeze([freeze({city:7,id:'city-exit',labelJa:'城門',kind:9,sourcePosition:freeze({x:23,y:14})})]),
    stocks:freeze({'city7-weapons':finaleBaxiPalaceStocks.weapons,'city7-tools':finaleBaxiPalaceStocks.tools}),
  });
  issuedData.add(townData);
  return freeze({townData,pageTranslations:freeze(pageTranslations),npcLabels:freeze(npcLabels)});
}


export function checkFinaleBaxiPalaceTrade(entry,chapter) {
  const a=entry?.action, keys=a&&Object.keys(a).sort().join(',');
  const uint=(value,max)=>Number.isSafeInteger(value)&&!Object.is(value,-0)&&value>=0&&value<=max;
  const owner=value=>value===null||uint(value,511);
  let ok=isFinaleBaxiPalaceCursor(chapter,entry?.cursor)&&uint(a?.itemSlotId,254);
  if(a?.type==='buy'){
    ok=ok&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&a.cityId===7&&owner(a.targetDefinitionIndex)&&
      ['weapons','tools'].includes(a.shop)&&finaleBaxiPalaceStocks[a.shop].includes(a.itemSlotId);
  }else if(a?.type==='sell'){
    ok=ok&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&owner(a.ownerDefinitionIndex)&&
      (a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  }else ok=false;
  if(!ok)throw new RangeError('Invalid native Map40 Chengdu trade');
  return a;
}
export function replayFinaleBaxiPalaceTrade(entry,campaign,itemServicesFactory) {
  const action=checkFinaleBaxiPalaceTrade(entry,root);
  if(!eq(campaign?.persistentState?.cityAvailabilityBytes,mask)||(campaign?.sceneFlagBytes?.[23]&2)!==2)
    throw new RangeError('Only the native Map40 palace can replay this operation');
  const service=itemServicesFactory(campaign);
  const result=service.operate({persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState});
  if(result?.applied!==true||!result.persistentState||service.validatePersistentState(result.persistentState)===false||
     (result.rngState??campaign.rngState)!==campaign.rngState)
    throw new RangeError('Native Map40 Chengdu trade must replay without an RNG change');
  return {...campaign,persistentState:result.persistentState};
}

// A visit does not run another palace story event. The handback returns
// to the exact source checkpoint that granted the exterior visit.
const profiles=new WeakSet();
const context=freeze({root:5,section:1,block:6});
export const isFinaleBaxiPalaceTownProfile=profile=>profiles.has(profile);
export const isFinaleBaxiPalaceVisit=(visit,chapter,cursor)=>
  isFinaleBaxiPalaceCursor(chapter,cursor)&&['town','world'].includes(visit);

function openPalaceExterior({origin,campaign,townData,sharedFactory,itemServicesFactory,readSave,request,route,observeOperation}={}){
  if(!local.has(origin)||!issuedData.has(townData)||!eq(campaign?.persistentState?.cityAvailabilityBytes,mask)||
    (campaign?.sceneFlagBytes?.[23]&2)!==2||!eq(campaign.targetContext,context))
    throw new RangeError('Exact issued Map40 Chengdu scope required');
  const shops=freeze(Object.keys(finaleBaxiPalaceStocks).map(kind=>{
    const weapons=kind==='weapons';
    return freeze({city:7,kind,facility:weapons?3:4,stockKey:'city7-'+kind,sceneKey:'shop-city7-'+kind,
      speakerDefinition:null,speakerNameJa:weapons?'武器屋':'道具屋',nativeActorDefinition:weapons?1021:1022});
  }));
  const profile=freeze({id:'finale-baxi-chengdu-exterior',context,cityIds:freeze([7]),initialCity:7,bgmId:origin.bgmId,
    hintsJa:freeze(['成都']),facilityRoutes:freeze([freeze({city:7,facility:5,event:'origin'})]),shops});
  profiles.add(profile);
  const carry=structuredClone({targetContext:context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,persistentState:campaign.persistentState});
  const engine=sharedFactory({data:townData,profile,validateCarry(value){
    if(!eq(value,carry))throw new RangeError('Cannot mutate the original Map40 carry');
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
export const createFinaleBaxiPalaceSession=options=>createDetachedTownSession(openPalaceExterior,options,7);
