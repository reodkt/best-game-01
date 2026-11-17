// Keyboard and pointer input. Held keys give a direction vector; a touch drag or mouse drag
// anywhere on the canvas steers the firefly toward the pointer (mobile-friendly). One-shot
// presses (start, restart, pause, mute) are queued as bit flags and taken once by the loop.

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

/**
 * `toField(clientX, clientY)` maps screen pixels to field coordinates; `getFly()` returns the
 * fly's current field position, so a drag can steer toward the pointer.
 */
export function createInput(target, toField, getFly) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let actions = 0;
  // Pointer drag: while pressed, the fly steers toward the pointer (mapped to field coords).
  let pointer = null;

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
    pointer = null;
  });

  target.addEventListener('pointerdown', (event) => {
    actions |= ACTION_CONFIRM;
    if (toField) pointer = toField(event.clientX, event.clientY);
    target.setPointerCapture?.(event.pointerId);
  });
  target.addEventListener('pointermove', (event) => {
    if (pointer !== null && toField) pointer = toField(event.clientX, event.clientY);
  });
  const release = () => {
    pointer = null;
  };
  target.addEventListener('pointerup', release);
  target.addEventListener('pointercancel', release);

  return {
    /** The move direction as a vector: keys give -1/0/1 per axis; a drag steers toward the pointer. */
    direction() {
      if (pointer !== null) {
        const fly = getFly ? getFly() : { x: 0, y: 0 };
        const dx = pointer.x - fly.x;
        const dy = pointer.y - fly.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 24) return { dx: dx / dist, dy: dy / dist };
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
