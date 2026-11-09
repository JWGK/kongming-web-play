import {validateChapter5ChanganSiegeReloadSite} from './chapter5-changan-siege-source.mjs';
import {validateNananTianshuiReloadSite} from './nanan-tianshui-source.mjs';
/** Strict first-battle scenario VM. Executes confirmed flag/control instructions.
 * Tactical/presentation effects suspend until the host explicitly applies them.
 * Unknown effects/opcodes are never treated as no-ops or completed battles.
 */
import {REVIEWED_CAMPAIGN_SCENARIOS} from './reviewed-campaign-scenarios.mjs';
import {UnsupportedRuleError} from './abilities.mjs';
const ROM='acf307942c7dc645cbf66ae13127437de146a2c3ce89d68a55003509f2e97511';
const BLOCK='b910e4ee70c8e52fef902f0ba64ae6b1a4f270b699b8393a27522ef542e4edf0';
const BOWANG_BLOCKS={
 1:{start:0x13be91,end:0x13c4c3,count:11,hash:'071e6677efe347edc96243c0887a18db2d4e16b17363f98262d97090bf9fdb86'},
 2:{start:0x13c4c3,end:0x13ca44,count:11,hash:'dc9d3a7fef1fdcf466711fe993e7dd63325955ce6258699a24e473efb15cc286'},
 3:{start:0x13ca44,end:0x13d1b9,count:15,hash:BLOCK},
 4:{start:0x13d1b9,end:0x13d7cf,count:13,hash:'d2799654d97bd6e6a98f1154e90e56a391e2761494fbc1a109735861f7ad87b7'}
};
const clone=v=>JSON.parse(JSON.stringify(v));
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
function guard(ok,rule){if(!ok)throw new UnsupportedRuleError(rule);}
function integer(v,min,max,name){if(!Number.isSafeInteger(v)||v<min||v>max)throw new RangeError(name);return v;}
function dense(v,n,name){if(!Array.isArray(v)||v.length!==n||Array.from({length:n},(_,i)=>!Object.hasOwn(v,i)).some(Boolean))throw new TypeError(name);return v;}
function flags(v){dense(v,256,'256 explicit scenario flags required');if(v.some(x=>typeof x!=='boolean'))throw new TypeError('Flags must be booleans');return [...v];}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
const u16=(a,i=0)=>a[i]|(a[i+1]<<8);
const EFFECT_OPCODES=new Set([0x12,0x26,0x15,0x25,0x3b,0x08,0x20,0x28,0x2c,0x3a,0x01,0x06,0x23,0x3c,0x00,0x03,0x05,0x09,0x0b,0x0f,0x10,0x11,0x17,0x18,0x1a,0x1b,0x1c,
  0x22,0x24,0x27,0x2b,0x2e,0x30,0x32,0x35,0x36,0x38,0x39]);
function conditionPass(d,values){return d.all_set.every(i=>values[i])&&d.all_clear.every(i=>!values[i]);}
function controlDecoded(c){
 const a=c.argument_bytes,d=clone(c.decoded??{});if(!a)return d;
 if(c.opcode===0x14)return {...d,flag:a[0],value:a[1]===0};
 if(c.opcode===0x21){const at=2+a[1];return {...d,skip_commands:a[0],all_set:a.slice(2,at),all_clear:a.slice(at+1)};}
 if([0x09,0x11].includes(c.opcode))return {...d,value_u16:u16(a)};
 if(c.opcode===0x0f)return {...d,value_u8:a[0]};return d;
}
function validateControl(c){const d=c.decoded;
 if(c.opcode===0x14){integer(d.flag,0,255,'flag');guard(typeof d.value==='boolean','scenario_flag_value');}
 if(c.opcode===0x21){integer(d.skip_commands,0,255,'skip count');for(const key of ['all_set','all_clear']){guard(Array.isArray(d[key])&&d[key].length<=255,'scenario_flag_conditions');d[key].forEach(x=>integer(x,0,255,'flag condition'));}}
 if([0x09,0x11].includes(c.opcode))integer(d.value_u16,0,65535,'scene mode');
 if(c.opcode===0x0f)integer(d.value_u8,0,255,'block');
}

/** Original13288 return codes:0 victory-target death,1 loss-target death,2other.
 * This only classifies the definition; it neither removes units nor ends battle.
 */
export function classifyScenarioDeath(conditions,definition){
  integer(definition,0,65535,'definition');
  for(const key of ['victory','defeat']){
    if(typeof conditions?.[`${key}Enabled`]!=='boolean')throw new TypeError('Explicit death condition enable required');
    integer(conditions[`${key}Definition`],0,65535,'death condition definition');
  }
  if(conditions.victoryEnabled&&conditions.victoryDefinition===definition)return 0;
  if(conditions.defeatEnabled&&conditions.defeatDefinition===definition)return 1;
  return 2;
}

/** Primitive descriptor predicates proven by the original lookup helpers.
 * Semantic names select an original lookup, not permission to declare victory.
 * Generic type0 script-prefix conditions are handled by selectEvent, not here.
 */
export function matchesScenarioDescriptor(row,query){
  integer(row?.type_raw,0,254,'descriptor type');
  const type=row.type_raw&127, a=row.selector,b=row.argument_b,c=row.argument_c;
  for(const value of [a,b,c])integer(value,0,65535,'descriptor argument');
  if(['coordinate','rectangle','adjacency'].includes(query?.kind))integer(query.selector,0,65535,'selector');
  if(['coordinate','rectangle'].includes(query?.kind)){integer(query.x,0,255,'x');integer(query.y,0,255,'y');}
  if(query?.kind==='adjacency')integer(query.neighborDefinition,0,65535,'neighbor definition');
  if(['type9_value','type12_value','turn_start','postdeath'].includes(query?.kind))integer(query.value,0,65535,'predicate value');
  let result;
  switch(query?.kind){
    case 'coordinate':result=type===6&&a===query.selector&&b===((query.x<<8)|query.y);break;
    case 'rectangle':result=type===11&&a===query.selector&&(b>>>8)<=query.x&&query.x<=(c>>>8)&&
      (b&255)<=query.y&&query.y<=(c&255);break;
    case 'adjacency':result=type===4&&a===query.selector&&b===query.neighborDefinition;break;
    case 'turn_start':case 'type9_value':result=type===9&&a===query.value;break;
    case 'postdeath':case 'type12_value':result=type===12&&a===query.value;break;
    case 'victory':case 'type7':result=type===7;break;
    case 'defeat':case 'type8':result=type===8;break;
    case 'generic':result=type===0&&(query.genericPredicateResult??true);break;
    default:throw new UnsupportedRuleError('unknown_scenario_predicate');
  }
  return row.type_raw===1 || (row.type_raw&128) ? !result : result;
}

/** Browser-safe typed inventory: no encoded script payloads or source addresses. */
export function normalizeScenarioInventory(inventory){
  // Reuse the strict private parser checks before stripping provenance payloads.
  guard(inventory?.purpose==='private_first_battle_scenario_bytecode','normalize_requires_private_inventory');
  createScenarioEventInterpreter(inventory);
  const scriptIds=new Map(inventory.scripts.map((s,i)=>[s.entry_pc,`script-${i}`]));
  function decoded(c){
    const d=controlDecoded(c);
    function strip(v){if(Array.isArray(v))return v.map(strip);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v)
      .filter(([k])=>!['raw_bytes','header_bytes','unresolved_tail_bytes','ignored_bytes','argument_bytes','native_helper','source_value',
        'scene_boolean_01c6','scene_bytes_06be_06bf','phase_gate_global_0201194c_byte_09'].includes(k)).map(([k,x])=>[k,strip(x)]));return v;}
    const out=strip(d);
    if(c.opcode===3)out.turn_limit=d.header_bytes[1];
    if(c.opcode===0x11)out.required_scene_kind=d.phase_gate_global_0201194c_byte_09;
    if(c.opcode===0x35){const a=d.arguments_u8;delete out.arguments_u8;out.transitionParameters={first:a[0],second:a[1],third:a[2],fourth:a[3]};}
    return out;
  }
  return freeze({schema_version:'1.0.0',purpose:'normalized_first_battle_scenario',source_rom:{sha256:ROM},
    block_index:inventory.block_index,block_sha256:inventory.block_sha256,
    records:inventory.records.map(r=>({index:r.index,type_raw:r.type_raw,selector:r.selector,argument_b:r.argument_b,
      argument_c:r.argument_c,script_id:scriptIds.get(r.script_pc)})),groups:clone(inventory.groups),
    scripts:inventory.scripts.map((s,i)=>({id:scriptIds.get(s.entry_pc),commands:s.commands.map((c,j)=>({id:`script-${i}-command-${j}`,
      opcode:c.opcode,decoded:decoded(c),operation:c.operation,support:c.support}))})),
    opening_context:{block_index:inventory.block_index,group_start:0,record_index:0,flags_must_come_from_preopening_state:true},
    canonical_context:{group_start:inventory.canonical_context.group_start,scene_mode:inventory.canonical_context.scene_mode,
      resume_state:0,flags:[...inventory.canonical_context.flags]}});
}

export function createScenarioEventInterpreter(inventory){
  const campaign=inventory?.purpose==='normalized_campaign_battle_scenario',normalized=campaign||inventory?.purpose==='normalized_first_battle_scenario',profile=campaign?REVIEWED_CAMPAIGN_SCENARIOS[inventory.contextId]:BOWANG_BLOCKS[inventory?.block_index];
  if(campaign)guard(profile?.blockIndex===inventory.block_index,'campaign_scenario_context');
  guard((normalized||inventory?.purpose==='private_first_battle_scenario_bytecode')&&inventory.schema_version==='1.0.0'&&
    inventory.source_rom?.sha256===ROM&&profile&&inventory.block_sha256===profile.hash&&
    (normalized||(inventory.block_start===profile.start&&inventory.block_end===profile.end)),'scenario_inventory');
  const data=clone(inventory);
  if(normalized){data.records=data.records.map(r=>({...r,script_pc:r.script_id}));
    data.scripts=data.scripts.map(s=>({...s,entry_pc:s.id}));}
  dense(data.records,profile.count,'Exact first-battle variant descriptor count required');
  const scripts=new Map(),groups=new Map(),commandIds=new Set();
  for(const g of data.groups){
    integer(g.start_record,0,profile.count-1,'group start');integer(g.record_count,1,profile.count,'group count');
    guard(g.start_record+g.record_count<=profile.count&&!groups.has(g.start_record),'scenario_group');groups.set(g.start_record,g);
  }
  for(const s of data.scripts){
    guard(Array.isArray(s.commands)&&s.commands.length>0&&s.commands.at(-1).opcode===255,'scenario_script');
    let pc=s.entry_pc;
    for(const c of s.commands){
      integer(c.opcode,0,255,'opcode');
      if(!normalized){
        integer(c.size,1,572,'command size');
        dense(c.argument_bytes,c.size-1,'complete command payload required').forEach(x=>integer(x,0,255,'argument byte'));
        guard(c.pc===pc,'scenario_command_boundary');pc+=c.size;
        const a=c.argument_bytes;let expected=c.opcode===255?0:data.argument_lengths?.[c.opcode];
        if(c.opcode===0x20)expected=1+(a[0]&127);
        if(c.opcode===0x21)expected=3+a[1]+a[2+a[1]];
        guard(Number.isInteger(expected)&&a.length===expected,'scenario_opcode_payload');
        c.id=String(c.pc);c.decoded=controlDecoded(c);
      }else guard(typeof c.id==='string'&&c.id.length>0&&!commandIds.has(c.id),'scenario_command_id');
      commandIds.add(c.id);validateControl(c);if(c.opcode===0x12){const r=data.records.find(r=>r.script_pc===s.entry_pc);guard(campaign&&((data.contextId==='3:3:9'&&r?.index===9&&s.commands.indexOf(c)===22)||(data.contextId==='3:3:10'&&r?.index===8&&s.commands.indexOf(c)===10))&&same(c.decoded,{}),'unreviewed_root_advance');}if(c.opcode===0x26){guard(campaign,'unreviewed_map_reload');const r=data.records.find(r=>r.script_pc===s.entry_pc);if(data.contextId==='5:0:12')validateChapter5ChanganSiegeReloadSite(data.contextId,r?.index,s.commands.indexOf(c),c.decoded);else validateNananTianshuiReloadSite(data.contextId,r?.index,s.commands.indexOf(c),c.decoded);}
      guard(c.support==='internal'||c.support==='host_effect_required'||c.support==='blocked','scenario_opcode_support');
    }
    if(!normalized)guard(pc===s.end_pc&&s.entry_pc>=data.block_start&&s.end_pc<=data.block_end,'scenario_script_bound');
    guard(!scripts.has(s.entry_pc),'scenario_duplicate_script');scripts.set(s.entry_pc,s);
  }
  for(const r of data.records)guard(scripts.has(r.script_pc),'scenario_record_script');
  freeze(data);
  const evidence=c=>normalized?{commandId:c.id}:{pc:c.pc};
  function validate(vm){
    guard(vm?.schemaVersion==='1.0.0'&&vm.blockIndex===data.block_index&&(!campaign||vm.contextId===data.contextId),'scenario_state');
    const record=data.records[integer(vm.recordIndex,0,profile.count-1,'record index')];
    const script=scripts.get(record.script_pc);
    integer(vm.commandIndex,0,script.commands.length,'command index');flags(vm.flags);
    guard(groups.has(vm.groupStart),'scenario_state_group');integer(vm.sceneMode,0,65535,'scene mode');
    guard(['running','awaiting_effect','complete','blocked'].includes(vm.status),'scenario_state_status');
    if(vm.status==='running')guard(vm.commandIndex<script.commands.length,'scenario_pc_after_end');
    if(vm.status==='awaiting_effect'){
      const c=script.commands[vm.commandIndex];
      guard(c&&vm.pendingEffect?.id===`${vm.recordIndex}:${vm.commandIndex}:${c.id}`,'scenario_pending_effect');
      if(['3:2:3','3:2:4','3:2:7','3:2:8','3:2:12','3:2:14','3:3:4','3:3:5','3:3:9','3:3:10','4:0:3','4:0:4','4:1:4','4:1:5','4:1:8','4:3:4','4:3:5','4:3:8','4:3:9','4:3:13','4:3:16','5:0:2','5:0:3','5:0:6','5:0:7','5:0:12'].includes(data.contextId))guard(same(vm.pendingEffect,{id:`${vm.recordIndex}:${vm.commandIndex}:${c.id}`,kind:c.operation,opcode:c.opcode,...evidence(c),arguments:clone(c.decoded),requiresHostImplementation:true}),'qishan_source_pending_effect');
    }
    return {record,script,group:groups.get(vm.groupStart)};
  }
  function begin({recordIndex,groupStart,flags:values,sceneMode=0x3000,resumeState=0,commandIndex=0}={}){
    guard(resumeState===0,'scenario_native_continuation_not_supported');
    const record=data.records[integer(recordIndex,0,profile.count-1,'record index')],g=groups.get(groupStart);
    guard(g&&recordIndex>=g.start_record&&recordIndex<g.start_record+g.record_count,'record_outside_active_group');
    integer(sceneMode,0,65535,'scene mode');
    integer(commandIndex,0,scripts.get(record.script_pc).commands.length-1,'command index');
    guard(commandIndex===0||(campaign&&['5:0:2','5:0:3','5:0:6','5:0:7','5:0:12'].includes(data.contextId)&&groupStart===0&&recordIndex===0&&commandIndex===2&&scripts.get(record.script_pc).commands[commandIndex].opcode===0x22)||(campaign&&['4:3:13','4:3:16'].includes(data.contextId)&&groupStart===0&&recordIndex===0&&commandIndex===(data.contextId==='4:3:13'?2:3)&&scripts.get(record.script_pc).commands[commandIndex].opcode===0x22)||(campaign&&['4:3:4','4:3:5','4:3:8','4:3:9'].includes(data.contextId)&&groupStart===0&&recordIndex===0&&commandIndex===2&&scripts.get(record.script_pc).commands[2].opcode===0x22)||(campaign&&data.contextId==='4:1:8'&&groupStart===0&&recordIndex===0&&commandIndex===2&&scripts.get(record.script_pc).commands[2].opcode===0x22)||(campaign&&['4:1:4','4:1:5'].includes(data.contextId)&&groupStart===0&&recordIndex===0&&commandIndex===3&&scripts.get(record.script_pc).commands[3].opcode===0x22)||(campaign&&['4:0:3','4:0:4'].includes(data.contextId)&&groupStart===0&&recordIndex===0&&commandIndex===2&&scripts.get(record.script_pc).commands[2].opcode===0x22)||(campaign&&data.contextId==='1:0:3'&&groupStart===8&&((recordIndex===9&&commandIndex===8)||(recordIndex===10&&commandIndex===5)))||(commandIndex===1&&g.repeat_on_end&&(record.type_raw&127)===0&&
      scripts.get(record.script_pc).commands[0].opcode===0x21),'scenario_unsupported_entry_cursor');
    return freeze({schemaVersion:'1.0.0',blockIndex:data.block_index,...(campaign?{contextId:data.contextId}:{}),groupStart,recordIndex,commandIndex,
      sceneMode,flags:flags(values),status:'running',pendingEffect:null,returnCode:null,
      transition:null,executedCommands:0});
  }
  function selectEvent({groupStart,resumeState=0,flags:values},query){
    guard(resumeState===0,'scenario_native_continuation_not_supported');
    const g=groups.get(groupStart);guard(g,'unknown_scenario_group');
    for(const r of data.records.slice(g.start_record,g.start_record+g.record_count)){
      let q=query,commandIndex=0;
      const first=scripts.get(r.script_pc).commands[0];
      if(query.kind==='generic'&&(r.type_raw&127)===0&&g.repeat_on_end&&first.opcode===0x21){
        q={...query,genericPredicateResult:conditionPass(first.decoded,flags(values))};commandIndex=1;
      }
      if(matchesScenarioDescriptor(r,q))return freeze({recordIndex:r.index,commandIndex,
        adjacencyDefinitions:query.kind==='adjacency'?[query.selector,query.neighborDefinition]:null});
    }
    return null;
  }
  function findEvent(context,query){
    const selected=selectEvent(context,query);
    guard(!selected||selected.commandIndex===0,'use_selectEvent_for_consumed_condition_cursor');
    return selected?.recordIndex??null;
  }
  function advanceGroup(vm,group){
    if(group.next_group_start===null){vm.transition={kind:'next_block',blockIndex:data.block_index+1};}
    else vm.groupStart=group.next_group_start;
  }
  function run(input,{maxCommands=1024}={}){
    validate(input);integer(maxCommands,1,10000,'maxCommands');const vm=clone(input);
    if(vm.status!=='running')return freeze(vm);
    for(let budget=0;budget<maxCommands;budget++){
      const {script,group}=validate(vm),c=script.commands[vm.commandIndex],d=c.decoded;
      if(c.opcode===0x14){
        // Flags210..229 have extra character side effects in original15AA4.
        if(d.flag>=210&&d.flag<=229){vm.status='blocked';vm.transition={reason:'flag_has_unimplemented_character_side_effect',opcode:20,...evidence(c)};return freeze(vm);}
        vm.flags[d.flag]=d.value;vm.commandIndex++;
      }else if(c.opcode===0x21){
        const pass=conditionPass(d,vm.flags);
        const skipped=script.commands.slice(vm.commandIndex+1,vm.commandIndex+1+d.skip_commands),nested=skipped.filter(x=>x.opcode===0x21);const reviewedNativeSkip=campaign&&data.contextId==='2:2:2'&&vm.recordIndex===7&&vm.commandIndex===6&&d.skip_commands===1&&nested.length===1&&nested[0].decoded.skip_commands===1&&nested[0].decoded.all_set.length===0&&JSON.stringify(nested[0].decoded.all_clear)==='[0]';
        // Native13504 skips this exact [1,0,1,0] payload to its true command end. Other nested encodings remain guarded.
        if(!pass&&nested.length&&!reviewedNativeSkip){
          vm.status='blocked';vm.transition={reason:'nested_conditional_native_skip_cursor_not_supported',...evidence(c)};return freeze(vm);
        }
        vm.commandIndex+=1+(pass?0:d.skip_commands);guard(vm.commandIndex<script.commands.length,'conditional_skip_outside_script');
      }else if(c.opcode===0x33){vm.commandIndex++; // Called helper4A680 is literally bx lr.
      }else if(c.opcode===0x13){advanceGroup(vm,group);vm.commandIndex++;vm.returnCode=5;vm.status='complete';
      }else if(c.opcode===0xff){
        if(!group.repeat_on_end)advanceGroup(vm,group);
        vm.commandIndex++;vm.returnCode=(vm.sceneMode&0xf000)===0x1000?0:1;vm.status='complete';
      }else if(c.support==='host_effect_required'&&EFFECT_OPCODES.has(c.opcode)){
        // Tactical effects cannot be silently acknowledged by this VM.
        if(c.opcode===0x1c&&(campaign?(vm.sceneMode&0xf000)!==0x3000:vm.sceneMode!==0x3000)){vm.status='blocked';vm.transition={reason:'unit_order_requires_battle_scene_mode',...evidence(c)};return freeze(vm);}
        vm.status='awaiting_effect';vm.pendingEffect={id:`${vm.recordIndex}:${vm.commandIndex}:${c.id}`,
          kind:c.operation,opcode:c.opcode,...evidence(c),arguments:clone(c.decoded),
          ...(normalized?{}:{argumentBytes:[...c.argument_bytes]}),
          requiresHostImplementation:true};return freeze(vm);
      }else{vm.status='blocked';vm.transition={reason:'unsupported_scenario_opcode',opcode:c.opcode,...evidence(c)};return freeze(vm);}
      vm.executedCommands++;
      if(vm.status==='complete')return freeze(vm);
    }
    // Bounded yield is resumable, not event completion.
    return freeze(vm);
  }
  function resume(input,{effectId,handled=false}={}){
    const {script}=validate(input);guard(input.status==='awaiting_effect','scenario_no_pending_effect');
    guard(handled===true&&effectId===input.pendingEffect.id,'scenario_effect_not_explicitly_handled');
    const vm=clone(input),c=script.commands[vm.commandIndex];
    if(c.opcode===0x09||c.opcode===0x11)vm.sceneMode=c.decoded.value_u16;
    vm.commandIndex++;vm.executedCommands++;vm.pendingEffect=null;vm.status='running';
    if(c.opcode===0x12){vm.transition={kind:'advance_root',root:4,section:0,blockIndex:0,groupStart:0};vm.status='complete';vm.returnCode=1;}
    else if(c.opcode===0x0f){vm.transition={kind:'set_block',blockIndex:c.decoded.value_u8,groupStart:0};vm.status='complete';vm.returnCode=(vm.sceneMode&0xf000)===0x1000?0:1;}
    else if(c.opcode===0x09){vm.status='complete';vm.returnCode=2;vm.transition={kind:'scene_mode_yield',resumeCommandIndex:vm.commandIndex};}
    else if(c.opcode===0x05){vm.status='complete';vm.returnCode=0;vm.transition={kind:'scene_yield',resumeCommandIndex:vm.commandIndex};}
    return freeze(vm);
  }
  function confirmSourcePrompt(input,{confirmed}={}){
    const {script}=validate(input),c=script.commands[input.commandIndex];
    guard(['2:2:1','2:2:2'].includes(data.contextId)&&input.status==='awaiting_effect'&&c.opcode===0x15&&input.recordIndex===4&&c.decoded.comparisonValue===0&&c.decoded.skipCommands===1,'unreviewed_source_confirmation');
    guard(typeof confirmed==='boolean','explicit_source_confirmation_required');
    const out=clone(input);out.commandIndex+=1+((confirmed?1:0)===c.decoded.comparisonValue?c.decoded.skipCommands:0);out.executedCommands++;out.pendingEffect=null;out.status='running';validate(out);return freeze(out);
  }
  function chooseSourceOption(input,{optionIndex}={}){
    const {script}=validate(input),c=script.commands[input.commandIndex];
    const qishan=data.contextId==='3:2:3'&&input.commandIndex===0&&({2:4377,7:4964,12:5589})[input.recordIndex]===c.decoded.value_u16;
    guard(input.status==='awaiting_effect'&&c.opcode===0x25&&(qishan||(data.contextId==='2:1:5'&&input.recordIndex===7&&c.decoded.value_u16===14955)),'unreviewed_source_choice');
    integer(optionIndex,0,qishan?2:1,'source option');
    const out=clone(begin({recordIndex:input.recordIndex+optionIndex+1,groupStart:input.groupStart,flags:input.flags,sceneMode:input.sceneMode}));out.executedCommands=input.executedCommands+1;return freeze(out);
  }
  function continueAfterYield(input,{resumeState=1}={}){
    validate(input);guard(resumeState===1&&input.status==='complete'&&
      ['scene_yield','scene_mode_yield'].includes(input.transition?.kind)&&
      input.transition.resumeCommandIndex===input.commandIndex,'scenario_not_known_yield');
    const vm=clone(input);vm.status='running';vm.transition=null;vm.returnCode=null;return freeze(vm);
  }
  return Object.freeze({begin,run,resume,confirmSourcePrompt,chooseSourceOption,continueAfterYield,resumeContinuation:continueAfterYield,findEvent,selectEvent,
    openingEntry:freeze(clone(data.opening_context)),canonicalContext:freeze(clone(data.canonical_context)),
    records:data.records,groups:data.groups});
}
