import {wugongFrames as frames} from './wugong-still-frames.mjs?v=0.73.94-wugong-parity';
const decoded = new Map();
const groups = {departure:new Set(), aftermath:new Set()};
for (const [key,path] of Object.entries(frames)) {
  const [cursor] = JSON.parse(key);
  groups[cursor[2] < 8 ? 'departure' : 'aftermath'].add(path);
}

export function wugongPicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (!['chapter5-wugong-source','chapter5-wugong-aftermath'].includes(view?.chapterId) || !room ||
    !Array.isArray(cursor) || cursor.length !== 5 ||
    !(cursor[0] === 5 && cursor[1] === 0 && [4,5,6,7,8,9,10].includes(cursor[2]))) return null;
  if (recipe && !['chapter5-wugong-presentation/1','chapter5-wugong-aftermath-presentation/1'].includes(recipe.version)) return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function prepareWugongPictures(phase = "departure") {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...groups[phase]].map(path => {
    if (!decoded.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      decoded.set(path, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError('Invalid Wugong still dimensions');
        }
        return image;
      }).catch(error => { decoded.delete(path); throw error; }));
    }
    return decoded.get(path);
  }));
}
