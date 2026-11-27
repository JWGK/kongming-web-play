import {pursuitIngressFrames as frames} from './pursuit-ingress-still-frames.mjs?v=0.73.78';
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
  if(!file&&chapter==='qishan-root4-departure'&&view.coreStage==='manual-prompt'&&
    view.nativeManualMarker===1&&[1,2].includes(cursor[2])&&cursor[3]===16&&cursor[4]===2&&
    room.sceneMode===8200&&room.currentCity===17&&!p.pending){
    // The original 61/0 prompt doesn't alter the settled readiness frame.
    file=exact([chapter,[4,0,cursor[2],16,1],...keys.slice(2)]);
  }
  // Both preparations use the same settled Wei room after command 20:29.
  if(!file&&chapter==='qishan-root4-departure'&&room.sceneMode===8202&&!p.pending&&
    ['preparation','held-pre-enemy'].includes(view.coreStage)&&[3,4].includes(cursor[2])&&
    cursor[3]===0&&[1,2].includes(cursor[4])&&/^departure:4:0:[12]:20:29:37$/.test(p.completedRecipeId??'')){
    const sibling=[4,0,cursor[2]===3?4:3,0,cursor[4]];
    file=exact([chapter,sibling,...keys.slice(2)]);
  }
  return file?{asset:file,sceneAsset:file,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}
// Original OP11: 0x1aba55 (reference 4551) and 0x1abe17 (8075).
// Both change perspective to Sima Yi's camp. The projected completion
// frame has no title; only the current, skippable title recipe gets narration.
export function pursuitIngressDialogue(view){
  const cursor=view?.sourceCursor, p=view?.presentation, room=view?.room;
  if(view?.chapterId!=='qishan-root4-departure'||view.coreStage!=='presentation'||view.dialogue||
    !Array.isArray(cursor)||cursor.length!==5||cursor[0]!==4||cursor[1]!==0||
    ![1,2].includes(cursor[2])||cursor[3]!==20||cursor[4]!==15||
    room?.currentCity!==17||room?.sceneMode!==8202||
    p?.version!=='web-qishan-root4-departure-display/1')return null;
  const id='departure:'+cursor.join(':')+':b', recipe=p.recipe;
  if(p.pending?.id!==id||recipe?.id!==id||recipe.skippableByInput!==true)return null;
  const text=recipe.frames?.at(-1)?.localizedCaption?.text;
  return text==='祁山　魏軍營帳'?{textJa:text,speakerDefinition:null}:null;
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
