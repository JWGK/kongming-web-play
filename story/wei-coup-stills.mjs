import {map45TownFrames} from "./map45-town-still-frames.mjs?v=0.73.100-wei-coup";
import {weiCoupFrames} from "./wei-coup-still-frames.mjs?v=0.73.100-wei-coup";
import {map45TownRouteFrames} from "./map45-town-route-still-frames.mjs?v=0.73.100-wei-coup";
const divergentTownKeys=new Set(Object.values(map45TownRouteFrames).flatMap(Object.keys));
import {map45PostFrames} from "./map45-post-still-frames.mjs?v=0.73.100-wei-coup";
const frames=Object.freeze({...weiCoupFrames,...map45TownFrames,...map45PostFrames});
const locations=new Map([["5:1:14:1:17", [1922623, "江陵　会議場", "江陵　議事廳"]], ["5:1:15:0:4", [1922953, "洛陽", "洛陽"]], ["5:1:15:0:9", [1922968, "洛陽　司馬懿邸", "洛陽　司馬懿府邸"]], ["5:1:15:1:11", [1923157, "華山　草原", "華山　草原"]], ["5:1:15:2:12", [1923376, "洛陽　宮殿", "洛陽　宮殿"]], ["5:2:0:0:12", [1949549, "洛陽　会議場", "洛陽　議事廳"]], ["5:2:0:1:4", [1949636, "成都", "成都"]], ["5:2:0:1:13", [1949685, "成都　宮殿", "成都　宮殿"]], ["5:2:0:8:6", [1949753, "成都　邸宅", "成都　府邸"]], ["5:2:0:14:13", [1949927, "成都　会議場", "成都　議事廳"]], ["5:2:0:16:22", [1950503, "城　会議場", "郿城　議事廳"]], ["5:2:0:33:5", [1950702, "長安　会議場", "長安　議事廳"]], ["5:2:2:1:4", [1952577, "洛陽", "洛陽"]]]);
const pictureCache=new Map();
function known(view){
 const c=view?.sourceCursor;
 if(!view?.room||!Array.isArray(c)||c[0]!==5||c.length!==5)return false;
 if(view.chapterId==="chapter5-section2-town")return c[1]===2&&c[2]===0&&!(view.hosted&&view.screen)&&!(view.room.sceneMode===4096&&view.room.inputEnabled);
 if(view.room.inputEnabled===true)return false;
 if(view.chapterId==="chapter5-second-changan-return")return c[1]===2&&c[2]===2&&c[3]<=1&&c[4]<=21;
 const chart=c[1]===1&&(c[2]===14&&c[3]===1&&c[4]>=17||c[2]===15)||
    c[1]===2&&c[2]===0&&c[3]===0&&c[4]<=9;
 return chart&&["chapter5-jiangling-aftermath","chapter5-wei-coup","chapter5-baidi-return",
    "chapter5-baidi-jiangling-aftermath","chapter5-baidi-wei-coup"].includes(view.chapterId);
}
export function weiCoupPicture(view){
 if(!known(view))return null;
 const key=JSON.stringify([view.sourceCursor,view.room.currentCity,view.room.sceneMode,view.presentation?.kind??null]);
 // The captured native east-west, north-fire, and both Baidi tactics room endpoints are
 // pixel-identical across every one of their 152 source keys.
 const origin=["5:1:3","5:1:4","5:1:10"].includes(view.originContextId)?"5:1:11":view.originContextId;
 const route=map45TownRouteFrames[origin];
 const asset=route?.[key]??(divergentTownKeys.has(key)&&!route&&view.originContextId!=="5:0:17"?null:frames[key]);
 return asset?{asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}
export function weiCoupDialogue(view){
 if(!known(view)||view.coreStage!=="presentation"||view.dialogue)return null;
 const recipe=view.presentation,loc=locations.get(view.sourceCursor.join(":"));
 return recipe?.kind==="caption"&&recipe.opcode===11&&loc&&loc[0]===recipe.sourceOffset&&
   (loc[1]===recipe.afterRoom?.caption||loc[2]===recipe.afterRoom?.caption)
   ?{textJa:loc[2],speakerDefinition:null}:null;
}
export async function prepareWeiCoupPictures(chapter){
 if(typeof Image!=="function")return;
 const choose=chapter==="aftermath"?key=>key.startsWith("[[5,1,14,"):
    chapter==="town"?key=>key.startsWith("[[5,2,0,"):key=>!key.startsWith("[[5,1,14,");
 const records=chapter==="town"?map45TownFrames:weiCoupFrames;
 await Promise.all([...new Set(Object.entries(records).filter(([key])=>choose(key)).map(([,asset])=>asset))].map(asset=>{
   if(!pictureCache.has(asset)){
     const img=new Image();img.src=new URL("../"+asset,import.meta.url).href;
     const ready=img.decode().then(()=>{if(img.naturalWidth!==240||img.naturalHeight!==160)throw Error("Invalid original scene image")}).catch(error=>{pictureCache.delete(asset);throw error;});
     pictureCache.set(asset,ready);
   }
   return pictureCache.get(asset);
 }));
}
