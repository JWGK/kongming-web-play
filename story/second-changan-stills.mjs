// Original episode captions, verified against each native opcode 11 address.
const captions=new Map([
  ["5:0:11:0:3",[0x1ca4e6,17306,["\uE01F城","郿城"],"郿城"]],
  ["5:0:11:0:21",[0x1ca54f,17311,["眉城　会議場","郿城　議事廳"],"郿城　議事廳"]],
  ["5:0:13:1:23",[0x1cadfe,19347,["\uE01F城　会議場","郿城　議事廳"],"郿城　議事廳"]],
  ["5:0:14:0:7",[0x1cb0fb,21484,["長安"],"長安"]],
  ["5:0:14:2:3",[0x1cb1c1,22037,["洛陽"],"洛陽"]],
  ["5:0:14:2:13",[0x1cb1f3,22042,["洛陽　曹叡邸"],"洛陽　曹叡邸"]],
  ["5:0:14:3:7",[0x1cb2dd,23004,["洛陽　司馬懿邸"],"洛陽　司馬懿邸"]],
  ["5:0:14:4:8",[0x1cb440,24249,["洛陽　城内","洛陽　城內"],"洛陽　城內"]],
  ["5:0:15:0:5",[0x1cb49f,24496,["永昌"],"永昌"]],
  ["5:0:15:0:14",[0x1cb4ca,24501,["永昌　会議場","永昌　議事廳"],"永昌　議事廳"]],
  ["5:0:16:1:4",[0x1cb57f,25081,["成都"],"成都"]],
  ["5:0:16:1:13",[0x1cb5aa,25086,["成都　会議場","成都　議事廳"],"成都　議事廳"]],
]);
export const secondChanganChapters=Object.freeze(["chapter5-wugong-selection","chapter5-changan-siege-source","chapter5-changan-return","chapter5-kongming-return"]);
export const secondChanganVersions=Object.freeze(["chapter5-wugong-selection-presentation/1","chapter5-changan-siege-presentation/1","chapter5-changan-return-presentation/1","chapter5-kongming-return-presentation/1"]);
export const secondChanganCursor=c=>Array.isArray(c)&&c.length===5&&c[0]===5&&c[1]===0&&[9,10,11,12,13,14,15,16,17,18].includes(c[2]);
export function secondChanganCaption(recipe) {
  const cursor=recipe?.sourceCursor;
  if(!secondChanganVersions.includes(recipe?.version)||recipe?.kind!=="caption"||recipe.opcode!==11||!secondChanganCursor(cursor))return null;
  const row=captions.get(cursor.join(":"));
  return row&&recipe.sourceOffset===row[0]&&recipe.details?.reference===row[1]&&row[2].includes(recipe.afterRoom?.caption)?row[3]:null;
}
export function secondChanganDialogue(view) {
  if(!secondChanganChapters.includes(view?.chapterId)||view.coreStage!=="presentation"||view.dialogue)return null;
  const text=secondChanganCaption(view.presentation);
  return text?{textJa:text,speakerDefinition:null}:null;
}
export const secondChanganWorldStill=(room,cursor)=>secondChanganCursor(cursor)&&room?.sceneMode===4096&&room.inputEnabled===false;
