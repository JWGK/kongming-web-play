/** Pure manual representation adapter. No localStorage, bank registration, writes or autosave.
 * The owner/bank must atomically pair source, settings and displayed turn count. */
import {createChapter5JianningReturnManualCodec} from './game-chapter5-jianning-return-manual-codec.mjs';
import {CHAPTER5_JIANNING_RETURN_MANUAL_SITE as SAVE,isChapter5JianningReturnSourceApi} from './game-chapter5-jianning-return-source.mjs';
import {isChapter5JianningReturnSourceConfiguration} from './game-chapter5-jianning-return-config.mjs';
const need=(v,m)=>{if(!v)throw new RangeError(m);};
export function createChapter5JianningReturnManualStorage({configuration,sourceApi}={}){
 need(isChapter5JianningReturnSourceConfiguration(configuration)&&isChapter5JianningReturnSourceApi(sourceApi)&&sourceApi.inspectionConfigurationIdentity()===configuration,'Exact captured Jianning return source/storage configuration');
 const codec=createChapter5JianningReturnManualCodec({validateSource:(s,o)=>sourceApi.inspectManualSnapshot(s,o)});
 function prepareRecord({model,settings,turns}){need(sourceApi.ownsModel(model),'Current issued source model before logical manual serialization');return codec.encode({version:'chapter5-jianning-return-manual/1',saveCursor:[...SAVE],source:sourceApi.exportManualSnapshot(model),settings,turns});}
 function inspectRecord(text,options){return codec.decode(text,options);}
 function restoreRecord(text,options){const payload=inspectRecord(text,options);return Object.freeze({payload,result:sourceApi.restoreManualSnapshot(payload.source,{saveCursor:payload.saveCursor})});}
 return Object.freeze({prepareRecord,inspectRecord,restoreRecord});
}
