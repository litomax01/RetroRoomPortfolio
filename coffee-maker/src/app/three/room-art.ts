import * as THREE from 'three';
import { canvasTex } from './kit';

/** Texturas dibujadas en canvas para la sala de juegos. */

/** Listones verticales de nogal oscuro (pared de madera). */
export const slatTexture = (repeat: [number, number]): THREE.CanvasTexture =>
  canvasTex(
    512,
    512,
    (g, w, h) => {
      const n = 16;
      const sw = w / n;
      for (let i = 0; i < n; i++) {
        const l = 20 + ((i * 7) % 5) * 2;
        g.fillStyle = `hsl(22, 38%, ${l}%)`;
        g.fillRect(i * sw, 0, sw, h);
        // Veta vertical
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = `rgba(0,0,0,${0.05 + ((k * 3 + i) % 4) * 0.025})`;
          g.lineWidth = 1;
          const x = i * sw + 3 + ((k * 11 + i * 5) % (sw - 6));
          g.beginPath();
          g.moveTo(x, 0);
          g.bezierCurveTo(x + 3, h * 0.3, x - 3, h * 0.6, x + 1, h);
          g.stroke();
        }
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(i * sw + sw - 3, 0, 3, h);
        g.fillStyle = 'rgba(255,200,140,0.07)';
        g.fillRect(i * sw, 0, 2, h);
      }
    },
    repeat,
  );

/** Piedra gris oscura con vetas (pared de la TV). */
export const stoneTexture = (): THREE.CanvasTexture =>
  canvasTex(512, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#34343c');
    gr.addColorStop(1, '#202028');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(190,190,210,${0.04 + (i % 4) * 0.025})`;
      g.lineWidth = 1 + (i % 3);
      g.beginPath();
      const y = (i * 41) % h;
      g.moveTo(0, y);
      g.bezierCurveTo(w * 0.3, y + 70, w * 0.6, y - 80, w, y + ((i * 13) % 60) - 30);
      g.stroke();
    }
  });

/** Mural "PLAY WIN!" estilo grafiti. */
export const muralTexture = (): THREE.CanvasTexture =>
  canvasTex(2048, 1024, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0e1a3a');
    bg.addColorStop(0.55, '#1a1450');
    bg.addColorStop(1, '#2a0f40');
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    // Salpicaduras y destellos
    for (let i = 0; i < 70; i++) {
      g.fillStyle = ['rgba(93,242,255,0.18)', 'rgba(255,62,165,0.16)', 'rgba(255,216,77,0.16)'][i % 3];
      g.beginPath();
      g.arc((i * 313) % w, (i * 197) % h, 6 + ((i * 7) % 26), 0, Math.PI * 2);
      g.fill();
    }
    g.save();
    g.translate(w / 2, h / 2 + 20);
    g.rotate(-0.1);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    const word = (t: string, x: number, y: number, size: number, fill: string, edge: string) => {
      g.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
      g.lineWidth = size * 0.16;
      g.strokeStyle = '#0a0720';
      g.strokeText(t, x + 8, y + 10);
      g.lineWidth = size * 0.1;
      g.strokeStyle = edge;
      g.strokeText(t, x, y);
      g.fillStyle = fill;
      g.fillText(t, x, y);
    };
    word('PLAY', -300, -170, 360, '#5df2ff', '#ffffff');
    word('WIN!', 160, 120, 440, '#ffb020', '#fff2a0');
    g.restore();
    // Estrella, rayo y balón
    g.fillStyle = '#ffd84d';
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 40 : 100;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(1760 + Math.cos(a) * r, 190 + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(1030, 150, 84, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#111';
    for (const [x, y] of [[1030, 150], [980, 100], [1085, 105], [1000, 205], [1075, 200]]) {
      g.beginPath();
      g.arc(x, y, 22, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#ff3ea5';
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(140, 880);
    g.lineTo(220, 800);
    g.lineTo(190, 800);
    g.lineTo(270, 720);
    g.stroke();
  });

/** Alfombra: patrón abstracto de manchas grises. */
export const rugTexture = (base: string, fleck: string): THREE.CanvasTexture =>
  canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 380; i++) {
      g.fillStyle = fleck;
      g.globalAlpha = 0.05 + ((i * 7) % 10) * 0.012;
      const x = (i * 137) % w;
      const y = (i * 251) % h;
      g.beginPath();
      g.ellipse(x, y, 4 + ((i * 13) % 34), 3 + ((i * 17) % 18), (i % 7) * 0.45, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
  });

/** Palabra de neón con brillo, sobre fondo transparente. */
export function drawNeonWord(g: CanvasRenderingContext2D, w: number, h: number, text: string, color: string): void {
  g.clearRect(0, 0, w, h);
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = `400 ${Math.round(h * 0.78)}px "Pacifico", "Brush Script MT", cursive`;
  g.lineJoin = 'round';
  const x = w * 0.08;
  const y = h * 0.52;
  g.shadowColor = color;
  g.shadowBlur = 38;
  g.strokeStyle = color;
  g.lineWidth = 10;
  g.strokeText(text, x, y);
  g.shadowBlur = 16;
  g.lineWidth = 6;
  g.strokeText(text, x, y);
  g.shadowBlur = 0;
  g.strokeStyle = '#ffffff';
  g.globalAlpha = 0.85;
  g.lineWidth = 2.5;
  g.strokeText(text, x, y);
  g.globalAlpha = 1;
}
