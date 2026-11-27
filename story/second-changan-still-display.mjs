import {secondChanganFrames as frames} from './second-changan-still-frames.mjs?v=0.73.95-changan-siege';
import {secondChanganChapters,secondChanganVersions,secondChanganCursor} from "./second-changan-stills.mjs?v=0.73.95-changan-siege";
const decoded = new Map();
const groups = {departure:new Set(), aftermath:new Set(), return:new Set()};
for (const [key,path] of Object.entries(frames)) {
  const [cursor] = JSON.parse(key);
  groups[cursor[2] < 13 ? 'departure' : cursor[2] === 13 || cursor[2] === 14 && cursor[3] === 0 ? 'aftermath' : 'return'].add(path);
}

export function secondChanganPicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (!secondChanganChapters.includes(view?.chapterId) || !room || !secondChanganCursor(cursor)) return null;
  if (recipe && !secondChanganVersions.includes(recipe.version)) return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function prepareSecondChanganPictures(phase = "departure") {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...groups[phase]].map(path => {
    if (!decoded.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      decoded.set(path, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError('Invalid Changan siege still dimensions');
        }
        return image;
      }).catch(error => { decoded.delete(path); throw error; }));
    }
    return decoded.get(path);
  }));
}
