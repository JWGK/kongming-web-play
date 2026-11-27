import {qishanDisputeFrames as frames} from './qishan-dispute-still-frames.mjs?v=0.73.71';
const decoded = new Map();

export function qishanDisputePicture(view) {
  const cursor = view?.sourceCursor, room = view?.room, recipe = view?.presentation;
  if (view?.chapterId !== 'qishan-dispute-source' || !room ||
    !Array.isArray(cursor) || cursor.length !== 5 ||
    cursor[0] !== 4 || cursor[1] !== 1 || ![0,1,2,3,4,5].includes(cursor[2])) return null;
  if (recipe && recipe.version !== 'qishan-dispute-presentation/1') return null;
  if (room.sceneMode === 4096 && room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, recipe?.kind ?? null])];
  return asset ? {asset, sceneAsset: asset, cleanScene: true, nativeWidth: 240, nativeHeight: 160} : null;
}

export function prepareQishanDisputePictures() {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...new Set(Object.values(frames))].map(path => {
    if (!decoded.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      decoded.set(path, image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) {
          throw new RangeError('Invalid Qishan Dispute still dimensions');
        }
        return image;
      }).catch(error => { decoded.delete(path); throw error; }));
    }
    return decoded.get(path);
  }));
}
