import {huluguFrames as frames} from './hulugu-still-frames.mjs?v=0.73.76';
const decoded = new Map();

export function huluguPicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (view?.chapterId !== 'chapter4-hulugu-source' || !room ||
    !Array.isArray(cursor) || cursor.length !== 5 ||
    cursor[0] !== 4 || cursor[1] !== 3 || ![6,7,8,9].includes(cursor[2])) return null;
  if (recipe && recipe.version !== 'chapter4-hulugu-presentation/1') return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function prepareHuluguPictures() {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...new Set(Object.values(frames))].map(path => {
    if (!decoded.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      decoded.set(path, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError('Invalid Hulugu still dimensions');
        }
        return image;
      }).catch(error => { decoded.delete(path); throw error; }));
    }
    return decoded.get(path);
  }));
}
