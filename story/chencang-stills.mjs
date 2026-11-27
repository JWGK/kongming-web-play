// Display-only pilot: show a stable original composition, not the first
// animation frame. Do not edit the native command, cadence or receipt.
export function chencangStoryStill(section,recipe,current){
  if(!recipe?.frames?.length||!recipe.completionFrame)return current;
  if(section==='aftermath'){
    if(recipe.id==='march')return recipe.frames.at(-1); // the marker has arrived at Chang'an
    if(recipe.id==='titleWait')return recipe.frames.at(-1); // keep the title card visible
    return ['titleInit','room'].includes(recipe.id)?recipe.completionFrame:current;
  }
  if(section==='changan'&&/^changan:(normal|high):\d+$/.test(recipe.id)){
    if(recipe.skippableByInput)return recipe.frames.at(-1);
    return recipe.completionFrame;
  }
  return current;
}

// Only the first Chencang battle's departure interlude uses these resources.
// This world base has city pins baked into the pixels. Do not change the
// navigation map, or the authenticated recipe/cursor/frame accounting.
const departureWorldBase = 'source-b57cc6bcdb4c182f7e9d283a69af14d72c821b5e325debb1317b495a03667117';
export const departureTerrainOnly = 'first-chencang-departure:terrain-only';
const departureCityOverlays = new Set([
  'source-4a0954c93eb8da625fbd8394c9f202c83b98852cbde99aa47b571df7d062b83f',
  'source-5f4959cabab641ed945b44b0a6d51732f9647cb1ae055543479914601284ed64',
  'source-8c94a419fb945bceb7d17af5d1ed2f1e4feede83645a56949002f3381ef39a57',
  'source-e9c49c724a1769ae124976ab976b0909fa4e8efd75d76a63a7fc81693816b015',
  'source-ae79c7f8e33d9d0df3ed4d2543cf1c6a742519471f2a25143fac919cab51d681',
]);

export function firstChencangDepartureFrame(frame){
  if(frame?.backgroundAssetId!==departureWorldBase)return frame;
  return {...frame,backgroundAssetId:departureTerrainOnly,
    overlays:frame.overlays.filter(o=>!departureCityOverlays.has(o.assetId))};
}
export function firstChencangDepartureStill(recipe,current){
  const frame=/^departure:\d+:(?:initial|return):3:3:[78]:/.test(recipe?.id)
    ? recipe.completionFrame??current : current;
  return firstChencangDepartureFrame(frame);
}

const terrainPath = new URL('../assets/second-chencang-battle/world-background-no-objects.png',import.meta.url);
const terrainHash = 'c0aa6e9a50a462c1578485468fc7b3fb2aa5a7a4eb5e44b2bd41ef3ccc9d6d1e';

export function firstChencangDepartureDecoder(stock, fetchAsset = globalThis.fetch, decode = bytes=>createImageBitmap(new Blob([bytes],{type:'image/png'}))){
  let pending=null, terrain=null, disposed=false;
  const check=condition=>{if(!condition)throw new RangeError('Invalid first Chencang cutscene terrain');};
  return Object.freeze({
    loadImage(id){
      check(!disposed);
      if(id!==departureTerrainOnly)return stock.loadImage(id);
      if(terrain)return Promise.resolve(terrain);
      return pending??=(async()=>{
        const response=await fetchAsset(terrainPath);
        check(response.ok);
        const bytes=await response.arrayBuffer();
        check(bytes.byteLength===27397);
        const hex=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))]
          .map(x=>x.toString(16).padStart(2,'0')).join('');
        check(hex===terrainHash&&!disposed);
        const image=await decode(bytes);
        if(disposed||image.width!==240||image.height!==160){
          image.close?.();check(false);
        }
        return terrain=image;
      })().finally(()=>{pending=null;});
    },
    dispose(){
      disposed=true;
      terrain?.close?.();terrain=null;
      stock.dispose();
    }
  });
}
