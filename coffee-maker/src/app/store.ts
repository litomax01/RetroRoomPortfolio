import { Injectable, computed, signal } from '@angular/core';
import { CONTENT, Lang } from './data/content';

export type Mode = 'menu' | 'projects' | 'about' | 'music' | 'contact';
export type AboutTab = 'about' | 'skills' | 'experience' | 'personal';

const LANG_KEY = 'cm-lang';
const VOL_KEY = 'cm-volume';

function readNumber(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key));
    if (localStorage.getItem(key) !== null && v >= 0 && v <= 1) return v;
  } catch {
    /* sin almacenamiento */
  }
  return fallback;
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* sin almacenamiento: usamos el idioma del navegador */
  }
  return navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** Estado compartido entre la escena 3D y la interfaz HTML. */
@Injectable({ providedIn: 'root' })
export class Store {
  readonly lang = signal<Lang>(initialLang());
  readonly content = computed(() => CONTENT[this.lang()]);

  readonly mode = signal<Mode>('menu');
  readonly aboutTab = signal<AboutTab>('about');
  /** Índice del proyecto abierto; null = lista de proyectos. */
  readonly projectIndex = signal<number | null>(null);
  /** Captura mostrada en la galería de la ficha del proyecto. */
  readonly shotIndex = signal(0);
  /** Captura ampliada a pantalla completa. */
  readonly lightbox = signal(false);
  /** Camara enfocada de cerca en un objeto (doble clic). */
  readonly focused = signal(false);

  readonly progress = signal(0);
  readonly ready = signal(false);
  readonly started = signal(false);
  readonly musicPlaying = signal(false);
  readonly trackIndex = signal(0);
  readonly trackTime = signal(0);
  readonly trackDuration = signal(0);
  readonly trackChanging = signal(false);
  /** La carta de contacto se muestra cuando el barista llega. */
  readonly menuOpen = signal(false);
  readonly webglOk = signal(true);
  /** Volumen de la música (0..1) y silencio, recordados entre visitas. */
  readonly volume = signal(readNumber(VOL_KEY, 0.8));
  readonly muted = signal(false);
  /** Minijuego de pinball abierto sobre la escena. */
  readonly pinballOpen = signal(false);
  /** Máquina arcade (Pac-Man) abierta sobre la escena. */
  readonly arcadeOpen = signal(false);
  /** Futbolín abierto sobre la escena. */
  readonly foosballOpen = signal(false);
  /** Billar abierto sobre la escena. */
  readonly poolOpen = signal(false);
  readonly chessOpen = signal(false);
  readonly snesOpen = signal(false);
  /** Lista de juegos del dock desplegada. */
  readonly gamesOpen = signal(false);
  /** Ayuda de primera visita ("Explora el bar…"). */
  readonly helpVisible = signal(false);
  /** Proyecto bajo el cursor en el cuadro 3D (resalta la botella). */
  readonly hoverProject = signal<number | null>(null);
  /** Mensaje temporal al copiar el correo. */
  readonly copied = signal<"ok" | "fail" | null>(null);
  readonly reducedMotion = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignorar */
    }
    document.documentElement.lang = lang;
  }

  setVolume(v: number): void {
    const clamped = Math.min(1, Math.max(0, v));
    this.volume.set(clamped);
    if (clamped > 0) this.muted.set(false);
    try {
      localStorage.setItem(VOL_KEY, String(clamped));
    } catch {
      /* ignorar */
    }
  }

  toggleLang(): void {
    this.setLang(this.lang() === 'es' ? 'en' : 'es');
  }
}
