/** Current observed-domain projection of native16F8C; never invents unknown entities.
 * Source03 reset all45 descriptors before23. Enemy22 has NOT run at selection.
 * This helper owns no admission authority; caller supplies authenticated current data.
 */
export function secondChencangPreparationSpec(data){
 const need=(v,m)=>{if(!v)throw new TypeError(m);},id=data?.nextBattleContext?.contextId;
 need(['3:3:9','3:3:10'].includes(id)&&data.nextBattleContext.mapIndex===30,'Exact map30 preparation identity');
 const rows=data.variant?.friendlyRows,expected=id==='3:3:9'?[0,7,4]:[0],capacity=id==='3:3:9'?5:11;
 need(Array.isArray(rows)&&rows.filter(r=>r.definition===1024).length===capacity&&JSON.stringify(rows.filter(r=>r.definition<1024).map(r=>r.definition))===JSON.stringify(expected),'Exact map30 source friendly descriptors');
 const known=[...data.playerDefinitionPool,...data.nextBattleContext.knownEntityDefinitions];
 need(new Set(known).size===known.length&&known.every(d=>Number.isInteger(d)&&d>=0&&d<=511),'Disjoint current observed entity partition');
 const templates=new Map(data.entityTemplates.map(e=>[e.definitionIndex,e]));
 const current=known.map(d=>{const e=templates.get(d);need(e&&Number.isInteger(e.entityControlClass)&&e.entityControlClass>=0&&e.entityControlClass<=31,'Known current control required');return e;});
 const eligible=e=>[0,6].includes(e.entityControlClass&31);
 for(const d of expected)need(current.some(e=>e.definitionIndex===d),'Fixed map30 actor must be observed current entity');
 const visibleRequired=expected.filter(d=>eligible(current.find(e=>e.definitionIndex===d)));
 // Native descriptors contain fixed IDs, optional1024 and FFFFFFFF; only fixed
 // IDs can match its0..511 scan. No enemy or predecessor descriptor exclusions.
 const optional=current.filter(e=>eligible(e)&&!expected.includes(e.definitionIndex)).map(e=>e.definitionIndex).sort((a,b)=>a-b).slice(0,128);
 return {requiredDefinitions:visibleRequired,optionalDefinitions:optional,capacity,maxParticipants:visibleRequired.length+capacity};
}
