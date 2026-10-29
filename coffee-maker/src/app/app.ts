import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { LINKS } from './data/content';
import { TRACKS } from './data/tracks';
import { Store } from './store';
import { Experience, MODE_HASH } from './three/experience';

function readVolume(key: string, fallback: number): number {
  try {
    const v = parseFloat(localStorage.getItem(key) ?? '');
    if (v >= 0 && v <= 1) return v;
  } catch {
    /* sin almacenamiento */
  }
  return fallback;
}

function readPinballVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem('cm-pinball-vol') ?? '');
    if (v >= 0 && v <= 1) return v;
  } catch {
    /* sin almacenamiento */
  }
  return 0.25;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  protected readonly store = inject(Store);
  protected readonly mainStack = ['Angular', 'TypeScript', 'Spring Boot'];
  protected readonly skillIcons = ['💻', '🛠️', '🖥️', '🤝'];

  /** Cuántos proyectos de la vitrina usan una tecnología (según su lista de stack). */
  protected usedIn(tech: string): number {
    // Angular siempre se escribe en TypeScript, aunque el stack del proyecto no lo liste aparte.
    const names = tech === 'TypeScript' ? ['TypeScript', 'Angular'] : [tech];
    return this.store.content().projects.filter((p) => p.stack.some((s) => names.some((n) => s.startsWith(n)))).length;
  }
  protected readonly links = LINKS;
  protected readonly tracks = TRACKS;
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  protected exp: Experience | null = null;

  /** Space Cadet servido desde nuestros propios archivos (mismo origen). */
  protected readonly pinballUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('pinball-original/SpaceCadetPinball.html');

  protected readonly titleChars = computed(() => [...this.store.content().siteName]);
  protected readonly pinballSize = signal({ w: 600, h: 440 });
  protected readonly pinballVolume = signal(readPinballVolume());

  /** Pac-Man (Flash) corre en el emulador Ruffle, servido desde nuestros propios archivos (mismo origen). */
  protected readonly arcadeUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('arcade/index.html');
  protected readonly arcadeVolume = signal(readVolume('cm-arcade-vol', 0.5));
  private coin: HTMLAudioElement | null = null;

  /** Futbolín de Prashant Baid (MIT), mejorado (2 jugadores, dificultad, meta de goles). */
  protected readonly foosballUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('foosball-game/index.html');

  /** Billar "Classic-Pool-Game" de Chen Shmilovich (MIT), solo para uso personal no comercial. */
  protected readonly poolUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('pool-game/index.html');

  /** Ajedrez: reglas de chess.js (BSD-2-Clause, Jeff Hlywa), interfaz y rival propios. */
  protected readonly chessUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('chess-game/index.html');

  /** Super Nintendo en la TV: emulador EmulatorJS (GPL-3.0, núcleo snes9x) cargado desde su CDN; los ROM son solo para uso local. */
  protected readonly snesUrl = inject(DomSanitizer).bypassSecurityTrustResourceUrl('snes-game/index.html');

  /** Lista de juegos del dock. */
  protected games(): Array<{ key: string; icon: string; label: string }> {
    const ui = this.store.content().ui;
    // La fuente pixelada no trae todas las tildes: se muestran sin ellas
    const plain = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');
    return [
      { key: 'pinball', icon: '🎯', label: plain(ui['pinballTitle']) },
      { key: 'arcade', icon: '👾', label: plain(ui['arcadeTitle']) },
      { key: 'foosball', icon: '⚽', label: plain(ui['foosballTitle']) },
      { key: 'pool', icon: '🎱', label: plain(ui['poolTitle']) },
      { key: 'chess', icon: '♟', label: plain(ui['chessTitle']) },
      { key: 'snes', icon: '🎮', label: plain(ui['snesTitle']) },
    ];
  }

  protected playGame(key: string): void {
    this.store.gamesOpen.set(false);
    this.exp?.playGame(key);
  }

  protected closeGames(): void {
    this.store.gamesOpen.set(false);
    this.exp?.highlight(null);
  }

  protected closeSnes(): void {
    this.store.snesOpen.set(false);
  }

  protected closeChess(): void {
    this.store.chessOpen.set(false);
  }

  protected closePool(): void {
    this.store.poolOpen.set(false);
  }

  protected closeFoosball(): void {
    this.store.foosballOpen.set(false);
  }

  protected closeArcade(): void {
    this.store.arcadeOpen.set(false);
  }

  protected setArcadeVolume(event: Event, frame: HTMLIFrameElement): void {
    const v = Number((event.target as HTMLInputElement).value) / 100;
    this.arcadeVolume.set(v);
    try {
      localStorage.setItem('cm-arcade-vol', String(v));
    } catch {
      /* ignorar */
    }
    frame.contentWindow?.postMessage({ type: 'arcade-volume', v }, location.origin);
  }

  /** Al cargar el juego se le da el foco para que reciba el teclado. */
  protected focusArcade(frame: HTMLIFrameElement): void {
    frame.contentWindow?.focus();
  }

  protected setPinballVolume(event: Event, frame: HTMLIFrameElement): void {
    const v = Number((event.target as HTMLInputElement).value) / 100;
    this.pinballVolume.set(v);
    try {
      localStorage.setItem('cm-pinball-vol', String(v));
    } catch {
      /* ignorar */
    }
    frame.contentWindow?.postMessage({ type: 'pinball-volume', v }, location.origin);
  }

  @HostListener('window:message', ['$event'])
  protected onMessage(e: MessageEvent): void {
    if (e.origin !== location.origin || e.data?.type !== 'pinball-size') return;
    const { w, h } = e.data as { w: number; h: number };
    if (w > 100 && h > 100) this.pinballSize.set({ w, h });
  }

  constructor() {
    document.documentElement.lang = this.store.lang();
    effect(() => {
      if (!this.store.arcadeOpen()) return;
      untracked(() => {
        try {
          this.coin ??= new Audio('audio/coin.mp3');
          this.coin.volume = 0.6;
          this.coin.currentTime = 0;
          void this.coin.play().catch(() => undefined);
        } catch {
          /* sin audio */
        }
      });
    });
    effect(() => {
      // La URL refleja la seccion abierta para poder compartir enlaces directos (#proyectos)
      const mode = this.store.mode();
      if (!this.store.started()) return;
      untracked(() => history.replaceState(null, '', location.pathname + location.search + (MODE_HASH[mode] ? '#' + MODE_HASH[mode] : '')));
    });
    effect(() => {
      this.store.lang(); // al cambiar de idioma se redibujan las pantallas
      untracked(() => this.exp?.sync());
    });
  }

  protected closePinball(): void {
    this.store.pinballOpen.set(false);
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeyDown(e: KeyboardEvent): void {
    if (e.code !== 'Escape') return;
    if (this.store.pinballOpen()) this.closePinball();
    if (this.store.arcadeOpen()) this.closeArcade();
    if (this.store.foosballOpen()) this.closeFoosball();
    if (this.store.poolOpen()) this.closePool();
    if (this.store.chessOpen()) this.closeChess();
    if (this.store.snesOpen()) this.closeSnes();
    if (this.store.gamesOpen()) this.closeGames();
  }

  ngAfterViewInit(): void {
    if (!this.hasWebgl()) {
      this.store.webglOk.set(false);
      return;
    }
    try {
      this.exp = new Experience(this.canvas().nativeElement, this.store);
    } catch {
      this.store.webglOk.set(false);
    }
  }

  ngOnDestroy(): void {
    this.exp?.dispose();
  }

  private hasWebgl(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  protected fmt(sec: number): string {
    const s = Math.max(0, Math.floor(sec));
    const m = Math.floor(s / 60);
    const rest = String(s % 60).padStart(2, '0');
    return m + ':' + rest;
  }

  protected seek(event: Event): void {
    const v = Number((event.target as HTMLInputElement).value);
    this.exp?.seek(v / 1000);
  }

  protected progress(): number {
    const d = this.store.trackDuration();
    return d ? Math.round((this.store.trackTime() / d) * 1000) : 0;
  }

  /** Título y subtítulo narrativo de la sección activa. */
  protected head(): [string, string] {
    const ui = this.store.content().ui;
    switch (this.store.mode()) {
      case 'about':
        return [ui['aboutTitle'], ui['aboutSub']];
      case 'projects':
        return [ui['projectsTitle'], ui['projectsSub']];
      case 'music':
        return [ui['musicTitle'], ui['musicSub']];
      default:
        return [ui['contactTitle2'], ui['contactSub']];
    }
  }

  protected setVolume(event: Event): void {
    this.exp?.setVolume(Number((event.target as HTMLInputElement).value) / 100);
  }

  private copiedTimer = 0;

  protected async copyEmail(): Promise<void> {
    let result: 'ok' | 'fail' = 'ok';
    try {
      await navigator.clipboard.writeText(LINKS.email);
    } catch {
      result = 'fail';
    }
    this.store.copied.set(result);
    window.clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => this.store.copied.set(null), 2500);
  }

  protected step(delta: number): void {
    const i = this.store.projectIndex();
    if (i === null) return;
    const n = this.store.content().projects.length;
    this.exp?.openProject((i + delta + n) % n);
  }
}
