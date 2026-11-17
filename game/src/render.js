// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. The
// ember's light is a radial gradient over a canal that stays readable on its own — the scene
// must read at a glance even where the light does not reach. Behind everything, two parallax
// layers of far shore and near reeds scroll at different speeds to sell the depth. Particles
// (moth dust, crack splinters, burn sparks) are drawn from a fixed pool; text that holds a
// number is rebuilt only when the number changes, so a frame allocates nothing.
import { BARGE, DEPTH, EMBER, FIELD, FONT, LIGHT, PALETTE } from './config.js';
import { KIND_FLARE, KIND_MOTH, KIND_POOL, KIND_REED, KIND_ROCK } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 660, top: 170, line: 38, bottom: 80 };
const HULL_MARKS = 5;
const PARTICLES = 64;

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
  const comboLabel = cachedLabel('Combo x');
  const particles = [];
  for (let index = 0; index < PARTICLES; index += 1) {
    particles.push({ life: 0, x: 0, y: 0, vx: 0, vy: 0, size: 2, colour: PALETTE.ember });
  }
  let shake = 0;

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

  /** Spawn a burst of particles at a point. `count` of the pool's slots light up. */
  function burst(x, y, count, colour, speed) {
    for (let index = 0; index < PARTICLES && count > 0; index += 1) {
      const p = particles[index];
      if (p.life > 0) continue;
      count -= 1;
      p.life = 0.4 + Math.random() * 0.4;
      p.x = x;
      p.y = y;
      const angle = Math.random() * Math.PI * 2;
      p.vx = Math.cos(angle) * speed * (0.4 + Math.random() * 0.6);
      p.vy = Math.sin(angle) * speed * (0.4 + Math.random() * 0.6);
      p.size = 2 + Math.random() * 3;
      p.colour = colour;
    }
  }

  function drawParticles(dt) {
    for (let index = 0; index < PARTICLES; index += 1) {
      const p = particles[index];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
      context.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      context.fillStyle = p.colour;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;
  }

  /** Far shore silhouettes (slow) and near reed tufts (fast), two parallax layers. */
  function drawParallax(state) {
    const far = (state.distance * 0.25) % 320;
    context.fillStyle = 'rgba(40, 62, 92, 0.55)';
    for (let index = -1; index < 5; index += 1) {
      const x = index * 320 - far;
      context.fillRect(x, 40, 190, 26);
      context.fillRect(x + 220, 70, 130, 18);
      context.fillRect(x + 90, 620, 210, 30);
      context.fillRect(x + 260, 648, 120, 20);
    }
    const near = (state.distance * 0.85) % 260;
    context.fillStyle = 'rgba(30, 48, 44, 0.75)';
    for (let index = -1; index < 6; index += 1) {
      const x = index * 260 - near;
      context.fillRect(x, 690, 150, 30);
      context.fillRect(x + 170, 0, 110, 24);
    }
  }

  /** Water, with faint current lines that scroll to sell the pace. */
  function drawWater(state) {
    context.fillStyle = PALETTE.water;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.waterLines;
    context.lineWidth = 2;
    const offset = (state.distance * 0.35) % 64;
    context.beginPath();
    for (let line = 0; line < 9; line += 1) {
      const y = 40 + line * 80;
      context.moveTo(0, y);
      context.lineTo(FIELD.width, y);
    }
    context.stroke();
    context.fillStyle = PALETTE.waterStreaks;
    for (let streak = 0; streak < 8; streak += 1) {
      const y = 90 + ((streak * 131 + offset * 3) % (FIELD.height - 160));
      context.fillRect((streak * 271 + offset * 9) % FIELD.width, y, 110, 4);
    }
    drawParallax(state);
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
        context.fillStyle = PALETTE.rockShade;
        context.beginPath();
        context.arc(thing.x - thing.radius * 0.25, cy - thing.radius * 0.2, thing.radius * 0.55, 0, Math.PI * 2);
        context.fill();
      } else if (thing.kind === KIND_MOTH) {
        const flutter = Math.sin(state.elapsed * 9 + index) * 4;
        context.fillStyle = PALETTE.mothWing;
        context.beginPath();
        context.ellipse(thing.x - 10, thing.y + flutter, 11, 6, -0.5, 0, Math.PI * 2);
        context.ellipse(thing.x + 10, thing.y + flutter, 11, 6, 0.5, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.moth;
        context.beginPath();
        context.arc(thing.x, thing.y, 7, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(255, 244, 200, 0.9)';
        context.beginPath();
        context.arc(thing.x, thing.y, 3, 0, Math.PI * 2);
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
        context.fillStyle = PALETTE.reedBlades;
        for (let blade = 0; blade < 6; blade += 1) {
          const bx = thing.x + blade * (thing.width / 6);
          context.fillRect(bx, Math.max(0, topEnd - 30), 4, 30);
          context.fillRect(bx, bottomStart, 4, 30);
        }
      } else if (thing.kind === KIND_FLARE) {
        const pulse = 1 + Math.sin(state.elapsed * 7) * 0.2;
        context.fillStyle = 'rgba(255, 157, 92, 0.35)';
        context.beginPath();
        context.arc(thing.x, thing.y, 26 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.flareText;
        context.beginPath();
        context.arc(thing.x, thing.y, 12 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#fff3d6';
        context.beginPath();
        context.arc(thing.x, thing.y, 5, 0, Math.PI * 2);
        context.fill();
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
    context.arc(0, -barge.height / 2 - 30, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.ember;
    context.beginPath();
    context.arc(0, -barge.height / 2 - 30, 14, 0, Math.PI * 2);
    context.globalAlpha = 0.4;
    context.fill();
    context.globalAlpha = 1;
    context.restore();
  }

  /** The ember's light: a radial gradient that opens the dark, brighter as the ember is fed. */
  function drawLight(state) {
    const radius = LIGHT.min + (LIGHT.max - LIGHT.min) * (Math.max(0, state.light) / EMBER.max);
    const cx = state.barge.x + state.barge.width / 2;
    const cy = state.barge.y + state.barge.height / 2;
    context.save();
    context.globalCompositeOperation = 'destination-out';
    const hole = context.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    hole.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    hole.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = hole;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.restore();
    // A warm tint inside the light, so the glow itself is visible.
    const warm = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    warm.addColorStop(0, 'rgba(255, 190, 100, 0.16)');
    warm.addColorStop(1, 'rgba(255, 170, 60, 0)');
    context.fillStyle = warm;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawHud(state, best) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 20, 30, PALETTE.text, 'left');
    text(depthLabel(state.depth), FIELD.width / 2, 20, 30, PALETTE.text, 'center');
    // The ember bar: light is health.
    const barX = FIELD.width - 264;
    const barY = 24;
    const barWidth = 200;
    text(lightLabel(Math.ceil(state.light)), barX - 12, 20, 30, PALETTE.text, 'right');
    context.fillStyle = PALETTE.panel;
    context.fillRect(barX, barY, barWidth, 22);
    const share = Math.max(0, Math.min(1, state.light / EMBER.max));
    context.fillStyle = share > 0.35 ? PALETTE.ember : PALETTE.danger;
    context.fillRect(barX, barY, barWidth * share, 22);
    context.strokeStyle = PALETTE.muted;
    context.lineWidth = 2;
    context.strokeRect(barX, barY, barWidth, 22);
    // Hull cracks, as marks under the ember bar.
    for (let mark = 0; mark < HULL_MARKS; mark += 1) {
      context.fillStyle = mark < state.cracks ? PALETTE.danger : PALETTE.panel;
      context.fillRect(barX + mark * 30, barY + 28, 22, 6);
    }
    if (state.combo >= 2) text(comboLabel(state.combo), 24, 58, 26, PALETTE.comboText, 'left');
    if (state.flareSeconds > 0) text(`FLARE ${Math.ceil(state.flareSeconds)}s`, 24, state.combo >= 2 ? 92 : 58, 26, PALETTE.flareText, 'left');
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 90, 56, PALETTE.ember, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 23, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 44, 26, PALETTE.text, 'center');
  }

  const TITLE_LINES = [
    'Pilot the lantern-barge down the drowned canal.',
    'The ember is your life: it drains always, faster in dark pools.',
    'Catch glow-moths to feed it — back-to-back catches build a combo.',
    'Catch an ember flare and rocks burn as fuel for a few seconds.',
    'Lean right (D / →) to race the current — faster, and wilder.',
  ];
  const PAUSED_LINES = ['The canal will wait for you.'];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the water, the things, the barge, the light, then the HUD or a panel. */
  function draw(state, screen, best, dt) {
    if (shake > 0) shake = Math.max(0, shake - dt * 30);
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const jx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const jy = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + jx * view.scale, view.y + jy * view.scale);
    drawWater(state);
    drawThings(state);
    drawBarge(state);
    drawLight(state);
    drawParticles(dt ?? 1 / 60);
    if (screen === SCREEN_TITLE) {
      drawPanel('Ember Canal', TITLE_LINES, 'Press Space or click to launch');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = `${state.mothsCaught} moths · best combo x${state.combo} · depth ${state.depth} of ${DEPTH.max} · ${state.rocksBurned} rocks burned`;
      drawPanel('The ember went out', OVER_LINES, 'Press Space or click to launch again');
    }
  }

  return { draw, burst, addShake(amount) { shake = Math.max(shake, amount); } };
}
