/**
 * Retro 8-bit Audio Synthesizer using Web Audio API.
 * Synthesizes classic arcade chiptune sound effects dynamically without external assets.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.5;

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public enableAudioOnGesture() {
    this.initContext();
  }

  public setMuted(muted: boolean) {
    this.enabled = !muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  // Helper to create oscillator with envelope
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    gainMultiplier = 1,
    pitchEnd?: number
  ) {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      const startTime = this.ctx.currentTime;
      osc.frequency.setValueAtTime(freq, startTime);
      if (pitchEnd !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(10, pitchEnd), startTime + duration);
      }

      const masterGain = this.volume * 0.4 * gainMultiplier;
      gain.gain.setValueAtTime(masterGain, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    } catch {
      // AudioContext state errors caught silently
    }
  }

  // 1. Regular Coin Pickup (high pleasant 8-bit blip)
  public playCoinSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, now); // B5
    osc.frequency.setValueAtTime(1318.51, now + 0.04); // E6

    const g = this.volume * 0.25;
    gain.gain.setValueAtTime(g, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }

  // 2. Super Gem / Big Coin (sparkling tri-tone chime)
  public playSuperCoinSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [659.25, 830.61, 1046.5, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'square', 0.08, 0.4);
      }, idx * 35);
    });
  }

  // 3. Power-Up Picked Up (energetic ascending fanfare)
  public playPowerUpSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const tones = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    tones.forEach((tone, i) => {
      setTimeout(() => {
        this.playTone(tone, 'triangle', 0.12, 0.5);
      }, i * 50);
    });
  }

  // 4. Freeze Spell / Ice Wave (descending icy chime)
  public playFreezeSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const tones = [1200, 950, 720, 580];
    tones.forEach((tone, i) => {
      setTimeout(() => {
        this.playTone(tone, 'sine', 0.1, 0.35);
      }, i * 40);
    });
  }

  // 5. Shield Block / Deflection
  public playShieldPopSound() {
    if (!this.enabled) return;
    this.playTone(700, 'triangle', 0.18, 0.6, 250);
  }

  // 6. Hit / Player Loss of Life (crunchy 8-bit crash)
  public playHitSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(this.volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 7. Portal Unlock Activation (sci-fi resonant sweep)
  public playPortalOpenSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  }

  // 8. Level Victory / Cleared
  public playLevelClearSound() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const melody = [
      { f: 523.25, d: 0.1 }, // C5
      { f: 659.25, d: 0.1 }, // E5
      { f: 783.99, d: 0.1 }, // G5
      { f: 1046.5, d: 0.25 }, // C6
    ];

    let delay = 0;
    melody.forEach((note) => {
      setTimeout(() => {
        this.playTone(note.f, 'square', note.d, 0.45);
      }, delay);
      delay += note.d * 1000 + 40;
    });
  }

  // 9. Game Over (retro melancholic descent)
  public playGameOverSound() {
    if (!this.enabled) return;
    const notes = [440, 415, 392, 349];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.25, 0.35, freq * 0.95);
      }, idx * 180);
    });
  }

  // 10. UI Button Click
  public playButtonBeep() {
    if (!this.enabled) return;
    this.playTone(750, 'square', 0.05, 0.2, 900);
  }
}

export const sound = new SoundEngine();
