// Skerry Run — sound from nothing but oscillators.
// No audio files ship with the game: the engine hum, the ring chime and the
// landing thud are all built in code, so the game loads nothing at all.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.engine = null;
    this.engineGain = null;
    this.muted = false;
  }

  // Browsers only let audio start after a gesture; call this on first input.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 52;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;
      this.engine.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engine.start();
    } catch {
      this.ctx = null;
    }
  }

  // The hum follows the throttle: faster prop, higher note, louder wash.
  setEngine(throttle, flying) {
    if (!this.ctx || !this.engineGain) return;
    const target = this.muted || !flying ? 0 : 0.028 + throttle * 0.05;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
    this.engine.frequency.setTargetAtTime(
      46 + throttle * 44,
      this.ctx.currentTime,
      0.15,
    );
  }

  blip(frequency, duration, type = 'sine', volume = 0.12) {
    if (!this.ctx || this.muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Silence is always an acceptable fallback.
    }
  }

  ringChime() {
    this.blip(880, 0.28, 'sine', 0.14);
    window.setTimeout(() => this.blip(1318, 0.34, 'sine', 0.1), 90);
  }

  thud() {
    this.blip(70, 0.3, 'triangle', 0.22);
  }

  alarm() {
    this.blip(440, 0.16, 'square', 0.05);
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}
