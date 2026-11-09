/** Authored semantic indicators derived only from existing engine status rules.
 * These labels/symbol IDs are not recovered original icon assets. Pure: no RNG,
 * state mutation, action legality or arithmetic is implemented here.
 */
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const FLAGS=[
 [1,'movement_down','debuff','移動力降低','移動力減半'],
 [2,'speed_down','debuff','攻擊速度降低','攻擊速度降至 1'],
 [4,'strategy_sealed','control','封策','不能使用策略'],
 [8,'strategy_resistance','buff','策略防護','策略傷害與策略值削減減半；異常策略須連續通過兩次判定'],
 [16,'confusion','control','混亂','不能行動或反擊'],
 [32,'poison','debuff','中毒','在對應階段受到毒傷'],
 [128,'movement_up','buff','移動力提升','暫時增加 3 點移動力'],
];
export function unitStatusIndicators(unit={}){
 const out=[];
 for(const [field,stat]of [['status24','攻擊'],['status25','防禦']]){
  const raw=unit[field];if(!Number.isInteger(raw))continue;const stage=raw&~64;
  if(![0,1,3,4].includes(stage))continue;
  const direction=stage<2?'up':'down',ratio=({0:'150%',1:'120%',3:'80%',4:'2/3'})[stage];
  out.push({id:`${field==='status24'?'attack':'defense'}_${direction}`,field,kind:stage<2?'buff':'debuff',stage,label:`${stat}${stage<2?'提升':'降低'}`,description:`${stat}為正常值的 ${ratio}`});
 }
 if(Number.isInteger(unit.status26))for(const[bit,id,kind,label,description]of FLAGS)if(unit.status26&bit)out.push({id,field:'status26',kind,bit,label,description});
 return freeze(out);
}
export function statusChangePresentation(effect){
 const field=effect.field??({0:'status24',1:'status25',3:'status26'})[effect.kind];
 if(!['status24','status25','status26'].includes(field)||!Number.isInteger(effect.before)||!Number.isInteger(effect.after))return null;
 const before=unitStatusIndicators({[field]:effect.before}),after=unitStatusIndicators({[field]:effect.after});
 if(JSON.stringify(before)===JSON.stringify(after))return null; // bookkeeping bits are not a status change
 const removed=before.filter(a=>!after.some(b=>a.id===b.id)),added=after.filter(a=>!before.some(b=>a.id===b.id));
 const changed=after.filter(a=>before.some(b=>a.id===b.id&&a.stage!==b.stage));
 return freeze({field,before,after,removed,added,changed,returnedToNormal:before.length>0&&after.length===0});
}
