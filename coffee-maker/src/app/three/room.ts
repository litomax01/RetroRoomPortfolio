import * as THREE from 'three';
import { Panel, drawEmblem } from './panels';
import { VitrinaParts, buildVitrina } from './vitrina';
import { buildPinballMachine } from './pinball-model';
import { box, canvasTex, mesh, std } from './kit';
import {
  arcadeCabinet,
  diningChair,
  foosball,
  plant,
  poolTable,
  roundTable,
  shelfUnit,
} from './room-props';
import { SITE_NAME } from '../data/content';
import { buildCat } from './cat';

/** Tamano del gato en la sala (mayor que 1 para que se vea bien desde la camara). */
const CAT_SCALE = 1.7;
import { drawNeonWord, rugTexture, slatTexture, stoneTexture } from './room-art';

export type Action =
  | 'sign:contact'
  | 'panel:display'
  | 'panel:board'
  | 'vitrina'
  | 'bottle'
  | 'record'
  | 'pinball'
  | 'arcade'
  | 'foosball'
  | 'pool'
  | 'chess'
  | 'mask'
  | 'eva'
  | 'cat';

export interface RoomParts {
  root: THREE.Group;
  board: Panel;
  /** Ancla de la TV CRT y la consola (se llena al cargar los modelos); `tvFrame` es la TV plana de respaldo. */
  tv: THREE.Group;
  tvFrame: THREE.Object3D;
  /** Título grabado en la vitrina de proyectos. */
  display: Panel;
  vitrina: VitrinaParts;
  credits: Panel;
  clickable: THREE.Object3D[];
  platter: THREE.Object3D;
  tonearm: THREE.Object3D;
  gear: THREE.Object3D;
  glowMaterials: THREE.MeshStandardMaterial[];
  lights: { record: THREE.PointLight; eva: THREE.PointLight };
  cat: {
    head: THREE.Group;
    paw: THREE.Group;
    /** Grupo completo del gato (se mueve por la sala). */
    root: THREE.Group;
    /** Modelo sentado (lamiendose la pata) y modelo de pie para caminar; solo uno visible a la vez. */
    sit: THREE.Group;
    walk: THREE.Group;
    /** Patas del modelo de pie: delantera izq., delantera der., trasera izq., trasera der. */
    legs: THREE.Group[];
    walkHead: THREE.Group;
    tail: THREE.Group;
  };
  emblem: Panel;
  vinyl: THREE.Group;
  setLabel: (index: number, color: string) => void;
  eqBars: THREE.Mesh[];
  fan: THREE.Object3D;
  dust: THREE.Points;
  /** Máquina de pinball (el modelo descargado la sustituye al cargar). */
  pinball: THREE.Group;
  /** Arcade de Pac-Man (el modelo descargado la sustituye al cargar). */
  arcade: THREE.Group;
  /** Rocola (el modelo descargado la sustituye al cargar). */
  jukebox: THREE.Group;
  /** Mesa de billar y futbolín (los modelos descargados los sustituyen al cargar). */
  pool: THREE.Group;
  foosball: THREE.Group;
  /** Máscara de Majora en la pared izquierda: abre "Sobre mí". */
  mask: THREE.Group;
  chessTable: THREE.Object3D;
  /** Figura de Evangelion en la esquina derecha (la rellena el modelo descargado). */
  eva: THREE.Group;
  accent: THREE.PointLight[];
  /** Colores que la sala tiñe según la canción: `mix` 0 = color principal, 1 = secundario. */
  tintables: Array<{ color: THREE.Color; base: THREE.Color; mix: number }>;
  bartender: Bartender;
  /** Materiales a los que se aplican texturas PBR al cargarlas. */
  pbr: Record<'floor' | 'wood', THREE.MeshStandardMaterial[]>;
}

export interface Bartender {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  armL: { shoulder: THREE.Group; elbow: THREE.Group };
  armR: { shoulder: THREE.Group; elbow: THREE.Group };
  menu: THREE.Group;
  menuPanel: Panel;
  /** Puesto desde donde sale a atender. */
  post: { x: number; z: number; rot: number };
}

const C = {
  bulb: '#ffd9a0',
  warm: '#ffb877',
  cyan: '#5df2ff',
  magenta: '#ff3ea5',
  yellow: '#ffd84d',
  steel: '#3a3d58',
};

export function buildRoom(): RoomParts {
  const root = new THREE.Group();
  const clickable: THREE.Object3D[] = [];
  const glowMaterials: THREE.MeshStandardMaterial[] = [];
  const pbr: RoomParts['pbr'] = { floor: [], wood: [] };

  const glow = (color: string, intensity = 2) => {
    const m = new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity });
    glowMaterials.push(m);
    return m;
  };
  const chrome = std('#9aa8d8', { metalness: 0.85, roughness: 0.3 });
  const woodDark = std('#2a1810', { roughness: 0.5 });
  woodDark.userData['tint'] = '#8470b8';
  pbr.wood.push(woodDark);

  const hitbox = (size: [number, number, number], pos: [number, number, number], action: Action) => {
    const m = new THREE.Mesh(box(...size), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set(...pos);
    m.userData['action'] = action;
    root.add(m);
    clickable.push(m);
  };

  // ---- Luz: ambiente morada y puntos cálidos y de neón ----
  root.add(new THREE.HemisphereLight('#7a66f0', '#2a1d5e', 0.9));
  // En táctil se omiten las luces de acento (`optional`): cada luz se calcula por píxel en todos los materiales
  const lowEnd = window.matchMedia('(pointer: coarse)').matches;
  const addLight = (color: string, intensity: number, dist: number, x: number, y: number, z: number, optional = false) => {
    const l = new THREE.PointLight(color, intensity, dist, 1.5);
    if (optional && lowEnd) return l;
    l.position.set(x, y, z);
    root.add(l);
    return l;
  };
  addLight(C.warm, 30, 14, -1.4, 5.6, 1.5);
  addLight(C.magenta, 9, 9, 5.2, 2.6, -4.2, true);
  addLight(C.cyan, 7, 8, 3.2, 2.2, -4.4, true);
  addLight('#ffcf8a', 16, 9, -3.9, 4.4, 5.0);
  addLight('#ffb070', 12, 10, 4.4, 4.8, 5.0);
  // Juego de color por zonas: turquesa a la izquierda, magenta a la derecha, índigo al fondo
  const washTeal = addLight('#19e6d2', 14, 9, -7.2, 3.4, 0.5);
  const washMagenta = addLight('#ff2fa8', 14, 9, 7.2, 3.4, 0.5);
  const washIndigo = addLight('#5b3bff', 10, 9, 0.5, 4.6, -4.6);
  const lightRecord = addLight('#ff6ad5', 7, 9, 5.0, 1.9, 3.7);

  // ---- Piso de madera y alfombras ----
  const floorMat = std('#6a5646', { roughness: 0.55, metalness: 0.05 });
  floorMat.userData['tint'] = '#c4b2ea';
  floorMat.userData['gain'] = 1.25;
  pbr.floor.push(floorMat);
  const floor = mesh(new THREE.PlaneGeometry(16, 15), floorMat, [0, 0, 1.5], root);
  floor.rotation.x = -Math.PI / 2;
  const rug = (w: number, d: number, x: number, z: number, base: string, fleck: string) => {
    const r = mesh(new THREE.PlaneGeometry(w, d), std('#ffffff', { map: rugTexture(base, fleck), roughness: 1 }), [x, 0.012, z], root);
    r.rotation.x = -Math.PI / 2;
  };
  rug(5.4, 3.8, -2.6, -0.3, '#6a6a74', '#d8d8e8');
  rug(4.6, 3.6, 4.4, 5.8, '#2a2438', '#8a7aa8');

  // ---- Paredes: madera en los lados, piedra tras la TV, mural a la derecha ----
  const wallDark = std('#15121f', { roughness: 0.95 });
  mesh(new THREE.PlaneGeometry(16, 7), wallDark, [0, 3.5, -6.0], root);
  const slatsL = std('#ffffff', { map: slatTexture([3.75, 1]), roughness: 0.6 });
  const wallL = mesh(new THREE.PlaneGeometry(15, 7), slatsL, [-8.0, 3.5, 1.5], root);
  wallL.rotation.y = Math.PI / 2;
  const slatsR = std('#cfcfdf', { map: slatTexture([3.75, 1]), roughness: 0.6 });
  const wallR = mesh(new THREE.PlaneGeometry(15, 7), slatsR, [8.0, 3.5, 1.5], root);
  wallR.rotation.y = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(3.2, 7), std('#ffffff', { map: slatTexture([0.8, 1]), roughness: 0.6 }), [-6.4, 3.5, -5.99], root);
  mesh(new THREE.PlaneGeometry(4.2, 4.9), std('#ffffff', { map: stoneTexture(), roughness: 0.55, metalness: 0.15 }), [-1.4, 2.55, -5.97], root);
  // Póster de la pared del fondo: retrato vertical (img/poster.jpg, 2:3) con marco oscuro
  const posterTex = new THREE.TextureLoader().load('img/poster.jpg');
  posterTex.colorSpace = THREE.SRGBColorSpace;
  posterTex.anisotropy = 8;
  const POSTER_W = 2.3;
  const POSTER_H = 3.45;
  mesh(box(POSTER_W + 0.22, POSTER_H + 0.22, 0.06), std('#0c0a14', { roughness: 0.5, metalness: 0.2 }), [5.2, 3.6, -5.97], root);
  mesh(
    new THREE.PlaneGeometry(POSTER_W, POSTER_H),
    new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.85, emissive: '#ffffff', emissiveMap: posterTex, emissiveIntensity: 0.3 }),
    [5.2, 3.6, -5.935],
    root,
  );
  // Zócalos oscuros
  mesh(box(16, 0.18, 0.05), std('#0c0a14'), [0, 0.09, -5.97], root);
  mesh(box(0.05, 0.18, 15), std('#0c0a14'), [-7.97, 0.09, 1.5], root);
  mesh(box(0.05, 0.18, 15), std('#0c0a14'), [7.97, 0.09, 1.5], root);

  // ---- Techo con cenefa de luz LED ----
  const ceil = mesh(new THREE.PlaneGeometry(16, 15), std('#2a2536', { roughness: 0.95 }), [0, 6.9, 1.5], root);
  ceil.rotation.x = Math.PI / 2;
  const tray = std('#3a3448', { roughness: 0.9 });
  mesh(box(13.0, 0.12, 12.4), tray, [0, 6.62, 1.5], root);
  const led = glow('#ffc878', 2.6);
  const ledZ0 = -4.7;
  const ledZ1 = 7.7;
  const ledX = 6.5;
  mesh(box(2 * ledX, 0.05, 0.05), led, [0, 6.54, ledZ0], root);
  mesh(box(2 * ledX, 0.05, 0.05), led, [0, 6.54, ledZ1], root);
  mesh(box(0.05, 0.05, ledZ1 - ledZ0), led, [-ledX, 6.54, (ledZ0 + ledZ1) / 2], root);
  mesh(box(0.05, 0.05, ledZ1 - ledZ0), led, [ledX, 6.54, (ledZ0 + ledZ1) / 2], root);
  // Luces empotradas
  const spotDisc = glow('#fff2d8', 3);
  for (const x of [-5, -1.7, 1.7, 5]) for (const z of [-3, 0.5, 4, 7]) mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 14), spotDisc, [x, 6.55, z], root);

  // ---- Juego de luz: neón al pie de las paredes y charcos de color sobre el piso (sin luces extra) ----
  const tintables: RoomParts['tintables'] = [];
  const baseStrip = (color: string, size: [number, number, number], pos: [number, number, number], mix: number) => {
    const m = glow(color, 2.6);
    m.userData['pulse'] = 2.6;
    tintables.push({ color: m.emissive, base: m.emissive.clone(), mix });
    mesh(box(...size), m, pos, root);
  };
  baseStrip('#19e6d2', [0.06, 0.06, 14.6], [-7.93, 0.55, 1.5], 0);
  baseStrip('#ff2fa8', [0.06, 0.06, 14.6], [7.93, 0.55, 1.5], 1);
  baseStrip('#7a4dff', [15.8, 0.06, 0.06], [0, 0.55, -5.93], 0.5);
  const lightPool = (color: string, size: number, x: number, z: number, opacity: number, mix: number) => {
    const tex = canvasTex(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.45, 'rgba(255,255,255,0.35)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
    const poolMat = new THREE.MeshBasicMaterial({ map: tex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    tintables.push({ color: poolMat.color, base: poolMat.color.clone(), mix });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), poolMat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.03, z);
    m.renderOrder = 1;
    root.add(m);
  };
  lightPool('#19e6d2', 8, -5.4, 0.5, 0.42, 0);
  lightPool('#ff2fa8', 8, 5.4, 0.5, 0.42, 1);
  lightPool('#7a4dff', 9, 0, -3.8, 0.4, 0.5);
  lightPool('#ffb877', 7, -1, 3.2, 0.3, 0.5);

  // ---- TV de pared ("Sobre mí"), mueble bajo y estantes ----
  const board = new Panel(1024, 640, 3.3, 2.0625);
  board.mesh.position.set(-1.4, 3.15, -5.915);
  board.mesh.userData['action'] = 'panel:board';
  root.add(board.mesh);
  clickable.push(board.mesh);
  const tvFrame = mesh(box(3.4, 2.16, 0.05), std('#07070c', { roughness: 0.3, metalness: 0.5 }), [-1.4, 3.15, -5.945], root); // TV plana de respaldo si el modelo no carga
  const tv = new THREE.Group();
  tv.position.set(-1.4, 0.55, -4.95);
  root.add(tv);
  const consoleMat = std('#1c1210', { roughness: 0.5 });
  consoleMat.userData['tint'] = '#9a8478';
  pbr.wood.push(consoleMat);
  mesh(box(4.6, 0.5, 3.0), consoleMat, [-1.4, 0.3, -4.45], root);
  mesh(box(3.9, 0.025, 0.04), glow('#ffc878', 2), [-1.4, 0.02, -2.92], root);
  const shelfL = shelfUnit(glow, 0);
  shelfL.position.set(-4.3, 0, -5.79);
  root.add(shelfL);
  const shelfR = shelfUnit(glow, 1);
  shelfR.position.set(1.5, 0, -5.79);
  root.add(shelfR);

  // ---- Neón con el nombre sobre la TV ----
  const neon = new Panel(1280, 256, 6.5, 1.3);
  neon.mesh.position.set(-1.4, 5.55, -5.94);
  root.add(neon.mesh);
  const drawName = (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `400 ${Math.floor(1180 / SITE_NAME.length)}px "Press Start 2P", monospace`;
    g.shadowColor = '#ff3ea5';
    g.shadowBlur = 40;
    g.fillStyle = '#ffd6ef';
    g.fillText(SITE_NAME, w / 2, h / 2);
    g.shadowColor = '#5df2ff';
    g.shadowBlur = 16;
    g.fillStyle = '#e8fbff';
    g.fillText(SITE_NAME, w / 2, h / 2);
    g.shadowBlur = 0;
  };
  neon.redraw(drawName);
  // La fuente pixelada puede no estar lista al construir la escena: se redibuja al cargar
  void document.fonts?.load('72px "Press Start 2P"').then(() => neon.redraw(drawName));

  // ---- Neones "Play / Code / Repeat" en la pared izquierda: una fila por encima del pinball ----
  // El texto se lee hacia -Z, asi que la primera palabra queda en la Z mayor.
  const NEON_ROW_Y = 5.25;
  const neonWords: Array<[string, string, number]> = [
    ['Play', '#4aa8ff', 0.7],
    ['Code', '#ff5a3a', -2.0],
    ['Repeat', '#3aff7a', -4.7],
  ];
  const neonPanels: Array<[Panel, string, string]> = neonWords.map(([text, color, z]) => {
    const p = new Panel(1024, 380, 2.6, 0.97);
    p.mesh.position.set(-7.93, NEON_ROW_Y, z);
    p.mesh.rotation.y = Math.PI / 2; // mira hacia la sala (+X)
    root.add(p.mesh);
    p.redraw((g, w, h) => drawNeonWord(g, w, h, text, color));
    return [p, text, color];
  });
  // ---- Máscara de Majora bajo los neones: abre "Sobre mí" ----
  const maskGroup = new THREE.Group();
  maskGroup.position.set(-7.45, 3.55, 0.5);
  root.add(maskGroup);
  mesh(box(0.08, 2.5, 2.7), std('#120d22', { roughness: 0.6, metalness: 0.25 }), [-7.93, 3.55, 0.5], root);
  mesh(box(0.05, 2.62, 2.82), std('#ffd84d', { roughness: 0.4, metalness: 0.6 }), [-7.96, 3.55, 0.5], root);
  addLight('#b86bff', 9, 7, -6.2, 3.6, 0.5, true);
  hitbox([1.4, 2.4, 2.6], [-7.45, 3.55, 0.5], 'mask');

  void document.fonts?.load('80px "Pacifico"').then(() => neonPanels.forEach(([p, t, c]) => p.redraw((g, w, h) => drawNeonWord(g, w, h, t, c))));

  // ---- Vitrina de proyectos (pared derecha) ----
  const vitrina = buildVitrina(clickable);
  vitrina.root.position.set(7.99, 3.1, -0.5);
  vitrina.root.rotation.y = -Math.PI / 2;
  root.add(vitrina.root);
  const display = vitrina.title;
  hitbox([0.3, 2.9, 3.9], [7.85, 3.1, -0.5], 'vitrina');

  // ---- Muebles y máquinas ----
  const pool = poolTable(glow);
  pool.position.set(-2.4, 0, 3.0);
  hitbox([4.6, 1.3, 2.6], [-2.4, 0.65, 3.0], 'pool');
  pool.rotation.y = 0.08;
  root.add(pool);


  // Un solo arcade grande al fondo, junto al mural: abre Pac-Man
  const arcade = arcadeCabinet(glow, '#ffd84d', 'PAC-MAN', '#ffd84d', '#e0a800');
  arcade.position.set(3.5, 0, -5.0);
  arcade.scale.setScalar(2.3);
  root.add(arcade);
  hitbox([1.9, 4.6, 2.0], [3.5, 2.3, -4.7], 'arcade');
  // Esquina derecha: aqui estaba el juego de basket; ahora va la figura de Evangelion (se carga como modelo).
  const eva = new THREE.Group();
  eva.position.set(7.0, 0, -5.0);
  root.add(eva);
  hitbox([2.4, 5.4, 2.4], [7.0, 2.7, -5.0], 'eva');
  const lightEva = addLight('#ff8a2a', 0, 9, 6.0, 3.4, -3.6); // destello al hacer clic
  const foos = foosball();
  foos.position.set(3.2, 0, 1.4);
  hitbox([2.9, 1.5, 2.9], [3.2, 0.75, 1.4], 'foosball');
  root.add(foos);

  const table = roundTable();
  table.position.set(1.6, 0, 4.4);
  root.add(table);
  hitbox([1.8, 0.4, 1.8], [1.6, 0.9, 4.4], 'chess');
  // Dos sillas enfrentadas a los lados del tablero de ajedrez
  for (const side of [-1, 1]) {
    const chair = diningChair();
    chair.position.set(1.6 + side * 1.15, 0, 4.4);
    chair.rotation.y = -side * Math.PI / 2;
    root.add(chair);
  }

  for (const [x, z] of [[7.3, 1.9], [-5.9, -5.2], [7.5, 6.6]]) {
    const p = plant();
    p.position.set(x, 0, z);
    root.add(p);
  }

  // ---- Tocadiscos tipo jukebox (neón rosa y cian) ----
  const jb = new THREE.Group();
  jb.position.set(6.4, 0, 3.7);
  jb.rotation.y = -Math.PI / 2;
  root.add(jb);
  const cabinet = std('#1a1448', { roughness: 0.4, metalness: 0.25 });
  mesh(box(1.9, 1.9, 0.95), cabinet, [0, 0.95, 0], jb);
  const archTop = mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.95, 28, 1, false, Math.PI / 2, Math.PI), cabinet, [0, 1.9, 0], jb);
  archTop.rotation.x = Math.PI / 2;
  mesh(box(2.0, 0.12, 1.05), chrome, [0, 0.06, 0.02], jb);

  mesh(box(1.3, 0.9, 0.05), std('#07050f', { roughness: 0.2 }), [0, 1.55, 0.46], jb);
  mesh(new THREE.CircleGeometry(0.65, 28, 0, Math.PI), std('#07050f', { roughness: 0.2 }), [0, 2.0, 0.465], jb);
  mesh(new THREE.TorusGeometry(0.72, 0.045, 8, 32, Math.PI), glow('#ff6ad5', 1.8), [0, 2.0, 0.49], jb);
  mesh(new THREE.TorusGeometry(0.88, 0.04, 8, 32, Math.PI), glow('#aef6ff', 1.6), [0, 2.0, 0.49], jb);
  [-0.82, 0.82].forEach((x) => mesh(box(0.06, 1.7, 0.06), glow('#5df2ff', 1.8), [x, 0.95, 0.49], jb));

  const tilt = new THREE.Group();
  tilt.position.set(0, 1.62, 0.5);
  tilt.rotation.x = Math.PI / 2;
  jb.add(tilt);
  const platter = new THREE.Group();
  tilt.add(platter);
  mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.02, 40), std('#1a1a28', { metalness: 0.7, roughness: 0.35 }), [0, -0.02, 0], platter);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.07, 10), chrome, [0, 0.02, 0], platter);

  const vinyl = new THREE.Group();
  platter.add(vinyl);
  mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.03, 40), std('#07060a', { roughness: 0.2, metalness: 0.5 }), [0, 0, 0], vinyl);
  [0.26, 0.33, 0.4, 0.46].forEach((rad) =>
    mesh(new THREE.TorusGeometry(rad, 0.004, 4, 48), std('#3a3340'), [0, 0.018, 0], vinyl).rotation.set(Math.PI / 2, 0, 0),
  );
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = labelCanvas.height = 128;
  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  const labelMesh = mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshBasicMaterial({ map: labelTex, toneMapped: false }), [0, 0.019, 0], vinyl);
  labelMesh.rotation.x = -Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), chrome, [0, 0.02, 0], vinyl);
  mesh(box(0.1, 0.03, 0.035), glow('#e0f4ff', 2.4), [0.36, 0.03, 0], vinyl);
  const setLabel = (index: number, color: string) => {
    const g = labelCanvas.getContext('2d')!;
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = color;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(64, 64, 44, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#1a0d06';
    g.font = '400 46px "Press Start 2P", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(index + 1), 64, 68);
    g.beginPath();
    g.arc(64, 64, 5, 0, Math.PI * 2);
    g.fill();
    labelTex.needsUpdate = true;
  };
  setLabel(0, '#ffd84d');

  const tonearm = new THREE.Group();
  tonearm.position.set(0.66, 2.05, 0.52);
  jb.add(tonearm);
  mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 12), chrome, [0, 0, 0], tonearm).rotation.x = Math.PI / 2;
  mesh(box(0.035, 0.95, 0.035), chrome, [0, -0.45, 0], tonearm);
  mesh(box(0.1, 0.14, 0.05), std('#222'), [0, -0.95, 0], tonearm);
  tonearm.rotation.z = 0.5;

  // Rejilla con ecualizador de neón
  mesh(box(1.25, 0.55, 0.05), std('#07050f'), [0, 0.55, 0.47], jb);
  const eqBars: THREE.Mesh[] = [];
  const eqColors = ['#5df2ff', '#b46aff', '#ff3ea5'];
  for (let i = 0; i < 12; i++) {
    const geo = box(0.06, 0.4, 0.03);
    geo.translate(0, 0.2, 0);
    const b = mesh(geo, glow(eqColors[Math.floor((i / 12) * 3)], 2.0), [-0.55 + i * 0.1, 0.3, 0.5], jb);
    b.scale.y = 0.15;
    eqBars.push(b);
  }
  const gemMat = std('#000000', { emissive: '#7fe3ff', emissiveIntensity: 1.8 });
  gemMat.userData['pulse'] = 1.8;
  glowMaterials.push(gemMat);
  mesh(new THREE.OctahedronGeometry(0.13, 0), gemMat, [0, 1.0, 0.5], jb).scale.set(0.8, 1.4, 0.8);

  const gearMount = new THREE.Group();
  gearMount.position.set(1.0, 0.95, 0);
  gearMount.rotation.y = Math.PI / 2;
  jb.add(gearMount);
  const gear = new THREE.Group();
  gearMount.add(gear);
  mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.07, 20), chrome, [0, 0, 0], gear).rotation.x = Math.PI / 2;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mesh(box(0.11, 0.11, 0.07), chrome, [Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0], gear).rotation.z = a;
  }
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.09, 12), std('#14142a'), [0, 0, 0], gear).rotation.x = Math.PI / 2;
  hitbox([1.4, 3.2, 2.1], [6.4, 1.6, 3.7], 'record');

  // ---- Cartel de créditos sobre el jukebox ----
  const credits = new Panel(1024, 512, 2.4, 1.2);
  credits.mesh.position.set(7.88, 4.5, 4.0);
  credits.mesh.rotation.y = -Math.PI / 2;
  root.add(credits.mesh);
  mesh(box(0.1, 1.4, 2.6), chrome, [7.95, 4.5, 4.0], root);

  // ---- Máquina de pinball junto a la pared izquierda (el frente mira a +X) ----
  const pinball = buildPinballMachine(glow);
  pinball.group.position.set(-7.0, 0, -0.2);
  pinball.group.rotation.y = Math.PI / 2;
  pinball.group.scale.setScalar(1.25);
  root.add(pinball.group);
  clickable.push(pinball.hit);
  const pinballGroup = pinball.group;

  // ---- Ventilador de techo negro ----
  const fan = new THREE.Group();
  fan.position.set(0.6, 6.45, 1.0);
  root.add(fan);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8), std('#0a0a10'), [0.6, 6.68, 1.0], root);
  mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 16), std('#0a0a10', { metalness: 0.5 }), [0, 0, 0], fan);
  for (let i = 0; i < 5; i++) {
    const arm = new THREE.Group();
    arm.rotation.y = (i / 5) * Math.PI * 2;
    fan.add(arm);
    mesh(box(1.3, 0.025, 0.24), std('#15151c', { roughness: 0.5 }), [0.85, 0, 0], arm);
  }
  mesh(new THREE.SphereGeometry(0.09, 12, 10), glow(C.bulb, 2.4), [0, -0.12, 0], fan);

  // ---- Polvo en la luz ----
  const dustCount = 120;
  const dustPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i * 3] = -7 + Math.random() * 14;
    dustPos[i * 3 + 1] = 0.5 + Math.random() * 6;
    dustPos[i * 3 + 2] = -5 + Math.random() * 12;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: '#cfd8ff',
      size: 0.04,
      map: canvasTex(32, 32, (g) => {
        const r = g.createRadialGradient(16, 16, 0, 16, 16, 16);
        r.addColorStop(0, 'rgba(255,255,255,1)');
        r.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, 32, 32);
      }),
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  root.add(dust);

  // ---- Anfitrión (personaje original, de formas simples) ----
  const skin = std('#e2b48e', { roughness: 0.6 });
  const shirt = std('#2a2a5a', { roughness: 0.7 });
  const trousers = std('#1c1c2a', { roughness: 0.8 });
  const vestMat = std('#ff3ea5', { roughness: 0.6 });
  const bt = new THREE.Group();
  // El anfitrión espera de pie frente a la TV, viéndola
  const btPost = { x: -4.3, z: -3.0 };
  const btPostRot = Math.atan2(-1.4 - btPost.x, -5.9 - btPost.z);
  bt.position.set(btPost.x, 0, btPost.z);
  bt.rotation.y = btPostRot;
  bt.scale.setScalar(1.8);
  root.add(bt);
  addLight('#ffd9a0', 8, 5, btPost.x, 3.4, btPost.z + 1.4);

  const mkLeg = (x: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0.9, 0);
    bt.add(g);
    mesh(box(0.15, 0.85, 0.17), trousers, [0, -0.43, 0], g);
    mesh(box(0.17, 0.08, 0.27), std('#f0f0f8'), [0, -0.86, 0.04], g);
    return g;
  };
  const legL = mkLeg(-0.1);
  const legR = mkLeg(0.1);

  const body = new THREE.Group();
  bt.add(body);
  mesh(box(0.44, 0.58, 0.25), shirt, [0, 1.2, 0], body);
  mesh(box(0.46, 0.2, 0.27), vestMat, [0, 1.3, 0], body);
  mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 10), skin, [0, 1.53, 0], body);

  const head = new THREE.Group();
  head.position.set(0, 1.67, 0);
  body.add(head);
  mesh(new THREE.SphereGeometry(0.14, 20, 16), skin, [0, 0, 0], head);
  const hair = mesh(new THREE.SphereGeometry(0.15, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), std('#2a1a10', { roughness: 0.9 }), [0, 0.02, -0.01], head);
  hair.rotation.x = -0.15;
  mesh(box(0.13, 0.03, 0.03), std('#2a1a10'), [0, -0.045, 0.13], head);
  mesh(new THREE.SphereGeometry(0.014, 8, 6), std('#111'), [-0.05, 0.02, 0.13], head);
  mesh(new THREE.SphereGeometry(0.014, 8, 6), std('#111'), [0.05, 0.02, 0.13], head);
  // Audífonos gamer
  const cups = glow('#5df2ff', 2);
  mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 20, Math.PI), std('#15151c', { metalness: 0.6 }), [0, 0.01, 0], head);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 14), cups, [s * 0.155, 0.0, 0], head).rotation.z = Math.PI / 2;

  const mkArm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 1.43, 0);
    body.add(shoulder);
    mesh(box(0.1, 0.3, 0.1), shirt, [0, -0.15, 0], shoulder);
    const elbow = new THREE.Group();
    elbow.position.set(0, -0.3, 0);
    shoulder.add(elbow);
    mesh(box(0.09, 0.28, 0.09), shirt, [0, -0.14, 0], elbow);
    mesh(new THREE.SphereGeometry(0.05, 10, 8), skin, [0, -0.3, 0], elbow);
    return { shoulder, elbow };
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  // Mando en la mano izquierda
  mesh(box(0.12, 0.03, 0.07), std('#15151c'), [0, -0.34, 0.04], armL.elbow);

  // Carta de contacto (aparece al ofrecerla)
  const menuHold = new THREE.Group();
  menuHold.position.set(0.02, -0.33, 0.13);
  menuHold.rotation.set(-0.15, 0, 0);
  menuHold.visible = false;
  armR.elbow.add(menuHold);
  mesh(box(0.36, 0.48, 0.025), std('#0e0a1c', { roughness: 0.4 }), [0, 0.1, 0], menuHold);
  mesh(box(0.38, 0.5, 0.01), chrome, [0, 0.1, -0.012], menuHold);
  const menuPanel = new Panel(256, 340, 0.33, 0.44);
  menuPanel.mesh.position.set(0, 0.1, 0.015);
  menuHold.add(menuPanel.mesh);

  // Clic sobre el anfitrión = ir a Contacto
  const btHit = new THREE.Mesh(box(0.8, 1.9, 0.7), new THREE.MeshBasicMaterial({ visible: false }));
  btHit.position.set(0, 0.95, 0);
  btHit.userData['action'] = 'sign:contact';
  bt.add(btHit);
  clickable.push(btHit);

  // ---- Medallón (oculto; la textura se conserva por compatibilidad) ----
  const emblem = new Panel(256, 256, 1.3, 1.3);
  emblem.mesh.position.set(0, 5.45, -5.92);
  emblem.mesh.visible = false;
  root.add(emblem.mesh);

  drawEmblem(emblem.ctx, 256, 256, SITE_NAME);
  emblem.texture.needsUpdate = true;

  // ---- Gato siames (modelo en cat.ts): empieza sentado sobre la alfombra, lamiendose una pata ----
  const cat = buildCat();
  cat.root.position.set(-0.4, 0.012, -2.2);
  cat.root.rotation.y = 0.5;
  cat.root.scale.setScalar(CAT_SCALE);
  root.add(cat.root);

  // zona de clic del gato: sigue al gato por toda la sala
  const catHit = new THREE.Mesh(box(0.6, 0.9, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
  catHit.position.set(0, 0.4, 0);
  catHit.userData['action'] = 'cat';
  cat.root.add(catHit);
  clickable.push(catHit);

  return {
    root,
    board,
    tv,
    tvFrame,
    display,
    vitrina,
    credits,
    clickable,
    platter,
    tonearm,
    gear,
    glowMaterials,
    lights: { record: lightRecord, eva: lightEva },
    cat,
    emblem,
    vinyl,
    setLabel,
    eqBars,
    fan,
    dust,
    pinball: pinballGroup,
    arcade,
    jukebox: jb,
    pool,
    foosball: foos,
    mask: maskGroup,
    chessTable: table,
    eva,
    accent: [lightRecord, washTeal, washMagenta, washIndigo],
    tintables,
    bartender: {
      root: bt,
      body,
      head,
      legL,
      legR,
      armL,
      armR,
      menu: menuHold,
      menuPanel,
      post: { x: btPost.x, z: btPost.z, rot: btPostRot },
    },
    pbr,
  };
}
