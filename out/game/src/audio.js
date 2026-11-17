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

  /** A sliding tone, for the crack and the end: the pitch falls as the light goes. */
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
    /** A moth caught: a bright two-note chirp. */
    moth() {
      tone(880, 0.09, 0.5, 'triangle');
      if (!muted) setTimeout(() => tone(1320, 0.12, 0.4, 'triangle'), 70);
    },
    /** The hull cracks on a rock: a low, falling knock. */
    crack() {
      slide(220, 60, 0.28, 0.6);
    },
    /** A depth band begins: a soft rising chime. */
    depth() {
      tone(520, 0.14, 0.3, 'sine');
      if (!muted) setTimeout(() => tone(780, 0.18, 0.25, 'sine'), 90);
    },
    /** The ember goes out: a long fall. */
    out() {
      slide(330, 40, 0.9, 0.7);
    },
    /** The run starts: a short rising pair. */
    start() {
      tone(440, 0.1, 0.35, 'triangle');
      if (!muted) setTimeout(() => tone(660, 0.14, 0.3, 'triangle'), 80);
    },
    /** An ember flare caught: a rising fire whoosh. */
    flare() {
      slide(300, 900, 0.35, 0.5);
    },
    /** A rock burns as fuel: a short crackle. */
    burn() {
      tone(180, 0.12, 0.4, 'sawtooth');
      if (!muted) setTimeout(() => tone(240, 0.1, 0.3, 'sawtooth'), 60);
    },
    /** A five-combo streak: a bright arpeggio. */
    combo() {
      tone(660, 0.08, 0.35, 'triangle');
      if (!muted) {
        setTimeout(() => tone(880, 0.08, 0.35, 'triangle'), 60);
        setTimeout(() => tone(1320, 0.12, 0.35, 'triangle'), 120);
      }
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
