// The game's rules and state, with no drawing and no browser in it. The firefly moves freely
// (the caller passes a direction vector each step); dew drops spawn and are collected by
// touch; spiders chase lazily; vines grow and wither; blooms grant a shield or slow time.
// step() advances one fixed step and returns what happened as bit flags, so the caller can
// react without the world knowing about screens or sound. Nothing allocates after createWorld.
import { BLOOM, DROPS, FIELD, FLY, GARDENS, HEARTS, SCORE, SPIDER, VINE } from './config.js';

export const KIND_DROP = 0;
export const KIND_SPIDER = 1;
export const KIND_VINE = 2;
export const KIND_SHIELD = 3;
export const KIND_SLOW = 4;

export const EVENT_COLLECT = 1;
export const EVENT_HIT = 2;
export const EVENT_OUT = 4;
export const EVENT_GARDEN = 8;
export const EVENT_SHIELD = 16;
export const EVENT_SLOW = 32;

export function createWorld(random) {
  const fly = { x: FIELD.width / 2, y: FIELD.height * 0.7, radius: FLY.radius };
  const things = [];
  for (let index = 0; index < 48; index += 1) {
    things.push({ active: false, kind: KIND_DROP, x: 0, y: 0, radius: 0, born: 0, life: 0, wobble: 0 });
  }
  const state = {
    fly,
    things,
    hearts: HEARTS,
    collected: 0,
    needed: DROPS.need,
    garden: 1,
    score: 0,
    elapsed: 0,
    shieldSeconds: 0,
    slowSeconds: 0,
    invulnerable: 0,
    dropTimer: DROPS.interval,
    spiderTimer: SPIDER.interval,
    vineTimer: VINE.interval,
    bloomTimer: BLOOM.interval,
    hitFlash: 0,
  };

  function reset() {
    fly.x = FIELD.width / 2;
    fly.y = FIELD.height * 0.7;
    for (const thing of things) thing.active = false;
    state.hearts = HEARTS;
    state.collected = 0;
    state.needed = DROPS.need;
    state.garden = 1;
    state.score = 0;
    state.elapsed = 0;
    state.shieldSeconds = 0;
    state.slowSeconds = 0;
    state.invulnerable = 0;
    state.dropTimer = DROPS.interval;
    state.spiderTimer = SPIDER.interval;
    state.vineTimer = VINE.interval;
    state.bloomTimer = BLOOM.interval;
    state.hitFlash = 0;
  }

  function freeThing() {
    for (let index = 0; index < things.length; index += 1) if (!things[index].active) return things[index];
    return null;
  }

  function countKind(kind) {
    let count = 0;
    for (let index = 0; index < things.length; index += 1) {
      if (things[index].active && things[index].kind === kind) count += 1;
    }
    return count;
  }

  function spawnDrop() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_DROP;
    thing.radius = DROPS.radius;
    thing.x = 60 + random() * (FIELD.width - 120);
    thing.y = 120 + random() * (FIELD.height - 200);
    thing.born = state.elapsed;
    thing.life = 14;
    thing.wobble = random() * Math.PI * 2;
  }

  function spawnSpider() {
    if (countKind(KIND_SPIDER) >= Math.min(SPIDER.maxPerGarden, 1 + state.garden)) return;
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_SPIDER;
    thing.radius = SPIDER.radius;
    // Enter from an edge, never on top of the fly.
    const edge = Math.floor(random() * 4);
    thing.x = edge === 0 ? -40 : edge === 1 ? FIELD.width + 40 : 80 + random() * (FIELD.width - 160);
    thing.y = edge === 2 ? -40 : edge === 3 ? FIELD.height + 40 : 120 + random() * (FIELD.height - 240);
    thing.born = state.elapsed;
    thing.life = Infinity;
    thing.wobble = random() * Math.PI * 2;
  }

  function spawnVine() {
    if (countKind(KIND_VINE) >= Math.min(VINE.maxPerGarden, state.garden + 1)) return;
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = KIND_VINE;
    thing.radius = 6;
    thing.x = 120 + random() * (FIELD.width - 240);
    thing.born = state.elapsed;
    thing.life = VINE.lifeSeconds;
    thing.wobble = random() * Math.PI * 2;
  }

  function spawnBloom() {
    const thing = freeThing();
    if (thing === null) return;
    thing.active = true;
    thing.kind = Math.floor(random() * 2) === 0 ? KIND_SHIELD : KIND_SLOW;
    thing.radius = 18;
    thing.x = 80 + random() * (FIELD.width - 160);
    thing.y = 120 + random() * (FIELD.height - 220);
    thing.born = state.elapsed;
    thing.life = BLOOM.lifeSeconds;
    thing.wobble = random() * Math.PI * 2;
  }

  function spiderSpeed() {
    return SPIDER.speedBase + SPIDER.speedPerGarden * (state.garden - 1);
  }

  /** How far a vine has grown, 0..1, from its birth. */
  function vineGrowth(thing) {
    return Math.min(1, (state.elapsed - thing.born) / VINE.growSeconds);
  }

  /**
   * One fixed step. `dx` and `dy` are the move direction, each -1..1 (a vector, so a touch
   * drag or an analog stick works as well as keys). `slowInput` scales spider speed only,
   * never the fly: slow time helps you, not them.
   */
  function step(dt, dx, dy, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.shieldSeconds > 0) state.shieldSeconds = Math.max(0, state.shieldSeconds - dt);
    if (state.slowSeconds > 0) state.slowSeconds = Math.max(0, state.slowSeconds - dt);
    if (state.invulnerable > 0) state.invulnerable = Math.max(0, state.invulnerable - dt);
    if (state.hitFlash > 0) state.hitFlash = Math.max(0, state.hitFlash - dt * 3);

    // The fly moves freely inside the field.
    const length = Math.hypot(dx, dy) || 1;
    const speed = FLY.speed * Math.min(1, length);
    fly.x += (dx / length) * speed * dt;
    fly.y += (dy / length) * speed * dt;
    fly.x = Math.min(FIELD.width - fly.radius, Math.max(fly.radius, fly.x));
    fly.y = Math.min(FIELD.height - fly.radius - 8, Math.max(fly.radius + 70, fly.y));

    state.dropTimer -= dt;
    if (state.dropTimer <= 0) {
      if (countKind(KIND_DROP) < DROPS.maxOnField) spawnDrop();
      state.dropTimer += DROPS.interval;
    }
    state.spiderTimer -= dt;
    if (state.spiderTimer <= 0) {
      spawnSpider();
      state.spiderTimer += SPIDER.interval + random() * 2;
    }
    state.vineTimer -= dt;
    if (state.vineTimer <= 0) {
      spawnVine();
      state.vineTimer += VINE.interval + random() * 3;
    }
    state.bloomTimer -= dt;
    if (state.bloomTimer <= 0) {
      spawnBloom();
      state.bloomTimer += BLOOM.interval + random() * 5;
    }

    const spiderScale = state.slowSeconds > 0 ? 0.35 : 1;

    for (let index = 0; index < things.length; index += 1) {
      const thing = things[index];
      if (!thing.active) continue;
      if (thing.kind === KIND_DROP) {
        // A dew drop bobs gently where it fell.
        thing.y += Math.sin(state.elapsed * 2 + thing.wobble) * 8 * dt;
        if (thing.life !== Infinity && state.elapsed - thing.born > thing.life) {
          thing.active = false;
          continue;
        }
        const dx2 = thing.x - fly.x;
        const dy2 = thing.y - fly.y;
        if (!harmless && dx2 * dx2 + dy2 * dy2 < (thing.radius + fly.radius) ** 2) {
          thing.active = false;
          state.collected += 1;
          state.score += SCORE.drop;
          events |= EVENT_COLLECT;
          if (state.collected >= state.needed) {
            state.score += SCORE.gardenBonus;
            state.garden += 1;
            state.collected = 0;
            state.needed = DROPS.need + state.garden * 2;
            events |= EVENT_GARDEN;
            if (state.garden > GARDENS) {
              events |= EVENT_OUT;
              break;
            }
          }
        }
      } else if (thing.kind === KIND_SPIDER) {
        // A lazy chase: toward the fly, with a slow sideways wobble.
        const dx2 = fly.x - thing.x;
        const dy2 = fly.y - thing.y;
        const dist = Math.hypot(dx2, dy2) || 1;
        const speed = spiderSpeed() * spiderScale;
        thing.x += (dx2 / dist) * speed * dt + Math.cos(state.elapsed * 1.7 + thing.wobble) * 30 * dt;
        thing.y += (dy2 / dist) * speed * dt + Math.sin(state.elapsed * 1.3 + thing.wobble) * 18 * dt;
        thing.x = Math.min(FIELD.width - thing.radius, Math.max(thing.radius, thing.x));
        thing.y = Math.min(FIELD.height - thing.radius, Math.max(thing.radius + 70, thing.y));
        if (!harmless && state.invulnerable <= 0) {
          const hitDist = thing.radius + fly.radius - 6;
          const hx = thing.x - fly.x;
          const hy = thing.y - fly.y;
          if (hx * hx + hy * hy < hitDist * hitDist) {
            if (state.shieldSeconds > 0) {
              // The shield eats the hit and bounces the spider away.
              state.shieldSeconds = 0;
              thing.x -= (dx2 / dist) * 120;
              thing.y -= (dy2 / dist) * 120;
              events |= EVENT_SHIELD;
            } else {
              state.hearts -= 1;
              state.invulnerable = 2;
              state.hitFlash = 1;
              events |= EVENT_HIT;
              if (state.hearts <= 0) {
                events |= EVENT_OUT;
                break;
              }
            }
          }
        }
      } else if (thing.kind === KIND_VINE) {
        if (thing.life !== Infinity && state.elapsed - thing.born > thing.life) {
          thing.active = false;
          continue;
        }
        if (!harmless && state.invulnerable <= 0) {
          const growth = vineGrowth(thing);
          const height = growth * 260;
          const top = 70;
          const bottom = FIELD.height - 8;
          const half = VINE.width / 2 + 4;
          // The vine grows from both the ceiling and the floor at its x.
          const nearX = Math.abs(fly.x - thing.x) < half + fly.radius;
          if (nearX && (fly.y - fly.radius < top + height || fly.y + fly.radius > bottom - height)) {
            if (state.shieldSeconds > 0) {
              state.shieldSeconds = 0;
              state.invulnerable = 1;
              events |= EVENT_SHIELD;
            } else {
              state.hearts -= 1;
              state.invulnerable = 2;
              state.hitFlash = 1;
              events |= EVENT_HIT;
              if (state.hearts <= 0) {
                events |= EVENT_OUT;
                break;
              }
            }
          }
        }
      } else if (thing.kind === KIND_SHIELD || thing.kind === KIND_SLOW) {
        if (thing.life !== Infinity && state.elapsed - thing.born > thing.life) {
          thing.active = false;
          continue;
        }
        const dx2 = thing.x - fly.x;
        const dy2 = thing.y - fly.y;
        if (!harmless && dx2 * dx2 + dy2 * dy2 < (thing.radius + fly.radius) ** 2) {
          thing.active = false;
          state.score += SCORE.bloom;
          if (thing.kind === KIND_SHIELD) {
            state.shieldSeconds = BLOOM.shieldSeconds;
            events |= EVENT_SHIELD;
          } else {
            state.slowSeconds = BLOOM.slowSeconds;
            events |= EVENT_SLOW;
          }
        }
      }
    }

    return events;
  }

  reset();
  return { state, reset, step, vineGrowth, spiderSpeed };
}
