import * as THREE from 'three';
import { Panel } from './panels';

/** Paleta de la estantería de cartuchos (sala de juegos). */
export const VIT = {
  night: '#0f0a2e',
  panel: '#1c1450',
  brass: '#5df2ff',
  ivory: '#e8f6ff',
  burgundy: '#ff3ea5',
};

/** Medidas locales de la vitrina (metros). Origen: centro del marco; +z hacia la sala. */
export const VIT_W = 3.9;
export const VIT_H = 2.9;
export const SHELF_TOP = -0.62;
export const TAG_Y = -0.91;
export const TAG_Z = 0.43;
export const TAG_W = 0.7;
export const SLOTS = 5;

export interface BottlePart {
  group: THREE.Group;
  baseY: number;
  /** Posición X local de la botella. */
  x: number;
  spot: THREE.SpotLight;
}

export interface VitrinaParts {
  root: THREE.Group;
  /** Título grabado en la parte alta del marco. */
  title: Panel;
  bottles: BottlePart[];
}

const bottleX = (i: number) => (i - (SLOTS - 1) / 2) * 0.74;

/** Punto local (en el marco) donde se ancla la etiqueta HTML de cada botella. */
export const tagLocal = (i: number, dx = 0) => new THREE.Vector3(bottleX(i) + dx, TAG_Y, TAG_Z);

function std(color: string, opts: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05, ...opts });
}

function add<T extends THREE.Object3D>(parent: THREE.Object3D, obj: T, x = 0, y = 0, z = 0): T {
  obj.position.set(x, y, z);
  parent.add(obj);
  return obj;
}

/** Fondo morado oscuro con rejilla de neón tipo synthwave. */
function backTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 768;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, c.height);
  bg.addColorStop(0, '#120a34');
  bg.addColorStop(1, '#251660');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(93,242,255,0.16)';
  g.lineWidth = 2;
  for (let x = 0; x <= c.width; x += 64) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, c.height);
    g.stroke();
  }
  for (let y = 0; y <= c.height; y += 64) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(c.width, y);
    g.stroke();
  }
  const v = g.createRadialGradient(512, 430, 60, 512, 430, 620);
  v.addColorStop(0, 'rgba(255,62,165,0.18)');
  v.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = v;
  g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const CART_COLORS = ['#ff3ea5', '#5df2ff', '#ffd84d', '#7dff8a', '#ff9a3e'];

/** Etiqueta del cartucho: degradado de neón, número y marco. */
function labelTexture(i: number): THREE.CanvasTexture {
  const W = 256;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const col = CART_COLORS[i % CART_COLORS.length];
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1050');
  bg.addColorStop(1, '#0a0720');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.strokeStyle = col;
  g.lineWidth = 8;
  g.strokeRect(10, 10, W - 20, H - 20);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  const num = () => {
    g.fillStyle = col;
    g.shadowColor = col;
    g.shadowBlur = 14;
    g.font = '400 44px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(i + 1).padStart(2, '0'), W / 2, 214);
    g.shadowBlur = 0;
  };
  num();
  // Portada de la etiqueta: se pinta cuando carga la imagen
  const art = new Image();
  art.onload = () => {
    g.drawImage(art, 18, 18, W - 36, Math.round((W - 36) / 1.43));
    num();
    t.needsUpdate = true;
  };
  art.src = `img/carts/cart-${(i % 5) + 1}.jpg`;
  return t;
}

/** Cartucho de videojuego en pie: carcasa gris, hendidura superior, etiqueta y conector. */
function buildBottle(i: number, brass: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const shell = std('#8a8fa0', { roughness: 0.55, metalness: 0.15 });
  const W = 0.5;
  const H = 0.56;
  const D = 0.09;
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W, H, D), shell), 0, H / 2 + 0.08, 0);
  // Base con conector dorado
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.08, D * 0.7), std('#d8b84a', { metalness: 0.9, roughness: 0.3 })), 0, 0.04, 0);
  // Relieves de la carcasa
  for (let k = 0; k < 5; k++) {
    add(g, new THREE.Mesh(new THREE.BoxGeometry(W * 0.76, 0.012, 0.012), std('#6a6f80', { roughness: 0.6 })), 0, 0.17 + k * 0.025, D / 2 + 0.003);
  }
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W * 0.2, 0.05, 0.02), std('#5a5f70')), W * 0.28, H + 0.04, D / 2);
  // Etiqueta
  const labelTex = labelTexture(i);
  const label = add(
    g,
    new THREE.Mesh(new THREE.PlaneGeometry(W * 0.8, W * 0.8), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.5, emissive: '#ffffff', emissiveMap: labelTex, emissiveIntensity: 0.55 })),
    0,
    0.38,
    D / 2 + 0.004,
  );
  label.name = 'label';
  add(g, new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.02, D + 0.02), brass), 0, 0.085, 0);
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });
  return g;
}

/** Estantería de cartuchos: marco oscuro con neón, repisa y un cartucho por proyecto con foco propio. */
export function buildVitrina(clickable: THREE.Object3D[]): VitrinaParts {
  const root = new THREE.Group();
  const wood = std('#14102a', { roughness: 0.6, metalness: 0.2 });
  const brass = std('#9aa8d8', { metalness: 0.85, roughness: 0.3 });
  const brassDim = std('#2a8a9a', { metalness: 0.6, roughness: 0.5 });
  const T = 0.16; // grosor del marco
  const D = 0.14; // profundidad del marco

  // Fondo
  add(root, new THREE.Mesh(new THREE.PlaneGeometry(VIT_W - T, VIT_H - T), new THREE.MeshStandardMaterial({ map: backTexture(), roughness: 0.9 })), 0, 0, 0.004);

  // Marco de madera oscura
  add(root, new THREE.Mesh(new THREE.BoxGeometry(VIT_W, T, D), wood), 0, (VIT_H - T) / 2, D / 2);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(VIT_W, T, D), wood), 0, -(VIT_H - T) / 2, D / 2);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(T, VIT_H - 2 * T, D), wood), -(VIT_W - T) / 2, 0, D / 2);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(T, VIT_H - 2 * T, D), wood), (VIT_W - T) / 2, 0, D / 2);
  // Filete de latón fino en el borde interior
  const iw = VIT_W - 2 * T;
  const ih = VIT_H - 2 * T;
  const L = 0.014;
  add(root, new THREE.Mesh(new THREE.BoxGeometry(iw, L, L), brass), 0, ih / 2, D);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(iw, L, L), brass), 0, -ih / 2, D);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(L, ih, L), brass), -iw / 2, 0, D);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(L, ih, L), brass), iw / 2, 0, D);
  // Esquinas escalonadas
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = sx * (VIT_W / 2 - T / 2);
      const y = sy * (VIT_H / 2 - T / 2);
      add(root, new THREE.Mesh(new THREE.BoxGeometry(T * 1.05, T * 1.05, D + 0.03), wood), x, y, (D + 0.03) / 2);
      add(root, new THREE.Mesh(new THREE.BoxGeometry(T * 0.5, T * 0.5, 0.012), brassDim), x, y, D + 0.03);
    }
  }

  // Repisa con frente de madera y placa de latón bajo cada botella
  add(root, new THREE.Mesh(new THREE.BoxGeometry(iw, 0.6, 0.44), wood), 0, SHELF_TOP - 0.3, 0.22);
  add(root, new THREE.Mesh(new THREE.BoxGeometry(iw, 0.022, 0.022), brass), 0, SHELF_TOP - 0.004, 0.45);
  for (let i = 0; i < SLOTS; i++) {
    const plaque = add(root, new THREE.Mesh(new THREE.BoxGeometry(TAG_W + 0.08, 0.5, 0.01), std(VIT.night, { roughness: 0.5 })), bottleX(i), TAG_Y, 0.443);
    plaque.name = 'plaque';
    add(root, new THREE.Mesh(new THREE.BoxGeometry(TAG_W + 0.1, 0.52, 0.006), brassDim), bottleX(i), TAG_Y, 0.439);
  }

  // Título grabado: lo dibuja panels.drawVitrinaTitle
  const title = new Panel(2048, 440, 3.3, 0.71);
  title.mesh.position.set(0, 0.98, 0.012);
  title.mesh.userData['action'] = 'panel:display';
  title.mesh.userData['noHover'] = true;
  root.add(title.mesh);
  clickable.push(title.mesh);

  // Botellas, cada una con su foco cálido
  const bottles: BottlePart[] = [];
  const baseY = SHELF_TOP + 0.012;
  for (let i = 0; i < SLOTS; i++) {
    const x = bottleX(i);
    const group = buildBottle(i, brass);
    group.position.set(x, baseY, 0.2);
    root.add(group);

    const spot = new THREE.SpotLight('#dff2ff', 0, 5, 0.36, 0.8, 1.6);
    spot.position.set(x, 1.15, 1.0);
    spot.target.position.set(x, baseY + 0.35, 0.2);
    root.add(spot, spot.target);

    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.8, 0.4), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x, baseY + 0.4, 0.2);
    hit.userData['action'] = 'bottle';
    hit.userData['index'] = i;
    hit.userData['noHover'] = true;
    root.add(hit);
    clickable.push(hit);

    bottles.push({ group, baseY, x, spot });
  }

  return { root, title, bottles };
}
