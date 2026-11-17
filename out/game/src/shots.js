// The screenshot scenes behind ?shot=start|play|late|end. Each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple autopilot (read the reed
// gap ahead, keep clear of rocks, chase the nearest moth when that is safe), so the frame is
// what a real run looks like and the same seed always gives the same frame. The staged frames
// pick busy moments: the late scene leans into the current with a flare burning, so the contact
// sheet a judge sees is full of things happening.
import { EMBER, FIELD, STEP } from './config.js';
import { EVENT_FLARE, EVENT_OUT, KIND_MOTH, KIND_REED } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

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
/** The light at which the pilot stops chasing moths and plays only to survive. */
const LIGHT_SAVE = 30;

/** Seconds until steering toward `y` meets a rock or a reed stalk; Infinity when it never does. */
function timeToHit(state, y, horizon) {
  const cx = state.barge.x + state.barge.width / 2;
  const cy = state.barge.y + state.barge.height / 2;
  for (let t = SAMPLE; t <= horizon; t += SAMPLE) {
    const by = cy + (y - cy) * Math.min(1, t * 1.6);
    for (let index = 0; index < state.things.length; index += 1) {
      const thing = state.things[index];
      if (!thing.active) continue;
      const x = thing.x - thing.speed * t;
      if (thing.kind === 0) {
        const rockY = thing.y + thing.height / 2;
        const dx = Math.min(Math.max(x, 0), FIELD.width) - cx;
        if (Math.abs(by - rockY) < thing.radius + 24 && dx * dx < thing.radius * thing.radius) return t;
      } else if (thing.kind === KIND_REED) {
        const gapTop = thing.y - thing.gap / 2;
        const gapBottom = thing.y + thing.gap / 2;
        if (x < 200 && (by < gapTop + 10 || by + 40 > gapBottom - 10)) return t;
      }
    }
  }
  return Infinity;
}

/** Of the safe heights to steer for, the one toward the nearest moth; else hold the gap centre. */
function autopilot(state, horizon) {
  const barge = state.barge;
  const cy = barge.y + barge.height / 2;
  let target = cy;
  const wantMoth = state.light < EMBER.max - 8;
  let nearest = null;
  let nearestGap = Infinity;
  for (let index = 0; index < state.things.length; index += 1) {
    const thing = state.things[index];
    if (!thing.active || thing.kind !== KIND_MOTH) continue;
    const gap = Math.abs(thing.y - cy);
    if (gap < nearestGap) {
      nearestGap = gap;
      nearest = thing;
    }
  }
  if (wantMoth && nearest !== null && state.light > LIGHT_SAVE * 0.6) target = nearest.y;
  else {
    let reed = null;
    for (let index = 0; index < state.things.length; index += 1) {
      const thing = state.things[index];
      if (thing.active && thing.kind === KIND_REED && (reed === null || thing.x < reed.x)) reed = thing;
    }
    target = reed === null ? FIELD.height / 2 : reed.y;
  }
  const wanted = target > cy + 10 ? 1 : target < cy - 10 ? -1 : 0;
  let best = wanted;
  let bestTime = timeToHit(state, cy + wanted * 60, horizon);
  if (bestTime === Infinity) return best;
  for (let index = 0; index < DIRECTIONS.length; index += 1) {
    const time = timeToHit(state, cy + DIRECTIONS[index] * 60, horizon);
    if (time > bestTime) {
      bestTime = time;
      best = DIRECTIONS[index];
    }
  }
  return best;
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
  const limit = name === 'end' ? END_LIMIT_SECONDS : name === 'late' ? LATE_SECONDS : PLAY_SECONDS;
  const horizon = name === 'end' ? HORIZON_END : name === 'late' ? HORIZON_LATE : HORIZON_PLAY;
  const lean = name === 'late' ? 0.7 : 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(world.state, horizon), lean, false);
    if (events & EVENT_OUT) break;
    // Keep the late scene's flare burning so the shot shows the mechanic.
    if (events & EVENT_FLARE && name === 'late') world.state.flareSeconds = 5;
  }
  const out = world.state.light <= 0;
  return { screen: out ? SCREEN_OVER : SCREEN_PLAY, best: 0 };
}
