import {SCREENS, MAIN_MENU_ITEMS, NEW_GAME_ITEMS, transition, viewToken} from './startup-state.mjs';
import {OPENING_ROUTES, pageIndex} from './startup-sequences.mjs';
import {MENU_COPY} from './startup-content.mjs';
import {APPROVED_OPENING_TEXT} from './startup-approved-zh.mjs';
import {createCheckpointStore} from './startup-storage.mjs';
import {MAX_PACK_BYTES, parseOpeningPack} from './startup-pack.mjs';
export const POINTER_TRANSITION_GUARD_MS = 500;

export function mountStartup(doc = document, store = createCheckpointStore(), {now = () => performance.now()} = {}) {
  const $ = id => doc.getElementById(id);
  const loaded = store.read();
  let state = loaded.state;
  const localPacks = new Map();
  let readGeneration = 0, pointerBlockedUntil = -Infinity;
  $('storage-status').textContent = loaded.status;
  const element = (tag,text,className) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  // Reject fresh-DOM retargeting across screens, routes AND source blocks.
  // No timers; rejection does not extend the gate. Keyboard/AT stays immediate.
  const activation = run => (event = {}) => {
    const fromPointer = event.detail > 0 || ['mouse','touch','pen'].includes(event.pointerType);
    if (fromPointer && (event.detail > 1 || now() < pointerBlockedUntil)) { event.preventDefault?.(); return; }
    const previousView = viewToken(state);
    run(event);
    if (fromPointer && viewToken(state) !== previousView) pointerBlockedUntil = now()+POINTER_TRANSITION_GUARD_MS;
  };
  const button = (label,run,className = '') => {
    const node = element('button',label,className); node.type = 'button';
    node.addEventListener('click',activation(run)); return node;
  };
  function menu() {
    if (state.screen === SCREENS.MAIN_MENU) return {items:MAIN_MENU_ITEMS,index:state.menuIndex};
    if (state.screen === SCREENS.NEW_GAME) return {items:NEW_GAME_ITEMS,index:state.newGameIndex};
    return null;
  }
  function currentPage() {
    if (state.routeId === null) return null;
    const pack = localPacks.get(state.routeId) ?? APPROVED_OPENING_TEXT[state.routeId];
    const page = pack?.pages.find(page => page.id === state.cursors[state.routeId].pageId);
    return page ? {...page,language:pack.language} : null;
  }
  function send(event,focusSelection = false) {
    // Advance only when a verified local or explicitly approved built-in block exists.
    if (state.screen === SCREENS.OPENING_STORY && ['CONFIRM','NEXT'].includes(event.type)) {
      if (!currentPage()) { $('flow-status').textContent = '請先載入目前開場的核實片段。'; return; }
      event = {...event,type:'NEXT'};
    }
    const next = transition(state,event);
    if (next === state) {
      if (event.type === 'CONFIRM') {
        const selected = menu();
        if (selected && !selected.items[selected.index].enabled) $('flow-status').textContent = MENU_COPY[selected.items[selected.index].id].reason;
      }
      return;
    }
    const changedView = viewToken(next) !== viewToken(state);
    state = next;
    if (event.type === 'RESET') { localPacks.clear(); readGeneration++; $('pack-status').textContent = ''; }
    if (changedView) {
      readGeneration++;
      $('pack-status').textContent = state.routeId !== null && localPacks.has(state.routeId) ? '這條開場的片段保留在本頁記憶體。' : '';
    }
    $('storage-status').textContent = store.write(state);
    render();
    if (changedView) $('screen-title').focus({preventScroll:true});
    else if (focusSelection && menu()) $('screen-actions').children[menu().index]?.focus({preventScroll:true});
  }
  function renderMenu(items,selected,capturedView) {
    const stageMenu = element('div',undefined,'stage-menu'); stageMenu.setAttribute('aria-hidden','true');
    items.forEach((item,index) => {
      const copy = MENU_COPY[item.id];
      stageMenu.append(element('div',copy.zh,`stage-menu-item${index === selected ? ' selected' : ''}${item.enabled ? '' : ' unavailable'}`));
      const action = button('',() => {
        send({type:'SELECT',index,view:capturedView},!item.enabled);
        send({type:'CONFIRM',view:capturedView});
      },`menu-action${index === selected ? ' selected' : ''}`);
      action.dataset.action = item.id;
      action.setAttribute('aria-disabled',String(!item.enabled));
      action.setAttribute('aria-label',`${copy.zh}${item.enabled ? '' : '，尚未開放。'+copy.reason}`);
      const hint = OPENING_ROUTES[item.id] ? `獨立開場 · ${OPENING_ROUTES[item.id].pages.length} 段核實內容` : '開始新的入口流程';
      action.append(element('span',copy.zh),element('small',item.enabled ? hint : copy.reason));
      $('screen-actions').append(action);
    });
    $('scene-visual').append(stageMenu);
  }
  function render() {
    const capturedView = viewToken(state), scene = $('scene-visual'), actions = $('screen-actions');
    scene.replaceChildren(); actions.replaceChildren(); $('back-controls').replaceChildren();
    scene.className = `scene-visual scene-${state.screen}`; scene.dataset.screen = state.screen;
    scene.dataset.route = state.routeId ?? ''; scene.dataset.page = state.routeId === null ? '' : state.cursors[state.routeId].pageId;
    const index = state.routeId === null ? -1 : pageIndex(state.routeId,state.cursors[state.routeId].pageId);
    if (state.screen !== SCREENS.BOOT) {
      const back = button(index > 0 ? '上一段' : '返回',() => send({type:'BACK',view:capturedView}));
      back.id = 'back-button'; $('back-controls').append(back);
    }
    $('pack-panel').hidden = state.screen !== SCREENS.OPENING_STORY;
    const route = state.routeId === null ? null : OPENING_ROUTES[state.routeId];
    const names = {[SCREENS.BOOT]:'標題畫面',[SCREENS.MAIN_MENU]:'主選單',[SCREENS.NEW_GAME]:'從頭開始',[SCREENS.OPENING_STORY]:route?.label ?? '故事入口'};
    const title = route ? `${route.label} · 第 ${index+1} / ${route.pages.length} 段` : names[state.screen];
    $('screen-title').textContent = title; scene.setAttribute('aria-label',title); $('flow-status').textContent = title;
    if (state.screen === SCREENS.BOOT) {
      const logo = element('div',undefined,'title-logo'); logo.append(element('span','三國志'),element('span','孔明傳'));
      scene.append(logo,element('p','按下「開始」','start-prompt'),element('small','文字版場景 · 原作圖像待接入','scene-note'));
      const start = button('開始',() => send({type:'START',view:capturedView}),'start-button'); start.dataset.action = 'start'; actions.append(start);
      $('screen-description').textContent = '點按開始。此版保留參考頁面的 3:2 場景與場景下方控制方式。';
    } else if (state.screen === SCREENS.MAIN_MENU) {
      renderMenu(MAIN_MENU_ITEMS,state.menuIndex,capturedView);
      $('screen-description').textContent = '從頭開始已接通；其他功能暫未開放，不會讀取或刪除既有存檔。';
    } else if (state.screen === SCREENS.NEW_GAME) {
      const motif = element('div',undefined,'new-game-heading'); motif.append(element('span','三國志'),element('strong','孔明傳'),element('small','角色圖像待接入')); scene.append(motif);
      renderMenu(NEW_GAME_ITEMS,state.newGameIndex,capturedView);
      $('screen-description').textContent = '兩個選項各有獨立的開場內容與瀏覽位置，可直接逐段觀看繁體中文版本；不會合併兩條開場。';
    } else {
      const page = currentPage(), evidence = route.pages[index], last = index === route.pages.length-1;
      const textLabel = page?.language === 'ja' ? '日文原文' : '繁體中文';
      const placeholder = element('div',undefined,'opening-placeholder');
      if (page && ['chapter-title','act-title'].includes(evidence.kind)) {
        const heading = element('span',page.lines.join('\n'),'opening-title'); heading.lang = page.language;
        placeholder.append(heading,element('small',`${route.label} · ${textLabel}`));
      } else placeholder.append(element('span',route.label,'opening-title'),element('p',page ? `第 ${index+1} 段 · ${textLabel}` : '等待本機片段'),element('small',page ? (last ? '可返回開場選單或重新觀看。' : '點按「下一段」繼續觀看。') : '請載入這條開場的已核實片段。'));
      scene.append(placeholder);
      if (page) {
        const dialogue = element('div',page.lines.join('\n'),'dialogue'); dialogue.lang = page.language; dialogue.setAttribute('aria-label',`${route.label}，第 ${index+1} 段${textLabel}`); actions.append(dialogue);
        $('screen-description').textContent = last ? '這批開場內容到此，後續場景尚未接入。可返回開場選單，選擇另一條開場。' : '依已核實內容分段呈現，可前進或返回。';
      } else $('screen-description').textContent = '這段內容目前無法讀取，請返回選單。此版本只包含已獲准的六段開場繁體中文文字，不附原作圖像或音樂。';
      const next = button(last ? '後續場景尚未接入' : page ? '下一段' : '請先載入本機片段',() => send({type:'NEXT',view:capturedView}));
      next.id = 'next-button'; next.disabled = !page || last; actions.append(next);
      const leave = button('返回開場選單',() => send({type:'LEAVE',view:capturedView})); leave.id = 'leave-button'; $('back-controls').append(leave);
      if (index > 0) {
        const restart = button('重看這條開場',() => send({type:'RESTART_ROUTE',view:capturedView})); restart.id = 'restart-route-button'; $('back-controls').append(restart);
      }
    }
  }
  $('reset-button').addEventListener('click',activation(() => send({type:'RESET'})));
  doc.addEventListener('keydown',event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return;
    const target = event.target;
    if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT','SUMMARY','A'].includes(target?.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'enter' && target?.tagName === 'BUTTON') return;
    const command = {arrowup:{type:'MOVE',delta:-1},arrowdown:{type:'MOVE',delta:1},a:{type:'CONFIRM'},enter:{type:'CONFIRM'},b:{type:'BACK'},escape:{type:'BACK'}}[key];
    if (!command) return;
    event.preventDefault(); send({...command,view:viewToken(state)},command.type === 'MOVE');
  });
  $('pack-input').addEventListener('change',async event => {
    const file = event.target.files?.[0];
    // Retain the File, clear immediately: a cancelled slow read must allow the
    // same filename to be selected again without clearing a later selection.
    event.target.value = '';
    const generation = ++readGeneration, routeId = state.routeId, capturedView = viewToken(state);
    if (!file || state.screen !== SCREENS.OPENING_STORY) return;
    $('pack-status').textContent = '正在本機核對目前開場的片段…';
    const current = () => generation === readGeneration && viewToken(state) === capturedView && state.routeId === routeId;
    try {
      if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_PACK_BYTES) throw Error('片段檔超過 96 KiB 或大小無效，未讀取。');
      const pack = await parseOpeningPack(await file.text(),routeId);
      if (!current()) return;
      localPacks.set(routeId,pack); render(); $('pack-status').textContent = '核對通過。這條開場的片段只保留在本頁記憶體。';
    } catch (error) { if (current()) $('pack-status').textContent = error.message || '片段無法讀取。'; }
  });
  render(); return Object.freeze({getState:() => state});
}
if (typeof document !== 'undefined') mountStartup();
