// A tiny procedural audio layer (WebAudio, no files): each sound is a short oscillator and
// gain envelope, built once at the first user gesture and reused. Muted by default until the
// player's first input (a browser's autoplay rule), and toggled with M.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) return true;
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return false;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
    return true;
  }

  /** One tone: a sine or triangle at `hertz`, an attack to `peak`, an exponential release. */
  function tone(hertz, seconds, peak, type) {
    if (muted || !ensure()) return;
    if (context.state === 'suspended') context.resume();
    const when = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type ?? 'sine';
    oscillator.frequency.setValueAtTime(hertz, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + seconds + 0.02);
  }

  /** A sliding tone, for hits and the end. */
  function slide(fromHertz, toHertz, seconds, peak) {
    if (muted || !ensure()) return;
    if (context.state === 'suspended') context.resume();
    const when = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(fromHertz, when);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, toHertz), when + seconds);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(peak, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + seconds);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(when);
    oscillator.stop(when + seconds + 0.02);
  }

  return {
    /** A dew drop collected: a bright water-drop plink, higher with each quick catch. */
    collect() {
      tone(880 + Math.random() * 220, 0.1, 0.4, 'sine');
      if (!muted) setTimeout(() => tone(1320, 0.1, 0.25, 'sine'), 60);
    },
    /** Hit by a spider or a vine: a low, harsh knock. */
    hit() {
      slide(220, 60, 0.3, 0.6);
    },
    /** A shield bloom taken: a warm chime. */
    shield() {
      tone(660, 0.12, 0.35, 'triangle');
      if (!muted) setTimeout(() => tone(990, 0.16, 0.3, 'triangle'), 80);
    },
    /** A slow bloom taken: a falling, dreamy glide. */
    slow() {
      slide(900, 300, 0.4, 0.3);
    },
    /** A garden completed: a rising three-note fanfare. */
    garden() {
      tone(523, 0.12, 0.35, 'triangle');
      if (!muted) {
        setTimeout(() => tone(659, 0.12, 0.35, 'triangle'), 110);
        setTimeout(() => tone(784, 0.2, 0.35, 'triangle'), 220);
      }
    },
    /** Caught: a long fall. */
    out() {
      slide(330, 40, 0.9, 0.7);
    },
    /** Dawn breaks: a bright rising arpeggio. */
    win() {
      tone(523, 0.14, 0.35, 'triangle');
      if (!muted) {
        setTimeout(() => tone(659, 0.14, 0.35, 'triangle'), 120);
        setTimeout(() => tone(784, 0.14, 0.35, 'triangle'), 240);
        setTimeout(() => tone(1046, 0.3, 0.4, 'triangle'), 360);
      }
    },
    /** The run starts: a short rising pair. */
    start() {
      tone(440, 0.1, 0.35, 'triangle');
      if (!muted) setTimeout(() => tone(660, 0.14, 0.3, 'triangle'), 80);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
