import {createInitialState, transition, SCREENS, MAIN_MENU_ITEMS, NEW_GAME_ITEMS} from './startup-state.mjs';
export const STARTUP_STORAGE_KEY = 'kongming-opening-flow-v1';
export function createCheckpointStore(getStorage = () => globalThis.localStorage) {
  let writable = true;
  function read() {
    try {
      const raw = getStorage().getItem(STARTUP_STORAGE_KEY);
      if (raw === null) return {state:createInitialState(), status:'此流程只記住瀏覽位置，不是原作存檔。'};
      if (typeof raw !== 'string' || raw.length > 1024) throw Error('Oversized checkpoint');
      const data = JSON.parse(raw);
      if (!data || data.version !== 1 || Object.keys(data).sort().join(',') !== 'menuIndex,newGameIndex,screen,version' ||
          !Object.values(SCREENS).includes(data.screen) || !Number.isInteger(data.menuIndex) || data.menuIndex < 0 || data.menuIndex >= MAIN_MENU_ITEMS.length ||
          !Number.isInteger(data.newGameIndex) || data.newGameIndex < 0 || data.newGameIndex >= NEW_GAME_ITEMS.length) throw Error('Invalid checkpoint');
      const state = Object.freeze({screen:data.screen,menuIndex:data.menuIndex,newGameIndex:data.newGameIndex});
      transition(state, {type:'UNKNOWN'});
      return {state, status:'已恢復上次瀏覽位置；本機參考片段需重新選取。'};
    } catch {
      writable = false;
      return {state:createInitialState(), status:'瀏覽位置無法讀取。本次仍可操作，且不會覆寫既有資料。'};
    }
  }
  function write(state) {
    if (!writable) return '本次瀏覽位置不儲存；既有資料保持不變。';
    try {
      getStorage().setItem(STARTUP_STORAGE_KEY, JSON.stringify({version:1,...state}));
      return '已記住瀏覽位置；不會變更原作或訓練場存檔。';
    } catch {
      writable = false;
      return '瀏覽器無法儲存位置；本次仍可繼續操作。';
    }
  }
  return Object.freeze({read,write});
}
