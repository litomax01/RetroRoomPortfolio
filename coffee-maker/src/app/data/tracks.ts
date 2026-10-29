export interface Track {
  title: string;
  subtitle: string;
  src: string;
  /** Color de la etiqueta del disco. */
  color: string;
}

// Los archivos están en public/audio. Cambia títulos o agrega pistas aquí.
export const TRACKS: Track[] = [
  {
    title: 'Alicia (Piano Version)',
    subtitle: 'Clair Obscur: Expedition 33',
    src: 'audio/alicia-piano.mp3',
    color: '#4ff2ff',
  },
  {
    title: 'Death By Glamour',
    subtitle: '',
    src: 'audio/death-by-glamour.mp3',
    color: '#ff3ea5',
  },
  {
    title: 'Memory',
    subtitle: '',
    src: 'audio/memory.mp3',
    color: '#ffb86b',
  },
  {
    title: 'Saria’s Song (The Lost Woods)',
    subtitle: 'Zelda Original Soundtrack',
    src: 'audio/sarias-song.mp3',
    color: '#7dff8a',
  },
];
