/** Sonidos sintetizados con WebAudio: sin archivos de audio. Para usar mp3 propios, reemplazar aquí. */
export class Sounds {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicTimer: number | null = null;
  private step = 0;

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Debe llamarse dentro de un gesto del usuario (botón ENTRAR). */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Rugido grave para la figura de Evangelion: dos tonos graves que bajan y ruido filtrado. */
  roar(): void {
    this.tone(150, 1.3, 'sawtooth', 0.35, 0, 38);
    this.tone(95, 1.2, 'square', 0.18, 0.05, 30);
    this.tone(60, 1.0, 'sawtooth', 0.25, 0.35, 28);
    if (!this.ctx || !this.master) return;
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    src.connect(filt).connect(g).connect(this.master);
    src.start(this.ctx.currentTime + 0.05);
  }

  /** Maullido corto: dos tonos que suben y bajan. */
  meow(): void {
    this.tone(520, 0.16, 'sawtooth', 0.08, 0, 900);
    this.tone(900, 0.32, 'sawtooth', 0.07, 0.15, 480);
  }

  click(): void {
    this.tone(520, 0.09, 'triangle', 0.25, 0, 300);
  }

  whoosh(): void {
    this.tone(180, 0.6, 'sawtooth', 0.05, 0, 700);
  }

  bloop(): void {
    this.tone(330, 0.12, 'sine', 0.3, 0, 660);
  }

  ding(): void {
    this.tone(880, 0.7, 'sine', 0.25);
    this.tone(1320, 0.5, 'sine', 0.12, 0.05);
  }

  /** Arpegio lento en La menor, ambiente tipo lofi. */
  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    const notes = [220, 261.63, 329.63, 392, 329.63, 261.63, 196, 246.94, 293.66, 392, 293.66, 246.94];
    this.musicTimer = window.setInterval(() => {
      const f = notes[this.step % notes.length];
      this.tone(f, 1.4, 'triangle', 0.12);
      if (this.step % 4 === 0) this.tone(f / 2, 2.4, 'sine', 0.14);
      this.step++;
    }, 520);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  dispose(): void {
    this.stopMusic();
    void this.ctx?.close();
    this.ctx = null;
  }
}
