/**
 * Procedural Web Audio API sound generator for MOONRUN.
 * No external asset files needed. Handles ambient drone, helmet breathing,
 * jet booster, jumps, pickups, collisions, tension rumble, and escape fanfares.
 */

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private breathingGain: GainNode | null = null;
  private boostGain: GainNode | null = null;
  private boostSource: AudioBufferSourceNode | null = null;
  private threatGain: GainNode | null = null;
  private threatOsc: OscillatorNode | null = null;
  private isInitialized: boolean = false;
  private lastBreathingCycle: number = 0;

  constructor() {
    // Check saved mute preference
    try {
      this.isMuted = localStorage.getItem('moonrun_muted') === 'true';
    } catch {
      this.isMuted = false;
    }
  }

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupAmbience();
      this.setupBreathing();
      this.setupBoostNoise();
      this.setupThreatRumble();

      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  public resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('moonrun_muted', String(this.isMuted));
    } catch {
      // ignore
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  private setupAmbience() {
    if (!this.ctx || !this.masterGain) return;
    
    // Sub rumble + ethereal high sine for lunar loneliness
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    this.ambientGain = this.ctx.createGain();
    this.ambientGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(55, this.ctx.currentTime); // A1 sub

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(110, this.ctx.currentTime);

    // Subtle lowpass
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain);

    osc1.start();
    osc2.start();
  }

  private setupBreathing() {
    if (!this.ctx || !this.masterGain) return;

    this.breathingGain = this.ctx.createGain();
    this.breathingGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.breathingGain.connect(this.masterGain);
  }

  /**
   * Called in game loop to trigger gentle cyclic astronaut breathing
   */
  public updateBreathing(timeSec: number, isCriticalOxygen: boolean) {
    if (!this.ctx || !this.breathingGain || this.isMuted) return;

    const cycleDuration = isCriticalOxygen ? 1.8 : 3.2; // faster anxious breathing when low oxygen
    const phase = (timeSec % cycleDuration) / cycleDuration;

    // Breath in (0 to 0.4), breath out (0.5 to 0.9)
    let intensity = 0;
    if (phase < 0.4) {
      intensity = Math.sin((phase / 0.4) * Math.PI) * 0.04;
    } else if (phase >= 0.5 && phase < 0.9) {
      intensity = Math.sin(((phase - 0.5) / 0.4) * Math.PI) * 0.035;
    }

    if (Math.floor(timeSec / cycleDuration) !== this.lastBreathingCycle && intensity > 0.01) {
      this.lastBreathingCycle = Math.floor(timeSec / cycleDuration);
      this.playBreathPuff(phase < 0.4 ? 600 : 450);
    }
  }

  private playBreathPuff(filterFreq: number) {
    if (!this.ctx || !this.breathingGain || this.isMuted) return;

    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.6;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.025, this.ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.55);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.breathingGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 0.6);
  }

  private setupBoostNoise() {
    if (!this.ctx || !this.masterGain) return;

    // Looping white noise for jet thruster
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.boostSource = this.ctx.createBufferSource();
    this.boostSource.buffer = buffer;
    this.boostSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, this.ctx.currentTime);
    filter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    this.boostGain = this.ctx.createGain();
    this.boostGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.boostSource.connect(filter);
    filter.connect(this.boostGain);
    this.boostGain.connect(this.masterGain);

    this.boostSource.start();
  }

  public setBoosting(boosting: boolean) {
    if (!this.ctx || !this.boostGain || this.isMuted) return;
    const target = boosting ? 0.22 : 0;
    this.boostGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
  }

  private setupThreatRumble() {
    if (!this.ctx || !this.masterGain) return;

    this.threatOsc = this.ctx.createOscillator();
    this.threatOsc.type = 'sawtooth';
    this.threatOsc.frequency.setValueAtTime(42, this.ctx.currentTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(90, this.ctx.currentTime);

    this.threatGain = this.ctx.createGain();
    this.threatGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.threatOsc.connect(filter);
    filter.connect(this.threatGain);
    this.threatGain.connect(this.masterGain);

    this.threatOsc.start();
  }

  public updateThreatProximity(threatDistance: number) {
    if (!this.ctx || !this.threatGain || this.isMuted) return;
    
    // As threat distance decreases from 35m to 0m, increase rumble
    let volume = 0;
    if (threatDistance < 28) {
      volume = (1 - (threatDistance / 28)) * 0.18;
    }
    this.threatGain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
  }

  public playJump() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.22);
  }

  public playLand() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playOxygenPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    
    // Crisp ascending cyan chime
    const freqs = [880, 1320, 1760];
    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.05);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.14, this.ctx!.currentTime + idx * 0.05 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.05 + 0.3);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + idx * 0.05);
      osc.stop(this.ctx!.currentTime + idx * 0.05 + 0.35);
    });
  }

  public playPartPickup() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Resonant mechanical amber chord (A major triad)
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.06);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx!.currentTime + idx * 0.06 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + idx * 0.06);
      osc.stop(this.ctx!.currentTime + idx * 0.06 + 0.5);
    });
  }

  public playRockHit() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    // Noise burst + deep thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  public playLowOxygenAlarm() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(980, this.ctx.currentTime);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playGameOverCapture() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(25, this.ctx.currentTime + 0.8);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.85);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.9);
  }

  public playVictoryFanfare() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const notes = [293.66, 369.99, 440, 587.33, 739.99, 880]; // D major ascending
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx!.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0, this.ctx!.currentTime + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx!.currentTime + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + idx * 0.12 + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(this.ctx!.currentTime + idx * 0.12);
      osc.stop(this.ctx!.currentTime + idx * 0.12 + 0.65);
    });
  }

  public playCrashSound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.75);
  }
}

export const sound = new SoundSystem();
