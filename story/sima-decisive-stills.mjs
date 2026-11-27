// Map33 prelude: only the original location captions and scripted world
// marches; city selection, core dialogue, and chapter/title screens are separate.
const locations=new Map([
  ['6:1:3',[0x1b0d69,11278,'陳倉','陳倉']],
  ['6:1:15',[0x1b0daa,11283,'陳倉　会議場','陳倉　議事廳']],
  ['6:2:2',[0x1b0dd9,11787,'洛陽','洛陽']],
  ['6:2:12',[0x1b0e11,11792,'洛陽　宮殿','洛陽　宮殿']],
  ['6:3:10',[0x1b0e6a,12101,'陳倉　会議場','陳倉　議事廳']],
  ['7:0:3',[0x1b0f2b,12536,'祁山','祁山']],
  ['7:0:21',[0x1b0f94,12541,'祁山　蜀軍幕舎','祁山　蜀軍營帳']],
]);
const marches=new Set(['6:0:2','6:0:3','6:4:3']);
export const decisivePreludeCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&cursor[0]===4&&cursor[1]===1&&[6,7].includes(cursor[2]);
export function decisivePreludeCaption(recipe){
  const cursor=recipe?.sourceCursor;
  if(recipe?.version!=='qishan-map33-presentation/1'||recipe.kind!=='caption'||recipe.opcode!==11||!decisivePreludeCursor(cursor))return null;
  const source=locations.get(cursor.slice(2).join(':'));
  return source&&recipe.sourceOffset===source[0]&&recipe.details?.reference===source[1]&&recipe.afterRoom?.caption===source[2]?source[3]:null;
}
export function decisivePreludeDialogue(view){
  if(view?.chapterId!=='qishan-map33-source'||view.coreStage!=='presentation'||view.dialogue)return null;
  const text=decisivePreludeCaption(view.presentation);
  return text?{textJa:text,speakerDefinition:null}:null;
}
export function decisivePreludeWorldStill(room,cursor){
  return decisivePreludeCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false&&
    (marches.has(cursor.slice(2).join(':'))||room.march!=null);
}
