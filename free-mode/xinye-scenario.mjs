// Source-to-VM projection. Construction remains outside the tactical VM.
import source from './xinye-source.mjs';

const contextId = '6:0:0';
const specs = Object.freeze({
  0x00: ['dialogue', d => ({value_u16:d.reference})],
  0x06: ['scene_presentation_cleanup', () => ({})],
  0x0b: ['message_panel', d => ({value_u16:d.reference})],
  0x11: ['scene_mode_present', d => ({
    value_u16:d.value, battle_byte_02_if_gate_passes:2, required_scene_kind:3
  })],
  0x13: ['advance_group', () => ({}), 'internal'],
  0x14: ['set_flag', d => ({flag:d.flag,value:d.value}), 'internal'],
  0x1a: ['deploy_unit', d => ({value_u16:d.value})],
  0x1b: ['inventory_object_operation', d => ({value_u8:d.value})],
  0x21: ['conditional_skip', d => ({
    skip_commands:d.skipCommands,all_set:[...d.allSet],all_clear:[...d.allClear]
  }), 'internal'],
  0x29: ['free_mode_return', () => ({})],
  0x2b: ['subcommand', d => ({subcommand:d.subcommand,value_u16:d.word})],
  0x30: ['victory_text_reference', d => ({value_u16:d.reference})],
  0x36: ['presentation_transition', () => ({})],
  0x38: ['bgm_select', d => ({value_u8:d.value})],
  0xff: ['end_event', () => ({}), 'internal'],
});
const groups = [
  // Record 0 is the original constructor, consumed by createXinyePreparation.
  // It is deliberately not an executable VM group in this projection.
  {start_record:1,record_count:1,group:1,repeat_on_end:false,next_group_start:2},
  {start_record:2,record_count:7,group:2,repeat_on_end:true,next_group_start:9},
  {start_record:9,record_count:1,group:3,repeat_on_end:false,next_group_start:null},
];

export function createXinyeFreeScenarioInventory() {
  const records = [{index:0,type_raw:0,selector:0,argument_b:0,argument_c:0,script_id:'xinye-free-0'}];
  const scripts = [{id:'xinye-free-0',commands:[{
    id:'xinye-free-0-end',opcode:255,decoded:{},operation:'constructor_outside_vm',support:'blocked'
  }]}];
  for (const row of source.records) {
    const id = 'xinye-free-' + row.record;
    records.push({index:row.record,type_raw:row.typeRaw,selector:row.selector,argument_b:row.argB,
      argument_c:row.argC,script_id:id});
    scripts.push({id,commands:row.commands.map(({opcode,decoded},index) => {
      const [operation,normalize,support='host_effect_required'] = specs[opcode] ?? [];
      if (!normalize) throw new TypeError('Unreviewed 6:0:0 scenario opcode ' + opcode);
      return {id:id+'-'+index,opcode,decoded:normalize(decoded),operation,support};
    })});
  }
  return {
    schema_version:'1.0.0',purpose:'normalized_campaign_battle_scenario',contextId,block_index:0,
    source_rom:{sha256:source.source.romSha256},block_sha256:source.source.blockSha256,
    records,scripts,groups:structuredClone(groups),
    opening_context:{group_start:1,record_index:1},
    canonical_context:{group_start:2,scene_mode:source.map.scene,resume_state:0,flags:Array(256).fill(false)},
  };
}
