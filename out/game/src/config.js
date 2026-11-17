// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
//
// Ember Canal: pilot a lantern-barge down a drowned canal at night. The towed ember is the
// health bar — it drains always, faster in dark pools, and a rock crack takes a bite at once.
// Glow-moths feed it; catching them back to back builds a combo worth extra light and score.
// Rare ember flares let the barge burn straight through one rock. Leaning into the current
// (D / →) races the pace and the score at the cost of control.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const SPAWN_AHEAD = 420;
export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const BARGE = { width: 52, height: 34, steer: 320, drift: 26, maxLean: 1.4 };

export const EMBER = { max: 100, startLight: 72, drain: 2.6, drainInDark: 11 };

export const ROCK = {
  minRadius: 26, maxRadius: 62,
  speed: 130, speedPerDepth: 55,
  interval: 1.5, intervalScale: 0.93, minInterval: 0.55,
  crackLight: 14,
};

export const MOTH = { radius: 12, light: 13, speed: 95, interval: 2.1, intervalJitter: 1.7 };

export const POOL = { minWidth: 150, maxWidth: 320, speed: 150, interval: 6.5, intervalJitter: 5 };

export const REED = { stalkWidth: 26, gapMin: 150, gapMax: 240, speed: 150, interval: 5.5, intervalScale: 0.94, minInterval: 2.6 };

export const FLARE = { interval: 9, intervalJitter: 6, burnSeconds: 6 };

export const COMBO = { window: 4, lightStep: 2, lightMax: 10, scoreStep: 25, scoreMax: 150 };

export const DEPTH = { seconds: 14, max: 9 };

export const SCORE = { distance: 1, moth: 100, rockDodge: 20, flareBurn: 40 };

export const LIGHT = { min: 150, max: 460 };

export const BEST_KEY = 'ember-canal-best';

// A brighter night than most: the canal reads at a glance even in a small contact sheet, while
// the pools and the far dark still hold the mood. The ember's warm colours sit against the
// cool water, so the eye lands on the barge first, then the things ahead of it.
export const PALETTE = {
  backdrop: '#0b1220',
  water: '#1d3350',
  waterStreaks: 'rgba(160, 210, 255, 0.07)',
  waterLines: 'rgba(160, 210, 255, 0.05)',
  rock: '#5b6472',
  rockEdge: '#8a94a6',
  rockShade: 'rgba(10, 16, 28, 0.45)',
  moth: '#ffe08a',
  mothWing: 'rgba(255, 224, 138, 0.55)',
  poolDark: 'rgba(6, 10, 22, 0.72)',
  reeds: '#2e4a3a',
  reedBlades: 'rgba(190, 255, 200, 0.12)',
  barge: '#7c5a3a',
  bargeHull: '#5a3f26',
  ember: '#ffb347',
  emberCore: '#fff3d6',
  danger: '#ff5d5d',
  text: '#f2ead8',
  muted: '#a8b4c8',
  panel: 'rgba(12, 20, 36, 0.92)',
  panelEdge: '#ffb347',
  comboText: '#ffd166',
  flareText: '#ff9d5c',
};
