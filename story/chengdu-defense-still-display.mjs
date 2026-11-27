import {chengduDefenseFrames as frames} from './chengdu-defense-still-frames.mjs?v=0.73.96-chengdu-defense';

const sourceChapter = 'chapter5-chengdu-defense-return';
const decoded = new Map();

export function chengduDefensePicture(view) {
  const cursor = view?.sourceCursor, room = view?.room;
  if (view?.chapterId !== sourceChapter || !room || cursor?.length !== 5 ||
      cursor[0] !== 5 || cursor[1] !== 1 || cursor[2] !== 0 ||
      room.inputEnabled === true) return null;
  const asset = frames[JSON.stringify([cursor, room.currentCity, room.sceneMode, view.presentation?.kind ?? null])];
  return asset ? {asset, sceneAsset:asset, cleanScene:true, nativeWidth:240, nativeHeight:160} : null;
}

export function prepareChengduDefensePictures() {
  if (typeof Image !== 'function') return Promise.resolve();
  return Promise.all([...new Set(Object.values(frames))].map(path => {
    if (!decoded.has(path)) {
      const image = new Image();
      image.src = new URL('../' + path, import.meta.url).href;
      const job = image.decode().then(() => {
        if (image.naturalWidth !== 240 || image.naturalHeight !== 160) throw new RangeError('Invalid Chengdu Defense still dimensions');
        return image;
      }).catch(error => {decoded.delete(path); throw error;});
      decoded.set(path, job);
    }
    return decoded.get(path);
  }));
}
