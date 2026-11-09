import {NATIVE_ZERO_GRAPH_SAVE_BINDINGS} from './native-zero-save-bindings.mjs';
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const need=(value,message)=>{if(!value)throw new RangeError(message);};
/** Presentation-only cold target for an exact reviewed source 3D00 save.
 * This never executes the live continuation or derives prior mutable state.
 * Unlisted manual saves retain their existing behavior, including 3D01.
 */
export function nativeZeroGraphSaveTarget(data,nodeId){
 const row=NATIVE_ZERO_GRAPH_SAVE_BINDINGS.find(row=>row.graphId===data.graphId&&row.saveId===nodeId);
 if(!row)return null;
 need(data.chapterId===row.chapterId&&same(data.sourceContext,row.sourceContext),'Changed native zero-save graph identity');
 need(same(data.nodes?.[row.saveId],row.saveNode)&&same(data.nodes?.[row.hubId],row.hubNode),'Changed native zero-save source/target');
 need(same(data.phases?.[row.saveNode.phase],row.phaseData)&&same(data.phases?.[row.hubNode.phase],row.phaseData),'Changed native zero-save current phase');
 need(same(data.menuProfiles?.[row.hubNode.menuProfileId]??null,row.menuProfile),'Changed native zero-save hub menu');
 return row.hubId;
}
