import {wuzhangFrames as frames} from './wuzhang-still-frames.mjs?v=0.73.77';
import {prepareNativeStillFiles} from "./native-still-surface.mjs?v=0.73.80";

export function wuzhangPicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (view?.chapterId !== 'chapter4-wuzhang-source' || !room ||
    !Array.isArray(cursor) || cursor.length !== 5 ||
    cursor[0] !== 4 || cursor[1] !== 3 || ![10,11,12,13,15,16].includes(cursor[2])) return null;
  if (recipe && recipe.version !== 'chapter4-wuzhang-presentation/1') return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function prepareWuzhangPictures() {
  return prepareNativeStillFiles(Object.values(frames));
}
