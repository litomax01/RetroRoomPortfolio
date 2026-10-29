import * as THREE from 'three';
import { Content, LINKS } from '../data/content';
import { AboutTab } from '../store';

// Los nombres se conservan; los valores son una paleta cálida de época.
export const PALETTE = {
  bg: '#0a0720',
  bg2: '#1c1450',
  cyan: '#5df2ff', // acento principal
  magenta: '#ff3ea5',
  amber: '#ffd84d',
  text: '#e8f6ff',
  muted: '#9fa6d6',
};

const HEAD = '"Orbitron", "Press Start 2P", system-ui, sans-serif';
const BODY = '"Instrument Sans", system-ui, sans-serif';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Plano con una textura de canvas que se redibuja cuando cambia el contenido. */
export class Panel {
  readonly canvas = document.createElement('canvas');
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  readonly mesh: THREE.Mesh;

  constructor(
    readonly px: number,
    readonly py: number,
    worldW: number,
    worldH: number,
  ) {
    this.canvas.width = px;
    this.canvas.height = py;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 4;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(worldW, worldH),
      new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false, transparent: true, alphaTest: 0.04 }),
    );
  }

  redraw(fn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): void {
    const { ctx, px, py } = this;
    ctx.save();
    ctx.clearRect(0, 0, px, py);
    fn(ctx, px, py);
    ctx.restore();
    this.texture.needsUpdate = true;
  }
}

function frame(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string): void {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, PALETTE.bg2);
  g.addColorStop(1, PALETTE.bg);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.lineWidth = 2;
  ctx.strokeRect(26, 26, w - 52, h - 52);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  maxLines = 99,
): number {
  const words = text.split(' ');
  let line = '';
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      y += lineH;
      lines++;
      line = word;
      if (lines >= maxLines) return y;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, y);
    y += lineH;
  }
  return y;
}

function chip(ctx: CanvasRenderingContext2D, label: string, x: number, y: number, color: string): number {
  ctx.font = `600 24px ${BODY}`;
  const w = ctx.measureText(label).width + 28;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y - 26, w, 38, 19);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(label, x + 14, y + 1);
  return w + 10;
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/** Aparición escalonada: progreso 0..1 del elemento i de n dentro del progreso global. */
function stagger(prog: number, i: number, n: number): number {
  const span = 0.5;
  const start = (i / Math.max(1, n)) * (1 - span);
  return ease((prog - start) / span);
}

/** Dibuja con transparencia y un pequeño desplazamiento hacia arriba. */
function show(ctx: CanvasRenderingContext2D, k: number, draw: () => void): void {
  if (k <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = k;
  ctx.translate(0, (1 - k) * 22);
  draw();
  ctx.restore();
}

/** Indicador de pasos: Perfil · Habilidades · Experiencia. */
function stepper(ctx: CanvasRenderingContext2D, w: number, c: Content, tab: AboutTab): void {
  const labels: Array<[AboutTab, string]> = [
    ['about', c.ui['tabAbout']],
    ['skills', c.ui['tabSkills']],
    ['experience', c.ui['tabExperience']],
  ];
  ctx.font = `600 20px ${BODY}`;
  const widths = labels.map(([, l]) => ctx.measureText(l).width + 30);
  let x = w - 44 - widths.reduce((a, b) => a + b + 10, -10);
  labels.forEach(([key, label], i) => {
    const on = key === tab;
    ctx.beginPath();
    ctx.roundRect(x, 38, widths[i], 34, 17);
    ctx.fillStyle = on ? PALETTE.cyan : 'rgba(255,255,255,0.06)';
    ctx.fill();
    ctx.strokeStyle = on ? PALETTE.cyan : PALETTE.muted;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = on ? '#2a140c' : PALETTE.muted;
    ctx.textAlign = 'left';
    ctx.fillText(label, x + 15, 61);
    x += widths[i] + 10;
  });
}

/** Pizarra de la sala: Perfil / Habilidades / Experiencia, con aparición por pasos. */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  c: Content,
  tab: AboutTab,
  portrait: HTMLImageElement | null,
  prog = 1,
): void {
  frame(ctx, w, h, PALETTE.cyan);
  const pad = 56;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  stepper(ctx, w, c, tab);

  if (tab === 'about') {
    const photoW = 250;
    const photoH = 310;
    const px = pad;
    const py = 100;
    show(ctx, stagger(prog, 0, 6), () => {
      if (portrait) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(px, py, photoW, photoH, 18);
        ctx.clip();
        const r = Math.max(photoW / portrait.width, photoH / portrait.height);
        const dw = portrait.width * r;
        const dh = portrait.height * r;
        ctx.drawImage(portrait, px + (photoW - dw) / 2, py + (photoH - dh) * 0.2, dw, dh);
        ctx.restore();
      }
      ctx.strokeStyle = PALETTE.magenta;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.roundRect(px, py, photoW, photoH, 18);
      ctx.stroke();
    });
    const tx = px + photoW + 44;
    show(ctx, stagger(prog, 1, 6), () => {
      ctx.fillStyle = PALETTE.cyan;
      ctx.font = `400 48px ${HEAD}`;
      ctx.fillText(c.name, tx, 150);
    });
    show(ctx, stagger(prog, 2, 6), () => {
      ctx.fillStyle = PALETTE.amber;
      ctx.font = `700 23px ${BODY}`;
      ctx.fillText(c.role, tx, 190);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 21px ${BODY}`;
      ctx.fillText('📍 ' + c.location, tx, 224);
    });
    show(ctx, stagger(prog, 3, 6), () => {
      ctx.fillStyle = PALETTE.text;
      ctx.font = `500 23px ${BODY}`;
      wrap(ctx, c.about, tx, 272, w - tx - pad, 31, 5);
    });
    show(ctx, stagger(prog, 4, 6), () => {
      const cy = 452;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = PALETTE.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(pad, cy, w - pad * 2, 132, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.amber;
      ctx.font = `700 21px ${BODY}`;
      ctx.fillText('🎓 ' + c.ui['education'].toUpperCase(), pad + 24, cy + 38);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 26px ${BODY}`;
      ctx.fillText(c.education.title, pad + 24, cy + 74);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 21px ${BODY}`;
      ctx.fillText(`${c.education.school} · ${c.education.period}`, pad + 24, cy + 106);
    });
    return;
  }

  if (tab === 'skills') {
    const total = c.skills.reduce((n, g) => n + g.items.length + 1, 0) + 2;
    let idx = 0;
    let y = 130;
    for (const group of c.skills) {
      const gk = stagger(prog, idx++, total);
      show(ctx, gk, () => {
        ctx.fillStyle = PALETTE.amber;
        ctx.font = `700 26px ${BODY}`;
        ctx.fillText(group.name, pad, y);
      });
      y += 46;
      let x = pad;
      for (const item of group.items) {
        ctx.font = `600 24px ${BODY}`;
        const cw = ctx.measureText(item).width + 28;
        if (x + cw > w - pad) {
          x = pad;
          y += 46;
        }
        const k = stagger(prog, idx++, total);
        const cx = x;
        const cyy = y;
        show(ctx, k, () => {
          chip(ctx, item, cx, cyy, PALETTE.magenta);
        });
        x += cw + 10;
      }
      y += 66;
    }
    show(ctx, stagger(prog, idx++, total), () => {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 21px ${BODY}`;
      ctx.fillText(`🌐 ${c.ui['languages']}: ${c.languages}`, pad, h - 78);
    });
    show(ctx, stagger(prog, idx++, total), () => {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 21px ${BODY}`;
      ctx.fillText(`🏅 ${c.ui['certification']}: ${c.certification}`, pad, h - 46);
    });
    return;
  }

  // Experiencia: registro de misiones (tarjetas con insignia y tecnologias; caben las 4 primeras)
  const cards = c.experience.slice(0, 4);
  const badgeColors = [PALETTE.magenta, PALETTE.cyan, PALETTE.amber, '#a98bff'];
  const cardH = 112;
  const gap = 10;
  const top0 = 92;
  cards.forEach((job, i) => {
    const k = stagger(prog, i, cards.length);
    const cy = top0 + i * (cardH + gap);
    const color = badgeColors[i % badgeColors.length];
    show(ctx, k, () => {
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pad - 8, cy, w - (pad - 8) * 2, cardH, 14);
      ctx.fill();
      ctx.stroke();
      const x = pad + 10;
      const right = w - pad - 2;
      // Titulo + insignia a la derecha
      let badgeW = 0;
      if (job.badge) {
        ctx.font = `700 15px ${HEAD}`;
        badgeW = ctx.measureText(job.badge).width + 24;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(right - badgeW, cy + 12, badgeW, 28, 14);
        ctx.fill();
        ctx.fillStyle = PALETTE.bg;
        ctx.textAlign = 'center';
        ctx.fillText(job.badge, right - badgeW / 2, cy + 31);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = PALETTE.text;
      ctx.font = `700 24px ${BODY}`;
      let title = job.role;
      while (ctx.measureText(title).width > right - badgeW - x - 14 && title.length > 8) title = title.slice(0, -2);
      if (title !== job.role) title = title.trimEnd() + '…';
      ctx.fillText(title, x, cy + 34);
      // Lugar · periodo y tecnologias
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `500 18px ${BODY}`;
      ctx.fillText(`${job.place} · ${job.period}`, x, cy + 58);
      if (job.tags?.length) {
        ctx.fillStyle = PALETTE.amber;
        ctx.font = `600 17px ${BODY}`;
        ctx.textAlign = 'right';
        ctx.fillText(job.tags.join(' · '), right, cy + 58);
        ctx.textAlign = 'left';
      }
      // Logro principal
      ctx.fillStyle = PALETTE.text;
      ctx.font = `500 19px ${BODY}`;
      wrap(ctx, job.bullets[0], x, cy + 84, right - x, 22, 2);
    });
  });
}

/** Paleta de la vitrina de proyectos (ver vitrina.ts). */
const VIT = { night: '#101B1A', emerald: '#243C35', brass: '#AD8C55', ivory: '#E9DFCB', burgundy: '#4B2028' };

/** Título grabado en el marco de la vitrina. Lienzo de 2048 px para que el texto se lea nítido. */
export function drawVitrinaTitle(ctx: CanvasRenderingContext2D, w: number, h: number, c: Content): void {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = VIT.brass;
  ctx.font = `600 34px ${BODY}`;
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '10px';
  ctx.fillText(c.ui['vitrinaEyebrow'].toUpperCase(), w / 2 + 5, 62);
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.fillStyle = VIT.ivory;
  ctx.font = `400 132px ${HEAD}`;
  ctx.fillText(c.ui['projectsTitle'], w / 2, 206);
  ctx.fillStyle = 'rgba(233,223,203,0.72)';
  ctx.font = `500 50px ${BODY}`;
  ctx.fillText(c.ui['projectsSub'], w / 2, 290);
  // filete fino con rombo central
  const y = 352;
  ctx.strokeStyle = VIT.brass;
  ctx.fillStyle = VIT.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, y);
  ctx.lineTo(w / 2 - 26, y);
  ctx.moveTo(w / 2 + 26, y);
  ctx.lineTo(w * 0.7, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w / 2, y - 11);
  ctx.lineTo(w / 2 + 11, y);
  ctx.lineTo(w / 2, y + 11);
  ctx.lineTo(w / 2 - 11, y);
  ctx.closePath();
  ctx.fill();
}

/** Panel junto al tocadiscos: créditos. */
export function drawCredits(ctx: CanvasRenderingContext2D, w: number, h: number, c: Content): void {
  frame(ctx, w, h, PALETTE.amber);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = `400 44px ${HEAD}`;
  ctx.fillText(c.ui['credits'], 48, 86);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `500 26px ${BODY}`;
  wrap(ctx, c.ui['creditsBody'], 48, 140, w - 96, 36, 8);
}

/** Cartel de neón. */
export function drawSign(ctx: CanvasRenderingContext2D, w: number, h: number, label: string, color: string): void {
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.roundRect(10, 10, w - 20, h - 20, 22);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `700 ${Math.round(h * 0.42)}px ${HEAD}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, w / 2, h / 2 + 4);
}

/** Pizarra en la vista principal: bienvenida + guía de secciones (sin foto). */
export function drawWelcome(ctx: CanvasRenderingContext2D, w: number, h: number, _c: Content, _prog = 1): void {
  // Vista general: sin panel. La imagen de la TV (barras de color) esta pintada en la textura del propio modelo; este plano solo recibe el clic
  ctx.clearRect(0, 0, w, h);
}

/** Emblema circular del local. */
export function drawEmblem(ctx: CanvasRenderingContext2D, w: number, h: number, name: string): void {
  const cx = w / 2;
  const cy = h / 2;
  ctx.fillStyle = '#2a140c';
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2 - 30, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.amber;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const words = name.toUpperCase().split(' ');
  ctx.font = `700 ${Math.round(w * 0.13)}px ${HEAD}`;
  words.forEach((word, i) => ctx.fillText(word, cx, cy + (i - (words.length - 1) / 2) * w * 0.17));
}

/** Portada de la carta que sostiene el barista. */
export function drawMenuCover(ctx: CanvasRenderingContext2D, w: number, h: number, c: Content): void {
  ctx.fillStyle = '#3b1d10';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PALETTE.cyan;
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, w - 48, h - 48);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.amber;
  ctx.font = `700 22px ${BODY}`;
  ctx.fillText('✦ ✦ ✦', w / 2, 70);
  ctx.fillStyle = PALETTE.cyan;
  ctx.font = `400 54px ${HEAD}`;
  ctx.fillText(c.ui['menuCover'], w / 2, h / 2 - 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 22px ${BODY}`;
  ctx.fillText(c.siteName, w / 2, h / 2 + 50);
  ctx.fillStyle = PALETTE.amber;
  ctx.font = `700 22px ${BODY}`;
  ctx.fillText('✦ ✦ ✦', w / 2, h - 70);
}

/** Pantalla del Game Boy que sostiene el anfitrion: datos de contacto en verde monocromo. */
export function drawGameBoyScreen(ctx: CanvasRenderingContext2D, w: number, h: number, c: Content): void {
  const PX = '"Press Start 2P", "Orbitron", monospace';
  ctx.fillStyle = '#9bbc0f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#0f380f';
  ctx.strokeStyle = '#0f380f';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `400 20px ${PX}`;
  ctx.fillText(c.ui['menuTitle'].toUpperCase(), w / 2, 36);
  ctx.fillRect(18, 56, w - 36, 3);
  ctx.textAlign = 'left';
  const rows: Array<[string, string]> = [
    [c.ui['menuMail'], LINKS.email],
    [c.ui['menuGit'], LINKS.github.replace('https://', '')],
    [c.ui['menuIn'], 'leonardo-torres'],
  ];
  rows.forEach(([label, value], i) => {
    const y = 88 + i * 62;
    ctx.font = `400 13px ${PX}`;
    ctx.fillText('> ' + label.toUpperCase(), 20, y);
    ctx.font = `400 ${value.length > 22 ? 11 : 13}px ${PX}`;
    ctx.fillText(value, 20, y + 24);
  });
  ctx.textAlign = 'center';
  ctx.font = `400 12px ${PX}`;
  ctx.fillText('PRESS START', w / 2, h - 22);
}
