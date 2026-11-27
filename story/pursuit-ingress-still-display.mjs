import {pursuitIngressFrames as frames} from './pursuit-ingress-still-frames.mjs?v=0.73.68';
const cache=new Map();
export function pursuitIngressPicture(view){
  const chapter=view?.chapterId, cursor=view?.sourceCursor, room=view?.room, p=view?.presentation;
  if(chapter!=='qishan-root4-camp'&&chapter!=='qishan-root4-departure')return null;
  if(p?.version!==`web-${chapter}-display/1`)return null;
  if(!Array.isArray(cursor)||cursor.length!==5||cursor[0]!==4||cursor[1]!==0||!room||!p)return null;
  if(chapter==='qishan-root4-camp'&&(![1,2].includes(cursor[2])||cursor[3]!==1||view.canOpenMenu||view.disputeTownMenu))return null;
  if(room.sceneMode===4096&&room.inputEnabled===true)return null;
  const keys=[chapter,cursor,room.currentCity,room.sceneMode,p.pending?.id??null,p.completedRecipeId??null];
  const exact=stamp=>frames[JSON.stringify(stamp)];
  let file=exact(keys);
  // Both preparations use the same settled Wei room after command 20:29.
  if(!file&&chapter==='qishan-root4-departure'&&room.sceneMode===8202&&!p.pending&&
    ['preparation','held-pre-enemy'].includes(view.coreStage)&&[3,4].includes(cursor[2])&&
    cursor[3]===0&&[1,2].includes(cursor[4])&&/^departure:4:0:[12]:20:29:37$/.test(p.completedRecipeId??'')){
    const sibling=[4,0,cursor[2]===3?4:3,0,cursor[4]];
    file=exact([chapter,sibling,...keys.slice(2)]);
  }
  return file?{asset:file,sceneAsset:file,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}
export function preparePursuitIngressPictures(){
  if(typeof Image!=='function')return Promise.resolve();
  return Promise.all([...new Set(Object.values(frames))].map(path=>{
    if(!cache.has(path)){
      const image=new Image();image.src=new URL('../'+path,import.meta.url).href;
      cache.set(path,image.decode().then(()=>{
        if(image.naturalWidth!==240||image.naturalHeight!==160)throw new RangeError('Invalid pursuit story still');
        return image;
      }).catch(error=>{cache.delete(path);throw error;}));
    }
    return cache.get(path);
  }));
}
