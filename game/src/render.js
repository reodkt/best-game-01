// Drawing only: the world's state and the current screen in, pixels out. Everything is big,
// bright and outlined so the scene reads at a glance — a firefly with a warm glow, glowing
// dew drops, spiders with red eyes, vines with thorns, blooms with a pulsing halo. The
// 1280x720 playfield is scaled to fit the window and centred.
import { BLOOM, FIELD, FONT, GARDENS, HEARTS, PALETTE, VINE } from './config.js';
import { KIND_DROP, KIND_SHIELD, KIND_SLOW, KIND_SPIDER, KIND_VINE } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 680, top: 170, line: 40, bottom: 84 };

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
  const gardenLabel = cachedLabel('Garden ');
  const jarLabel = cachedLabel('');
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
    // CSS pixels per device pixel: pointer events report CSS pixels, the canvas is device pixels.
    view.css = ratio;
  }

  /** Map screen (CSS) pixels to field coordinates, for input steering. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (FIELD.width / rect.width),
      y: (clientY - rect.top) * (FIELD.height / rect.height),
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.textAlign = align;
    context.fillStyle = 'rgba(0, 0, 0, 0.6)';
    context.fillText(value, x + 2, y + 2);
    context.fillStyle = color;
    context.fillText(value, x, y);
  }

  /** The garden backdrop: sky above, grass below, and soft glows that keep it bright. */
  function drawBackdrop(state) {
    const sky = context.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.skyGlow);
    sky.addColorStop(0.45, PALETTE.sky);
    sky.addColorStop(1, PALETTE.grass);
    context.fillStyle = sky;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Grass blades along the bottom, in two depths.
    context.strokeStyle = PALETTE.blades;
    context.lineWidth = 3;
    const sway = state.elapsed * 1.2;
    context.beginPath();
    for (let blade = 0; blade < 40; blade += 1) {
      const x = blade * 32 + 8;
      const swayX = Math.sin(sway + blade) * 6;
      context.moveTo(x, FIELD.height);
      context.quadraticCurveTo(x + swayX, FIELD.height - 40, x + swayX * 2, FIELD.height - 72);
    }
    context.stroke();
    // A soft moon glow top-right keeps the upper field from reading dark.
    const moon = context.createRadialGradient(FIELD.width - 140, 90, 20, FIELD.width - 140, 90, 260);
    moon.addColorStop(0, 'rgba(255, 255, 240, 0.35)');
    moon.addColorStop(1, 'rgba(255, 255, 240, 0)');
    context.fillStyle = moon;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawThings(state) {
    for (let index = 0; index < state.things.length; index += 1) {
      const thing = state.things[index];
      if (!thing.active) continue;
      if (thing.kind === KIND_DROP) {
        const pulse = 1 + Math.sin(state.elapsed * 4 + thing.wobble) * 0.15;
        context.fillStyle = 'rgba(127, 227, 255, 0.25)';
        context.beginPath();
        context.arc(thing.x, thing.y, thing.radius * 2.2 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.drop;
        context.beginPath();
        context.arc(thing.x, thing.y, thing.radius * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.dropCore;
        context.beginPath();
        context.arc(thing.x - 4, thing.y - 4, thing.radius * 0.35, 0, Math.PI * 2);
        context.fill();
      } else if (thing.kind === KIND_SPIDER) {
        const wobble = Math.sin(state.elapsed * 6 + thing.wobble) * 2;
        // Legs first, then the body, then the eyes.
        context.strokeStyle = PALETTE.spiderLegs;
        context.lineWidth = 4;
        context.beginPath();
        for (let leg = 0; leg < 4; leg += 1) {
          const angle = (leg / 4) * Math.PI + Math.PI / 8 + wobble * 0.05;
          context.moveTo(thing.x, thing.y);
          context.lineTo(thing.x + Math.cos(angle) * 34, thing.y + Math.sin(angle) * 34);
          context.moveTo(thing.x, thing.y);
          context.lineTo(thing.x - Math.cos(angle) * 34, thing.y + Math.sin(angle) * 34);
        }
        context.stroke();
        context.fillStyle = PALETTE.spider;
        context.beginPath();
        context.arc(thing.x, thing.y, thing.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.spiderEyes;
        context.beginPath();
        context.arc(thing.x - 8, thing.y - 4, 4, 0, Math.PI * 2);
        context.arc(thing.x + 8, thing.y - 4, 4, 0, Math.PI * 2);
        context.fill();
      } else if (thing.kind === KIND_VINE) {
        const growth = Math.min(1, (state.elapsed - thing.born) / VINE.growSeconds);
        const height = growth * 260;
        context.strokeStyle = PALETTE.vine;
        context.lineWidth = VINE.width * 0.4;
        context.beginPath();
        context.moveTo(thing.x, 70);
        context.quadraticCurveTo(thing.x + 14, 70 + height * 0.5, thing.x, 70 + height);
        context.moveTo(thing.x, FIELD.height - 8);
        context.quadraticCurveTo(thing.x - 14, FIELD.height - 8 - height * 0.5, thing.x, FIELD.height - 8 - height);
        context.stroke();
        // Thorns along each vine.
        context.fillStyle = PALETTE.vineThorn;
        for (let thorn = 1; thorn <= 4; thorn += 1) {
          const ty = 70 + (height / 5) * thorn;
          context.beginPath();
          context.moveTo(thing.x + 6, ty);
          context.lineTo(thing.x + 18, ty + 6);
          context.lineTo(thing.x + 6, ty + 12);
          context.fill();
          const by = FIELD.height - 8 - (height / 5) * thorn;
          context.beginPath();
          context.moveTo(thing.x - 6, by);
          context.lineTo(thing.x - 18, by - 6);
          context.lineTo(thing.x - 6, by - 12);
          context.fill();
        }
      } else if (thing.kind === KIND_SHIELD || thing.kind === KIND_SLOW) {
        const gold = thing.kind === KIND_SHIELD;
        const pulse = 1 + Math.sin(state.elapsed * 5 + thing.wobble) * 0.2;
        context.fillStyle = gold ? 'rgba(255, 209, 102, 0.3)' : 'rgba(127, 184, 255, 0.3)';
        context.beginPath();
        context.arc(thing.x, thing.y, thing.radius * 2.4 * pulse, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = gold ? PALETTE.bloomGold : PALETTE.bloomBlue;
        context.beginPath();
        for (let petal = 0; petal < 6; petal += 1) {
          const angle = (petal / 6) * Math.PI * 2 + state.elapsed;
          context.ellipse(thing.x + Math.cos(angle) * 10, thing.y + Math.sin(angle) * 10, 9, 5, angle, 0, Math.PI * 2);
        }
        context.fill();
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(thing.x, thing.y, 5, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  /** The firefly: a warm glow, a body, and two wings that flutter. */
  function drawFly(state) {
    const fly = state.fly;
    const flutter = Math.sin(state.elapsed * 24) * 4;
    context.fillStyle = PALETTE.flyGlow;
    context.beginPath();
    context.arc(fly.x, fly.y, fly.radius * 2.4, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.flyWing;
    context.beginPath();
    context.ellipse(fly.x - 14, fly.y - 10 + flutter, 12, 6, -0.6, 0, Math.PI * 2);
    context.ellipse(fly.x + 14, fly.y - 10 + flutter, 12, 6, 0.6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.fly;
    context.beginPath();
    context.arc(fly.x, fly.y, fly.radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#5a4a1a';
    context.beginPath();
    context.arc(fly.x - 6, fly.y - 4, 3.5, 0, Math.PI * 2);
    context.arc(fly.x + 6, fly.y - 4, 3.5, 0, Math.PI * 2);
    context.fill();
    // The shield ring while it lasts.
    if (state.shieldSeconds > 0) {
      context.strokeStyle = PALETTE.shieldRing;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(fly.x, fly.y, fly.radius + 12 + Math.sin(state.elapsed * 8) * 3, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(state) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 30, PALETTE.text, 'left');
    text(gardenLabel(`${state.garden}/${GARDENS}`), FIELD.width / 2, 18, 30, PALETTE.text, 'center');
    // The jar: collected drops as filled dots, the rest as hollow ones.
    const dots = state.needed;
    const dotX = 24;
    const dotY = 64;
    text(jarLabel(`${state.collected}/${state.needed}`), 24, 92, 22, PALETTE.muted, 'left');
    for (let index = 0; index < dots; index += 1) {
      const x = dotX + index * 26;
      context.beginPath();
      context.arc(x, dotY, 8, 0, Math.PI * 2);
      if (index < state.collected) {
        context.fillStyle = PALETTE.drop;
        context.fill();
      } else {
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.lineWidth = 2;
        context.stroke();
      }
    }
    // Hearts, top-right.
    for (let index = 0; index < HEARTS; index += 1) {
      const x = FIELD.width - 40 - index * 44;
      const y = 34;
      context.fillStyle = index < state.hearts ? PALETTE.heart : PALETTE.heartEmpty;
      context.beginPath();
      context.arc(x - 7, y - 4, 9, 0, Math.PI * 2);
      context.arc(x + 7, y - 4, 9, 0, Math.PI * 2);
      context.moveTo(x - 15, y);
      context.lineTo(x, y + 16);
      context.lineTo(x + 15, y);
      context.closePath();
      context.fill();
    }
    if (state.slowSeconds > 0) text(`SLOW ${Math.ceil(state.slowSeconds)}s`, FIELD.width - 24, 66, 22, PALETTE.bloomBlue, 'right');
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
    text(title, FIELD.width / 2, y + 92, 56, PALETTE.bloomGold, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 24, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 46, 26, PALETTE.text, 'center');
  }

  const TITLE_LINES = [
    'You are a firefly. Move freely: WASD / arrows, or drag anywhere.',
    'Collect glowing dew drops to fill the jar before dawn.',
    'Avoid the spiders and the thorn vines.',
    'Golden bloom = shield · Blue bloom = slow time.',
    'Three hearts. Three gardens. Each busier than the last.',
  ];
  const PAUSED_LINES = ['The garden will wait for you.'];
  const END_LINES = ['', '', ''];

  /** Paint one frame: the garden, the things, the firefly, then the HUD or a panel. */
  function draw(state, screen, best, dt) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.sky;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawBackdrop(state);
    drawThings(state);
    drawFly(state);
    if (state.slowSeconds > 0) {
      context.fillStyle = PALETTE.slowTint;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (state.hitFlash > 0) {
      context.fillStyle = `rgba(255, 93, 93, ${state.hitFlash * 0.25})`;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    if (screen === SCREEN_TITLE) {
      drawPanel('Firefly Garden', TITLE_LINES, 'Tap, click or press Space to begin');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) drawPanel('Paused', PAUSED_LINES, 'Press P to resume');
    else if (screen === SCREEN_OVER) {
      END_LINES[0] = finalLabel(state.score);
      END_LINES[1] = bestLabel(best);
      END_LINES[2] = `Garden ${state.garden} of ${GARDENS} · ${state.collected}/${state.needed} drops`;
      drawPanel('Caught!', END_LINES, 'Tap, click or press Space to try again');
    } else if (screen === SCREEN_WIN) {
      END_LINES[0] = finalLabel(state.score);
      END_LINES[1] = bestLabel(best);
      END_LINES[2] = 'All three gardens filled before dawn!';
      drawPanel('Dawn Breaks — You Win', END_LINES, 'Tap, click or press Space to play again');
    }
    drawStick();
  }

  /** The virtual joystick, drawn while a finger is down on a touch screen. */
  let stickState = null;
  function showStick(stick) {
    stickState = stick;
  }
  function drawStick() {
    if (stickState === null) return;
    const base = toField(stickState.baseX, stickState.baseY);
    const knobX = base.x + (stickState.dx / 56) * 60;
    const knobY = base.y + (stickState.dy / 56) * 60;
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 3;
    context.beginPath();
    context.arc(base.x, base.y, 56, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = 'rgba(255, 255, 255, 0.35)';
    context.beginPath();
    context.arc(knobX, knobY, 26, 0, Math.PI * 2);
    context.fill();
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField, showStick };
}
