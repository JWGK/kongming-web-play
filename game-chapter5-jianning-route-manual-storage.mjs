/** Exact route-manual representation, no physical storage or owner authority. */
import {createChapter5JianningRouteManualCodec} from './game-chapter5-jianning-route-manual-codec.mjs';
export function createChapter5JianningRouteManualStorage({sourceApi}={}){
 const codec=createChapter5JianningRouteManualCodec({sourceApi});
 return Object.freeze({
  configurationIdentity:codec.configurationIdentity,
  prepareRecord({model,settings,turns}){if(!sourceApi.ownsModel(model))throw new RangeError('Issued current route model');const source=sourceApi.exportManualSnapshot(model);return codec.encode({version:'chapter5-jianning-route-manual/1',saveCursor:[...source.sourceCursor],source,settings,turns});},
  inspectRecord:(text,options)=>codec.decode(text,options),
  restoreRecord(text,options){const payload=codec.decode(text,options);return Object.freeze({payload,result:sourceApi.restoreManualSnapshot(payload.source,{saveCursor:payload.saveCursor})});}
 });
}
