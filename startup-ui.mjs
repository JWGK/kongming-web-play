import {SCREENS, MAIN_MENU_ITEMS, NEW_GAME_ITEMS, transition} from './startup-state.mjs';
import {MENU_COPY} from './startup-content.mjs';
import {createCheckpointStore} from './startup-storage.mjs';
import {MAX_PACK_BYTES, parseOpeningPack} from './startup-pack.mjs';

export const POINTER_TRANSITION_GUARD_MS = 500;

export function mountStartup(doc = document, store = createCheckpointStore(), {now = () => performance.now()} = {}) {
  const $ = id => doc.getElementById(id);
  const loaded = store.read();
  let state = loaded.state;
  let localPack = null;
  let readGeneration = 0;
  let pointerBlockedUntil = -Infinity;
  $('storage-status').textContent = loaded.status;
  const element = (tag, text, className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  // A second physical click/tap can hit a NEW control after a synchronous
  // render. Screen-qualified callbacks alone cannot reject that retargeting.
  // Use a bounded monotonic-time gate, without timers or persistent disabled
  // state. Keyboard/assistive clicks (detail 0, no pointer type) remain immediate.
  const activation = run => (event = {}) => {
    const fromPointer = event.detail > 0 || ['mouse','touch','pen'].includes(event.pointerType);
    if (fromPointer && (event.detail > 1 || now() < pointerBlockedUntil)) {
      event.preventDefault?.();
      return;
    }
    const previousScreen = state.screen;
    run(event);
    if (fromPointer && state.screen !== previousScreen) pointerBlockedUntil = now() + POINTER_TRANSITION_GUARD_MS;
  };
  const button = (label, run, className = '') => {
    const node = element('button', label, className);
    node.type = 'button';
    node.addEventListener('click', activation(run));
    return node;
  };
  function menu() {
    if (state.screen === SCREENS.MAIN_MENU) return {items:MAIN_MENU_ITEMS, index:state.menuIndex};
    if (state.screen === SCREENS.NEW_GAME) return {items:NEW_GAME_ITEMS, index:state.newGameIndex};
    return null;
  }
  function send(event, focusSelection = false) {
    const next = transition(state, event);
    if (next === state) {
      if (event.type === 'CONFIRM') {
        const selected = menu();
        if (selected && !selected.items[selected.index].enabled) $('flow-status').textContent = MENU_COPY[selected.items[selected.index].id].reason;
      }
      return;
    }
    const changedScreen = next.screen !== state.screen;
    state = next;
    if (event.type === 'RESET') { localPack = null; readGeneration++; $('pack-status').textContent = ''; }
    if (changedScreen) {
      readGeneration++;
      if (state.screen !== SCREENS.OPENING_STORY) $('pack-status').textContent = localPack ? '已核對的片段仍保留在本頁記憶體。' : '';
    }
    $('storage-status').textContent = store.write(state);
    render();
    if (changedScreen) $('screen-title').focus({preventScroll:true});
    else if (focusSelection) $('screen-actions').children[menu().index]?.focus({preventScroll:true});
  }
  function renderMenu(items, selected, capturedScreen) {
    const stageMenu = element('div', undefined, 'stage-menu');
    stageMenu.setAttribute('aria-hidden', 'true');
    items.forEach((item, index) => {
      const copy = MENU_COPY[item.id];
      const row = element('div', copy.zh, `stage-menu-item${index === selected ? ' selected' : ''}${item.enabled ? '' : ' unavailable'}`);
      stageMenu.append(row);
      const action = button('', () => {
        send({type:'SELECT',index,screen:capturedScreen}, !item.enabled);
        send({type:'CONFIRM',screen:capturedScreen});
      }, `menu-action${index === selected ? ' selected' : ''}`);
      action.dataset.action = item.id;
      action.setAttribute('aria-disabled', String(!item.enabled));
      action.setAttribute('aria-label', `${copy.zh}${item.enabled ? '' : '，尚未開放。' + copy.reason}`);
      action.append(element('span', copy.zh), element('small', item.enabled ? (item.id === 'game-start' ? '進入已核實的故事入口' : '開始新的入口流程') : copy.reason));
      $('screen-actions').append(action);
    });
    $('scene-visual').append(stageMenu);
  }
  function render() {
    const capturedScreen = state.screen;
    const scene = $('scene-visual');
    const actions = $('screen-actions');
    scene.replaceChildren(); actions.replaceChildren();
    scene.className = `scene-visual scene-${state.screen}`;
    scene.dataset.screen = state.screen;
    $('back-controls').replaceChildren();
    if (state.screen !== SCREENS.BOOT) {
      const back = button('返回', () => send({type:'BACK',screen:capturedScreen}));
      back.id = 'back-button'; $('back-controls').append(back);
    }
    $('pack-panel').hidden = state.screen !== SCREENS.OPENING_STORY;
    const names = {[SCREENS.BOOT]:'標題畫面',[SCREENS.MAIN_MENU]:'主選單',[SCREENS.NEW_GAME]:'從頭開始',[SCREENS.OPENING_STORY]:'故事入口'};
    $('screen-title').textContent = names[state.screen];
    scene.setAttribute('aria-label', names[state.screen]);
    $('flow-status').textContent = names[state.screen];
    if (state.screen === SCREENS.BOOT) {
      const title = element('div', undefined, 'title-logo');
      title.append(element('span','三國志'), element('span','孔明傳'));
      scene.append(title, element('p','按下「開始」','start-prompt'), element('small','文字版場景 · 原作圖像待接入','scene-note'));
      const start = button('開始', () => send({type:'START',screen:capturedScreen}), 'start-button');
      start.dataset.action = 'start'; actions.append(start);
      $('screen-description').textContent = '點按開始。此版保留參考頁面的 3:2 場景與場景下方控制方式。';
    } else if (state.screen === SCREENS.MAIN_MENU) {
      renderMenu(MAIN_MENU_ITEMS, state.menuIndex, capturedScreen);
      $('screen-description').textContent = '從頭開始已接通；其他功能暫未開放，不會讀取或刪除既有存檔。';
    } else if (state.screen === SCREENS.NEW_GAME) {
      const motif = element('div',undefined,'new-game-heading');
      motif.append(element('span','三國志'),element('strong','孔明傳'),element('small','角色圖像待接入'));
      scene.append(motif);
      renderMenu(NEW_GAME_ITEMS, state.newGameIndex, capturedScreen);
      $('screen-description').textContent = '立即開始遊戲會進入第一個故事展示檢查點。序章與戰役尚未接入。';
    } else {
      if (localPack?.frameDataUrl) {
        const img = element('img'); img.src = localPack.frameDataUrl;
        img.alt = '已核實的原作開場參考影格，240 × 160；此為靜態展示，不是遊戲引擎重播。';
        img.width = 240; img.height = 160; scene.append(img);
      } else {
        const empty = element('div',undefined,'opening-placeholder');
        empty.append(element('span','故事入口','opening-title'),element('p',localPack ? '已載入原文片段' : '等待本機參考片段'),element('small','此處不續寫未核實的故事。'));
        scene.append(empty);
      }
      if (localPack) {
        const dialogue = element('div',localPack.lines.join('\n'),'dialogue');
        dialogue.lang = 'ja'; dialogue.setAttribute('aria-label','原作開場共同前五行');
        actions.append(dialogue);
        $('screen-description').textContent = '已顯示本機核實片段：共同前五行原文。參考影格僅作靜態展示；未判定完整分支，也未啟動原作腳本。';
      } else $('screen-description').textContent = '已到達故事入口。此版本不附原作圖像或劇情；可在下方選取已核實的本機參考片段，或返回選單。';
      const next = button('下一步（後續尚未接入）', () => {}); next.disabled = true; actions.append(next);
    }
  }
  $('reset-button').addEventListener('click', activation(() => send({type:'RESET'})));
  doc.addEventListener('keydown', event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT','SUMMARY','A'].includes(target?.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'enter' && target?.tagName === 'BUTTON') return; // Native button activation runs once.
    const mapping = {arrowup:{type:'MOVE',delta:-1},arrowdown:{type:'MOVE',delta:1},a:{type:'CONFIRM'},enter:{type:'CONFIRM'},b:{type:'BACK'},escape:{type:'BACK'}};
    const command = mapping[key];
    if (!command) return;
    event.preventDefault(); send({...command,screen:state.screen}, command.type === 'MOVE');
  });
  $('pack-input').addEventListener('change', async event => {
    const file = event.target.files?.[0];
    const generation = ++readGeneration;
    if (!file || state.screen !== SCREENS.OPENING_STORY) return;
    $('pack-status').textContent = '正在本機核對片段…';
    try {
      if (file.size > MAX_PACK_BYTES) throw Error('片段檔超過 96 KiB，未讀取。');
      const pack = await parseOpeningPack(await file.text());
      if (generation !== readGeneration || state.screen !== SCREENS.OPENING_STORY) return;
      localPack = pack; render(); $('pack-status').textContent = '核對通過。片段僅保留在本頁記憶體。';
    } catch (error) {
      if (generation === readGeneration && state.screen === SCREENS.OPENING_STORY) $('pack-status').textContent = error.message || '片段無法讀取。';
    } finally { event.target.value = ''; }
  });
  render();
  return Object.freeze({getState:() => state});
}
if (typeof document !== 'undefined') mountStartup();
