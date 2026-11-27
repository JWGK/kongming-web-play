import {jianningJianglingFrames} from "./jianning-jiangling-still-frames.mjs?v=0.73.99-jiangling-route";
import {jianglingAfterFrames} from "./jiangling-after-still-frames.mjs?v=0.73.99-jiangling-route";
import {jianglingFrames} from "./jiangling-still-frames.mjs?v=0.73.99-jiangling-route";
import {baidiRouteFrames as frames} from './baidi-route-still-frames.mjs?v=0.73.98-baidi-route';
const chapter='chapter5-baxi-return',aftermath='chapter5-baidi-return',version='chapter5-baxi-return-presentation/1';
const commonAfter="chapter5-jianning-after",commonCamp="chapter5-jiangling-continuation";
const jianningCommon=(id,c)=>[5,12].includes(c?.[2])&&id==="chapter5-jianning-return"||c?.[2]===12&&id==="chapter5-jianning-route";
const genericAfter=(id,c)=>c?.[2]===14&&id==="chapter5-jiangling-return";
const accepts=(id,c)=>genericAfter(id,c)||jianningCommon(id,c)||([12,14].includes(c?.[2])?id===aftermath:id===chapter);
const decoded=new Map();
export const baidiRouteCursor=c=>Array.isArray(c)&&c.length===5&&c[0]===5&&c[1]===1&&
  (c[2]===8&&c[3]>=2||c[2]===9||c[2]===12||c[2]===14&&[0,1].includes(c[3])&&c[4]<=17);
const captions=new Map([
  ['5:1:8:2:17',[0x1d3e50,9433,['建業　会議場','建業　議事廳'],'建業　議事廳']],
  ['5:1:9:0:4',[0x1d401c,11072,['巴西'],'巴西']],
  ['5:1:9:1:8',[0x1d4048,11093,['巴西　会議場','巴西　議事廳'],'巴西　議事廳']],
  ['5:1:12:2:3',[0x1d4e8c,15950,['江陵'],'江陵']],
  ['5:1:12:2:22',[0x1d4ef8,15955,['江陵　会議場','江陵　議事廳'],'江陵　議事廳']],
  ['5:1:12:3:9',[0x1d4fb5,16670,['白帝城　蜀軍幕舎','白帝城　蜀軍營帳'],'白帝城　蜀軍營帳']],
  ['5:1:14:1:4',[0x1d55fd,19936,['江陵'],'江陵']],
]);
export function baidiRouteCaption(recipe){
  const commonVersion=recipe?.sourceCursor?.[2]===12&&[commonAfter+"-presentation/1",commonCamp+"-presentation/1"].includes(recipe.version)||recipe?.sourceCursor?.[2]===14&&recipe.version==="chapter5-jiangling-return-presentation/1";
  if(!baidiRouteCursor(recipe?.sourceCursor)||!commonVersion&&recipe.version!==(recipe.sourceCursor[2]===14?'private-baidi-jiangling-return-presentation/1':recipe.sourceCursor[2]===12?(recipe.sourceCursor[3]>2||recipe.sourceCursor[3]===2&&recipe.sourceCursor[4]>=22?'chapter5-baidi-jiangling-continuation-presentation/1':aftermath+'-presentation/1'):version)||recipe.opcode!==11||recipe.kind!=='caption')return null;
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
  if(!accepts(view?.chapterId,cursor)||!room||!(baidiRouteCursor(cursor)||jianningCommon(view.chapterId,cursor)&&cursor.slice(0,3).join(":")==="5:1:5")||room.sceneMode===4096&&room.inputEnabled===true)return null;
  const key=JSON.stringify([cursor,room.currentCity,room.sceneMode,view.presentation?.kind??null]);
  const asset=genericAfter(view.chapterId,cursor)?jianglingAfterFrames[key]:jianningCommon(view.chapterId,cursor)?(jianningJianglingFrames[key]??frames[key]??jianglingFrames[key]):frames[key]??(view.sourceChapterId==='chapter5-baidi-jiangling-continuation'?jianglingFrames[key]:view.sourceChapterId==='chapter5-baidi-jiangling-return'?jianglingAfterFrames[key]:null);
  return asset?{asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}
export function prepareBaidiRoutePictures(segment="inbound"){
  if(!["inbound","aftermath","jiangling","jiangling-after","jianning-common"].includes(segment))throw new RangeError("Unknown Baidi image segment");
  if(typeof Image!=='function')return Promise.resolve();
  return Promise.all([...new Set(segment==="jianning-common"?Object.values(jianningJianglingFrames):segment==="jiangling-after"?Object.values(jianglingAfterFrames):segment==="jiangling"?Object.values(jianglingFrames):Object.entries(frames).filter(([key])=>key.startsWith("[[5,1,12,")===(segment==="aftermath")).map(([,asset])=>asset))].map(asset=>{
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
