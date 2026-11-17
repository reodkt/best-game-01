// The screenshot scenes behind ?shot=start|play|late|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by a simple autopilot, so
// the frame is what a real run looks like and the same seed always gives the same frame.
import { GARDENS, STEP } from './config.js';
import { EVENT_OUT } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 1.2;
const PLAY_SECONDS = 30;
const LATE_SECONDS = 66;
const END_LIMIT_SECONDS = 900;
/** How far ahead, in seconds, the pilot looks at each stage of the run. */
const HORIZON_PLAY = 0.9;
const HORIZON_LATE = 0.55;
const HORIZON_END = 0.3;
const SAMPLE = 1 / 30;
const DIRECTIONS = [-1, 0, 1];
/** Extra room, each side, it keeps between the hull and a rock. */
const MARGIN = 16;

/** Of the safe heights to steer for, the one toward the nearest dew drop; else hold still. */
function autopilot(state, horizon) {
  const fly = state.fly;
  // Chase the nearest dew drop or bloom; flee any spider within 150 px; the vector sum of the
  // two urges is the move, so the pilot still collects while it backs away.
  let target = null;
  let targetDist = Infinity;
  let fleeX = 0;
  let fleeY = 0;
  for (let index = 0; index < state.things.length; index += 1) {
    const thing = state.things[index];
    if (!thing.active) continue;
    const dx = thing.x - fly.x;
    const dy = thing.y - fly.y;
    const dist = Math.hypot(dx, dy) || 1;
    if (thing.kind === 1) {
      if (dist < 150) {
        fleeX -= (dx / dist) * (150 - dist) / 150;
        fleeY -= (dy / dist) * (150 - dist) / 150;
      }
      continue;
    }
    if (thing.kind === 0 || thing.kind === 3 || thing.kind === 4) {
      if (dist < targetDist) {
        targetDist = dist;
        target = thing;
      }
    }
  }
  let dx = 0;
  let dy = 0;
  if (target !== null && targetDist > 10) {
    dx = (target.x - fly.x) / targetDist;
    dy = (target.y - fly.y) / targetDist;
  }
  dx += fleeX * 2;
  dy += fleeY * 2;
  const length = Math.hypot(dx, dy);
  if (length < 0.05) return { dx: 0, dy: 0 };
  return { dx: dx / length, dy: dy / length };
}

/**
 * Set `world` to the named scene (start, play, late or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'end' && name !== 'late') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, 0, 0, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  // 'end' plays until the run actually ends (caught or dawn), so the frame is a real ending;
  // 'late' plays twice as long as 'play', so the garden is busier; 'play' is the early game.
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'late' ? LATE_SECONDS : PLAY_SECONDS;
  for (let index = 0; index < limit / STEP; index += 1) {
    const dir = autopilot(world.state, 0.9);
    if (world.step(STEP, dir.dx, dir.dy, false) & EVENT_OUT) break;
  }
  if (name === 'end' && world.state.garden <= GARDENS) {
    // Still alive after the cap: show the caught screen anyway, with the score it reached.
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  const done = world.state.garden > GARDENS;
  return { screen: done ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
}
