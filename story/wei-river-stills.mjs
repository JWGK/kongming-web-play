// Scoped native captions and scripted map shots around the Wei River battle.
// These keys bind to the original instruction, not a translated location name.
const captions=new Map([
  ['2:0:1:2',[0x1b51f0,43,'渭水','渭水']],
  ['2:0:1:14',[0x1b522c,48,'渭水　魏軍幕舎','渭水　魏軍營帳']],
  ['2:0:2:2',[0x1b5258,857,'成都','成都']],
  ['2:0:2:14',[0x1b5299,862,'成都　城内','成都　城內']],
  ['2:0:3:9',[0x1b52fa,1534,'成都　宮殿','成都　宮殿']],
  ['2:0:4:2',[0x1b53a6,2629,'祁山','祁山']],
  ['2:0:4:22',[0x1b5419,2634,'祁山　蜀軍幕舎','祁山　蜀軍營帳']],
  ['2:1:4:20',[0x1b56e7,6649,'祁山　蜀軍幕舎','祁山　蜀軍營帳']],
  ['2:8:0:10',[0x1b768f,22227,'渭水　魏軍幕舎','渭水　魏軍營帳']],
  ['3:0:0:4',[0x1bcff5,0,'成都','成都']],
  ['3:0:0:20',[0x1bd042,45,'成都　宮殿','成都　宮殿']],
  ['3:1:0:7',[0x1bd166,1251,'成都　邸宅','成都　諸葛宅']],
  ['3:2:0:22',[0x1bd302,2737,'成都　会議場','成都　議事廳']],
  ['3:2:1:2',[0x1bd347,3490,'洛陽','洛陽']],
  ['3:2:1:17',[0x1bd39d,3495,'洛陽　会議場','洛陽　議事廳']],
  ['3:2:2:20',[0x1bd43b,4094,'成都　会議場','成都　議事廳']],
  ['3:2:3:19',[0x1bd57a,4518,'成都　集会所','成都　集會所']],
  ['3:2:4:17',[0x1bd5f9,4831,'成都　陣地','成都　軍陣']],
  ['3:2:5:18',[0x1bd671,4993,'成都　城内','成都　城內']],
  ['3:2:6:5',[0x1bd71a,5801,'成都　邸宅','成都　諸葛宅']],
  ['3:3:0:21',[0x1bd964,7052,'成都　会議場','成都　議事廳']],
  ['3:3:1:27',[0x1bda44,7848,'成都　城内','成都　城內']],
  ['3:3:3:15',[0x1bdc3f,8366,'洛陽　会議場','洛陽　議事廳']],
  ['3:3:5:3',[0x1bdda5,9152,'祁山','祁山']],
  ['3:3:5:24',[0x1bde1a,9157,'祁山　蜀軍幕舎','祁山　蜀軍營帳']],
]);
export const weiRiverCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&cursor[0]===4&&
  (cursor[1]===2||cursor[1]===3&&[0,1,2,3].includes(cursor[2]));
export function weiRiverCaption(recipe){
  const cursor=recipe?.sourceCursor;
  if(recipe?.version!=='chapter4-post-qishan-presentation/1'||recipe.kind!=='caption'||recipe.opcode!==11||!weiRiverCursor(cursor))return null;
  const source=captions.get(cursor.slice(1).join(':'));
  return source&&recipe.sourceOffset===source[0]&&recipe.details?.reference===source[1]&&recipe.afterRoom?.caption===source[2]?source[3]:null;
}
export function weiRiverDialogue(view){
  if(view?.chapterId!=='chapter4-post-qishan-source'||view.coreStage!=='presentation'||view.dialogue)return null;
  const text=weiRiverCaption(view.presentation);
  return text?{textJa:text,speakerDefinition:null}:null;
}
export function weiRiverWorldStill(room,cursor){
  return weiRiverCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
}
