// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.
//
// FIREFLY GARDEN: a bright night garden. You are a firefly — move freely in all four
// directions (WASD / arrows / drag anywhere on touch). Collect glowing dew drops to fill the
// jar before dawn; avoid spiders that patrol and thorn vines that grow. A golden bloom is a
// shield; a blue bloom slows time for a while. Three hearts, three gardens, each busier than
// the last. Everything is big, bright and readable at a glance.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const FLY = { radius: 22, speed: 340 };

export const DROPS = { radius: 14, need: 12, interval: 1.1, maxOnField: 7 };

export const SPIDER = { radius: 26, speedBase: 120, speedPerGarden: 45, interval: 4, maxPerGarden: 5 };

export const VINE = { interval: 5, growSeconds: 2.5, lifeSeconds: 9, width: 46, maxPerGarden: 4 };

export const BLOOM = { interval: 9, shieldSeconds: 5, slowSeconds: 4, lifeSeconds: 8 };

export const HEARTS = 3;
export const GARDENS = 3;

export const SCORE = { drop: 100, gardenBonus: 500, bloom: 50 };

export const BEST_KEY = 'firefly-garden-best';

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

// A bright night: deep teal sky, warm glows, everything outlined so it reads at a glance.
export const PALETTE = {
  sky: '#1c4d5e',
  skyGlow: '#2a6b7d',
  grass: '#2e7d4f',
  grassDark: '#256843',
  blades: 'rgba(140, 230, 170, 0.35)',
  drop: '#7fe3ff',
  dropCore: '#e8fbff',
  spider: '#3a2a3f',
  spiderLegs: '#241a28',
  spiderEyes: '#ff5d5d',
  vine: '#3f8f3a',
  vineThorn: '#1f5426',
  bloomGold: '#ffd166',
  bloomBlue: '#7fb8ff',
  fly: '#ffe066',
  flyWing: 'rgba(255, 255, 255, 0.85)',
  flyGlow: 'rgba(255, 224, 102, 0.35)',
  heart: '#ff6b81',
  heartEmpty: 'rgba(255, 255, 255, 0.25)',
  text: '#ffffff',
  muted: '#d7f0f5',
  panel: 'rgba(10, 40, 52, 0.92)',
  panelEdge: '#ffd166',
  danger: '#ff5d5d',
  shieldRing: 'rgba(255, 209, 102, 0.8)',
  slowTint: 'rgba(127, 184, 255, 0.14)',
};
