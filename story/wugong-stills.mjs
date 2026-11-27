// Original scenario Map38 caption opcodes. They belong in the active dialogue.
const captions=new Map([
  ["5:0:5:0:4",[0x1c8e2f,5808,"\uE01F城","郿城"]],
  ["5:0:5:1:19",[0x1c8ea8,5829,"\uE01F城　会議場","郿城　議事廳"]],
  ["5:0:9:0:17",[0x1c9b7a,8965,"建業　会議場","建業　議事廳"]],
  ["5:0:9:1:3",[0x1c9b8c,9215,"洛陽","洛陽"]],
  ["5:0:9:1:13",[0x1c9bbe,9220,"洛陽　会議場","洛陽　議事廳"]],
  ["5:0:9:2:3",[0x1c9c25,9515,"江陵","江陵"]],
  ["5:0:9:2:15",[0x1c9c60,9520,"江陵　呉軍陣地","江陵　吳軍陣地"]],
  ["5:0:9:4:16",[0x1c9e4d,11875,"建業　会議場","建業　議事廳"]],
  ["5:0:9:6:3",[0x1c9ee8,12685,"成都","成都"]],
  ["5:0:9:6:18",[0x1c9f33,12690,"成都　宮殿","成都　宮殿"]],
  ["5:0:10:0:4",[0x1ca174,14428,"洛陽","洛陽"]],
  ["5:0:10:0:13",[0x1ca19f,14433,"洛陽　会議場","洛陽　議事廳"]],
  ["5:0:10:1:4",[0x1ca20a,15201,"昆明","昆明"]],
  ["5:0:10:1:15",[0x1ca243,15206,"昆明　会議場","昆明　議事廳"]],
  ["5:0:10:3:4",[0x1ca2c8,15672,"成都","成都"]],
  ["5:0:10:3:18",[0x1ca311,15677,"成都　宮殿","成都　宮殿"]],
]);
export const wugongCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&cursor[0]===5&&cursor[1]===0&&[4,5,6,7,8,9,10].includes(cursor[2]);
export function wugongCaption(recipe){
  const cursor=recipe?.sourceCursor;
  if(!['chapter5-wugong-presentation/1','chapter5-wugong-aftermath-presentation/1'].includes(recipe?.version)||recipe.kind!=='caption'||recipe.opcode!==11||!wugongCursor(cursor))return null;
  const row=captions.get(cursor.join(':'));
  return row&&recipe.sourceOffset===row[0]&&recipe.details?.reference===row[1]&&
    [row[2],row[2].replaceAll("\uE01F","郿")].includes(recipe.afterRoom?.caption)?row[3]:null;
}
export function wugongDialogue(view){
  if(!['chapter5-wugong-source','chapter5-wugong-aftermath'].includes(view?.chapterId)||view.coreStage!=='presentation'||view.dialogue)return null;
  const text=wugongCaption(view.presentation);
  return text?{textJa:text,speakerDefinition:null}:null;
}
export const wugongWorldStill=(room,cursor)=>wugongCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
