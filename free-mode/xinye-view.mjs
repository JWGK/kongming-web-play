import {loadXinyeSpriteManifest} from './xinye-sprites.mjs';
import {xinyeFreeStage, xinyeText} from './xinye.mjs';

const name = unit => unit?.nameJa?.replaceAll('関','關') ?? '';
const button = (label, click) => {
  const el = document.createElement('button');
  el.type = 'button'; el.textContent = label; el.onclick = click;
  return el;
};
const text = (tag, value) => {
  const el = document.createElement(tag); el.textContent = value; return el;
};
const key = ({x,y}) => x + ':' + y;

export function createXinyeBattleView({play, leave, music}) {
  const initial = play.inspect();
  if(initial.scenarioId!=='free-xinye-6:0:0') throw new TypeError('Unexpected Free Xinye battle');
  const {width,height} = initial.board;
  const root = document.createElement('section'); root.id = 'free-xinye-battle';
  root.setAttribute('aria-labelledby','free-xinye-heading');
  const heading = text('h2','自由模式・新野城'); heading.id = 'free-xinye-heading'; heading.tabIndex = -1;
  const row = document.createElement('header'), turn = text('p','');
  const leaveButton = button('返回自由模式',()=>leave());
  row.append(heading,turn,leaveButton);
  const panel = document.createElement('div'); panel.className = 'free-xinye-message';
  const dialog = text('p',''); dialog.setAttribute('role','status');
  const next = button('下一句',advanceMessage);
  const confirmResult=button('確認戰果',()=>{
    if(confirmed) return;
    confirmed=play.result.accept();
    if(!confirmed) return;
    draw();
    leaveButton.focus({preventScroll:true});
  });
  panel.append(dialog,next,confirmResult);
  const viewport = document.createElement('div'); viewport.className = 'map-scroll free-xinye-scroll';
  viewport.setAttribute('role','region'); viewport.setAttribute('aria-label','可捲動的新野城戰場'); viewport.tabIndex=0;
  const board = document.createElement('div'); board.className='free-xinye-grid';
  board.style.setProperty('--free-cols',width);
  board.style.backgroundImage = 'url("' + new URL('../'+xinyeFreeStage.fieldAsset,import.meta.url).href + '")';
  const details=text('p',''); details.id='free-xinye-unit';
  const actionLog=text('p',''); actionLog.id='free-xinye-action'; actionLog.setAttribute('aria-live','polite');
  const controls=document.createElement('div'); controls.className = 'free-xinye-controls';
  const hint=text('p',''); hint.id='free-xinye-hint';
  const fault=text('p',''); fault.hidden=true; fault.setAttribute('role','alert');
  root.append(row,panel,hint,details,actionLog,controls,viewport,fault); viewport.append(board);
  const cells=[], cellArt=new WeakMap();
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const el=button('',()=>tapCell(x,y));
    el.dataset.cell=key({x,y}); cells.push(el); board.append(el);
  }
  let alive=true, running=false, frame=0, target=null, preview=null, shown=null, page=0, itemMenu=false;
  const recent=[];
  let confirmed=null, spriteFor=()=>null;

  function command(input) {
    if(!alive||fault.hidden===false) return;
    try { play.dispatch(input); draw(); schedule(); }
    catch(error){ stopWithError(error,input.type); }
  }
  function stopWithError(error,action) {
    cancelAnimationFrame(frame); frame=0;
    controls.replaceChildren(); board.inert=true; next.disabled=true;
    confirmResult.hidden=true; fault.hidden=false; fault.textContent='新野城未能繼續，請返回。原存檔未有改動。';
    console.warn('Free Xinye: context 6:0:0, local donor, action '+action,error);
  }
  function pages(effect) {
    if(effect.type==='dialogue'||effect.type==='message_panel'){
      if(Number.isInteger(effect.value_u16)) return (xinyeText(effect.value_u16) ?? []).map(p=>(p.nameJa ? p.nameJa.replaceAll('関','關')+'：' : '')+p.text);
      if(effect.textKey==='turn_limit_retreat') return ['已達回合上限。'];
      if(effect.textKey==='protagonist_defeat') return ['諸葛亮敗走。'];
    }
    if(effect.type==='warehouse_item') return ['取得：'+(effect.nameJa??effect.itemName??'道具')];
    return [];
  }
  function advanceMessage() {
    if(!shown) return;
    if(page+1 < shown.pages.length) {page++;dialog.textContent=shown.pages[page];return;}
    command({type:'acknowledge',effectId:shown.id});
  }
  function logEffect(fx,s) {
    const unit=slot=>name(s.units[slot]);
    const actor=unit(fx.actorSlot??fx.attackerSlot), victim=unit(fx.targetSlot??fx.defenderSlot);
    const strategy=fx.nameJa??'策略';
    let line='';
    if(fx.type==='physicalHit'||fx.type==='strategyHit'){
      const delta=fx.beforeTroops-fx.afterTroops;
      line=actor+' '+(fx.type==='strategyHit'?strategy:fx.kind==='counter'?'反擊':'攻擊')+'：'+victim+(delta>0?' -'+delta+' 兵':' 無損傷');
    }else if(fx.type==='troopHealing')line=actor+' '+strategy+'：'+victim+' +'+(fx.afterTroops-fx.beforeTroops)+' 兵';
    else if(fx.type==='strategyPointHealing')line=victim+' +'+fx.recovered+' 策略值';
    else if(fx.type==='strategyStatus')line=actor+' '+strategy+'：'+victim+(fx.success?' 已生效':' 未生效');
    else if(fx.type==='experienceChange'&&fx.slotIndex<15)line=unit(fx.slotIndex)+' +'+fx.total+' 經驗';
    else if(fx.type==='itemTransferred')line=actor+' 將道具交俾 '+victim;
    else if(fx.type==='itemConsumed')line=actor+' 使用道具'+(fx.effect?.recovered>0?'：'+victim+' +'+fx.effect.recovered+' 兵':'');
    else if(fx.type==='action_no_effect')line='行動未生效，請重新選擇。';
    if(!line)return;
    recent.push(line); if(recent.length>4)recent.shift();
    actionLog.textContent=recent.join(' ／ ');
  }
  function schedule() {
    if(frame||!alive||running||!fault.hidden||shown) return;
    const state=play.inspect();
    if(!state.pendingEffects.length&&['player','settled'].includes(state.phase))return;
    frame=requestAnimationFrame(pump);
  }
  function pump() {
    frame=0; if(!alive||shown) return;
    running=true;
    try{
      for(let n=0;n<10;n++){
        const s=play.inspect(), fx=s.pendingEffects[0];
        if(fx&&pages(fx).length)break;
        if(fx){logEffect(fx,s);play.dispatch({type:'acknowledge',effectId:fx.id});}
        else if(!['player','settled'].includes(s.phase))play.dispatch({type:'advance'});
        else break;
      }
      draw();
    }catch(error){stopWithError(error,'advance');}
    finally{running=false;}
    schedule();
  }
  function tapCell(x,y) {
    const s=play.inspect(), c=play.choices();
    if(s.phase!=='player'||s.pendingEffects.length) return;
    const u=s.units.find(u=>u.state15===2&&u.position?.x===x&&u.position.y===y);
    if(target){
      if(u&&target.slots.includes(u.slotIndex)) {
        const cmd=target.cmd; target=null; preview=null; command({...cmd,targetSlot:u.slotIndex});
      }
      return;
    }
    if(c.selection===null){if(u&&c.controllableSlots.includes(u.slotIndex))command({type:'select_unit',slotIndex:u.slotIndex});return;}
    if(c.stage==='destination_selection'&&c.destinations?.some(p=>p.x===x&&p.y===y)){
      if(preview===key({x,y})){preview=null;command({type:'confirm_destination'});}
      else{preview=key({x,y});command({type:'preview_destination',x,y});}
    }
  }
  function draw() {
    const s=play.inspect(), fx=s.pendingEffects[0];
    const message=fx?pages(fx):[];
    if(message.length){ if(shown?.id!==fx.id)page=0; shown={id:fx.id,pages:message}; }
    else{shown=null;page=0;}
    const settled=s.phase==='settled'&&!fx, ready=s.phase==='player'&&!fx;
    panel.hidden=!shown&&!settled; next.hidden=!shown;
    confirmResult.hidden=!settled||!play.result.canAccept();
    if(shown) dialog.textContent=shown.pages[page];
    else if(settled) dialog.textContent=s.terminal==='victory'
      ? (confirmed?'已確認新野城勝利。':'新野城勝利。')+'用咗 '+s.settlement.rawTurns+
        ' 回合，今局獲得 '+(s.settlement.currency-initial.currency)+' 金。局內獎勵唔會轉入主線存檔。'
      : '敗北。原存檔未有改動。';
    turn.textContent='第 '+s.round+'／'+s.turnLimit+' 回合・'+(ready?'我軍':settled?'戰鬥結束':'處理戰鬥事件');
    music?.(s.currentBgmId);
    const c=ready?play.choices():null;
    const destinations=new Set(c?.destinations?.map(key)), occupied=new Map(s.units
      .filter(u=>u.state15===2&&u.position).map(u=>[key(u.position),u]));
    if(c?.selection===null){target=null;preview=null;itemMenu=false;}
    const selected=c&&c.selection!==null?s.units[c.selection]:null;
    details.textContent=selected ? name(selected)+'・Lv.'+selected.level+'・兵 '+selected.troops+'/'+selected.stats.最大兵数+'・策略 '+selected.strategyPoints+'/'+selected.stats.最大策略値 : '';
    for(const el of cells){
      const at=el.dataset.cell, u=occupied.get(at), selectable=!!u&&c?.controllableSlots.includes(u.slotIndex);
      const aim=!!u&&!!target?.slots.includes(u.slotIndex);
      const sprite=u?spriteFor(u):null;
      const marker=sprite?'':u?name(u).slice(0,1):'';
      const art=sprite?sprite.url+':'+sprite.row+':'+sprite.flip:marker;
      if((cellArt.get(el)??'')!==art){
        cellArt.set(el,art);
        el.classList.toggle('has-sprite',!!sprite);
        el.textContent=marker;
        if(sprite){
          el.style.setProperty('--unit-sprite','url("'+sprite.url+'")');
          el.style.setProperty('--unit-row',sprite.row);
          el.style.setProperty('--unit-flip',sprite.flip?-1:1);
        }else{
          for(const prop of ['--unit-sprite','--unit-row','--unit-flip'])el.style.removeProperty(prop);
        }
      }
      el.setAttribute('aria-label',at.replace(':','，')+(u?' '+name(u)+' '+u.troops+' 兵':''));
      el.dataset.side=u?(u.slotIndex<15?'ally':'enemy'):'';
      el.classList.toggle('range',destinations.has(at)); el.classList.toggle('preview',preview===at);
      el.classList.toggle('aim',aim); el.classList.toggle('selected',!!u&&c?.selection===u.slotIndex);
      const enabled=ready&&(target ? aim : c.selection===null ? selectable : destinations.has(at));
      el.setAttribute('aria-disabled',String(!enabled)); el.tabIndex=enabled?0:-1;
    }
    controls.replaceChildren();
    hint.textContent=ready ? (target?'點選亮起嘅目標。':c.selection===null?'點選我軍，或者結束回合。':
      itemMenu?'選擇要使用或交俾友軍嘅道具。':c.stage==='destination_selection'?'點一次預覽，同一格再點一次確認。亦可原地行動。':'請選擇行動。') : '';
    if(!ready)return;
    if(c.selection===null){controls.append(button('結束我軍回合',()=>command({type:'end_player_phase'})));return;}
    if(target){controls.append(button('取消選擇目標',()=>{target=null;draw();}));return;}
    const aim=(cmd,slots)=>{target={cmd,slots};draw();};
    if(itemMenu){
      controls.append(button('返回行動',()=>{itemMenu=false;draw();}));
      for(const item of c.items??[]){
        const {inventoryIndex,nameJa,targets,transferTargets}=item;
        if(targets.length) controls.append(button('使用 '+nameJa,()=>{
          target={cmd:{type:'item',inventoryIndex},slots:targets};
          command({type:'begin_item_targeting',inventoryIndex});
        }));
        if(transferTargets.length) controls.append(button('交俾友軍 '+nameJa,()=>aim({type:'transfer_item',inventoryIndex},transferTargets)));
        if(!targets.length&&!transferTargets.length) controls.append(text('span',nameJa+'（暫無可用目標）'));
      }
      return;
    }
    controls.append(button('取消選將',()=>{preview=null;command({type:'cancel'});}));
    if(c.canActWithoutMoving)controls.append(button('原地行動',()=>{
      preview=null;
      command({type:'preview_destination',...c.actionPosition});
      command({type:'confirm_destination'});
    }));
    if(c.canWait) controls.append(button('待機',()=>command({type:'wait'})));
    if(c.items?.length) controls.append(button('道具',()=>{itemMenu=true;draw();}));
    if(c.attackTargets?.length) controls.append(button('攻擊',()=>aim({type:'attack'},c.attackTargets)));
    for(const strategy of c.strategies??[]) if(strategy.targets.length)
      controls.append(button((strategy.nameJa??'策略 '+strategy.strategyIndex).replaceAll('関','關'),()=>{
        target={cmd:{type:'strategy',strategyIndex:strategy.strategyIndex},slots:strategy.targets};
        command({type:'begin_strategy_targeting',strategyIndex:strategy.strategyIndex});
      }));
  }
  return Object.freeze({root,start(){
    draw();schedule();heading.focus({preventScroll:true});
    void loadXinyeSpriteManifest().then(resolver=>{
      if(!alive||!fault.hidden)return;
      spriteFor=resolver;draw();
    });
    const leader=initial.units[0].position;
    viewport.scrollLeft=leader.x*36-72; viewport.scrollTop=leader.y*36-72;
  },destroy(){alive=false;play.result.revoke();cancelAnimationFrame(frame);root.remove();}});
}
