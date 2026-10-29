import * as THREE from 'three';
import { Glow, box, canvasTex, emissiveTex, mesh, std } from './kit';

/** Muebles y máquinas de la sala de juegos. Todos miran a +Z local y se apoyan en y=0. */

const NEON = { cyan: '#5df2ff', pink: '#ff3ea5', yellow: '#ffd84d', green: '#3aff7a', blue: '#4aa8ff', orange: '#ff8a3a' };

export function poolTable(glow: Glow): THREE.Group {
  const g = new THREE.Group();
  const wood = std('#2a1810', { roughness: 0.45, metalness: 0.1 });
  const rail = std('#3a2314', { roughness: 0.4, metalness: 0.1 });
  const chrome = std('#b8bcc8', { roughness: 0.25, metalness: 0.9 });
  const felt = std('#1a3a8a', { roughness: 0.95 });

  for (const x of [-1.12, 1.12]) for (const z of [-0.5, 0.5]) mesh(box(0.2, 0.72, 0.2), wood, [x, 0.36, z], g);
  mesh(box(2.7, 0.2, 1.5), wood, [0, 0.8, 0], g);
  mesh(box(2.7, 0.12, 0.2), rail, [0, 0.97, 0.65], g);
  mesh(box(2.7, 0.12, 0.2), rail, [0, 0.97, -0.65], g);
  mesh(box(0.2, 0.12, 1.1), rail, [1.25, 0.97, 0], g);
  mesh(box(0.2, 0.12, 1.1), rail, [-1.25, 0.97, 0], g);
  mesh(box(2.3, 0.02, 1.1), felt, [0, 0.92, 0], g);
  // Cantoneras cromadas y troneras
  for (const x of [-1.3, 1.3]) for (const z of [-0.7, 0.7]) mesh(box(0.22, 0.14, 0.22), chrome, [x, 0.97, z], g);
  const pocket = new THREE.MeshBasicMaterial({ color: '#05030a' });
  for (const [x, z] of [[-1.13, -0.53], [1.13, -0.53], [-1.13, 0.53], [1.13, 0.53], [0, -0.57], [0, 0.57]]) {
    mesh(new THREE.CircleGeometry(0.075, 14), pocket, [x, 0.935, z], g).rotation.x = -Math.PI / 2;
  }
  // Bolas en triángulo y bola blanca
  const colors = ['#ffd84d', '#2a6bff', '#ff3a3a', '#7a2aff', '#ff8a2a', '#2aaa5a', '#8a1a1a', '#111111'];
  const ball = new THREE.SphereGeometry(0.03, 14, 10);
  let n = 0;
  for (let row = 0; row < 5; row++) {
    for (let k = 0; k <= row; k++) {
      mesh(ball, std(colors[n % colors.length], { roughness: 0.2, metalness: 0.1 }), [0.55 + row * 0.054, 0.96, (k - row / 2) * 0.062], g);
      n++;
    }
  }
  mesh(ball, std('#f4f0e8', { roughness: 0.2 }), [-0.6, 0.96, 0.05], g);
  // Tacos sobre el paño
  const cue = new THREE.CylinderGeometry(0.008, 0.014, 1.5, 8);
  const cueMat = std('#c89a5a', { roughness: 0.4 });
  const c1 = mesh(cue, cueMat, [-0.1, 0.975, 0.28], g);
  c1.rotation.set(0, 0.12, Math.PI / 2);
  const c2 = mesh(cue, cueMat, [-0.15, 0.975, 0.38], g);
  c2.rotation.set(0, -0.08, Math.PI / 2);
  // Luz de neón bajo el borde
  mesh(box(2.5, 0.02, 0.02), glow(NEON.blue, 1.4), [0, 0.7, 0.76], g);
  return g;
}

export function arcadeCabinet(glow: Glow, color: string, title: string, glowColor = color, bodyColor = '#14142a'): THREE.Group {
  const g = new THREE.Group();
  const body = std(bodyColor, { roughness: 0.5, metalness: 0.2 });
  mesh(box(0.78, 0.95, 0.8), body, [0, 0.475, 0], g);
  // Panel de control inclinado
  const panel = mesh(box(0.78, 0.08, 0.5), std('#1c1c36', { roughness: 0.4 }), [0, 1.0, 0.38], g);
  panel.rotation.x = 0.3;
  mesh(box(0.78, 0.8, 0.5), body, [0, 1.35, -0.12], g);
  mesh(box(0.78, 0.26, 0.55), body, [0, 1.88, -0.06], g);
  // Pantalla con un juego pixelado
  const screen = canvasTex(256, 200, (c, w, h) => {
    c.fillStyle = '#05030f';
    c.fillRect(0, 0, w, h);
    c.fillStyle = color;
    for (let i = 0; i < 28; i++) c.fillRect(((i * 53) % 240) + 6, ((i * 37) % 120) + 8, 4, 4);
    c.fillStyle = '#ffd84d';
    for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) c.fillRect(40 + k * 24, 30 + r * 20, 16, 10);
    c.fillStyle = '#5df2ff';
    c.fillRect(w / 2 - 14, h - 40, 28, 10);
    c.fillRect(w / 2 - 4, h - 50, 8, 10);
  });
  const scr = mesh(new THREE.PlaneGeometry(0.62, 0.5), emissiveTex(screen, 1.3), [0, 1.38, 0.136], g);
  scr.rotation.x = -0.12;
  // Marquesina luminosa
  const mq = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#0a0720';
    c.fillRect(0, 0, w, h);
    // Comecocos amarillo a la izquierda y el título a su lado
    c.fillStyle = '#ffd84d';
    c.shadowColor = '#ffd84d';
    c.shadowBlur = 16;
    c.beginPath();
    c.moveTo(70, h / 2);
    c.arc(70, h / 2, 44, 0.45, Math.PI * 2 - 0.45);
    c.closePath();
    c.fill();
    c.fillStyle = color;
    c.shadowColor = color;
    c.font = '700 40px "Press Start 2P", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const lines = title.split('\n');
    lines.forEach((t, i) => c.fillText(t, 140, h / 2 + (i - (lines.length - 1) / 2) * 50));
  });
  mesh(new THREE.PlaneGeometry(0.72, 0.18), emissiveTex(mq, 1.6), [0, 1.9, 0.222], g);
  // Joystick y botones
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), std('#ccc', { metalness: 0.8 }), [-0.18, 1.07, 0.38], g);
  mesh(new THREE.SphereGeometry(0.035, 10, 8), std('#ff3a3a', { roughness: 0.3 }), [-0.18, 1.14, 0.38], g);
  [NEON.yellow, NEON.cyan, NEON.pink].forEach((c, i) => mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), std(c, { emissive: c, emissiveIntensity: 0.5 }), [0.05 + i * 0.1, 1.04, 0.4], g));
  // Neones en los cantos frontales
  for (const x of [-0.39, 0.39]) mesh(box(0.025, 1.6, 0.025), glow(glowColor, 2.2), [x, 1.05, 0.2], g);
  return g;
}

export function foosball(): THREE.Group {
  const g = new THREE.Group();
  const dark = std('#15151c', { roughness: 0.5, metalness: 0.2 });
  mesh(box(1.5, 0.28, 0.85), dark, [0, 0.76, 0], g);
  mesh(box(1.34, 0.02, 0.7), std('#1d6a3a', { roughness: 0.9 }), [0, 0.91, 0], g);
  for (const x of [-0.7, 0.7]) for (const z of [-0.38, 0.38]) mesh(box(0.08, 0.62, 0.08), dark, [x, 0.31, z], g);
  const rodMat = std('#c8ccd6', { metalness: 0.9, roughness: 0.25 });
  [-0.5, -0.17, 0.17, 0.5].forEach((x, i) => {
    const rod = mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.05, 8), rodMat, [x, 1.0, 0], g);
    rod.rotation.x = Math.PI / 2;
    const col = i % 2 ? '#e03a3a' : '#3a6ae0';
    for (const z of [-0.2, 0, 0.2]) mesh(box(0.05, 0.12, 0.04), std(col, { roughness: 0.5 }), [x, 0.97, z], g);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8), std('#222'), [x, 1.0, 0.56], g).rotation.x = Math.PI / 2;
  });
  return g;
}

/** Estante con luz cálida y objetos de colección. `variant` cambia el contenido. */
export function shelfUnit(glow: Glow, variant: number): THREE.Group {
  const g = new THREE.Group();
  const wood = std('#2a1a12', { roughness: 0.5, metalness: 0.1 });
  const W = 1.6;
  const H = 4.4;
  const D = 0.42;
  mesh(box(W, H, 0.05), std('#12101a', { roughness: 0.9 }), [0, H / 2, -D / 2 + 0.02], g);
  for (const x of [-W / 2, W / 2]) mesh(box(0.06, H, D), wood, [x, H / 2, 0], g);
  const led = glow('#ffc878', 2.0);
  const shelves = [0.2, 1.2, 2.2, 3.2, 4.2];
  shelves.forEach((y) => {
    mesh(box(W, 0.05, D), wood, [0, y, 0], g);
    if (y > 0.3) mesh(box(W - 0.1, 0.015, 0.03), led, [0, y - 0.04, D / 2 - 0.06], g);
  });
  for (const x of [-W / 2 + 0.05, W / 2 - 0.05]) mesh(box(0.015, H - 0.2, 0.03), led, [x, H / 2, D / 2 - 0.06], g);

  const gold = std('#e0b030', { metalness: 0.9, roughness: 0.25 });
  const trophy = (x: number, y: number, s = 1) => {
    mesh(new THREE.CylinderGeometry(0.1 * s, 0.12 * s, 0.04 * s, 12), std('#222'), [x, y + 0.02 * s, 0], g);
    mesh(new THREE.CylinderGeometry(0.02 * s, 0.03 * s, 0.1 * s, 8), gold, [x, y + 0.09 * s, 0], g);
    mesh(new THREE.CylinderGeometry(0.1 * s, 0.04 * s, 0.14 * s, 12), gold, [x, y + 0.2 * s, 0], g);
  };
  const frame = (x: number, y: number, c: string, w = 0.3, h = 0.38) => {
    mesh(box(w + 0.04, h + 0.04, 0.025), std('#14141c'), [x, y + h / 2 + 0.02, 0.02], g);
    const art = canvasTex(64, 64, (cx) => {
      const gr = cx.createLinearGradient(0, 0, 64, 64);
      gr.addColorStop(0, c);
      gr.addColorStop(1, '#14102a');
      cx.fillStyle = gr;
      cx.fillRect(0, 0, 64, 64);
    });
    mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: art }), [x, y + h / 2 + 0.02, 0.035], g);
  };
  const books = (x: number, y: number, n: number) => {
    const cols = ['#a83a3a', '#2a5aa8', '#e0b030', '#2a8a5a', '#7a3aa8'];
    for (let i = 0; i < n; i++) {
      const h = 0.22 + ((i * 7 + variant) % 3) * 0.04;
      mesh(box(0.05, h, 0.2), std(cols[(i + variant) % cols.length], { roughness: 0.8 }), [x + i * 0.06, y + h / 2 + 0.025, 0], g);
    }
  };
  const plant = (x: number, y: number) => {
    mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.1, 10), std('#e8e0d0'), [x, y + 0.05, 0], g);
    const leaf = std('#2f7a3a', { roughness: 0.7 });
    for (let i = 0; i < 6; i++) {
      const l = mesh(new THREE.ConeGeometry(0.03, 0.22, 5), leaf, [x, y + 0.2, 0], g);
      l.rotation.set(0.6, (i / 6) * Math.PI * 2, 0, 'YXZ');
    }
  };
  const teddy = (x: number, y: number) => {
    const fur = std('#d8a040', { roughness: 0.95 });
    mesh(new THREE.SphereGeometry(0.1, 14, 10), fur, [x, y + 0.1, 0], g);
    mesh(new THREE.SphereGeometry(0.075, 14, 10), fur, [x, y + 0.24, 0.01], g);
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.03, 8, 6), fur, [x + s * 0.06, y + 0.3, 0], g);
      mesh(new THREE.SphereGeometry(0.035, 8, 6), fur, [x + s * 0.11, y + 0.12, 0.03], g);
      mesh(new THREE.SphereGeometry(0.035, 8, 6), fur, [x + s * 0.06, y + 0.02, 0.05], g);
    }
    mesh(new THREE.SphereGeometry(0.025, 8, 6), std('#3a2410'), [x, y + 0.23, 0.08], g);
  };

  if (variant === 0) {
    frame(-0.45, 0.25, '#ff3ea5');
    trophy(0.05, 0.25);
    plant(0.5, 0.25);
    trophy(-0.5, 1.25, 1.2);
    frame(0.1, 1.25, '#5df2ff', 0.34, 0.4);
    books(0.45, 1.25, 4);
    plant(-0.45, 2.25);
    frame(0.1, 2.25, '#ffd84d', 0.32, 0.4);
    trophy(0.55, 2.25);
    books(-0.55, 3.25, 6);
    frame(0.35, 3.25, '#7a5cff', 0.36, 0.42);
  } else {
    trophy(-0.5, 0.25, 1.2);
    frame(0.0, 0.25, '#3aff7a', 0.3, 0.36);
    trophy(0.5, 0.25);
    teddy(-0.4, 1.25);
    teddy(0.2, 1.25);
    books(0.5, 1.25, 3);
    frame(-0.3, 2.25, '#ff8a3a', 0.34, 0.4);
    plant(0.4, 2.25);
    trophy(-0.5, 3.25);
    books(-0.1, 3.25, 5);
    frame(0.55, 3.25, '#4aa8ff', 0.28, 0.34);
  }
  return g;
}

export function plant(): THREE.Group {
  const g = new THREE.Group();
  mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.6, 14), std('#e8e2d6', { roughness: 0.6 }), [0, 0.3, 0], g);
  const leaf = std('#2f7a3a', { roughness: 0.6 });
  for (let i = 0; i < 11; i++) {
    const f = mesh(new THREE.ConeGeometry(0.1, 1.6, 5), leaf, [0, 0.6, 0], g);
    f.geometry.translate(0, 0.8, 0);
    f.rotation.set(0.7 + (i % 3) * 0.12, (i / 11) * Math.PI * 2, 0, 'YXZ');
    f.scale.set(1, 1, 0.45);
  }
  return g;
}

/** Mesa redonda de madera oscura con tablero de juego encima. */
export function roundTable(): THREE.Group {
  const g = new THREE.Group();
  const wood = std('#2a1810', { roughness: 0.4, metalness: 0.1 });
  mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.07, 32), wood, [0, 0.8, 0], g);
  mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.76, 12), wood, [0, 0.4, 0], g);
  mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.05, 20), wood, [0, 0.03, 0], g);
  // Tablero de ajedrez con las piezas en posicion inicial (blancas hacia -x, negras hacia +x)
  const sq = 0.08;
  const top = 0.885;
  mesh(box(0.74, 0.03, 0.74), std('#5a3a1e', { roughness: 0.5 }), [0, 0.855, 0], g);
  mesh(box(0.64, 0.02, 0.64), std('#e8d4a0', { roughness: 0.7 }), [0, 0.875, 0], g);
  const darkSq = std('#6b4423', { roughness: 0.7 });
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 === 0) continue;
    mesh(box(sq, 0.004, sq), darkSq, [(r - 3.5) * sq, 0.886, (c - 3.5) * sq], g);
  }
  const white = std('#f2ead8', { roughness: 0.4 });
  const black = std('#1d1a1a', { roughness: 0.35 });
  const back = [4, 3, 2, 1, 0, 2, 3, 4]; // torre, caballo, alfil, dama, rey, alfil, caballo, torre
  const piece = (kind: number, mat: THREE.Material, x: number, z: number): void => {
    const ph = [0.1, 0.09, 0.075, 0.065, 0.055, 0.04][kind]; // rey, dama, alfil, caballo, torre, peon
    mesh(new THREE.CylinderGeometry(0.014, 0.026, ph, 10), mat, [x, top + ph / 2, z], g);
    mesh(new THREE.SphereGeometry(kind === 5 ? 0.017 : 0.022, 8, 6), mat, [x, top + ph + 0.008, z], g);
  };
  for (let c = 0; c < 8; c++) {
    const z = (c - 3.5) * sq;
    piece(back[c], white, -3.5 * sq, z);
    piece(5, white, -2.5 * sq, z);
    piece(5, black, 2.5 * sq, z);
    piece(back[c], black, 3.5 * sq, z);
  }
  return g;
}

export function diningChair(): THREE.Group {
  const g = new THREE.Group();
  const grey = std('#3a3a44', { roughness: 0.85 });
  const dark = std('#1a1a20', { roughness: 0.5, metalness: 0.2 });
  mesh(box(0.5, 0.08, 0.5), grey, [0, 0.5, 0], g);
  mesh(box(0.5, 0.55, 0.07), grey, [0, 0.86, -0.22], g).rotation.x = -0.08;
  for (const x of [-0.21, 0.21]) for (const z of [-0.2, 0.2]) mesh(box(0.04, 0.5, 0.04), dark, [x, 0.25, z], g);
  return g;
}
