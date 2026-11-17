// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. The
// ember's light is a radial gradient that reveals the canal ahead; outside it, everything fades
// to near black. Text that holds a number is rebuilt only when the number changes, so a frame
// allocates nothing.
import { BARGE, DEPTH, EMBER, FIELD, FONT, LIGHT, PALETTE } from './config.js';
import { KIND_MOTH, KIND_POOL, KIND_REED, KIND_ROCK } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 150, line: 36, bottom: 74 };
const HULL_MARKS = 5;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const depthLabel = cachedLabel('Depth ');
  const lightLabel = cachedLabel('Ember ');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  /** Water, with faint current lines that scroll to sell the pace. */
  function drawWater(state) {
    context.fillStyle = PALETTE.water;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    context.lineWidth = 2;
    const offset = (state.distance * 0.35) % 64;
    context.beginPath();
    for (let line = 0; line < 9; line += 1) {
      const y = 40 + line * 80;
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();
    context.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let streak = 0; streak < 6; streak += 1) {
      const y = 90 + ((streak * 131 + offset * 3) % (FIELD.height - 160));
      context.fillRect((streak * 271 + offset * 9) % FIELD.width, y, 90, 3);
    }
  }

  function drawThings(state) {
    const things = state.things;
    for (let index = 0; index < things.length; index += 1) {
      const thing = things[index];
      if (!thing.active) continue;
      if (thing.kind === KIND_ROCK) {
        const cy = thing.y + thing.height / 2;
        context.fillStyle = PALETTE.rock;
        context.beginPath();
        context.arc(thing.x, cy, thing.radius, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = PALETTE.rockEdge;
        context.lineWidth = 3;
        context.stroke();
        context.fillStyle = 'rgba(0, 0, 0, 0.25)';
        context.beginPath();
        context.arc(thing.x - thing.radius * 0.25, cy - thing.radius * 0.2, thing.radius * 0.55, 0, Math.PI * 2);
        context.fill();
      } else if (thing.kind === KIND_MOTH) {
        const flutter = Math.sin(state.elapsed * 9 + index) * 4;
        context.fillStyle = PALETTE.mothWing;
        context.beginPath();
        context.ellipse(thing.x - 9, thing.y + flutter, 9, 5, -0.5, 0, Math.PI * 2);
        context.ellipse(thing.x + 9, thing.y + flutter, 9, 5, 0.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.moth;
        context.beginPath();
        context.arc(thing.x, thing.y, 6, 0, Math.PI * 2);
        context.fill();
      } else if (thing.kind === KIND_POOL) {
        context.fillStyle = PALETTE.poolDark;
        context.fillRect(thing.x - thing.width / 2, 0, thing.width, FIELD.height);
      } else if (thing.kind === KIND_REED) {
        const topEnd = thing.y - thing.gap / 2;
        const bottomStart = thing.y + thing.gap / 2;
        context.fillStyle = PALETTE.reeds;
        context.fillRect(thing.x, 0, thing.width, topEnd);
        context.fillRect(thing.x, bottomStart, thing.width, FIELD.height - bottomStart);
        context.fillStyle = 'rgba(255, 255, 255, 0.06)';
        for (let blade = 0; blade < 6; blade += 1) {
          const bx = thing.x + blade * (thing.width / 6);
          context.fillRect(bx, Math.max(0, topEnd - 26), 3, 26);
          context.fillRect(bx, bottomStart, 3, 26);
        }
      }
    }
  }

  /** The barge: a hull, a mast and the ember in its cradle, with a lean tilt. */
  function drawBarge(state) {
    const barge = state.barge;
    const tilt = barge.lean * 0.06;
    context.save();
    context.translate(barge.x + barge.width / 2, barge.y + barge.height / 2);
    context.rotate(tilt);
    context.fillStyle = PALETTE.bargeHull;
    context.fillRect(-barge.width / 2, -barge.height / 2 + 8, barge.width, barge.height - 8);
    context.fillStyle = PALETTE.barge;
    context.fillRect(-barge.width / 2, -barge.height / 2, barge.width, 12);
    context.fillStyle = PALETTE.bargeHull;
    context.fillRect(-6, -barge.height / 2 - 26, 5, 26);
    context.fillStyle = PALETTE.emberCore;
    context.beginPath();
    context.arc(0, -barge.height / 2 - 30, 7, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  /** The ember's light: a radial gradient over everything, brighter as the ember is fed. */
  function drawLight(state) {
    const radius = LIGHT.min + (LIGHT.max - LIGHT.min) * (Math.max(0, state.light) / EMBER.max);
    const cx = state.barge.x + state.barge.width / 2;
    const cy = state.barge.y + state.barge.height / 2;
    const gradient = context.createRadialGradient(cx, cy, radius * 0.12, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255, 190, 100, 0.14)');
    gradient.addColorStop(0.7, 'rgba(255, 170, 60, 0.05)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // The dark beyond the light, so the canal ahead is earned.
    context.fillStyle = 'rgba(3, 5, 10, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.save();
    context.globalCompositeOperation = 'destination-out';
    const hole = context.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
    hole.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = hole;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 20, 28, PALETTE.text, 'left');
    text(depthLabel(state.depth), FIELD.width / 2, 20, 28, PALETTE.text, 'center');
    // The ember bar: light is health.
    const barX = FIELD.width - 264;
    const barY = 24;
    const barWidth = 200;
    text(lightLabel(Math.ceil(state.light)), barX - 12, 20, 28, PALETTE.text, 'right');
    context.fillStyle = PALETTE.panel;
    context.fillRect(barX, barY, barWidth, 20);
    const share = Math.max(0, Math.min(1, state.light / EMBER.max));
    context.fillStyle = share > 0.35 ? PALETTE.ember : PALETTE.danger;
    context.fillRect(barX, barY, barWidth * share, 20);
    context.strokeStyle = PALETTE.muted;
    context.lineWidth = 2;
    context.strokeRect(barX, barY, barWidth, 20);
    // Hull cracks, as marks under the ember bar.
    for (let mark = 0; mark < HULL_MARKS; mark += 1) {
      context.fillStyle = mark < state.cracks ? PALETTE.danger : PALETTE.panel;
      context.fillRect(barX + mark * 30, barY + 26, 22, 6);
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.ember;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 84, 52, PALETTE.ember, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 22, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 42, 24, PALETTE.text, 'center');
  }

  const TITLE_LINES = [
    'Pilot the lantern-barge down the drowned canal.',
    'The ember is your life: it drains always, faster in dark pools.',
    'Catch glow-moths to feed it. Thread the reeds. Dodge the rocks.',
    'Lean right (D / →) to race the current — faster, and wilder.',
    '',
  ];
  const PAUSED_LINES = ['The canal will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the water, the things, the barge, the light, then the HUD or a panel. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWater(state);
    drawThings(state);
    drawBarge(state);
    drawLight(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('Ember Canal', TITLE_LINES, 'Press Space or click to launch');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `${state.mothsCaught} moths caught · depth ${state.depth} of ${DEPTH.max} · ${state.cracks} cracks`;
      drawPanel('The ember went out', OVER_LINES, 'Press Space or click to launch again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
