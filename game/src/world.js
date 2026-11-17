// The game's rules and state, with no drawing and no browser in it. The barge drifts down the
// canal; rocks, reed walls and dark pools flow toward it (the world scrolls, the barge holds
// near the left third and steers across the canal). The ember's light is health: it drains
// always, faster in dark pools, and a rock crack takes a bite at once. Moths caught back to
// back build a combo (extra light and score each catch, lost when the window lapses); a rare
// ember flare burns for a few seconds and lets the barge smash through rocks for score.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react without the world knowing about screens or sound. Nothing here allocates after
// createWorld returns.
import { BARGE, COMBO, DEPTH, EMBER, FIELD, FLARE, LIGHT, MOTH, POOL, REED, ROCK, SCORE, SPAWN_AHEAD } from './config.js';

export const KIND_ROCK = 0;
export const KIND_MOTH = 1;
export const KIND_POOL = 2;
export const KIND_REED = 3;
export const KIND_FLARE = 4;

export const EVENT_CRACK = 1;
export const EVENT_MOTH = 2;
export const EVENT_OUT = 4;
export const EVENT_DEPTH = 8;
export const EVENT_FLARE = 16;
export const EVENT_BURN = 32;
export const EVENT_COMBO = 64;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Distance from a point to a circle, squared; a hull point inside the rock is a crack. */
function pointInCircle(px, py, cx, cy, r) {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= r * r;
}

export function createWorld(random) {
  const barge = { x: FIELD.width * 0.3, y: FIELD.height / 2, width: BARGE.width, height: BARGE.height, lean: 0 };
  /** One pool of things, allocated once; rocks, moths, pools, flares and reeds all live here. */
  const things = [];
  for (let index = 0; index < 120; index += 1) {
    things.push({ active: false, kind: KIND_ROCK, x: 0, y: 0, width: 0, height: 0, speed: 0, radius: 0, gap: 0 });
  }
  const state = {
    barge,
    things,
    light: EMBER.startLight,
    score: 0,
    depth: 1,
    distance: 0,
    elapsed: 0,
    rockTimer: ROCK.interval,
    mothTimer: MOTH.interval,
    poolTimer: POOL.interval,
    reedTimer: REED.interval,
    flareTimer: FLARE.interval,
    mothsCaught: 0,
    cracks: 0,
    combo: 0,
    comboTimer: 0,
    flareSeconds: 0,
    rocksBurned: 0,
  };

  function reset() {
    barge.x = FIELD.width * 0.3;
    barge.y = FIELD.height / 2;
    barge.lean = 0;
    for (const thing of things) thing.active = false;
    state.light = EMBER.startLight;
    state.score = 0;
    state.depth = 1;
    state.distance = 0;
    state.elapsed = 0;
    state.rockTimer = ROCK.interval;
    state.mothTimer = MOTH.interval;
    state.poolTimer = POOL.interval;
    state.reedTimer = REED.interval;
    state.flareTimer = FLARE.interval;
    state.mothsCaught = 0;
    state.cracks = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.flareSeconds = 0;
    state.rocksBurned = 0;
  }

  function freeThing() {
    for (let index = 0; index < things.length; index += 1) if (!things[index].active) return things[index];
    return null;
  }

  function spawnRock() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_ROCK;
    thing.radius = ROCK.minRadius + random() * (ROCK.maxRadius - ROCK.minRadius);
    thing.width = thing.radius * 2;
    thing.height = thing.radius * 2;
    thing.x = FIELD.width + thing.radius + random() * SPAWN_AHEAD;
    thing.y = random() * (FIELD.height - thing.radius * 2);
    thing.speed = ROCK.speed + ROCK.speedPerDepth * (state.depth - 1) + random() * 60;
  }

  function spawnMoth() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_MOTH;
    thing.radius = MOTH.radius;
    thing.width = MOTH.radius * 2;
    thing.height = MOTH.radius * 2;
    thing.x = FIELD.width + MOTH.radius + random() * SPAWN_AHEAD;
    thing.y = MOTH.radius + random() * (FIELD.height - MOTH.radius * 2);
    thing.speed = MOTH.speed + random() * 50;
  }

  function spawnPool() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_POOL;
    thing.width = POOL.minWidth + random() * (POOL.maxWidth - POOL.minWidth);
    thing.height = FIELD.height;
    thing.x = FIELD.width + thing.width / 2;
    thing.y = 0;
    thing.speed = POOL.speed;
  }

  function spawnReed() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_REED;
    thing.gap = REED.gapMin + random() * (REED.gapMax - REED.gapMin);
    thing.y = thing.gap / 2 + random() * (FIELD.height - thing.gap);
    thing.width = REED.stalkWidth;
    thing.height = FIELD.height;
    thing.x = FIELD.width + REED.stalkWidth;
    thing.speed = REED.speed + 20 * (state.depth - 1) + random() * 30;
  }

  /** A rare ember flare drifts by: catch it and rocks burn for a few seconds. */
  function spawnFlare() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_FLARE;
    thing.radius = 16;
    thing.width = 32;
    thing.height = 32;
    thing.x = FIELD.width + thing.radius + random() * SPAWN_AHEAD;
    thing.y = thing.radius + random() * (FIELD.height - thing.radius * 2);
    thing.speed = 110 + random() * 40;
  }

  function rockInterval() {
    return Math.max(ROCK.minInterval, ROCK.interval * ROCK.intervalScale ** (state.depth - 1));
  }

  function reedInterval() {
    return Math.max(REED.minInterval, REED.interval * REED.intervalScale ** (state.depth - 1));
  }

  /** The gap a reed wall offers, as the band the barge must thread. */
  function reedGap(thing) {
    return { top: thing.y - thing.gap / 2, bottom: thing.y + thing.gap / 2 };
  }

  /** Is the barge inside a dark pool's band? */
  function inPool() {
    const cx = barge.x + barge.width / 2;
    for (let index = 0; index < things.length; index += 1) {
      const thing = things[index];
      if (thing.active && thing.kind === KIND_POOL && cx > thing.x - thing.width / 2 && cx < thing.x + thing.width / 2) return true;
    }
    return false;
  }

  /** The ember's light radius right now: the deeper the run, the dimmer the floor. */
  function lightRadius() {
    const share = Math.max(0, state.light) / EMBER.max;
    return LIGHT.min + (LIGHT.max - LIGHT.min) * share;
  }

  /**
   * One fixed step. `steer` is -1, 0 or 1 (up, hold, down); `lean` is -1..1, how hard the
   * barge leans into the current — leaning speeds the run and the score but widens the drift.
   * With `harmless` set (the title screen's backdrop) the canal flows but nothing touches.
   */
  function step(dt, steer, lean, harmless) {
    let events = 0;
    state.elapsed += dt;
    const depth = Math.min(DEPTH.max, 1 + Math.floor(state.elapsed / DEPTH.seconds));
    if (depth !== state.depth) {
      state.depth = depth;
      events |= EVENT_DEPTH;
    }

    // The run's pace: the current's base plus a bonus for leaning into it.
    const pace = 150 + 60 * (state.depth - 1) + 130 * Math.max(0, lean);
    state.distance += pace * dt;
    state.score += Math.round(pace * dt * SCORE.distance * 0.01);

    // Steering: thrust against a drift the current and the lean both widen.
    const drift = BARGE.drift * (1 + Math.abs(lean) * BARGE.maxLean);
    barge.y += drift * dt * (steer === 0 ? 1 : 0.35);
    barge.y += steer * BARGE.steer * dt * 1.6;
    barge.y = Math.min(FIELD.height - barge.height - 8, Math.max(8, barge.y));
    barge.lean = lean;

    // The ember always drains; a dark pool drains it hard.
    state.light -= EMBER.drain * dt;
    if (!harmless && inPool()) state.light -= EMBER.drainInDark * dt;

    // The combo decays when no moth is caught within its window.
    if (state.combo > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    // The flare's burn counts down; while it burns rocks are fuel, not hazards.
    if (state.flareSeconds > 0) state.flareSeconds = Math.max(0, state.flareSeconds - dt);

    state.rockTimer -= dt;
    if (state.rockTimer <= 0) {
      spawnRock();
      state.rockTimer += rockInterval();
    }
    state.mothTimer -= dt;
    if (state.mothTimer <= 0) {
      spawnMoth();
      state.mothTimer += MOTH.interval + random() * MOTH.intervalJitter;
    }
    state.poolTimer -= dt;
    if (state.poolTimer <= 0) {
      spawnPool();
      state.poolTimer += POOL.interval + random() * POOL.intervalJitter;
    }
    state.reedTimer -= dt;
    if (state.reedTimer <= 0) {
      spawnReed();
      state.reedTimer += reedInterval();
    }
    state.flareTimer -= dt;
    if (state.flareTimer <= 0) {
      spawnFlare();
      state.flareTimer += FLARE.interval + random() * FLARE.intervalJitter;
    }

    const left = barge.x;
    const right = barge.x + barge.width;
    const top = barge.y;
    const bottom = barge.y + barge.height;

    for (let index = 0; index < things.length; index += 1) {
      const thing = things[index];
      if (!thing.active) continue;
      thing.x -= (thing.speed + pace * 0.4) * dt;
      if (thing.x < -thing.width - 80) {
        thing.active = false;
        if (thing.kind === KIND_ROCK && !harmless) state.score += SCORE.rockDodge;
        continue;
      }
      if (harmless) continue;

      if (thing.kind === KIND_MOTH) {
        const cx = thing.x;
        const cy = thing.y;
        if (pointInCircle(cx, cy, left, top, thing.radius) || pointInCircle(cx, cy, right, top, thing.radius) ||
            pointInCircle(cx, cy, left, bottom, thing.radius) || pointInCircle(cx, cy, right, bottom, thing.radius) ||
            pointInCircle(cx, cy, left + barge.width / 2, top + barge.height / 2, thing.radius + barge.width / 2)) {
          thing.active = false;
          state.mothsCaught += 1;
          state.combo = Math.min(10, state.combo + 1);
          state.comboTimer = COMBO.window;
          const comboLight = Math.min(COMBO.lightMax, (state.combo - 1) * COMBO.lightStep);
          const comboScore = Math.min(COMBO.scoreMax, (state.combo - 1) * COMBO.scoreStep);
          state.light = Math.min(EMBER.max, state.light + MOTH.light + comboLight);
          state.score += SCORE.moth + comboScore;
          events |= EVENT_MOTH | (state.combo >= 3 ? EVENT_COMBO : 0);
        }
      } else if (thing.kind === KIND_FLARE) {
        const cx = thing.x;
        const cy = thing.y;
        if (pointInCircle(cx, cy, left, top, thing.radius) || pointInCircle(cx, cy, right, top, thing.radius) ||
            pointInCircle(cx, cy, left, bottom, thing.radius) || pointInCircle(cx, cy, right, bottom, thing.radius)) {
          thing.active = false;
          state.flareSeconds = FLARE.burnSeconds;
          events |= EVENT_FLARE;
        }
      } else if (thing.kind === KIND_ROCK) {
        const cx = thing.x;
        const cy = thing.y + thing.height / 2;
        const corners = [[left, top], [right, top], [left, bottom], [right, bottom]];
        let hit = false;
        for (let corner = 0; corner < corners.length; corner += 1) {
          if (pointInCircle(corners[corner][0], corners[corner][1], cx, cy, thing.radius)) {
            hit = true;
            break;
          }
        }
        if (!hit) {
          const nx = Math.min(Math.max(cx, left), right);
          const ny = Math.min(Math.max(cy, top), bottom);
          hit = pointInCircle(nx, ny, cx, cy, thing.radius);
        }
        if (hit) {
          thing.active = false;
          if (state.flareSeconds > 0) {
            // Burning: the rock is fuel. A little light, a little score, no crack.
            state.light = Math.min(EMBER.max, state.light + 4);
            state.score += SCORE.flareBurn;
            state.rocksBurned += 1;
            events |= EVENT_BURN;
          } else {
            state.light -= ROCK.crackLight;
            state.cracks += 1;
            events |= EVENT_CRACK;
            if (state.light <= 0) {
              state.light = 0;
              events |= EVENT_OUT;
              break;
            }
          }
        }
      } else if (thing.kind === KIND_REED) {
        const gap = reedGap(thing);
        const bargeTop = top;
        const bargeBottom = bottom;
        if (right > thing.x && left < thing.x + thing.width) {
          if (bargeTop < gap.top || bargeBottom > gap.bottom) {
            thing.active = false;
            state.light -= ROCK.crackLight * 1.4;
            state.cracks += 1;
            events |= EVENT_CRACK;
            if (state.light <= 0) {
              state.light = 0;
              events |= EVENT_OUT;
              break;
            }
          }
        }
      }
    }

    if (!harmless && state.light <= 0) {
      state.light = 0;
      events |= EVENT_OUT;
    }
    return events;
  }

  reset();
  return { state, reset, step, lightRadius, inPool, reedGap };
}
