import {RULESET,SCENARIO} from './scenario.mjs';
export {RULESET,SCENARIO};
const copy = value => structuredClone(value);
const distance = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
const living = state => state.units.filter(u=>u.hp>0);
const inside = (s,x,y) => Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<s.width&&y<s.height;
const fail = message => {throw new Error(message);};
export function createBattle(){return {schemaVersion:1,scenarioId:SCENARIO.id,rulesetId:RULESET.id,sequence:0,round:1,phase:'player',outcome:null,width:SCENARIO.width,height:SCENARIO.height,terrain:[...SCENARIO.terrain],units:SCENARIO.units.map(u=>({...u,moved:false,acted:false,origin:null})),events:[{type:'start',text:'工程演練開始。擊敗所有演練敵軍即勝利。'}]};}
export function reachableCells(s,id){
  const u=s.units.find(u=>u.id===id); if(!u||u.hp<=0||u.acted||u.moved||s.outcome||u.side!==s.phase)return [];
  const occupied=new Set(living(s).filter(v=>v.id!==id).map(v=>v.x+v.y*s.width));
  const costs=new Map([[u.x+u.y*s.width,0]]),queue=[{x:u.x,y:u.y,cost:0}];
  while(queue.length){queue.sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x);const p=queue.shift(); if(p.cost!==costs.get(p.x+p.y*s.width))continue;
    for(const [dx,dy] of [[0,-1],[-1,0],[1,0],[0,1]]){const x=p.x+dx,y=p.y+dy,k=x+y*s.width;if(!inside(s,x,y)||occupied.has(k)||s.terrain[k]==='water')continue;
      const cost=p.cost+(s.terrain[k]==='forest'?RULESET.forestCost:RULESET.plainCost);if(cost>u.move||cost>=(costs.get(k)??Infinity))continue;costs.set(k,cost);queue.push({x,y,cost});}
  }
  return [...costs].filter(([k])=>k!==u.x+u.y*s.width).map(([k,cost])=>({x:k%s.width,y:Math.floor(k/s.width),cost})).sort((a,b)=>a.cost-b.cost||a.y-b.y||a.x-b.x);
}
export function attackTargets(s,id){const u=s.units.find(u=>u.id===id);if(!u||u.hp<=0||u.acted||s.outcome||u.side!==s.phase)return [];return living(s).filter(v=>v.side!==u.side&&distance(u,v)===RULESET.attackRange).map(copy);}
function result(s){const alive=living(s);if(!alive.some(u=>u.side==='enemy'))s.outcome='victory';else if(!alive.some(u=>u.side==='player'))s.outcome='defeat';if(s.outcome){s.phase='complete';s.events.push({type:s.outcome,text:s.outcome==='victory'?'演練勝利！':'演練失敗，可重新挑戰。'});}}
function strike(s,u,t){const damage=Math.min(t.hp,Math.max(RULESET.damageMinimum,u.attack-t.defense));t.hp-=damage;u.acted=true;u.origin=null;s.events.push({type:'attack',text:`${u.name}攻擊${t.name}，造成 ${damage} 點傷害。`,unitId:u.id,targetId:t.id,damage});result(s);}
function enemyTurn(s){
  s.phase='enemy';s.units.filter(u=>u.side==='enemy').forEach(u=>{u.acted=false;u.moved=false;u.origin=null;});
  for(const u of s.units.filter(u=>u.side==='enemy'&&u.hp>0)){
    if(s.outcome)break;
    let targets=attackTargets(s,u.id);
    if(!targets.length){const players=living(s).filter(v=>v.side==='player');const options=reachableCells(s,u.id).map(p=>({...p,distance:Math.min(...players.map(v=>distance(p,v)))})).sort((a,b)=>a.distance-b.distance||a.cost-b.cost||a.y-b.y||a.x-b.x);
      const best=options[0];if(best&&best.distance<Math.min(...players.map(v=>distance(u,v)))){u.x=best.x;u.y=best.y;u.moved=true;s.events.push({type:'move',unitId:u.id,text:`${u.name}移動。`});}targets=attackTargets(s,u.id);}
    if(targets.length){targets.sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id));strike(s,u,s.units.find(v=>v.id===targets[0].id));}else u.acted=true;
  }
  if(!s.outcome){s.round++;s.phase='player';s.units.forEach(u=>{u.moved=false;u.acted=false;u.origin=null;});s.events.push({type:'turn',text:`第 ${s.round} 回合，我軍行動。`});}
}
export function applyAction(state,action){
  if(!action||typeof action!=='object')fail('操作格式錯誤。');if(state.outcome||state.phase!=='player')fail('目前無法操作。');
  const s=copy(state);s.events=[];
  if(action.type==='endTurn'){s.units.forEach(u=>{u.origin=null;});enemyTurn(s);}
  else{const u=s.units.find(v=>v.id===action.unitId);if(!u||u.side!=='player'||u.hp<=0||u.acted)fail('此武將無法行動。');
    if(action.type==='move'){if(!reachableCells(s,u.id).some(p=>p.x===action.x&&p.y===action.y))fail('無法移動到此格。');u.origin={x:u.x,y:u.y};u.x=action.x;u.y=action.y;u.moved=true;s.events.push({type:'move',unitId:u.id,text:`${u.name}移動；可攻擊、待機或取消移動。`});}
    else if(action.type==='cancelMove'){if(!u.moved||!u.origin)fail('沒有可取消的移動。');if(living(s).some(v=>v.id!==u.id&&v.x===u.origin.x&&v.y===u.origin.y))fail('原位置已被占用。');u.x=u.origin.x;u.y=u.origin.y;u.origin=null;u.moved=false;s.events.push({type:'cancel',text:`${u.name}取消移動。`});}
    else if(action.type==='attack'){if(!attackTargets(s,u.id).some(v=>v.id===action.targetId))fail('目標不在攻擊範圍。');strike(s,u,s.units.find(v=>v.id===action.targetId));}
    else if(action.type==='wait'){u.acted=true;u.origin=null;s.events.push({type:'wait',text:`${u.name}待機。`});}
    else fail('尚未支援此操作。');
  }
  s.sequence++;return s;
}
export function serializeSave(state){validateState(state);return JSON.stringify({format:'kongming-rebuild-save',version:1,state});}
export function parseSave(text){if(typeof text!=='string'||text.length>100000)fail('存檔過大或格式錯誤。');let parsed;try{parsed=JSON.parse(text);}catch{fail('無法讀取存檔。');}if(parsed?.format!=='kongming-rebuild-save'||parsed.version!==1)fail('不相容的存檔格式。');validateState(parsed.state);return copy(parsed.state);}
function validateState(s){
  const num=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
  if(!s||s.schemaVersion!==1||s.scenarioId!==SCENARIO.id||s.rulesetId!==RULESET.id||s.width!==SCENARIO.width||s.height!==SCENARIO.height||JSON.stringify(s.terrain)!==JSON.stringify(SCENARIO.terrain)||!num(s.sequence,0,1e8)||!num(s.round,1,1e8)||!['player','complete'].includes(s.phase)||![null,'victory','defeat'].includes(s.outcome)||!Array.isArray(s.units)||s.units.length!==SCENARIO.units.length||!Array.isArray(s.events)||s.events.length>50)fail('存檔內容或版本不相容。');
  const occupied=new Set(),ids=new Set();
  for(const u of s.units){const base=SCENARIO.units.find(v=>v.id===u?.id);if(!base||ids.has(u.id)||['name','side','maxHp','attack','defense','move'].some(k=>u[k]!==base[k])||!num(u.hp,0,u.maxHp)||!inside(s,u.x,u.y)||s.terrain[u.x+u.y*s.width]==='water'||typeof u.moved!=='boolean'||typeof u.acted!=='boolean')fail('武將存檔不正確。');ids.add(u.id);
    if(u.origin!==null&&(!u.moved||u.acted||!inside(s,u.origin?.x,u.origin?.y)||s.terrain[u.origin.x+u.origin.y*s.width]==='water'))fail('移動存檔不正確。');
    if(u.hp>0){const key=u.x+u.y*s.width;if(occupied.has(key))fail('存檔中武將位置重疊。');occupied.add(key);}}
  for(const e of s.events)if(!e||typeof e.type!=='string'||e.type.length>40||typeof e.text!=='string'||e.text.length>500)fail('事件存檔不正確。');
  const p=s.units.some(u=>u.side==='player'&&u.hp>0),e=s.units.some(u=>u.side==='enemy'&&u.hp>0);const expected=!e?'victory':!p?'defeat':null;
  if(s.outcome!==expected||s.phase!==(expected?'complete':'player'))fail('戰鬥結果不一致。');
}
