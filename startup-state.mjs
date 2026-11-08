/** Deterministic presentation state, never a campaign or native save adapter. */
import {OPENING_ROUTES, ROUTE_IDS, isRouteId, firstPageId, pageIndex} from './startup-sequences.mjs';
export const SCREENS = Object.freeze({BOOT:'boot',MAIN_MENU:'main-menu',NEW_GAME:'new-game',OPENING_STORY:'opening-story'});
const items = entries => Object.freeze(entries.map(entry => Object.freeze(entry)));
export const MAIN_MENU_ITEMS = items([
  {id:'resume',enabled:false},{id:'record',enabled:false},{id:'new-game',enabled:true},
  {id:'delete-record',enabled:false},{id:'officers',enabled:false},{id:'free-mode',enabled:false},
]);
export const NEW_GAME_ITEMS = items([{id:'game-start',enabled:true},{id:'prologue',enabled:true}]);
const validIndex = (index,list) => Number.isInteger(index) && index >= 0 && index < list.length;
function freezeState(value) {
  return Object.freeze({screen:value.screen,menuIndex:value.menuIndex,newGameIndex:value.newGameIndex,routeId:value.routeId,
    cursors:Object.freeze(Object.fromEntries(ROUTE_IDS.map(id => [id,Object.freeze({sequenceId:value.cursors[id].sequenceId,pageId:value.cursors[id].pageId})])))});
}
export function createInitialState() {
  return freezeState({screen:SCREENS.BOOT,menuIndex:2,newGameIndex:0,routeId:null,
    cursors:Object.fromEntries(ROUTE_IDS.map(id => [id,{sequenceId:OPENING_ROUTES[id].sequenceId,pageId:firstPageId(id)}]))});
}
export function assertState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || !Object.values(SCREENS).includes(state.screen)
    || !validIndex(state.menuIndex,MAIN_MENU_ITEMS) || !validIndex(state.newGameIndex,NEW_GAME_ITEMS)
    || (state.screen === SCREENS.OPENING_STORY ? !isRouteId(state.routeId) : state.routeId !== null)
    || !state.cursors || Array.isArray(state.cursors) || typeof state.cursors !== 'object'
    || Object.keys(state.cursors).sort().join(',') !== [...ROUTE_IDS].sort().join(',')) throw new TypeError('Invalid startup flow state.');
  for (const id of ROUTE_IDS) {
    const cursor = state.cursors[id], pages = OPENING_ROUTES[id].pages;
    if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)
      || cursor.sequenceId !== OPENING_ROUTES[id].sequenceId
      || (pages.length ? pageIndex(id,cursor.pageId) < 0 : cursor.pageId !== null)) throw new TypeError('Invalid startup flow state.');
  }
  if (state.routeId !== null && NEW_GAME_ITEMS[state.newGameIndex].id !== state.routeId) throw new TypeError('Invalid startup flow state.');
}
export function copyState(state) { assertState(state); return freezeState(state); }
const update = (state,changes) => freezeState({...state,...changes});
export function viewToken(state) { return `${state.screen}|${state.routeId ?? ''}|${state.routeId === null ? '' : state.cursors[state.routeId].pageId ?? ''}`; }
function menuFor(state) {
  if (state.screen === SCREENS.MAIN_MENU) return {key:'menuIndex',list:MAIN_MENU_ITEMS};
  if (state.screen === SCREENS.NEW_GAME) return {key:'newGameIndex',list:NEW_GAME_ITEMS};
  return null;
}
function movePage(state,index) {
  const id = state.routeId;
  return update(state,{cursors:{...state.cursors,[id]:{sequenceId:OPENING_ROUTES[id].sequenceId,pageId:OPENING_ROUTES[id].pages[index].id}}});
}
/**
 * NEXT is a presentation-only action: the UI permits it only after loading the
 * current route's exact verified local pack. Terminal pages never jump to a
 * descriptor or another route. BACK steps one page; LEAVE returns to the route
 * chooser without clearing either route's cursor. RESET clears only this flow.
 * `view` rejects detached same-screen page/route callbacks; `screen` is retained
 * for callers of the original startup flow. Held-key repeat is ignored.
 */
export function transition(state,event) {
  assertState(state);
  if (!event || typeof event !== 'object' || Array.isArray(event) || typeof event.type !== 'string' || event.repeat === true
    || (event.screen !== undefined && event.screen !== state.screen)
    || (event.view !== undefined && event.view !== viewToken(state))) return state;
  if (event.type === 'RESET') return createInitialState();
  if (event.type === 'RESTART_ROUTE') {
    if (state.screen !== SCREENS.OPENING_STORY || state.cursors[state.routeId].pageId === firstPageId(state.routeId)) return state;
    return movePage(state,0);
  }
  if (event.type === 'LEAVE' && state.screen === SCREENS.OPENING_STORY) return update(state,{screen:SCREENS.NEW_GAME,routeId:null});
  if (event.type === 'BACK') {
    if (state.screen === SCREENS.OPENING_STORY) {
      const index = pageIndex(state.routeId,state.cursors[state.routeId].pageId);
      return index > 0 ? movePage(state,index-1) : update(state,{screen:SCREENS.NEW_GAME,routeId:null});
    }
    if (state.screen === SCREENS.NEW_GAME) return update(state,{screen:SCREENS.MAIN_MENU});
    if (state.screen === SCREENS.MAIN_MENU) return update(state,{screen:SCREENS.BOOT,menuIndex:2,newGameIndex:0});
    return state;
  }
  if (event.type === 'START') return state.screen === SCREENS.BOOT ? update(state,{screen:SCREENS.MAIN_MENU}) : state;
  if (event.type === 'MOVE' || event.type === 'SELECT') {
    const menu = menuFor(state); if (!menu) return state;
    let index;
    if (event.type === 'MOVE') {
      if (event.delta !== -1 && event.delta !== 1) return state;
      index = Math.max(0,Math.min(menu.list.length-1,state[menu.key]+event.delta));
    } else { if (!validIndex(event.index,menu.list)) return state; index = event.index; }
    return index === state[menu.key] ? state : update(state,{[menu.key]:index});
  }
  if (event.type === 'NEXT' && state.screen === SCREENS.OPENING_STORY) {
    const index = pageIndex(state.routeId,state.cursors[state.routeId].pageId);
    return index >= 0 && index+1 < OPENING_ROUTES[state.routeId].pages.length ? movePage(state,index+1) : state;
  }
  if (event.type === 'CONFIRM') {
    if (state.screen === SCREENS.BOOT) return update(state,{screen:SCREENS.MAIN_MENU});
    if (state.screen === SCREENS.MAIN_MENU && MAIN_MENU_ITEMS[state.menuIndex].enabled) return update(state,{screen:SCREENS.NEW_GAME,newGameIndex:0});
    if (state.screen === SCREENS.NEW_GAME) return update(state,{screen:SCREENS.OPENING_STORY,routeId:NEW_GAME_ITEMS[state.newGameIndex].id});
  }
  return state;
}
