import {createInitialState, copyState, SCREENS, MAIN_MENU_ITEMS, NEW_GAME_ITEMS} from './startup-state.mjs';
export const LEGACY_STARTUP_STORAGE_KEY = 'kongming-opening-flow-v1';
export const STARTUP_STORAGE_KEY = 'kongming-dual-opening-flow-v2';
const exactKeys = (object,keys) => object && !Array.isArray(object) && typeof object === 'object'
  && Object.keys(object).sort().join(',') === [...keys].sort().join(',');
function parse(raw) {
  if (typeof raw !== 'string' || raw.length > 4096) throw Error('Invalid checkpoint size');
  return JSON.parse(raw);
}
function migrateLegacy(raw) {
  const data = parse(raw);
  if (!exactKeys(data,['version','screen','menuIndex','newGameIndex']) || data.version !== 1
    || !Object.values(SCREENS).includes(data.screen)
    || !Number.isInteger(data.menuIndex) || data.menuIndex < 0 || data.menuIndex >= MAIN_MENU_ITEMS.length
    || !Number.isInteger(data.newGameIndex) || data.newGameIndex < 0 || data.newGameIndex >= NEW_GAME_ITEMS.length) throw Error('Invalid legacy checkpoint');
  // V1 never established the story route. Do not infer one from its menu index.
  return copyState({...createInitialState(),screen:data.screen === SCREENS.OPENING_STORY ? SCREENS.NEW_GAME : data.screen,
    menuIndex:data.menuIndex,newGameIndex:data.newGameIndex});
}
export function createCheckpointStore(getStorage = () => globalThis.localStorage) {
  let writable = true;
  function read() {
    try {
      const storage = getStorage(), raw = storage.getItem(STARTUP_STORAGE_KEY);
      if (raw === null) {
        const legacy = storage.getItem(LEGACY_STARTUP_STORAGE_KEY);
        if (legacy !== null) return {state:migrateLegacy(legacy),status:'已保留舊選單位置；舊故事位置未判定分支，請重新選擇。舊資料不會改寫。'};
        return {state:createInitialState(),status:'兩條開場分別記住瀏覽位置，不是原作存檔。'};
      }
      const data = parse(raw);
      if (!exactKeys(data,['version','screen','menuIndex','newGameIndex','routeId','cursors']) || data.version !== 2
        || !exactKeys(data.cursors,['game-start','prologue'])
        || !Object.values(data.cursors).every(cursor => exactKeys(cursor,['sequenceId','pageId']))) throw Error('Invalid checkpoint');
      return {state:copyState(data),status:'已恢復各開場的瀏覽位置；本機片段需重新選取。'};
    } catch {
      writable = false;
      return {state:createInitialState(),status:'瀏覽位置無法讀取。本次仍可操作，且不會覆寫既有資料。'};
    }
  }
  function write(state) {
    if (!writable) return '本次瀏覽位置不儲存；既有資料保持不變。';
    try {
      const clean = copyState(state);
      getStorage().setItem(STARTUP_STORAGE_KEY,JSON.stringify({version:2,...clean}));
      return '已分開記住兩條開場的位置；不會變更原作、舊入口或訓練場存檔。';
    } catch {
      writable = false;
      return '瀏覽器無法儲存位置；本次仍可繼續操作。';
    }
  }
  return Object.freeze({read,write});
}
