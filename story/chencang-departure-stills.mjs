const sourceChapters=new Set(['chapter4-post-chencang-normal','chapter4-post-chencang-high']);
const cleanWorld='assets/second-chencang-battle/world-background-no-objects.png';

// The departure graph already binds its flags, origin scene and original
// cursor to a digest-verified 240×160 static asset. Read that binding rather
// than identifying rooms by their display names or repainting their actors.
export function chencangDeparturePicture(view) {
  if(!view?.departure||!sourceChapters.has(view.chapterId))return null;
  const {screen,presentation}=view;
  if(screen?.departureComposite!==true||presentation?.version!=='web-second-chencang-display/1')return null;
  const marker=/^departure:\d+:(?:initial|return):3:3:([78]):(15|16|17|18):\d+$/.exec(screen.departureRecipeId??'');
  if(!marker||(marker[1]==='8')!==(view.chapterId==='chapter4-post-chencang-high'))return null;
  const current=presentation.pending?.id??presentation.completedRecipeId;
  if(current!==screen.departureRecipeId)return null;
  if(!/^assets\/(?:[-\w]+\/)+[-\w]+\.png$/.test(screen.asset))return null;
  // Aliases in native record 18 are scripted world shots, not navigable maps.
  const world=marker[2]==='18';
  if(screen.staticCheckpoint!==!world)return null;
  const asset=world?cleanWorld:screen.asset;
  return {asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160};
}
