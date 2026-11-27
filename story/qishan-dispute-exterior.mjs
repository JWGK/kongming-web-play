import {createDetachedTownSession} from "./settled-town-session.mjs?v=0.73.90-wei-river-towns";

// Original 4:1:0/1, Chengdu city 7. Source: ROM town hotspot table
// 0x873c0 + city*40 and room table 0x884e0 + city*27. 0x2cd46
// (finished room exit) falls back to the same city's exterior for
// selector 0xfe when no matching story event overrides it.
const city7Facilities = Object.freeze([
  ['hall',       0, '議事廳',  3,  9, 0x1d],
  ['gathering',  1, '集會所',  3, 14, 0x2f],
  ['tavern',     2, '酒館',   13, 13, 0x32],
  ['weapons',    3, '武器店',  9, 11, 0x33],
  ['tools',      4, '道具店', 19,  9, 0x35],
  ['palace',     5, '宮殿',   11,  7, 0x2c],
  ['residence',  6, '諸葛宅邸',20,  6, 0x37],
  ['city-exit',  9, '城門',   23, 14, null],
].map(([id, kind, label, x, y, roomByte]) => Object.freeze({id,kind,label,x,y,roomByte})));

const origins=new WeakMap();
const profiles=new WeakSet();
const arrivals = new Map([
  ['4:1:0:3:0', 0x2005],  // palace, after input release 0x1afb55
  ['4:1:1:1:0', 0x2006],  // residence, after input release 0x1afc4a
  ['4:1:1:9:0', 0x2006],  // later residence, after input release 0x1afce8
]);

// This binds the specific open story rooms. The no-exit city-42 camp and
// locked presentation records must never acquire a generic travel menu.
export function qishanDisputeExteriorOrigin({chapterId, cursor, stage, room}={}) {
  if (chapterId!=='qishan-dispute-source'||stage!=='hub'||room?.inputEnabled!==true||room.currentCity!==7) return null;
  if (!Array.isArray(cursor)||cursor.length!==5||!cursor.every(n=>Number.isSafeInteger(n)&&!Object.is(n,-0))) return null;
  const mode=arrivals.get(cursor.join(':'));
  if(mode===undefined||mode!==room.sceneMode)return null;
  const origin=Object.freeze({city:7,mode:0,facilities:city7Facilities});
  origins.set(origin,Object.freeze({cursor:Object.freeze([...cursor]),mode}));
  return origin;
}

// Pass the active source menu, not the chapter's other records. In block 1
// the hall entry becomes story progression only at its original later hub.
export function qishanDisputeFacilityHook(origin, facility, activeOptions) {
  if(!origins.has(origin)||!Array.isArray(activeOptions))return null;
  const id=facility==='residence'?'exit:8':facility==='hall'?'exit:11':null;
  return id!==null&&activeOptions.some(row=>row.id===id&&row.enabled===true)?id:null;
}

// Both lists are the actual 15-byte city 7 stock rows read by native 0x2a698
// (0xff padding omitted). Keep display slots and authority for purchases tied.
const stocks=Object.freeze({
  weapons:Object.freeze([23,17,13,33,35,38,41,66,75,81,88,93,99]),
  tools:Object.freeze([164,175,186,187,188,189,190,191,192,193]),
});
const originalStillKeys=Object.freeze({
  exterior:'city-7',
  hall:'city-7-facility-0',
  weapons:'shop-city7-weapons',
  tools:'shop-city7-tools',
  palace:'city-7-facility-5',
  residence:'city-7-facility-6',
  cityExit:'city-7-facility-9',
});
// Resolve the three published duplicate PNGs to the same delivery paths
// already used by the campaign asset-alias table.
const originalStillDelivery=Object.freeze({
  'assets/map8-story/scene-175b6d57875fc985f85f.png':'assets/map12-story/scene-175b6d57875fc985f85f.png',
  'assets/map2-story/jiangxia-tools.png':'assets/map12-story/scene-fc9c9cd4da79f0f362b8.png',
  'assets/map2-story/world-background.png':'assets/map12-story/scene-c8c9278de0d78538d7f6.png',
});
export function bindQishanDisputeCityAssets(townData, fengmingMedia) {
  const city=townData?.cities?.find(c=>c.id===7);
  if(!city||cityDataMismatch(city,townData))throw new TypeError('Exact native Chengdu facility project');
  const stills=Object.freeze(Object.fromEntries(Object.entries(originalStillKeys).map(([where,key])=>{
    const row=fengmingMedia?.scenes?.[fengmingMedia?.townScenes?.[key]];
    if(typeof row?.asset!=='string'||!/^assets\/[a-z0-9/._-]+\.png$/.test(row.asset)||
       !/^[0-9a-f]{64}$/.test(row.sha256)||row.width!==240||row.height!==160||
       row.presentation!=='canonical-static-original-art'||
       row.containsDialogueText!==false||row.containsDialoguePortrait!==false)throw new TypeError('Exact native fixed Chengdu art');
    return [where,Object.freeze({asset:originalStillDelivery[row.asset]??row.asset,sha256:row.sha256,bytes:row.bytes})];
  })));
  return Object.freeze({stills,stocks});
}
function cityDataMismatch(city,townData) {
  if(city.facilities?.length!==7)return true;
  for(const f of city7Facilities){
    const d=f.kind===9?townData.sourceExits?.find(r=>r.city===7&&r.kind===9):city.facilities.find(r=>r.kind===f.kind);
    if(!d||d.sourcePosition?.x!==f.x||d.sourcePosition?.y!==f.y)return true;
  }
  return Object.entries(stocks).some(([kind,wanted])=>{
    const got=townData.stocks?.['city7-'+kind];
    return !Array.isArray(got)||got.length!==wanted.length||got.some((id,i)=>id!==wanted[i]);
  });
}


// The shared Chapter 1–3 explorer remains the owner of navigation, shops,
// facilities and menu behavior. The Map32 profile only supplies origin,
// scope and event handbacks to the story reducer; it does not replicate UI.
export function qishanDisputeSharedTownProfile(origin, {activeOptions=[], hintJa, bgmId}={}) {
  const pinned=origins.get(origin);
  if(!pinned||!Array.isArray(activeOptions)||typeof hintJa!=='string'||!hintJa||
    !Number.isSafeInteger(bgmId)||bgmId<0||bgmId>255)throw new TypeError('Exact Map32 exterior origin');
  const facilityRoutes=[];
  const add=(facility,event)=>facilityRoutes.push(Object.freeze({city:7,facility,event}));
  if(pinned.mode===0x2005)add(5,'origin');
  if(pinned.mode===0x2006)add(6,'origin');
  const home=qishanDisputeFacilityHook(origin,'residence',activeOptions);
  const hall=qishanDisputeFacilityHook(origin,'hall',activeOptions);
  if(home&&pinned.mode!==0x2006)add(6,home);
  if(hall)add(0,hall);
  const profile=Object.freeze({
    id:'qishan-dispute-chengdu-'+pinned.cursor.join('-'),
    context:Object.freeze({root:4,section:1,block:pinned.cursor[2]}),
    cityIds:Object.freeze([7]),initialCity:7,bgmId,hintsJa:Object.freeze([hintJa]),
    facilityRoutes:Object.freeze(facilityRoutes),
    shops:Object.freeze([
      Object.freeze({city:7,facility:3,kind:'weapons',stockKey:'city7-weapons',sceneKey:'shop-city7-weapons',
       speakerDefinition:null,speakerNameJa:'武器屋',nativeActorDefinition:1021}),
      Object.freeze({city:7,facility:4,kind:'tools',stockKey:'city7-tools',sceneKey:'shop-city7-tools',
       speakerDefinition:null,speakerNameJa:'道具屋',nativeActorDefinition:1022}),
    ]),
  });
  profiles.add(profile);
  return profile;
}
export const isQishanDisputeSharedTownProfile=profile=>profiles.has(profile);

// No menu, transaction, text, or arbitrary room snapshot belongs in a
// physical record. Chapter 3 only opens the common menu at city/world.
const savedVisits=Object.freeze(['town','world']);
export function isQishanDisputeTownVisit(visit,chapter,cursor){
  return chapter==='qishan-dispute-source'&&savedVisits.includes(visit)&&Array.isArray(cursor)&&
    cursor.length===5&&cursor.every(n=>Number.isSafeInteger(n)&&!Object.is(n,-0))&&arrivals.has(cursor.join(':'));
}

// Map32 adapter. This deliberately delegates every action to the same
// controller and item services used by Chapter 3, not a second shop/menu.
export function openQishanDisputeTown({
  origin, activeOptions, hintJa, bgmId, campaign, townData, assets,
  sharedFactory, itemServicesFactory, readSave, request, route, observeOperation,
}={}) {
  const profile=qishanDisputeSharedTownProfile(origin,{activeOptions,hintJa,bgmId});
  if(typeof sharedFactory!=='function'||typeof itemServicesFactory!=='function'||typeof route!=='function'||
      !assets||assets.stocks!==stocks||!campaign?.persistentState)throw new TypeError('Exact native town bridge required');
  // Native command 32 at 0x1afa2e clears every city but Chengdu before
  // any of the admitted free-activity points. The mask uses MSB-first IDs.
  const mask=campaign.persistentState.cityAvailabilityBytes;
  if(!Array.isArray(mask)||mask.length!==8||mask.some((value,index)=>value!==(index===0?1:0)))
    throw new RangeError('Only the source Chengdu travel mask is admitted');
  const carry=structuredClone({
    targetContext:profile.context,initialSeed:campaign.initialSeed,rngState:campaign.rngState,
    lifespan:campaign.lifespan,sceneFlagBytes:campaign.sceneFlagBytes,decisions:campaign.decisions,
    persistentState:campaign.persistentState,
  });
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const engine=sharedFactory({
    data:townData,profile,validateCarry(value){
      if(!equal(value,carry))throw new RangeError('Town bridge cannot replace the source carry');
    },
    itemServicesFactory(value) {
      const adapter=itemServicesFactory(value);
      if(typeof observer!=='function')return adapter;
      return Object.freeze({...adapter,operate(input) {
        const result=adapter.operate(input);
        if(result.applied===true)observer(structuredClone(input.action),result);
        return result;
      }});
    },
    getSave:readSave,
    onRequest:request,
    onEnterFacility(next,event){return route(event,next);},
  });
  const observer=observeOperation;
  engine.start(carry);
  return engine;
}

// Retain the same local source scope and controller view for Map32.
export function createQishanDisputeTownSession(options) {
  return createDetachedTownSession(openQishanDisputeTown,options,7);
}

// Stage-local loader: these are the original Chapter 3 production inputs,
// already published. Never attach them to the title loader.
const townInputs=Object.freeze({
  baseTown:Object.freeze(['assets/campaign-story/taohuashui-town.json',24112,'af94e05a4bcec551f2588f5570180380a337ae539a2af7e64d8df6306f84a989']),
  townDelta:Object.freeze(['assets/campaign-story/fengming-town.delta.json',26055,'6900f703f8a11ad2e52189a3b15c35c8d236c87a4ad409bca7514678299547f1']),
  manifest:Object.freeze(['assets/fengming-story/manifest.json',226252,'12d54c9e2c28eeeb81c0f0180aabef2eee8b953a6bb2b61fbe2d0c00b6c459bf']),
});
export async function loadQishanDisputeTownData({
  fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle,materialize,bindMedia,
}={}) {
  if(typeof fetch!=='function'||typeof subtle?.digest!=='function'||typeof materialize!=='function'||typeof bindMedia!=='function')
    throw new TypeError('Same Chapter 3 town data pipeline required');
  const read=async ([file,length,expected])=>{
    const response=await fetch('./'+file);
    if(!response.ok)throw new RangeError('Could not load Chengdu town data: '+file);
    const bytes=new Uint8Array(await response.arrayBuffer());
    if(bytes.length!==length)throw new RangeError('Changed Chengdu town data length: '+file);
    const digest=Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    if(digest!==expected)throw new RangeError('Changed Chengdu town data digest: '+file);
    return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  };
  const [baseTown,townDelta,manifest]=await Promise.all(Object.values(townInputs).map(read));
  const assets=bindQishanDisputeCityAssets(townDelta,manifest);
  const townData=materialize({baseTown,townDelta,townMedia:bindMedia(manifest)});
  return Object.freeze({townData,assets});
}

// Root 4 selects common-town bank 3 (ROM 0x6563a0 root table, bank
// base 0x12f5bc). The early controller is shared, not its earlier NPC data.
const bank3Assets=Object.freeze({
  'town-bank3.json':Object.freeze(['assets/qishan-dispute/chengdu-town-bank3.json',21124,'40dcb9494b5f0097e4dee4c2926c4ae1c14e6af615e3a7885f22e57e32ff7928']),
  '1-bank3.png':Object.freeze(['assets/qishan-dispute/chengdu-1-bank3.png',49474,'40f1ad5c6e347b9eb8ae0d1cd816b74c9246fa33196fe346a2b3ef7728b2fcfb']),
  '2-bank3.png':Object.freeze(['assets/qishan-dispute/chengdu-2-bank3.png',69746,'ec2b61de3467e94fcf82ff82fee37a95ec38ecffa950b018e85864f7806c0ee0']),
});
const roles=Object.freeze({
  1:Object.freeze([0,7,15,21,27,31,53,55,74]),
  2:Object.freeze([2,22,23,24,26,45,48,62]),
});
export async function loadQishanDisputeTownBank({
  fetch=globalThis.fetch,subtle=globalThis.crypto?.subtle,townData,
}={}) {
  if(typeof fetch!=='function'||typeof subtle?.digest!=='function'||!townData?.scenes||!Array.isArray(townData.facilities))
    throw new TypeError('Prepared common town and file transport required');
  const read=async ([path,length,sha])=>{
    const response=await fetch('./'+path);
    if(!response.ok)throw new RangeError('Missing Chengdu bank3 asset: '+path);
    const bytes=new Uint8Array(await response.arrayBuffer());
    const actual=bytes.length===length?Array.from(new Uint8Array(await subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join(''):'';
    if(actual!==sha)throw new RangeError('Changed Chengdu bank3 asset: '+path);
    return bytes;
  };
  const [bytes]=await Promise.all(Object.values(bank3Assets).map(read));
  const bank=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(bank.version!==1||bank.sourceBank!==3||bank.city!==7||Object.keys(bank.frames).length!==2)
    throw new RangeError('Expected root 4 Chengdu common bank');
  const facilities=[...townData.facilities];
  const scenes={...townData.scenes};
  const npcLabels={},pageTranslations={};
  for(const [number,wanted] of Object.entries(roles)){
    const facility=Number(number),key='city-7-facility-'+number;
    const index=facilities.findIndex(x=>x.city===7&&x.facility===facility);
    const frame=bank.frames[key],image=bank3Assets[number+'-bank3.png'];
    if(index<0||!scenes[key]||frame.facility!==facility||frame.asset!==image[0]||frame.sha256!==image[2]||
       frame.npcs.length!==wanted.length||frame.npcs.some((npc,i)=>npc.npcDefinition!==wanted[i]))
      throw new RangeError('Changed Chengdu bank3 room: '+key);
    scenes[key]=Object.freeze({...scenes[key],asset:frame.asset,nativeWidth:240,nativeHeight:160,cleanScene:true,staticCheckpoint:true});
    for(const npc of frame.npcs){
      npcLabels[npc.id]=npc.speakerNameZhHant;
      for(const page of npc.pages){
        pageTranslations[page.sourcePageId]=Object.freeze({
          textJa:page.textZhHant,runs:page.runsZhHant,speakerNameJa:npc.speakerNameZhHant,
        });
      }
    }
    facilities[index]=Object.freeze({...facilities[index],npcs:frame.npcs});
  }
  return Object.freeze({townData:Object.freeze({...townData,facilities,scenes}),
    npcLabels:Object.freeze(npcLabels),pageTranslations:Object.freeze(pageTranslations)});
}

// New trade entries can replay only at the exact Chengdu exterior's owning
// story point. The real shared item service re-checks stock, owner, price,
// inventory capacity and all native persistent data at every replay.
export function isQishanDisputeTrade(action) {
  return action?.type==='buy'||action?.type==='sell';
}
export function checkQishanDisputeTrade(entry, chapter) {
  const a=entry?.action;
  const uint=(x,max)=>Number.isSafeInteger(x)&&!Object.is(x,-0)&&x>=0&&x<=max;
  const keys=a&&Object.keys(a).sort().join(',');
  const owner=x=>x===null||uint(x,511);
  const slot=a?.itemSlotId;
  let valid=chapter==='qishan-dispute-source'&&Array.isArray(entry?.cursor)&&
    arrivals.has(entry.cursor.join(':'))&&entry.cursor.length===5&&entry.cursor.every(x=>uint(x,255))&&uint(slot,254);
  if(a?.type==='buy')valid=valid&&keys==='cityId,itemSlotId,shop,targetDefinitionIndex,type'&&
    a.cityId===7&&['weapons','tools'].includes(a.shop)&&stocks[a.shop].includes(slot)===true&&owner(a.targetDefinitionIndex);
  else if(a?.type==='sell')valid=valid&&keys==='inventoryIndex,itemSlotId,ownerDefinitionIndex,type'&&
    owner(a.ownerDefinitionIndex)&&(a.ownerDefinitionIndex===null?a.inventoryIndex===null:uint(a.inventoryIndex,12));
  else valid=false;
  if(!valid)throw new RangeError('Invalid native Chengdu trade journal entry');
  return a;
}

export function replayQishanDisputeTrade({entry,chapter,campaign,itemServicesFactory}) {
  const action=checkQishanDisputeTrade(entry,chapter);
  const services=itemServicesFactory(campaign);
  const input={persistentState:structuredClone(campaign.persistentState),action:structuredClone(action),rngState:campaign.rngState};
  const result=services.operate(input);
  if(result?.applied!==true||!result.persistentState||services.validatePersistentState(result.persistentState)===false)
    throw new RangeError('Recorded native Chengdu trade did not replay');
  const rngState=result.rngState??campaign.rngState;
  if(rngState!==campaign.rngState)throw new RangeError('Chengdu trade cannot advance gameplay RNG');
  return {...campaign,persistentState:result.persistentState};
}
