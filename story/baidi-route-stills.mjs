import {baidiRouteFrames as frames} from './baidi-route-still-frames.mjs?v=0.73.98-baidi-route';
const chapter='chapter5-baxi-return',aftermath='chapter5-baidi-return',version='chapter5-baxi-return-presentation/1';
const accepts=(id,c)=>c?.[2]===12?id===aftermath:id===chapter;
const decoded=new Map();
export const baidiRouteCursor=c=>Array.isArray(c)&&c.length===5&&c[0]===5&&c[1]===1&&
  (c[2]===8&&c[3]>=2||c[2]===9||c[2]===12);
const captions=new Map([
  ['5:1:8:2:17',[0x1d3e50,9433,['建業　会議場','建業　議事廳'],'建業　議事廳']],
  ['5:1:9:0:4',[0x1d401c,11072,['巴西'],'巴西']],
  ['5:1:9:1:8',[0x1d4048,11093,['巴西　会議場','巴西　議事廳'],'巴西　議事廳']],
  ['5:1:12:2:3',[0x1d4e8c,15950,['江陵'],'江陵']],
]);
export function baidiRouteCaption(recipe){
  if(!baidiRouteCursor(recipe?.sourceCursor)||recipe.version!==(recipe.sourceCursor[2]===12?aftermath+'-presentation/1':version)||recipe.opcode!==11||recipe.kind!=='caption')return null;
  const row=captions.get(recipe.sourceCursor.join(':'));
  if(!row||recipe.sourceOffset!==row[0]||!row[2].includes(recipe.afterRoom?.caption))return null;
  return recipe.details?.reference===row[1]||recipe.details?.textJa===recipe.afterRoom.caption?row[3]:null;
}
export function baidiRouteDialogue(view){
  if(!accepts(view?.chapterId,view?.sourceCursor)||view.coreStage!=='presentation'||view.dialogue)return null;
  const textJa=baidiRouteCaption(view.presentation);
  return textJa?{textJa,speakerDefinition:null}:null;
}
export function baidiRoutePicture(view){
  const cursor=view?.sourceCursor,room=view?.room;
  if(!accepts(view?.chapterId,cursor)||!room||!baidiRouteCursor(cursor)||room.sceneMode===4096&&room.inputEnabled===true)return null;
  const asset=frames[JSON.stringify([cursor,room.currentCity,room.sceneMode,view.presentation?.kind??null])];
  return asset?{asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}
export function prepareBaidiRoutePictures(segment="inbound"){
  if(!["inbound","aftermath"].includes(segment))throw new RangeError("Unknown Baidi image segment");
  if(typeof Image!=='function')return Promise.resolve();
  return Promise.all([...new Set(Object.entries(frames).filter(([key])=>key.startsWith("[[5,1,12,")===(segment==="aftermath")).map(([,asset])=>asset))].map(asset=>{
    if(!decoded.has(asset)){
      const image=new Image();image.src=new URL('../'+asset,import.meta.url).href;
      const verify=image.decode().then(()=>{
        if(image.naturalWidth!==240||image.naturalHeight!==160)throw new RangeError('Invalid original Baidi image');
        return image;
      }).catch(error=>{decoded.delete(asset);throw error;});
      decoded.set(asset,verify);
    }
    return decoded.get(asset);
  }));
}
