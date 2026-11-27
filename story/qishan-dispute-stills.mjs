// Map 32 prelude. ROM opcode 11 is a location caption; chapter cards (13/14)
// and ordinary dialogue remain in their own presentation channels.
const locations = new Map([
  ['0:0:7', [0x1af943, 40, '洛陽', '洛陽']],
  ['0:0:19', [0x1af989, 45, '洛陽　会議場', '洛陽　議事廳']],
  ['0:2:3', [0x1afa7c, 985, '成都', '成都']],
  ['0:2:13', [0x1afab0, 990, '成都　宮殿', '成都　宮殿']],
  ['1:0:7', [0x1afc1e, 2874, '成都　邸宅', '成都　邸宅']],
  ['2:0:20', [0x1afdae, 4211, '成都　会議場', '成都　議事廳']],
  ['2:2:3', [0x1afe70, 4714, '陳倉', '陳倉']],
  ['2:2:14', [0x1afeaf, 4719, '陳倉　会議場', '陳倉　議事廳']],
  ['2:4:11', [0x1aff78, 5418, '斜谷　魏軍幕舎', '斜谷　魏軍營帳']],
  ['3:0:3', [0x1b0081, 5701, '漢中', '漢中']],
  ['3:0:24', [0x1b00fb, 5706, '漢中　会議場', '漢中　議事廳']],
  ['3:2:12', [0x1b0162, 6001, '陳倉　魏軍幕舎', '陳倉　魏軍營帳']],
  ['3:4:20', [0x1b0213, 7014, '鳳鳴山　蜀軍幕舎', '鳳鳴山　蜀軍營帳']],
]);
const marches=new Set(['0:1:4','0:1:5','2:1:3','2:1:4','2:3:3','2:5:3','3:1:3','3:3:2','3:3:4','3:3:6']);
export const disputePreludeCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&cursor[0]===4&&cursor[1]===1&&[0,1,2,3].includes(cursor[2]);
export function disputePreludeCaption(recipe){
  const cursor=recipe?.sourceCursor;
  if(recipe?.version!=='qishan-dispute-presentation/1'||recipe.kind!=='caption'||recipe.opcode!==11||!disputePreludeCursor(cursor))return null;
  const entry=locations.get(cursor.slice(2).join(':'));
  if(!entry||recipe.sourceOffset!==entry[0]||recipe.details?.reference!==entry[1]||recipe.afterRoom?.caption!==entry[2])return null;
  return entry[3];
}
export function disputePreludeDialogue(view){
  if(view?.chapterId!=='qishan-dispute-source'||view.coreStage!=='presentation'||view.dialogue)return null;
  const text=disputePreludeCaption(view.presentation);
  return text?{textJa:text,speakerDefinition:null}:null;
}
// A scripted world raster can persist between two events while field input is
// locked. Never remove pins from a playable player-controlled world view.
export function disputePreludeWorldStill(room,cursor){
  return disputePreludeCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false&&
    (marches.has(cursor.slice(2).join(':'))||room.march!=null);
}
