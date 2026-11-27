import {qishanCampStillFrames as frames} from './qishan-camp-still-frames.mjs?v=0.73.65';
const assetPrefix='assets/qishan-camp-stills/';
const isCampRoom=room=>room?.currentCity===17&&room.sceneMode===8200;
const imageCache=new Map();
function storyPicture(file){
  const asset=assetPrefix+file;
  return {asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160};
}
export function qishanCampStill(view){
  const cursor=view?.sourceCursor;
  if(!Array.isArray(cursor)||cursor.length!==5||cursor[0]!==4)return null;
  const chapter=view.chapterId, hold=view.room??view.settledFrame?.room;
  if(!isCampRoom(hold))return null;
  if(chapter==='qishan-map33-source'&&cursor[1]===1&&cursor[2]===7)
    return storyPicture(((hold.actors?.length??0)>2?frames['decisive-high']:null)?.hub??frames.decisive.hub);
  if(!['qishan-root4-camp','qishan-root4-departure'].includes(chapter)||cursor[1]!==0||![1,2].includes(cursor[2]))return null;
  const family=(cursor[2]===1?frames['pursuit-high']:null)??frames.pursuit;
  if(chapter==='qishan-root4-departure')return storyPicture(family.readiness);
  return storyPicture(family[view.dialogue?.speakerDefinition]??family.hub);
}
// Runs inside the already-admitted chapter media group, before the first
// display. The static images never join the title-screen preload.
export function prepareQishanCampStills(family){
  if(typeof Image!=='function')return Promise.resolve();
  const files=Object.entries(frames).filter(([key])=>key.startsWith(family)).flatMap(([,row])=>Object.values(row));
  return Promise.all([...new Set(files)].map(file=>{
    if(!imageCache.has(file)){
      const img=new Image(),src=new URL('../'+assetPrefix+file,import.meta.url);
      img.src=src.href;
      const task=img.decode().then(()=>{
        if(img.naturalWidth!==240||img.naturalHeight!==160)throw new RangeError('Unexpected Qishan story screenshot size');
        return img;
      }).catch(error=>{imageCache.delete(file);throw error;});
      imageCache.set(file,task);
    }
    return imageCache.get(file);
  }));
}
