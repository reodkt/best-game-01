// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
//
// Ember Canal: you pilot a lantern-barge down a flooded canal at night, towing a fragile ember
// that lights the water ahead. Rocks and reed walls close in as the canal narrows; glow-moths
// restock the ember's light; deep dark pools slow you and eat light. The ember is the health
// bar: when its glow runs out, the run ends. Speed is a choice — leaning into the current is
// faster but harder to steer.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The barge: a wide, slow hull that steers with a drift it must counter. */
export const BARGE = {
  width: 84,
  height: 40,
  speed: 300,
  drift: 46,          // px/s the current pushes you sideways each second
  steer: 620,         // px/s^2 of steering thrust
  maxLean: 1,         // -1..1, how hard the current pulls while you lean into it
};

/** The ember: light is health. It drains constantly and faster in the dark pools. */
export const EMBER = {
  max: 100,
  drain: 2.6,         // light per second, always
  drainInDark: 9.5,   // extra light per second inside a dark pool
  startLight: 78,     // where a fresh run begins
};

/** A glow-moth pickup: rests on the water, worth light and score. */
export const MOTH = {
  radius: 15,
  speed: 120,
  light: 26,
  points: 25,
  interval: 1.7,
  intervalJitter: 1.1,
};

/** A rock: the hull cracks on one, each crack drains light at once. */
export const ROCK = {
  minRadius: 26,
  maxRadius: 74,
  speed: 210,
  speedPerDepth: 26,
  interval: 0.62,
  intervalScale: 0.9,
  minInterval: 0.2,
  crackLight: 16,     // light lost per crack
  dodgePoints: 2,
};

/** A dark pool: a slow band of deep water that eats the ember's light. */
export const POOL = {
  minWidth: 220,
  maxWidth: 520,
  speed: 165,
  interval: 5.2,
  intervalJitter: 3,
  points: 0,
};

/** A reed wall: a gap in a line of reeds; thread it or crack the hull. */
export const REED = {
  gapMin: 190,
  gapMax: 330,
  speed: 205,
  interval: 4.4,
  intervalScale: 0.93,
  minInterval: 2.6,
  stalkWidth: 26,
};

/** Seconds per depth band; the canal narrows and quickens with each. */
export const DEPTH = { seconds: 14, max: 9 };

/** How far ahead of the barge things spawn, and how long a run can last before the scene ends. */
export const SPAWN_AHEAD = 90;

/** The light radius the ember casts, at full and at its floor. */
export const LIGHT = { max: 430, min: 120 };

export const SCORE = { moth: MOTH.points, rockDodge: ROCK.dodgePoints, distance: 1 };

export const PALETTE = {
  backdrop: '#070a12',
  water: '#0d1424',
  waterDeep: '#0a0f1c',
  poolDark: '#05070d',
  reeds: '#173322',
  rock: '#3c4356',
  rockEdge: '#59627a',
  barge: '#c98a3d',
  bargeHull: '#8a5a26',
  ember: '#ffb347',
  emberCore: '#fff3d6',
  moth: '#ffe9a8',
  mothWing: '#c9b06a',
  lightGlow: 'rgba(255, 179, 71, 0.16)',
  text: '#f2ead8',
  muted: '#7d8899',
  panel: '#101828',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best run is kept between visits (this browser only). */
export const BEST_KEY = 'ember-canal.best';
