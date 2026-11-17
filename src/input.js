// Keyboard and pointer input. Held keys give a direction vector. On touch, a VIRTUAL JOYSTICK:
// the first touch anywhere spawns a stick at that point; dragging moves the knob, and the
// fly walks in the knob's direction (with magnitude, so a small tilt walks slowly). The stick
// stays until the finger lifts. A tap (short touch without drag) still counts as CONFIRM.
// One-shot presses (start, restart, pause, mute) queue as bit flags.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

/** How far the knob must move (CSS px) before it counts as a direction, not a tap. */
const DEAD_ZONE = 12;
/** Knob travel in CSS px at which the stick reads full speed. */
const RANGE = 56;

export function createInput(target, toField, onStick) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  // Virtual joystick state, in CSS pixels relative to the viewport.
  let stick = null; // { baseX, baseY, dx, dy, moved }
  let pointerDownAt = 0;

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    stick = null;
    if (onStick) onStick(null);
  });

  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    pointerDownAt = performance.now();
    if (stick === null) {
      stick = { baseX: event.clientX, baseY: event.clientY, dx: 0, dy: 0, moved: false };
      if (onStick) onStick(stick);
    }
    try { target.setPointerCapture?.(event.pointerId); } catch { /* synthetic pointers cannot be captured */ }
    event.preventDefault();
  });
  target.addEventListener('pointermove', (event) => {
    if (stick === null) return;
    let dx = event.clientX - stick.baseX;
    let dy = event.clientY - stick.baseY;
    const dist = Math.hypot(dx, dy);
    if (dist > DEAD_ZONE) stick.moved = true;
    // Clamp the knob to its range so the direction stays honest at full deflection.
    if (dist > RANGE) {
      dx = (dx / dist) * RANGE;
      dy = (dy / dist) * RANGE;
    }
    stick.dx = dx;
    stick.dy = dy;
    if (onStick) onStick(stick);
    event.preventDefault();
  });
  const release = () => {
    stick = null;
    if (onStick) onStick(null);
  };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);
  // A long-press context menu would otherwise steal the pointer mid-drag on Android.
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** The move direction as a vector: keys give -1/0/1 per axis; the stick gives a scaled vector. */
    direction() {
      if (stick !== null && stick.moved) {
        const len = Math.hypot(stick.dx, stick.dy);
        if (len > DEAD_ZONE) {
          const power = Math.min(1, (len - DEAD_ZONE) / (RANGE - DEAD_ZONE));
          return { dx: (stick.dx / len) * power, dy: (stick.dy / len) * power };
        }
        return { dx: 0, dy: 0 };
      }
      return { dx: (right ? 1 : 0) - (left ? 1 : 0), dy: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
