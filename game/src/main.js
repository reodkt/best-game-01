// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The
// game moves between five screens: title, play, paused, game over and the dawn win screen.
//
// ?seed=N fixes the garden's pattern. ?shot=start|play|late|end stages that scene instead of
// running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, GARDENS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_COLLECT, EVENT_GARDEN, EVENT_HIT, EVENT_OUT, EVENT_SHIELD, EVENT_SLOW } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runGame() {
  const input = createInput(canvas, renderer.toField, () => world.state.fly);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let frameDt = 1 / 60;

  // Screen readers (and anyone watching the page's text) hear the screen changes and events.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.start();
    announce(`Garden 1 of ${GARDENS}. Collect the dew drops.`);
  }

  function endGame(win) {
    screen = win ? SCREEN_WIN : SCREEN_OVER;
    if (win) audio.win();
    else audio.out();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(win
      ? `Dawn breaks. You win with ${world.state.score} points.`
      : `Caught. Score ${world.state.score}. Best ${best}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    const dir = input.direction();
    const events = world.step(STEP, dir.dx, dir.dy, false);
    if (events & EVENT_OUT) endGame(world.state.garden > GARDENS);
    else {
      if (events & EVENT_COLLECT) audio.collect();
      if (events & EVENT_HIT) {
        audio.hit();
        renderer.addShake?.(10);
      }
      if (events & EVENT_SHIELD) audio.shield();
      if (events & EVENT_SLOW) audio.slow();
      if (events & EVENT_GARDEN) audio.garden();
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    frameDt = Math.min((now - last) / 1000, MAX_FRAME);
    accumulator += frameDt;
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
      // The title screen still breathes: the world idles so the garden moves behind the panel.
      if (screen === SCREEN_TITLE) world.step(STEP, 0, 0, true);
    }
    renderer.draw(world.state, screen, best, frameDt);
  }

  // Leaving the tab pauses a running game rather than letting the spiders close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Firefly Garden. Tap, click or press Space to begin.');
  requestAnimationFrame(frame);
}

if (shot) {
  // Staged scene for a screenshot: play the real rules forward, then paint twice.
  const scene = stageShot(shot, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, 0, 1 / 60);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
} else runGame();
