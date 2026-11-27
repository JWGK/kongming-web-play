import {checkQishanPostBattleTrade} from "./qishan-postbattle-exterior.mjs?v=0.73.91-hulu-valley-town";
import {checkQishanDecisiveTrade} from "./qishan-decisive-exterior.mjs?v=0.73.90-wei-river-towns";
import {checkQishanDisputeTrade,isQishanDisputeTrade} from "./qishan-dispute-exterior.mjs?v=0.73.90-wei-river-towns";

// Original opcode 23/0 precedes each settled hub. Script performers and
// dialogue also use these backgrounds, so the scene number alone is not enough.
const hubs = new Map([
  ['4:1:0:3:0',['qishan-dispute-source',7,8197]],
  ['4:1:1:1:0',['qishan-dispute-source',7,8198]],
  ['4:1:1:9:0',['qishan-dispute-source',7,8198]],
  ['4:1:3:5:0',['qishan-dispute-source',42,8200]],
  ['4:1:7:1:0',['qishan-map33-source',17,8200]],
  ['4:3:0:1:0',['chapter4-post-qishan-source',7,8197]],
  ['4:3:1:1:0',['chapter4-post-qishan-source',7,8198]],
  ['4:3:1:3:0',['chapter4-post-qishan-source',7,8198]],
  ['4:3:1:5:0',['chapter4-post-qishan-source',7,8198]],
  ['4:3:1:13:0',['chapter4-post-qishan-source',7,8198]],
  ['4:3:2:7:0',['chapter4-post-qishan-source',7,8198]],
  ['4:3:3:6:0',['chapter4-post-qishan-source',17,8200]],
  ['4:3:7:1:0',['chapter4-hulugu-source',17,8200]],
  ['5:0:1:2:0',['chapter5-changan-source',22,8200]],
]);
function townScope(cursor){
  return Array.isArray(cursor)&&cursor.length===5&&cursor.every(n=>Number.isSafeInteger(n)&&!Object.is(n,-0))?
    hubs.get(cursor.join(':')):null;
}
export const isDisputeTownCursor=(cursor,chapter='qishan-dispute-source')=>townScope(cursor)?.[0]===chapter;
export function disputeTownIsIdle(coreStage,room,cursor,chapter='qishan-dispute-source'){
  if(coreStage!=='hub'||room?.inputEnabled!==true)return false;
  const [owner,city,mode]=townScope(cursor)??[];
  return owner===chapter&&room.currentCity===city&&room.sceneMode===mode;
}

// Check before opening the owner/replaying a record. Choices are indexed
// separately, so a receipt cannot run while passing another identical room.
export function checkDisputeTownJournal(record,validateActions) {
  const kind=record.townCheckpoint;
  const entries=record.townOperations;
  if(kind===undefined&&entries===undefined)return [];
  const need=(pass)=>{if(!pass)throw new RangeError('Invalid Qishan town operation journal');};
  need(['qishan-dispute-source','qishan-map33-source','chapter4-post-qishan-source','chapter4-hulugu-source','chapter5-changan-source'].includes(record.chapter)&&(kind===undefined||kind===1&&isDisputeTownCursor(record.cursor,record.chapter)));
  need(Array.isArray(entries)&&entries.length<=512&&Array.isArray(record.choices));
  let previous=0;
  for(const entry of entries){
    need(entry&&Object.keys(entry).sort().join(',')==='action,beforeChoice,cursor'&&
      Number.isSafeInteger(entry.beforeChoice)&&entry.beforeChoice>=previous&&entry.beforeChoice<=record.choices.length&&
      isDisputeTownCursor(entry.cursor,record.chapter));
    previous=entry.beforeChoice;
  }
  const ordinary=[];
  for(const entry of entries){
    if(isQishanDisputeTrade(entry.action)){
      const check=record.chapter==='qishan-map33-source'?checkQishanDecisiveTrade:
        ['chapter4-post-qishan-source','chapter4-hulugu-source'].includes(record.chapter)?checkQishanPostBattleTrade:checkQishanDisputeTrade;
      check(entry,record.chapter);
    }
    else ordinary.push(entry.action);
  }
  validateActions(ordinary);
  return entries;
}
