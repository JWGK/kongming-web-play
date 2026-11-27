// Original opcode 23/0 precedes each settled hub. Script performers and
// dialogue also use these backgrounds, so the scene number alone is not enough.
const hubs = new Map([
  ['4:1:0:3:0',[7,8197]],
  ['4:1:1:1:0',[7,8198]],
  ['4:1:1:9:0',[7,8198]],
  ['4:1:3:5:0',[42,8200]],
]);
export const isDisputeTownCursor=cursor=>Array.isArray(cursor)&&cursor.length===5&&cursor.every(n=>Number.isSafeInteger(n)&&!Object.is(n,-0))&&hubs.has(cursor.join(':'));
export function disputeTownIsIdle(coreStage,room,cursor){
  if(coreStage!=='hub'||!isDisputeTownCursor(cursor)||room?.inputEnabled!==true)return false;
  const [city,mode]=hubs.get(cursor.join(':'));
  return room.currentCity===city&&room.sceneMode===mode;
}

// Check before opening the owner/replaying a record. Choices are indexed
// separately, so a receipt cannot run while passing another identical room.
export function checkDisputeTownJournal(record,validateActions) {
  const kind=record.townCheckpoint;
  const entries=record.townOperations;
  if(kind===undefined&&entries===undefined)return [];
  const need=(pass)=>{if(!pass)throw new RangeError('Invalid Map32 town operation journal');};
  need(record.chapter==='qishan-dispute-source'&&(kind===undefined||kind===1&&isDisputeTownCursor(record.cursor)));
  need(Array.isArray(entries)&&entries.length<=512&&Array.isArray(record.choices));
  let previous=0;
  for(const entry of entries){
    need(entry&&Object.keys(entry).sort().join(',')==='action,beforeChoice,cursor'&&
      Number.isSafeInteger(entry.beforeChoice)&&entry.beforeChoice>=previous&&entry.beforeChoice<=record.choices.length&&
      isDisputeTownCursor(entry.cursor));
    previous=entry.beforeChoice;
  }
  validateActions(entries.map(entry=>entry.action));
  return entries;
}
