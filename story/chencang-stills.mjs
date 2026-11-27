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
