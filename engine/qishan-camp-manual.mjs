// The saved state is a settled camp, not a renamed second-Chencang or active
// battle record. The owner supplies the same canonical budget as other record
// families, the fixed source pin, and an exact semantic admission function.
const VERSION='qishan-root4-camp-manual/1';
export const QISHAN_CAMP_MANUAL_PREFIX='KONGMING-QISHAN-ROOT4-CAMP-MANUAL/1\n';
const RECORD_LIMIT=524288;
const INVENTORY_OPERATION_LIMIT=512;
const need=(value,message)=>{if(!value)throw new RangeError(message);};
const exact=(value,keys)=>value!==null&&typeof value==='object'&&
  Object.getPrototypeOf(value)===Object.prototype&&Object.keys(value).sort().join(',')===keys;
const pinNumber=(value,max)=>Number.isSafeInteger(value)&&!Object.is(value,-0)&&value>=0&&value<=max;
function counter(value){return value===null||pinNumber(value,65535);}
function flag(bytes,position){return Boolean(bytes[position>>3]&(128>>(position&7)));}
function deepFreeze(value){
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const v of Object.values(value))deepFreeze(v);
    Object.freeze(value);
  }
  return value;
}

export function validateQishanCampSaveSite({source,cursor,sceneFlagBytes}) {
  need(Array.isArray(sceneFlagBytes)&&sceneFlagBytes.length===32&&sceneFlagBytes.every(n=>pinNumber(n,255)),
    'Exact camp route flags');
  const block=flag(sceneFlagBytes,197)?2:1;
  need(Array.isArray(cursor)&&cursor.length===5&&cursor.every(n=>pinNumber(n,255))&&
    cursor[0]===4&&cursor[1]===0&&cursor[2]===block&&cursor[3]>=1&&cursor[3]<=15,
    'Current Root4 camp return site, never another source branch');
  const record=source?.blocks?.[String(block)]?.records?.[String(cursor[3])];
  const end=record?.commands?.at(-1);
  need(end?.opcode===255&&end.record===cursor[3]&&end.commandIndex===cursor[4],
    'Manual save only after a whole source group returned to the camp hub');
  return block;
}

export function createQishanCampManualCodec({createBudget,source,validateSettings,validateSource}={}) {
  need([createBudget,validateSettings,validateSource].every(fn=>typeof fn==='function')&&source,
    'Fixed camp source, settings validator, exact semantic validator and common budget required');
  function admit(payload){
    need(exact(payload,'anchor,inventoryOperations,saveCursor,settings,source,topics,turns,version')&&payload.version===VERSION,
      'Exact Root4 camp manual envelope');
    const anchor=payload.anchor;
    need(exact(anchor,'battle,continuation')&&typeof anchor.battle==='string'&&anchor.battle.length<=RECORD_LIMIT&&
      /^KONGMING-SECOND-CHENCANG-CURRENT(?:-LZ)?\/1\n/.test(anchor.battle)&&
      anchor.continuation?.version==='changan-continuation-source/1',
      'Exact typed camp predecessor checkpoint required');
    validateQishanCampInventoryOperations(payload.inventoryOperations);
    validateQishanCampTopics(payload.topics);
    const leaf=payload.source;
    need(leaf?.version==='qishan-root4-camp-carry/1'&&leaf.nativeScene?.camp?.stage==='idle',
      'Settled Root4 camp record required');
    const block=validateQishanCampSaveSite({source,cursor:payload.saveCursor,sceneFlagBytes:leaf.campaign?.sceneFlagBytes});
    need(JSON.stringify(payload.saveCursor)===JSON.stringify(leaf.nativeScene.camp.sourceCursor),
      'Envelope and live camp source must bind to the same return site');
    need(counter(payload.turns), 'Inner native turn projection required');
    validateSettings(payload.settings);
    const frame=deepFreeze(payload);
    need(validateSource(frame.source,Object.freeze({block,cursor:frame.saveCursor,turns:frame.turns,anchor:frame.anchor,inventoryOperations:frame.inventoryOperations,topics:frame.topics}))===true,
      'Complete, synchronous Root4 camp semantic admission required');
    return frame;
  }
  function parse(text){
    need(typeof text==='string'&&text.startsWith(QISHAN_CAMP_MANUAL_PREFIX)&&text.length<=RECORD_LIMIT,
      'Bounded Root4 camp manual record required');
    const body=text.slice(QISHAN_CAMP_MANUAL_PREFIX.length), budget=createBudget(), value=budget.parse(body);
    need(budget.stringify(value)===body,'Canonical Root4 camp manual representation required');
    return value;
  }
  function encode(value){
    const budget=createBudget(), text=QISHAN_CAMP_MANUAL_PREFIX+budget.stringify(value);
    admit(parse(text));
    return text;
  }
  function decode(text,{expectedChannel,expectedTurns}={}){
    need(expectedChannel==='manual','Explicit Root4 camp manual channel required');
    const value=parse(text);
    need(counter(expectedTurns)&&value?.turns===expectedTurns,'Inner/outer Root4 camp turns must agree');
    return admit(value);
  }
  return Object.freeze({encode,decode});
}

/**
 * Reconstruct the pinned pure briefing controller, not the live presentation
 * owner. This does not mint a visible-animation receipt, run a clock, or
 * mutate the loaded campaign. Used to check a cold state's settled room.
 */
export function rebuildQishanCampBriefing(core, arrival) {
  let {model,intents}=core.fresh(arrival);
  const emitted=[...intents];
  for(let count=0;count<256;count++){
    const state=core.view(model);
    if(state.stage==='hub')
      return {model,intents:emitted,room:core.captureRoom(model),cursor:state.sourceCursor};
    const action=state.stage==='source-command'?{type:'step'}:
      state.stage==='dialogue'?{type:'advance-dialogue'}:
      state.stage==='presentation'?{type:'complete-presentation',presentation:state.presentation}:null;
    need(action,'Unreviewed source state during camp blueprint reconstruction');
    ({model,intents}=core.reduce(model,action));
    emitted.push(...intents);
  }
  throw new RangeError('Bounded camp briefing reconstruction');
}

export function validateQishanCampInventoryOperations(actions){
  need(Array.isArray(actions)&&actions.length<=INVENTORY_OPERATION_LIMIT,'Bounded camp inventory action proof');
  const owner=v=>pinNumber(v,511),slot=v=>pinNumber(v,254),bag=v=>pinNumber(v,12)&&v>=3;
  const endpoint=v=>v?.ownerDefinitionIndex===null?
    exact(v,'itemSlotId,ownerDefinitionIndex')&&pinNumber(v.itemSlotId,255):
    exact(v,'inventoryIndex,ownerDefinitionIndex')&&owner(v.ownerDefinitionIndex)&&bag(v.inventoryIndex);
  for(const action of actions){
    const kind=action?.type;
    const okay=kind==='equip'?exact(action,'definitionIndex,itemSlotId,type')&&owner(action.definitionIndex)&&slot(action.itemSlotId):
      kind==='unequip'?exact(action,'definitionIndex,inventoryIndex,type')&&owner(action.definitionIndex)&&pinNumber(action.inventoryIndex,2):
      kind==='use'?exact(action,'definitionIndex,inventoryIndex,type')&&owner(action.definitionIndex)&&bag(action.inventoryIndex):
      kind==='exchange'&&exact(action,'from,to,type')&&endpoint(action.from)&&endpoint(action.to);
    need(okay,'Exact camp inventory proof action');
  }
}

export function replayQishanCampInventory(initial,actions,operate){
  validateQishanCampInventoryOperations(actions);
  need(typeof operate==='function','Fixed camp inventory operation implementation');
  let current=initial;
  for(const action of actions){
    const result=operate(current,action);
    need(result?.applied===true,'Camp inventory command must replay exactly');
    current=result.persistentState;
  }
  return current;
}

export function validateQishanCampTopics(topics) {
  need(Array.isArray(topics)&&topics.length<=512&&topics.every(id=>pinNumber(id,511)&&id!==0&&id!==4),
    'Bounded settled camp NPC topics');
}

// Mechanical cold validation for the actual source/interaction paths. These
// short synchronous reductions are isolated from the real presenter and do not
// trade, update discovery storage, or start a live NPC interaction.
export function rebuildQishanCampTopics({core,briefing,interaction,initialInteraction,topics}){
  validateQishanCampTopics(topics);
  let model=briefing.model, room=interaction.freshTestSeed(initialInteraction).model;
  const intents=[...briefing.intents];
  function applyRoom(action){room=interaction.reduce(room,action).model;}
  function drainRoom(stop){
    for(let i=0;i<512;i++){
      const view=interaction.view(room);
      if(view.stage===stop)return;
      const action=view.stage==='approach'?{type:'advance-approach'}:
        view.stage==='presentation'?{type:'complete-presentation',presentation:view.presentation}:null;
      need(action,'Exact source-approved camp approach/return');
      applyRoom(action);
    }
    throw new RangeError('Bounded camp actor approach');
  }
  function applyCore(action){
    const result=core.reduce(model,action);
    model=result.model;intents.push(...result.intents);
  }
  for(const definitionIndex of topics){
    applyRoom({type:'select-target',definitionIndex});
    drainRoom('dialogue');
    applyCore({type:'talk',definitionIndex});
    for(let i=0;core.view(model).stage!=='hub';i++){
      const stage=core.view(model).stage;
      need(i<256&&['dialogue','source-command'].includes(stage),'Bounded current camp NPC script');
      applyCore({type:stage==='dialogue'?'advance-dialogue':'step'});
    }
    applyRoom({type:'source-talk-return'});
    drainRoom('idle');
  }
  return {model,intents,room:core.captureRoom(model),cursor:core.view(model).sourceCursor,
    visualActors:interaction.view(room).actors};
}

export function sameQishanCampVisualActors(derived,actual) {
  if(!Array.isArray(derived)||!Array.isArray(actual)||derived.length!==actual.length)return false;
  return actual.every((row,i)=>{
    const keys='definitionIndex,drawCounter,facing,highlighted,nativeState,poseSelector,slotIndex,stepPhase,x,y';
    if(!exact(row,keys)||!pinNumber(row.drawCounter,15))return false;
    // Ongoing ambient rendering is the only unsaved input to this counter.
    return keys.split(',').every(key=>key==='drawCounter'||row[key]===derived[i][key]);
  });
}
