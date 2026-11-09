import {getNativeEntityDefinition,isNativeEntityDefinitionCatalog} from './native-entity-definitions.mjs';
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};

/** Compatibility projection of reviewed constructor recipes, never save data.
 * Class, level, equipment, control, and all other constructor-specific values
 * remain with their original recipe. Persistent overlays are applied later.
 */
export function bindNativeEntityDefinitionRecipes(catalog,recipes){
 if(!isNativeEntityDefinitionCatalog(catalog)||!Array.isArray(recipes))throw new TypeError('Captured native definitions and reviewed constructor recipes required');
 return recipes.map(recipe=>{
  const definition=getNativeEntityDefinition(catalog,recipe?.definitionIndex),source=recipe?.statsSource;
  const keys=['武力','統率力','知力'];
  if(recipe.nameJa!==definition.nameJa||!source||source.sourceField08!==definition.sourceField08||!source.baseFields||Object.keys(source.baseFields).length!==3||keys.some(k=>source.baseFields[k]!==definition.baseFields[k]))throw new RangeError('Constructor recipe disagrees with canonical native definition');
  const out=structuredClone(recipe);
  out.nameJa=definition.nameJa;
  out.statsSource.baseFields=structuredClone(definition.baseFields);
  out.statsSource.sourceField08=definition.sourceField08;
  return out;
 });
}

/** Bind only the game's reviewed initial free-roam defaults, before New Game.
 * This function is never a restore/migration hook. Native prefix levels and
 * initial inventory remain as reviewed in the existing free-roam descriptor.
 */
export function bindNativeNewGameDefaults(catalog,freeRoamData){
 if(!isNativeEntityDefinitionCatalog(catalog)||!Array.isArray(freeRoamData?.initialPersistentState?.party))throw new TypeError('Captured native definitions and initial free-roam descriptor required');
 const initial=freeRoamData.initialPersistentState,expected=[0,1,2,3,6,51,52,53,55,56,57];
 if(JSON.stringify(initial.party.map(x=>x.definitionIndex))!==JSON.stringify(expected))throw new RangeError('Reviewed initial eleven-member party required');
 const out=structuredClone(freeRoamData);
 for(const row of out.initialPersistentState.party){
  const definition=getNativeEntityDefinition(catalog,row.definitionIndex);
  if(row.nameJa!==definition.nameJa||!row.baseFields||Object.keys(row.baseFields).length!==3||['武力','統率力','知力'].some(k=>row.baseFields[k]!==definition.baseFields[k]))throw new RangeError('Initial free-roam defaults disagree with canonical native definition');
  row.nameJa=definition.nameJa;row.baseFields=structuredClone(definition.baseFields);
 }
 return freeze(out);
}
