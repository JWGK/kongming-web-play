/**
 * A small, deterministic web presentation flow. This is not the original game
 * script interpreter, a campaign initializer, or an adapter for native saves.
 * Content, input devices, rendering, and optional web persistence live outside
 * this module. No browser APIs or original game assets are required.
 */

export const SCREENS = Object.freeze({
  BOOT: 'boot',
  MAIN_MENU: 'main-menu',
  NEW_GAME: 'new-game',
  OPENING_STORY: 'opening-story',
});

const items = entries => Object.freeze(entries.map(entry => Object.freeze(entry)));

// Positions follow the observed six-entry menu. An unavailable entry may be
// selected so that the UI can explain it, but confirming it never changes state.
export const MAIN_MENU_ITEMS = items([
  {id: 'resume', enabled: false},
  {id: 'record', enabled: false},
  {id: 'new-game', enabled: true},
  {id: 'delete-record', enabled: false},
  {id: 'officers', enabled: false},
  {id: 'free-mode', enabled: false},
]);

export const NEW_GAME_ITEMS = items([
  {id: 'game-start', enabled: true},
  {id: 'prologue', enabled: false},
]);

export function createInitialState() {
  return Object.freeze({
    screen: SCREENS.BOOT,
    menuIndex: 2,
    newGameIndex: 0,
  });
}

const validIndex = (index, list) => Number.isInteger(index) && index >= 0 && index < list.length;

function assertState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)
    || !Object.values(SCREENS).includes(state.screen)
    || !validIndex(state.menuIndex, MAIN_MENU_ITEMS)
    || !validIndex(state.newGameIndex, NEW_GAME_ITEMS)) {
    throw new TypeError('Invalid startup flow state.');
  }
}

function update(state, changes) {
  // Only the model's three fields are copied. Caller-owned data is never kept.
  return Object.freeze({
    screen: changes.screen ?? state.screen,
    menuIndex: changes.menuIndex ?? state.menuIndex,
    newGameIndex: changes.newGameIndex ?? state.newGameIndex,
  });
}

function menuFor(state) {
  if (state.screen === SCREENS.MAIN_MENU) return {key: 'menuIndex', list: MAIN_MENU_ITEMS};
  if (state.screen === SCREENS.NEW_GAME) return {key: 'newGameIndex', list: NEW_GAME_ITEMS};
  return null;
}

/**
 * Return the next immutable state, or the same state for an ignored event.
 *
 * Events:
 * - START / CONFIRM: leave boot; only CONFIRM activates a menu selection.
 * - MOVE {delta: -1 | 1}: move one position, clamped at the list bounds.
 * - SELECT {index}: select a valid position without activating it (touch/mouse).
 * - BACK: return one screen; main-menu -> boot also resets the selections.
 * - RESET: return to a fresh boot state.
 *
 * Optional `screen` rejects events from a stale screen's handlers. Pass it on
 * rendered buttons to prevent a double click from confirming two screens.
 * Optional `repeat: true` rejects held-key repeats; ordinary deliberate input
 * can continue through the flow. These are web input rules, not a claim about
 * the original game's wraparound or key-repeat timing.
 *
 * The opening-story screen is a terminal presentation checkpoint. CONFIRM there
 * does not advance unverified dialogue or start training or a campaign battle.
 */
export function transition(state, event) {
  assertState(state);
  if (!event || typeof event !== 'object' || Array.isArray(event)
    || typeof event.type !== 'string' || event.repeat === true
    || (event.screen !== undefined && event.screen !== state.screen)) return state;

  if (event.type === 'RESET') return createInitialState();

  if (event.type === 'BACK') {
    if (state.screen === SCREENS.OPENING_STORY) {
      return update(state, {screen: SCREENS.NEW_GAME, newGameIndex: 0});
    }
    if (state.screen === SCREENS.NEW_GAME) {
      return update(state, {screen: SCREENS.MAIN_MENU});
    }
    if (state.screen === SCREENS.MAIN_MENU) return createInitialState();
    return state;
  }

  if (event.type === 'START') {
    return state.screen === SCREENS.BOOT
      ? update(state, {screen: SCREENS.MAIN_MENU}) : state;
  }

  if (event.type === 'MOVE' || event.type === 'SELECT') {
    const menu = menuFor(state);
    if (!menu) return state;
    let index;
    if (event.type === 'MOVE') {
      if (event.delta !== -1 && event.delta !== 1) return state;
      index = Math.max(0, Math.min(menu.list.length - 1, state[menu.key] + event.delta));
    } else {
      if (!validIndex(event.index, menu.list)) return state;
      index = event.index;
    }
    return index === state[menu.key] ? state : update(state, {[menu.key]: index});
  }

  if (event.type === 'CONFIRM') {
    if (state.screen === SCREENS.BOOT) return update(state, {screen: SCREENS.MAIN_MENU});
    if (state.screen === SCREENS.MAIN_MENU && MAIN_MENU_ITEMS[state.menuIndex].enabled) {
      return update(state, {screen: SCREENS.NEW_GAME, newGameIndex: 0});
    }
    if (state.screen === SCREENS.NEW_GAME && NEW_GAME_ITEMS[state.newGameIndex].enabled) {
      return update(state, {screen: SCREENS.OPENING_STORY});
    }
  }
  return state;
}
