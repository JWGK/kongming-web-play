export const BATTLE_STORAGE_KEY = 'kongming-preview-0.2.inspection';
export const ZOOM_LEVELS = Object.freeze([32, 44, 56, 68]);
export function validateBattle(data) {
  if (data?.schemaVersion !== 1 || data.width !== 15 || data.height !== 24 || data.playerReady !== true || data.constructorSetup !== false || data.phase !== 'player_accessible_after_scripted_opening') throw new TypeError('Expected canonical player-ready board');
  if (!Array.isArray(data.terrainLabels) || data.terrainLabels.length !== 6) throw new TypeError('Invalid terrain labels');
  const terrainIds = new Set(data.terrainLabels.map(row => row.id));
  if (terrainIds.size !== 6 || data.terrainLabels.some(row => !Number.isInteger(row.id) || typeof row.name !== 'string')) throw new TypeError('Invalid terrain labels');
  if (!Array.isArray(data.terrainRows) || data.terrainRows.length !== data.height || data.terrainRows.some(row => !Array.isArray(row) || row.length !== data.width || row.some(id => !terrainIds.has(id)))) throw new TypeError('Invalid terrain grid');
  if (!Array.isArray(data.units) || data.units.length !== 16) throw new TypeError('Invalid player-ready unit count');
  const occupied = new Set(), unitIds = new Set();
  for (const unit of data.units) {
    if (typeof unit.id !== 'string' || unitIds.has(unit.id) || typeof unit.name !== 'string' || !inBounds(data, unit.position)) throw new TypeError('Invalid unit');
    if (!Number.isInteger(unit.currentClassIndex) || unit.currentClassIndex < 0 || unit.currentClassIndex > 42 || !Number.isInteger(unit.currentLevel) || unit.currentLevel < 1 || unit.currentLevel > 255) throw new TypeError('Invalid current class or level');
    const key = `${unit.position.x},${unit.position.y}`;
    if (occupied.has(key)) throw new TypeError('Duplicate occupied position');
    occupied.add(key); unitIds.add(unit.id);
  }
  if (data.observedConditions?.turn !== 2 || data.observedConditions?.turnLimit !== 30 || data.observedConditions?.weather !== '雨' || data.observedConditions?.victoryRuleImplemented !== false) throw new TypeError('Invalid observed conditions');
  return data;
}
export function inBounds(data, position) {
  return Boolean(position && Number.isInteger(position.x) && Number.isInteger(position.y) && position.x >= 0 && position.y >= 0 && position.x < data.width && position.y < data.height);
}
export function defaultBattleState() { return { tab: 'battle', selected: { x: 5, y: 22 }, zoom: 44 }; }
export function normalizeBattleState(data, value) {
  if (!value || !['battle', 'abilities'].includes(value.tab) || !inBounds(data, value.selected) || !ZOOM_LEVELS.includes(value.zoom)) return defaultBattleState();
  return { tab: value.tab, selected: { x: value.selected.x, y: value.selected.y }, zoom: value.zoom };
}
export function transitionBattle(data, state, action) {
  const current = normalizeBattleState(data, state);
  if (action.type === 'reset') return { ...defaultBattleState(), tab: current.tab };
  if (action.type === 'tab' && ['battle', 'abilities'].includes(action.value)) return { ...current, tab: action.value };
  if (action.type === 'select' && inBounds(data, action.position)) return { ...current, selected: { x: action.position.x, y: action.position.y } };
  if (action.type === 'unit') {
    const unit = data.units.find(unit => unit.id === action.id);
    if (unit) return { ...current, selected: { ...unit.position } };
  }
  if (action.type === 'zoom' && [-1, 1].includes(action.direction)) {
    const index = Math.min(ZOOM_LEVELS.length - 1, Math.max(0, ZOOM_LEVELS.indexOf(current.zoom) + action.direction));
    return { ...current, zoom: ZOOM_LEVELS[index] };
  }
  if (action.type === 'arrow') {
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[action.key];
    if (direction) return { ...current, selected: { x: Math.max(0, Math.min(data.width - 1, current.selected.x + direction[0])), y: Math.max(0, Math.min(data.height - 1, current.selected.y + direction[1])) } };
  }
  return current;
}
export function inspectCell(data, position) {
  if (!inBounds(data, position)) throw new RangeError('Cell is outside the battlefield');
  const terrainId = data.terrainRows[position.y][position.x];
  return { position: { ...position }, terrain: data.terrainLabels.find(terrain => terrain.id === terrainId), unit: data.units.find(unit => unit.position.x === position.x && unit.position.y === position.y) || null };
}
export function readBattlePreferences(storage, data, enabled) {
  if (!enabled) return defaultBattleState();
  try {
    const value = JSON.parse(storage?.getItem(BATTLE_STORAGE_KEY) || 'null');
    return value?.version === 1 ? normalizeBattleState(data, value.state) : defaultBattleState();
  } catch { return defaultBattleState(); }
}
export function saveBattlePreferences(storage, data, state, enabled) {
  try {
    if (!storage) return false;
    if (enabled) storage.setItem(BATTLE_STORAGE_KEY, JSON.stringify({ version: 1, state: normalizeBattleState(data, state) }));
    else storage.removeItem(BATTLE_STORAGE_KEY);
    return true;
  } catch { return false; }
}
