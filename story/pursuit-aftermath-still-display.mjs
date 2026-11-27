import {pursuitAftermathFrames as frames} from './pursuit-aftermath-still-frames.mjs?v=0.73.69';
import {pursuitAftermathCursor} from './qishan-pursuit-stills.mjs?v=0.73.58';

const cache = new Map();

export function pursuitAftermathPicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (view?.chapterId !== 'qishan-dispute-source' || !pursuitAftermathCursor(cursor) || !room) return null;
  if (recipe && recipe.version !== 'qishan-dispute-presentation/1') return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function preparePursuitAftermathPictures() {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...new Set(Object.values(frames))].map(path => {
    if (!cache.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      cache.set(path, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError('Invalid pursuit aftermath still dimensions');
        }
        return image;
      }).catch(error => { cache.delete(path); throw error; }));
    }
    return cache.get(path);
  }));
}
