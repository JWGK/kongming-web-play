import {finaleBaxiFrames as frames} from './finale-baxi-still-frames.mjs?v=0.73.97-finale-baxi';

const decoded = new Map();
const chapters = new Set(['chapter5-kongming-return','chapter5-baxi-source','chapter5-baxi-return']);
export const finaleBaxiCursor = cursor => Array.isArray(cursor) && cursor.length === 5 &&
  cursor[0] === 5 && cursor[1] === 1 && ([6,7].includes(cursor[2]) || cursor[2] === 8 && cursor[3] <= 1);

const captionRows = new Map([
  ['5:1:6:0:19',[0x1d32d8,5299,['建業　会議場','建業　議事廳'],'建業　議事廳']],
  ['5:1:6:2:12',[0x1d3439,5964,['成都　宮殿'],'成都　宮殿']],
  ['5:1:6:11:11',[0x1d350a,6868,['白帝城　呉軍幕舎','白帝城　吳軍營帳'],'白帝城　吳軍營帳']],
  ['5:1:6:13:8',[0x1d3591,7554,['巴西　会議場','巴西　議事廳'],'巴西　議事廳']],
  ['5:1:8:1:10',[0x1d3dd8,9183,['白帝城　会議場','白帝城　議事廳'],'白帝城　議事廳']],
]);
export function finaleBaxiCaption(recipe) {
  if (!finaleBaxiCursor(recipe?.sourceCursor) || recipe?.version !== (recipe?.sourceCursor?.[2] === 8 ? 'chapter5-baxi-return-presentation/1' : 'chapter5-kongming-return-presentation/1') ||
      recipe.kind !== 'caption' || recipe.opcode !== 11) return null;
  const row=captionRows.get(recipe.sourceCursor.join(':'));
  // This source's Baidi successor encodes the caption text, not a
  // numeric details.reference; the ROM offset and full content remain pinned.
  const authored=recipe.sourceCursor[2]===8
    ? row?.[2].includes(recipe.details?.textJa)&&recipe.details.textJa===recipe.afterRoom?.caption
    : recipe.details?.reference===row?.[1];
  return row && recipe.sourceOffset===row[0] && authored && row[2].includes(recipe.afterRoom?.caption) ? row[3] : null;
}
export function finaleBaxiDialogue(view) {
  if (!chapters.has(view?.chapterId) || view?.coreStage !== 'presentation' || view.dialogue) return null;
  const text=finaleBaxiCaption(view.presentation);
  return text ? {textJa:text,speakerDefinition:null} : null;
}
export const finaleBaxiWorldStill = (room,cursor) => finaleBaxiCursor(cursor) &&
  room?.sceneMode === 4096 && !room.inputEnabled;

export function finaleBaxiPicture(view) {
  const cursor=view?.sourceCursor,room=view?.room;
  if (!chapters.has(view?.chapterId) || !room || !finaleBaxiCursor(cursor) ||
      room.sceneMode===4096 && room.inputEnabled===true) return null;
  const asset=frames[JSON.stringify([cursor,room.currentCity,room.sceneMode,view.presentation?.kind??null])];
  return asset ? {asset,sceneAsset:asset,cleanScene:true,nativeWidth:240,nativeHeight:160} : null;
}

export function prepareFinaleBaxiPictures(phase='departure') {
  if (typeof Image !== 'function') return Promise.resolve();
  const paths=new Set();
  for (const [key,path] of Object.entries(frames))
    if ((JSON.parse(key)[0][2] <= 7)===(phase==='departure')) paths.add(path);
  return Promise.all([...paths].map(path => {
    if (!decoded.has(path)) {
      const image=new Image(); image.src=new URL('../'+path,import.meta.url).href;
      decoded.set(path,image.decode().then(()=>{
        if (image.naturalWidth!==240 || image.naturalHeight!==160) throw new RangeError('Invalid finale Baxi still dimensions');
        return image;
      }).catch(error=>{decoded.delete(path);throw error;}));
    }
    return decoded.get(path);
  }));
}
