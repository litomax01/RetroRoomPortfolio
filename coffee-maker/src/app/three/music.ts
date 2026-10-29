import { Track } from '../data/tracks';

export interface Levels {
  bass: number;
  mid: number;
  high: number;
  /** Espectro reducido, 0..1 por barra. */
  bars: Float32Array;
}

/** Reproductor de las pistas del jukebox, con analizador para animar la escena. */
export class MusicPlayer {
  private readonly audio = new Audio();
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private data: Uint8Array<ArrayBuffer> | null = null;
  private current = -1;
  private fadeId = 0;
  /** Volumen efectivo (0..1) que se restaura tras cada fundido. */
  private level = 0.8;
  readonly levels: Levels = { bass: 0, mid: 0, high: 0, bars: new Float32Array(12) };
  onEnded: (() => void) | null = null;

  constructor(private readonly tracks: Track[]) {
    this.audio.preload = 'auto';
    this.audio.volume = this.level;
    this.audio.addEventListener('ended', () => this.onEnded?.());
  }

  setVolume(level: number, muted: boolean): void {
    this.level = muted ? 0 : level;
    cancelAnimationFrame(this.fadeId);
    this.audio.volume = this.level;
  }

  /** Conecta el <audio> al analizador. Llamar tras un gesto del usuario. */
  attach(ctx: AudioContext): void {
    if (this.source) return;
    try {
      this.source = ctx.createMediaElementSource(this.audio);
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.78;
      this.data = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.source.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    } catch {
      this.source = null; // sin analizador: sigue sonando
    }
  }

  get index(): number {
    return this.current;
  }

  get playing(): boolean {
    return !this.audio.paused && !this.audio.ended;
  }

  get time(): number {
    return this.audio.currentTime || 0;
  }

  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  load(i: number): void {
    if (i === this.current) return;
    this.current = i;
    this.audio.src = this.tracks[i].src;
    this.audio.load();
  }

  async play(): Promise<void> {
    cancelAnimationFrame(this.fadeId);
    this.audio.volume = this.level;
    try {
      await this.audio.play();
    } catch {
      /* autoplay bloqueado: el usuario puede volver a pulsar */
    }
  }

  pause(): void {
    this.audio.pause();
  }

  /** Baja el volumen y pausa. */
  fadeOut(ms = 350): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      const from = this.audio.volume;
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / ms);
        this.audio.volume = from * (1 - k);
        if (k < 1) this.fadeId = requestAnimationFrame(step);
        else {
          this.audio.pause();
          this.audio.volume = this.level;
          resolve();
        }
      };
      step();
    });
  }

  seek(ratio: number): void {
    if (this.duration) this.audio.currentTime = ratio * this.duration;
  }

  /** Actualiza y devuelve niveles de audio (cero si no hay analizador). */
  sample(): Levels {
    const L = this.levels;
    if (!this.analyser || !this.data || !this.playing) {
      L.bass *= 0.9;
      L.mid *= 0.9;
      L.high *= 0.9;
      L.bars.forEach((v, i) => (L.bars[i] = v * 0.9));
      return L;
    }
    this.analyser.getByteFrequencyData(this.data);
    const n = this.data.length;
    const avg = (a: number, b: number) => {
      let sum = 0;
      for (let i = a; i < b; i++) sum += this.data![i];
      return sum / Math.max(1, b - a) / 255;
    };
    L.bass = avg(0, Math.floor(n * 0.1));
    L.mid = avg(Math.floor(n * 0.1), Math.floor(n * 0.4));
    L.high = avg(Math.floor(n * 0.4), n);
    const bars = L.bars.length;
    for (let b = 0; b < bars; b++) {
      const a = Math.floor((b / bars) * n * 0.75);
      const z = Math.max(a + 1, Math.floor(((b + 1) / bars) * n * 0.75));
      L.bars[b] = avg(a, z);
    }
    return L;
  }

  dispose(): void {
    cancelAnimationFrame(this.fadeId);
    this.audio.pause();
    this.audio.src = '';
  }
}
