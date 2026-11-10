/** Captured bounded configuration. It is not current-owner or loaded-save authority. */
import {CHAPTER5_JIANNING_RETURN_PINS} from './game-chapter5-jianning-return-pins.mjs';
import {isChapter5JianningReturnCampaignValidator} from './game-chapter5-jianning-return-campaign-validator.mjs';
import {disputeTree as tree,freezeDispute as freeze} from './game-qishan-dispute-preparation.mjs';
const configurations=new WeakMap(),need=(v,m)=>{if(!v)throw new RangeError(m);};
async function capture(value,pin){need(value instanceof Uint8Array&&value.length===pin.bytes,'Exact Jianning return bytes');const bytes=new Uint8Array(value),digest=await crypto.subtle.digest('SHA-256',bytes);need([...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')===pin.sha256,'Exact Jianning return source/locale hash');const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));tree(data);return freeze(data);}
export async function captureChapter5JianningReturnSourceConfiguration(bytes,{locale,validateCampaign}={}){
 need(isChapter5JianningReturnCampaignValidator(validateCampaign),'Captured strict Jianning return campaign validator');
 const [data,text]=await Promise.all([capture(bytes,CHAPTER5_JIANNING_RETURN_PINS.source),capture(locale,CHAPTER5_JIANNING_RETURN_PINS.locale)]);
 need(data.version==='chapter5-jianning-return-source-data/1'&&data.commands.length===14&&data.sites.length===8&&text.version==='chapter5-jianning-return-tc/1'&&text.locale==='zh-Hant','Exact bounded Jianning return domain');
 const token=Object.freeze({version:'chapter5-jianning-return-source-configuration/1'});configurations.set(token,Object.freeze({data,locale:text,validateCampaign}));return token;
}
export const isChapter5JianningReturnSourceConfiguration=x=>configurations.has(x);
export function readChapter5JianningReturnSourceConfiguration(x){need(configurations.has(x),'Captured Jianning return configuration');return configurations.get(x);}
