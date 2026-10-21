// Web Audio API Sound Generator for Pentatonic Cascade & Zen Ambient Focus Soundscapes

class SoundEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private activeAmbient: 'rain' | 'waves' | 'cafe' | 'off' = 'off';
  private masterVolume: number = 0.2;
  private isMuted: boolean = false;

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public setMasterVolume(percent: number) {
    // 0 to 100 -> 0.0 to 0.4
    this.masterVolume = Math.max(0, Math.min(100, percent)) / 250;
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Pentatonic notes frequencies (C, D, E, G, A in octave 5)
  private pentatonicFreqs = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  public playPentatonicChime(freqIndex?: number) {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const freq =
        freqIndex !== undefined
          ? this.pentatonicFreqs[freqIndex % this.pentatonicFreqs.length]
          : this.pentatonicFreqs[Math.floor(Math.random() * this.pentatonicFreqs.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 1.25);
    } catch {}
  }

  public playSoftClick() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(900, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(320, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {}
  }

  public stopAmbient() {
    if (this.currentSource) {
      try {
        (this.currentSource as any).stop?.();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }
    this.activeAmbient = 'off';
  }

  public setAmbient(type: 'rain' | 'waves' | 'cafe' | 'off'): 'rain' | 'waves' | 'cafe' | 'off' {
    this.initCtx();
    if (!this.ctx) return 'off';

    if (this.activeAmbient === type || type === 'off') {
      this.stopAmbient();
      return 'off';
    }

    this.stopAmbient();

    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (type === 'rain') {
      // Pink noise
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.04;
        b6 = white * 0.115926;
      }
    } else if (type === 'waves') {
      // Ocean waves with slow sinusoidal swells
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.9 * b2 + white * 0.15;
        const swell = (Math.sin((i / bufferSize) * Math.PI * 4) + 1) * 0.5;
        output[i] = (b0 + b1 + b2) * 0.03 * (0.3 + swell * 0.7);
      }
    } else {
      // Cafe ambient murmur
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = white * 0.018;
      }
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);

    whiteNoise.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);
    whiteNoise.start();

    this.currentSource = whiteNoise;
    this.activeAmbient = type;
    return type;
  }

  public getActiveAmbient() {
    return this.activeAmbient;
  }

  public toggleRainSound(): boolean {
    const res = this.setAmbient(this.activeAmbient === 'rain' ? 'off' : 'rain');
    return res === 'rain';
  }
}

export const soundEngine = new SoundEngine();
