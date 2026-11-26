// Map 1 manifest points at historical unit atlases no longer stored under
// next-battle/units. The Baxi copies are byte-identical (verified in QA).
const manifestUrl=new URL('../assets/next-battle/manifest.json',import.meta.url);
const atlasRoot=new URL('../assets/baxi-field/units/',import.meta.url);
let media;
const image=url=>new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img.naturalWidth===96&&img.naturalHeight===96);
  img.onerror=()=>resolve(false);
  img.src=url.href;
});
export function xinyeSpriteFor(manifest,unit){
  const actor=manifest?.units?.[unit?.definitionIndex];
  if(!actor||actor.definitionIndex!==unit.definitionIndex||actor?.classIndex!==unit?.classIndex)return null;
  const family=manifest?.spriteFamilies?.[actor.spriteFamily];
  const file=family?.path?.match(/^units\/(f[0-9]+-p[0-9]+\.png)$/)?.[1];
  if(!file||family.width!==96||family.height!==96||family.frameWidth!==32||family.frameHeight!==32||
    !/^[0-9a-f]{64}$/.test(manifest.files?.[family.path]?.sha256??''))return null;
  const row=[1,2,0,2][unit.facing18];
  if(row===undefined)return null;
  return {url:new URL(file,atlasRoot).href,sha256:manifest.files[family.path].sha256,row,flip:unit.facing18===1};
}
export function loadXinyeSpriteManifest(){
  if(!media)media=fetch(manifestUrl).then(response=>{
    if(!response.ok)throw Error('Map 1 sprite manifest unavailable');
    return response.json();
  }).then(async manifest=>{
    if(manifest?.map?.mapIndex!==1||manifest?.map?.cellPixels!==16)return ()=>null;
    const candidates=new Map();
    for(const unit of Object.values(manifest.units??{})){
      const row=xinyeSpriteFor(manifest,{...unit,facing18:2});
      if(row)candidates.set(row.url,row);
    }
    const ready=new Set();
    await Promise.all([...candidates.values()].map(async row=>{
      if(await image(new URL(row.url)))ready.add(row.url);
    }));
    return unit=>{
      const sprite=xinyeSpriteFor(manifest,unit);
      return sprite&&ready.has(sprite.url)?sprite:null;
    };
  }).catch(()=>{media=null;return ()=>null;});
  return media;
}
