import {earlyStoryPicture} from './chencang-stills.mjs?v=0.73.57-qishan-camp';
import {chencangStaticFrames} from './chencang-static-frames.mjs?v=0.73.66';

const pictureBank=new Map();
const policyByMode=Object.freeze({
  'aftermath':'web-second-chencang-aftermath-display/1',
  'changan':'web-changan-continuation-display/1',
});

export function chencangStaticPicture(view) {
  if(view?.chapterId!=='second-chencang')return null;
  const p=view.presentation;
  const scope=p?.version===policyByMode.changan?'changan':p?.version===policyByMode.aftermath?'aftermath':null;
  if(!scope)return null;
  const recipe=p.pending?p.recipe:null;
  const source=recipe?
    (recipe.skippableByInput?recipe.frames?.at(-1):recipe.completionFrame):
    p.completionFrame;
  if(!source||!Array.isArray(source.overlays))return null;
  const frame=earlyStoryPicture(scope,source);
  const key=JSON.stringify([scope,frame.backgroundAssetId,frame.darkenLevel??0,frame.overlays.map(o=>[o.assetId,o.x,o.y])]);
  const asset=chencangStaticFrames[key];
  return asset?{asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160}:null;
}

export function prepareChencangStaticPictures() {
  if(typeof Image!=='function')return Promise.resolve();
  return Promise.all([...new Set(Object.values(chencangStaticFrames))].map(path=>{
    if(!pictureBank.has(path)){
      const i=new Image();
      i.src=new URL('../'+path,import.meta.url).href;
      pictureBank.set(path,i.decode().then(()=>{
        if(i.naturalWidth!==240||i.naturalHeight!==160)throw new RangeError('Invalid Chencang story still');
        return i;
      }).catch(error=>{pictureBank.delete(path);throw error;}));
    }
    return pictureBank.get(path);
  }));
}
