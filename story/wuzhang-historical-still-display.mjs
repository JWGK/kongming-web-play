import {prepareNativeStillFiles} from "./native-still-surface.mjs?v=0.73.80";
import {historicalFrames} from "./wuzhang-historical-still-frames.mjs?v=0.73.80";

const world = "assets/map12-story/scene-c8c9278de0d78538d7f6.png";
const conditionalActors = [6, 14, 5];

export function historicalStillFile(cursor, stage, room) {
  if (!Array.isArray(cursor) || cursor.length !== 5 || cursor[0] !== 4 ||
      cursor[1] !== 3 || cursor[2] !== 17 || room?.retainsBattleFrame) return null;
  const [, , , block, index] = cursor;
  if (block === 0 && (index === 1 && stage === "dialogue" ||
      index === 2 && stage === "march")) return world;
  const actorVariant = block === 2 && (index === 19 || index === 20 || index === 39);
  const actors = actorVariant && Array.isArray(room?.actors) ?
    new Set(room.actors.map(actor => actor.definitionIndex)) : null;
  if (actorVariant && !actors) return null;
  const mask = actors ? conditionalActors.reduce((sum, id, bit) =>
    actors.has(id) ? sum | (1 << bit) : sum, 0) : null;
  const key = JSON.stringify(mask === null ? [cursor, stage] : [cursor, stage, mask]);
  return historicalFrames[key] ?? null;
}

export function prepareHistoricalStillFiles() {
  return prepareNativeStillFiles([world, ...Object.values(historicalFrames)]);
}
