import { isDevMode } from '@angular/core';
import * as THREE from 'three';
import { buildEvaArm, type EvaArm } from './eva-arm';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import gsap from 'gsap';
import { AboutTab, Mode, Store } from '../store';
import { Action, RoomParts, buildRoom } from './room';
import {
  Panel,
  drawBoard,
  drawCredits,
  drawVitrinaTitle,
  drawGameBoyScreen,
  drawWelcome,
} from './panels';
import { Sounds } from './sounds';
import { TAG_W, tagLocal } from './vitrina';
import { MusicPlayer } from './music';
import { TRACKS } from '../data/tracks';

interface View {
  pos: THREE.Vector3;
  target: THREE.Vector3;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

const VIEWS: Record<Mode, View> = {
  menu: { pos: V(0.6, 3.6, 12.2), target: V(0.6, 2.6, -3) },
  about: { pos: V(-2.9, 4.0, 1.0), target: V(-7.45, 3.9, -1.2) },
  projects: { pos: V(3.1, 3.25, -0.5), target: V(7.9, 3.0, -0.5) },
  music: { pos: V(3.4, 2.5, 7.4), target: V(6.6, 1.7, 3.7) },
  contact: { pos: V(0.8, 2.5, 5.6), target: V(0.4, 2.3, 1.4) },
};


const GradeShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      // contraste suave y tinte cálido en sombras
      col = mix(col, col*col*(3.0-2.0*col), 0.35);
      col *= vec3(0.98, 1.0, 1.02);
      // viñeta
      vec2 d = vUv - 0.5;
      float v = smoothstep(0.85, 0.25, length(d * vec2(1.15, 1.0)));
      col *= mix(0.62, 1.0, v);
      // grano fino
      float g = hash(vUv * 1000.0 + time) - 0.5;
      col += g * 0.025;
      gl_FragColor = vec4(col, c.a);
    }`,
};

/** Enlaces directos: #sobre-mi, #proyectos, #musica, #contacto (y sus equivalentes en inglés). */
export const MODE_HASH: Record<Mode, string> = { menu: '', about: 'sobre-mi', projects: 'proyectos', music: 'musica', contact: 'contacto' };
const HASH_MODE: Record<string, Mode> = {
  'sobre-mi': 'about', about: 'about',
  proyectos: 'projects', projects: 'projects',
  musica: 'music', music: 'music',
  contacto: 'contact', contact: 'contact',
};
const ORDER: Mode[] = ['menu', 'about', 'projects', 'music', 'contact'];
const UP = new THREE.Vector3(0, 1, 0);

/** Giro del modelo de pinball dentro de su grupo para que el frente mire a la sala. */
/** Giro del arcade dentro de su grupo para que la pantalla mire a la cámara. */
const ARCADE_YAW = 0;

/** Giro y alto de la rocola dentro de la sala. */
const JUKEBOX_YAW = 0;

/** Billar y futbolín: lado mayor que ocupan en la sala y giro dentro de su grupo. */
const POOL_FOOTPRINT = 4.3;
const POOL_YAW = 0;
const FOOSBALL_FOOTPRINT = 2.7;
const FOOSBALL_YAW = 0;

/** Figura de Evangelion Unit-01: alto en la sala y giro dentro de su grupo. */
const EVA_HEIGHT = 5.4;
/** Anfitrion (Mono): altura en su espacio local, giro para que mire a +Z y alto del Game Boy. */
/** Máscara de Majora: alto en la sala y giro para que mire a +X (hacia la sala). */
const MASK_HEIGHT = 1.9;
const MASK_YAW = Math.PI / 2;
const HOST_HEIGHT = 1.75;
const HOST_YAW = 0;
const GB_HEIGHT = 0.42;
const EVA_YAW = 1.2; // 1.57 = de frente hacia +Z; 1.2 apunta hacia la camara de la vista inicial
const JUKEBOX_HEIGHT = 3.2;
/** Alto del arcade en la sala (unidades de escena). */
const ARCADE_HEIGHT = 4.6;

const PINBALL_YAW = 0.95 + Math.PI;

/** TV CRT "Retro CRT TV With Videoplayer" (Ren Viro Store) y SNES (Maxim Fringe), ambos CC-BY 4.0, sobre el mueble bajo de la pared. */
const TV_HEIGHT = 4.0;
/** El centro de la caja del modelo queda a la izquierda del de la pantalla: se corre la TV esa fraccion de su ancho para centrarla. */
const TV_SHIFT = 0.093;
const TV_YAW = 0;
const SNES_WIDTH = 1.3;
const SNES_YAW = 0;
/** Pantalla de la TV como fraccion de la caja del modelo: centro (x, y), ancho y distancia delante de la caja. */
const TV_SCREEN = { cx: 0.355, cy: 0.31, w: 0.52, front: 0.02 };

/**
 * Núcleo de la escena: render, cámara, interacción y estado visual.
 * Patrón "Experience" inspirado en jesse-zhou.com, reescrito para Angular.
 */
/** Zonas ocupadas por los muebles, que el gato debe esquivar. */
const CAT_OBSTACLES: { x0: number; x1: number; z0: number; z1: number; h: number }[] = [
  { x0: -4.8, x1: 0.0, z0: 1.5, z1: 4.5, h: 0.95 }, // billar
  { x0: 1.7, x1: 4.7, z0: 0.3, z1: 2.5, h: 1.0 }, // futbolin
  { x0: 5.6, x1: 7.2, z0: 2.7, z1: 4.7, h: 1.7 }, // rocola
  { x0: 0.1, x1: 3.1, z0: 3.4, z1: 5.5, h: 1.0 }, // mesa y sillas
  { x0: -8.0, x1: -5.8, z0: -1.6, z1: 1.2, h: 3.0 }, // pinball
  { x0: -5.1, x1: -3.5, z0: -3.8, z1: -2.2, h: 1.8 }, // anfitrion
  { x0: 2.6, x1: 4.4, z0: -6.0, z1: -4.0, h: 2.1 }, // arcade
  { x0: 6.0, x1: 8.0, z0: -6.0, z1: -3.8, h: 5.4 }, // Evangelion
  { x0: -3.7, x1: 0.9, z0: -6.0, z1: -2.9, h: 0.6 }, // mueble de la TV
];
/** Limites del suelo transitable y separacion minima a los muebles. */
const CAT_BOUNDS = { x0: -7.2, x1: 7.4, z0: -3.9, z1: 7.2 };
const CAT_MARGIN = 0.3;
const CAT_STEP = 0.8;
const CAT_SPEED = 1.5;

const catBlocked = (x: number, z: number): boolean =>
  x < CAT_BOUNDS.x0 || x > CAT_BOUNDS.x1 || z < CAT_BOUNDS.z0 || z > CAT_BOUNDS.z1 ||
  CAT_OBSTACLES.some((o) => x > o.x0 - CAT_MARGIN && x < o.x1 + CAT_MARGIN && z > o.z0 - CAT_MARGIN && z < o.z1 + CAT_MARGIN);

/** Cuadricula de puntos libres del suelo: son los posibles destinos y los nodos para trazar el camino. */
const CAT_NODES: THREE.Vector2[] = (() => {
  const nodes: THREE.Vector2[] = [];
  for (let x = CAT_BOUNDS.x0; x <= CAT_BOUNDS.x1; x += CAT_STEP) {
    for (let z = CAT_BOUNDS.z0; z <= CAT_BOUNDS.z1; z += CAT_STEP) if (!catBlocked(x, z)) nodes.push(new THREE.Vector2(x, z));
  }
  return nodes;
})();

const catSegmentFree = (ax: number, az: number, bx: number, bz: number): boolean => {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.1));
  for (let i = 0; i <= steps; i++) {
    if (catBlocked(ax + ((bx - ax) * i) / steps, az + ((bz - az) * i) / steps)) return false;
  }
  return true;
};

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export class Experience {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly gtao: GTAOPass;
  private readonly grade: ShaderPass;
  private readonly pmrem: THREE.PMREMGenerator;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly look = new THREE.Vector3();
  private readonly basePos = new THREE.Vector3();
  private readonly orbit = { az: 0, el: 0, zoom: 1 };
  private dragging: { x: number; y: number } | null = null;
  private readonly parallax = new THREE.Vector2();
  private readonly clock = new THREE.Clock();
  private readonly sounds = new Sounds();
  private readonly music = new MusicPlayer(TRACKS);
  private changing = false;
  private arcadeMixer: THREE.AnimationMixer | null = null;
  private jukeboxGlow: Array<{ mat: THREE.MeshStandardMaterial; base: number }> = [];
  private uiTimer = 0;
  private readonly reveal = { v: 1 };
  private readonly room: RoomParts;
  private portrait: HTMLImageElement | null = null;
  private readonly spots: Partial<Record<Mode, THREE.SpotLight>> = {};
  private readonly hoverLight = new THREE.PointLight('#ffd9a0', 0, 4, 2);
  private outline!: OutlinePass;
  private outlineKey = '';
  private hovered: THREE.Object3D | null = null;
  private contactTimer = 0;
  /** Estado animado de cada botella: elevación y nivel de luz (0..1). */
  private readonly bState: Array<{ lift: number; lit: number }> = [0, 1, 2, 3, 4].map(() => ({ lift: 0, lit: 0.55 }));
  private readonly vis = { v: 0 };
  private bloomBase = 0.3;
  private tagEls: HTMLElement[] = [];

  private rafId = 0;
  private locked = false;
  private downAt: { x: number; y: number } | null = null;
  private frameMs = 16;
  private perfTimer = 0;
  private bloomEnabled = true;
  private frameNo = 0;
  private perfLevel = 0;
  private armTarget = 0.5;
  private currentMode: Mode = 'menu';
  private readonly onResize = () => this.resize();
  private readonly touches = new Map<number, { x: number; y: number }>();
  private pinchDist = 0;
  private readonly onPointerDown = (e: PointerEvent) => {
    this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.touches.size === 2) {
      // Segundo dedo: pasa de arrastre a pellizco y descarta el posible clic.
      this.pinchDist = this.touchDistance();
      this.downAt = null;
      this.dragging = null;
      return;
    }
    this.downAt = { x: e.clientX, y: e.clientY };
    this.dragging = { x: e.clientX, y: e.clientY };
  };
  private touchDistance(): number {
    const [a, b] = [...this.touches.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  private readonly onWheel = (e: WheelEvent) => {
    if (!this.store.started()) return;
    e.preventDefault();
    if (this.store.lightbox()) return;
    // Con el zoom ya al maximo, seguir girando la rueda hacia atras vuelve a toda la sala.
    if (e.deltaY > 0 && this.orbit.zoom >= 1.24 && (this.currentMode !== 'menu' || this.store.focused())) {
      this.wheelBack += e.deltaY;
      if (this.wheelBack > 240) {
        this.wheelBack = 0;
        this.back();
      }
      return;
    }
    this.wheelBack = 0;
    this.orbit.zoom = THREE.MathUtils.clamp(this.orbit.zoom * (1 + e.deltaY * 0.0009), 0.3, 1.25);
  };
  private wheelBack = 0;
  private readonly onDblClick = (e: MouseEvent) => this.focusAt(e as PointerEvent);
  private readonly onKey = (e: KeyboardEvent) => this.handleKey(e);
  private readonly onPointerUp = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    this.dragging = null;
    this.handleUp(e);
  };
  private readonly onPointerCancel = (e: PointerEvent) => {
    this.touches.delete(e.pointerId);
    this.dragging = null;
    this.downAt = null;
  };
  private readonly onPointerMove = (e: PointerEvent) => this.handleMove(e);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly store: Store,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // el compositor dibuja en targets propios: el MSAA del canvas no aporta nada
      powerPreference: 'high-performance',
    });
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; // se refresca a mitad de cadencia en el bucle

    this.scene.background = new THREE.Color('#0a0720');
    this.scene.fog = new THREE.Fog('#0a0720', 22, 44);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = this.pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.35;

    this.room = buildRoom();
    this.scene.add(this.room.root);
    this.setupShadows();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gtao = new GTAOPass(this.scene, this.camera, 256, 256);
    this.gtao.output = GTAOPass.OUTPUT.Default;
    this.gtao.blendIntensity = 0.9;
    this.gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 12 });
    this.composer.addPass(this.gtao);
    if (coarse) this.gtao.enabled = false; // en táctil se parte de calidad reducida
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    // Contorno luminoso del objeto señalado (sustituye a la luz general del hover)
    this.outline = new OutlinePass(new THREE.Vector2(256, 256), this.scene, this.camera);
    this.outline.edgeStrength = 5;
    this.outline.edgeGlow = 0.9;
    this.outline.edgeThickness = 2.2;
    this.outline.pulsePeriod = 2.4;
    this.outline.visibleEdgeColor.set('#5df2ff');
    this.outline.hiddenEdgeColor.set('#ff3ea5');
    this.outline.enabled = false;
    this.composer.addPass(this.outline);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    const v = VIEWS.menu;
    const dbg = isDevMode() ? new URLSearchParams(location.search).get('cam')?.split(',').map(Number) : null;
    if (dbg && dbg.length === 6 && dbg.every((n) => Number.isFinite(n))) {
      v.pos.set(dbg[0], dbg[1], dbg[2]);
      v.target.set(dbg[3], dbg[4], dbg[5]);
    }
    this.basePos.copy(this.fitPosition(v));
    this.camera.position.copy(this.basePos);
    this.look.copy(v.target);

    // Las animaciones duran lo mismo en tiempo real aunque bajen los FPS.
    gsap.ticker.lagSmoothing(0);
    this.music.onEnded = () => void this.next();
    this.music.setVolume(this.store.volume(), this.store.muted());
    this.setupSpotlights();
    this.scene.add(this.hoverLight);
    window.addEventListener('resize', this.onResize);
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('dblclick', this.onDblClick);
    window.addEventListener('keydown', this.onKey);

    this.resize();
    void this.loadAssets();
  }

  // ---------- Carga ----------

  private async loadAssets(): Promise<void> {
    const started = performance.now();
    const steps: Array<() => Promise<unknown>> = [
      () => this.loadPbr(),
      () => this.loadHdr(),
      () => this.loadPinball(),
      () => this.loadArcade(),
      () => this.loadJukebox(),
      () => this.loadTv(),
      () => this.loadProp('models/pool/pool.glb', this.room.pool, POOL_FOOTPRINT, POOL_YAW, true),
      () => this.loadProp('models/majora/scene.gltf', this.room.mask, MASK_HEIGHT, MASK_YAW, false, true),
      () => this.loadProp('models/foosball/foosball.glb', this.room.foosball, FOOSBALL_FOOTPRINT, FOOSBALL_YAW),
      () => this.loadHost(),
      () => this.loadProp('models/evangelion/scene.gltf', this.room.eva, EVA_HEIGHT, EVA_YAW, false, true),
      () =>
        Promise.all([
          document.fonts.load('400 40px "Press Start 2P"'),
          document.fonts.load('400 40px "Pacifico"'),
          document.fonts.load('700 40px "Orbitron"'),
          document.fonts.load('500 24px "Instrument Sans"'),
          document.fonts.load('700 24px "Instrument Sans"'),
        ]),
      () =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            this.portrait = img;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = 'img/portrait.jpg';
        }),
    ];
    for (let i = 0; i < steps.length; i++) {
      try {
        await steps[i]();
      } catch {
        /* una fuente que falla no debe bloquear la escena */
      }
      this.store.progress.set(Math.round(((i + 1) / steps.length) * 100));
    }
    const wait = Math.max(0, 900 - (performance.now() - started));
    await new Promise((r) => setTimeout(r, wait));
    this.sync();
    this.start();
    this.store.ready.set(true);
  }

  /**
   * Pinball "2000 Pinball" de Brian Trepanier (CC-BY 4.0). Reemplaza la máquina procedural,
   * que se queda como respaldo si el modelo no carga. La zona clicable se conserva.
   */
  /** Rocola "Junkebox (rocola)" de ImpTsuki (CC-BY 4.0). Su zona clicable y la música se conservan. */
  private async loadJukebox(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('models/jukebox/jukebox.glb');
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const group = this.room.jukebox;
    const s = JUKEBOX_HEIGHT / (size.y * group.scale.y);
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    holder.rotation.y = JUKEBOX_YAW;
    group.clear();
    group.add(holder);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.emissiveMap) this.jukeboxGlow.push({ mat, base: mat.emissiveIntensity });
    });
  }

  /** Pone la TV CRT y el SNES sobre el mueble y el panel de "Sobre mí" en la pantalla de la TV. Si falla, queda la TV plana. */
  private async loadTv(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const [crt, snes] = await Promise.all([loader.loadAsync('models/crt/crt.glb'), loader.loadAsync('models/snes/snes.glb')]);
    const tvGroup = this.room.tv;

    const tv = crt.scene;
    const drop: THREE.Object3D[] = [];
    tv.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && /^(Videoplayer|Videotape)/.test(m.name)) drop.push(o);
    });
    drop.forEach((o) => o.parent?.remove(o));
    const box = new THREE.Box3().setFromObject(tv);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = TV_HEIGHT / size.y;
    tv.scale.setScalar(k);
    tv.position.set(-center.x * k, -box.min.y * k, -center.z * k);
    const shift = TV_SHIFT * size.x * k;
    tvGroup.position.x += shift;
    const holder = new THREE.Group();
    holder.add(tv);
    holder.rotation.y = TV_YAW;
    tvGroup.add(holder);

    const sb = new THREE.Box3().setFromObject(snes.scene);
    const ss = sb.getSize(new THREE.Vector3());
    const sc = sb.getCenter(new THREE.Vector3());
    const ks = SNES_WIDTH / ss.x;
    snes.scene.scale.setScalar(ks);
    snes.scene.position.set(-sc.x * ks, -sb.min.y * ks, -sc.z * ks);
    const sHolder = new THREE.Group();
    sHolder.add(snes.scene);
    sHolder.position.set(0.1 - shift, 0, 1.55);
    sHolder.rotation.y = SNES_YAW;
    tvGroup.add(sHolder);
    [tv, snes.scene].forEach((root) =>
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }),
    );

    this.paintTvScreen(tv);

    // Panel sobre la pantalla (en el espacio de la sala)
    const board = this.room.board.mesh;
    const w = size.x * k * TV_SCREEN.w;
    this.boardBase = w / 3.3;
    board.scale.set(this.boardBase, this.boardBase, 1);
    board.position.set(tvGroup.position.x + (TV_SCREEN.cx - 0.5) * size.x * k, tvGroup.position.y + TV_SCREEN.cy * TV_HEIGHT, tvGroup.position.z + (size.z * k) / 2 + TV_SCREEN.front);
    this.room.tvFrame.visible = false;
  }

  /**
   * Sustituye un mueble procedural por un modelo descargado: lo centra, lo apoya en el suelo y lo escala
   * para que su lado mayor mida `footprint` (o su alto, con `byHeight`). Con `alignLong` gira el modelo para que ese lado quede en X.
   */
  private async loadProp(url: string, group: THREE.Group, footprint: number, yaw: number, alignLong = false, byHeight = false): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    if (url.includes('evangelion')) this.evaArm = buildEvaArm(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const s = footprint / ((byHeight ? size.y : Math.max(size.x, size.z)) * group.scale.x);
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    holder.rotation.y = yaw + (alignLong && size.z > size.x ? Math.PI / 2 : 0);
    group.clear();
    group.add(holder);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }

  /** Huesos de Mono (anfitrion) con su rotacion de reposo; null mientras no cargue el modelo. */
  private host: { bones: Record<string, THREE.Bone | undefined>; rest: Map<THREE.Bone, THREE.Quaternion>; model: THREE.Object3D; baseY: number } | null = null;

  /**
   * Anfitrion: "Little Nightmares - Mono" de HiGuys920 (CC-BY 4.0) con el Game Boy de rave-games (CC-BY 4.0).
   * Reemplaza al personaje de cubos; el Game Boy lleva los datos de contacto en su pantalla.
   */
  private async loadHost(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const mono = await loader.loadAsync('models/mono/mono.glb');
    const b = this.room.bartender;

    // Mono: altura fija en el espacio local del anfitrion
    const model = mono.scene;
    const box = new THREE.Box3().setFromObject(model);
    const s = HOST_HEIGHT / (box.max.y - box.min.y);
    model.scale.setScalar(s);
    model.position.y = -box.min.y * s;
    model.rotation.y = HOST_YAW;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });
    const bones: Record<string, THREE.Bone | undefined> = {};
    const rest = new Map<THREE.Bone, THREE.Quaternion>();
    model.traverse((o) => {
      const bone = o as THREE.Bone;
      if (!bone.isBone) return;
      rest.set(bone, bone.quaternion.clone());
      const n = bone.name;
      if (/^Left[ _]leg_/.test(n)) bones['legL'] = bone;
      else if (/^Right[ _]leg_/.test(n)) bones['legR'] = bone;
      else if (/^Left[ _]arm_/.test(n)) bones['armL'] = bone;
      else if (/^Right[ _]arm_/.test(n)) bones['armR'] = bone;
      else if (/^Left[ _]elbow_/.test(n)) bones['elbowL'] = bone;
      else if (/^Right[ _]elbow_/.test(n)) bones['elbowR'] = bone;
      else if (/^Left[ _]knee_/.test(n)) bones['kneeL'] = bone;
      else if (/^Right[ _]knee_/.test(n)) bones['kneeR'] = bone;
      else if (/^Spine_/.test(n)) bones['spine'] = bone;
      else if (/^Chest_/.test(n)) bones['chest'] = bone;
      else if (/^Neck_/.test(n)) bones['neck'] = bone;
      else if (/^Head_\d+$/.test(n) || /^Head_0\d+$/.test(n)) bones['head'] ??= bone;
    });
    if (isDevMode()) console.info('[host] altura cruda', box.max.y - box.min.y, 'huesos', Object.keys(bones));

    // Se ocultan los cubos del personaje anterior; la zona de clic y el brillo se conservan
    b.legL.visible = false;
    b.legR.visible = false;
    b.body.visible = false;
    b.root.add(model);

    // El Game Boy ya no se carga (el contacto se muestra en la tarjeta); la mano de cubos se oculta junto con el cuerpo
    b.menu.visible = false;
    this.host = { bones, rest, model, baseY: model.position.y };
    this.sync();
  }

  private boardBase = 0;

  /**
   * La pantalla de la TV es un rectangulo de la textura del modelo (estatica de TV). Se copia esa textura y se pinta ahi una carta de
   * ajuste de barras de color, asi la imagen es parte del cristal (con su curvatura y su brillo) y no un panel pegado delante.
   */
  private paintTvScreen(tv: THREE.Object3D): void {
    tv.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !mat || mat.name !== 'material' || !mat.emissiveMap) return;
      const src = mat.emissiveMap.image as CanvasImageSource & { width: number; height: number };
      const size = src.width;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(src, 0, 0, size, size);
      // Rectangulo de la pantalla dentro de la textura de 2048 px
      const r = { x: 1034 / 2048, y: 1251 / 2048, w: (2003 - 1034) / 2048, h: (1993 - 1251) / 2048 };
      const x0 = r.x * size;
      const y0 = r.y * size;
      const w = r.w * size;
      const h = r.h * size;
      // La textura del modelo tiene la pantalla invertida en vertical: se pinta con el eje Y volteado dentro del rectangulo
      ctx.save();
      ctx.translate(0, 2 * y0 + h);
      ctx.scale(1, -1);
      const top = ['#b4b4b4', '#b4b414', '#14b4b4', '#14b414', '#b414b4', '#b41414', '#1414b4'];
      const mid = ['#1414b4', '#0c0c0c', '#b414b4', '#0c0c0c', '#14b4b4', '#0c0c0c', '#b4b4b4'];
      const bw = w / 7;
      top.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(x0 + i * bw, y0, bw + 1, h * 0.68);
      });
      mid.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(x0 + i * bw, y0 + h * 0.68, bw + 1, h * 0.1);
      });
      ['#0a1a3c', '#d8d8d8', '#2a0a58', '#0c0c0c', '#161616'].forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(x0 + (i * w) / 5, y0 + h * 0.78, w / 5 + 1, h * 0.22);
      });
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let y = y0; y < y0 + h; y += 8) ctx.fillRect(x0, y, w, 3);
      ctx.restore();
      const tex = new THREE.CanvasTexture(canvas);
      tex.flipY = false;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      tex.wrapS = mat.emissiveMap.wrapS;
      tex.wrapT = mat.emissiveMap.wrapT;
      mat.emissiveMap = tex;
      mat.map = tex;
      mat.emissiveIntensity = 0.8;
      mat.needsUpdate = true;
    });
  }
  private evaBusy = false;
  private evaArm: EvaArm | null = null;

  /**
   * Animacion de la figura de Evangelion al hacer clic. El modelo solo tiene 3 huesos (sin brazos ni
   * piernas articulados), asi que se anima el cuerpo entero: agacharse, saltar girando y caer con destello.
   */
  private evaRoar(): void {
    if (this.evaBusy) return;
    this.evaBusy = true;
    const g = this.room.eva;
    const light = this.room.lights.eva;
    const reduce = this.store.reducedMotion();
    this.sounds.roar();
    if (reduce) {
      gsap.fromTo(light, { intensity: 40 }, { intensity: 0, duration: 1.2, onComplete: () => { this.evaBusy = false; } });
      return;
    }
    const arm = this.evaArm;
    if (arm) {
      // saludo: el brazo sube, el antebrazo se agita, la cabeza sigue el movimiento y el cuerpo se balancea
      const pose = { shoulder: 0, elbow: 0, yaw: 0, nod: 0, lean: 0, sway: 0 };
      const nodAxis = arm.lateral;
      const up = new THREE.Vector3(0, 1, 0);
      const qa = new THREE.Quaternion();
      const gy0 = g.rotation.y;
      const apply = () => {
        arm.shoulder.quaternion.setFromAxisAngle(arm.axis, pose.shoulder);
        arm.elbow.quaternion.setFromAxisAngle(arm.axis, pose.elbow);
        if (arm.head) {
          arm.head.quaternion.setFromAxisAngle(up, pose.yaw).multiply(qa.setFromAxisAngle(nodAxis, pose.nod));
        }
        g.rotation.z = pose.lean;
        g.rotation.y = gy0 + pose.sway;
      };
      const tl = gsap
        .timeline({ onUpdate: apply, onComplete: () => { Object.assign(pose, { shoulder: 0, elbow: 0, yaw: 0, nod: 0, lean: 0, sway: 0 }); apply(); this.evaBusy = false; } })
        .to(pose, { nod: -0.25, duration: 0.25, ease: 'power2.out' })
        .to(pose, { shoulder: 1.6, elbow: 1.0, nod: 0.12, yaw: -0.35, lean: 0.05, sway: 0.12, duration: 0.7, ease: 'power2.out' }, '>-0.05')
        .fromTo(light, { intensity: 40 }, { intensity: 0, duration: 3.4, ease: 'power2.out' }, '<')
        .to(pose, { elbow: 1.45, duration: 0.2, ease: 'sine.inOut' })
        .to(pose, { elbow: 0.55, duration: 0.3, ease: 'sine.inOut', repeat: 5, yoyo: true })
        .to(pose, { elbow: 1.0, duration: 0.2, ease: 'sine.inOut' });
      // mientras saluda: la cabeza mira de lado a lado y el cuerpo se mece
      tl.to(pose, { yaw: 0.35, lean: -0.04, sway: -0.1, duration: 0.5, ease: 'sine.inOut' }, 0.9)
        .to(pose, { yaw: -0.3, lean: 0.04, sway: 0.1, duration: 0.5, ease: 'sine.inOut' }, 1.4)
        .to(pose, { yaw: 0.25, lean: -0.03, sway: -0.06, duration: 0.5, ease: 'sine.inOut' }, 1.9);
      tl.to(pose, { elbow: 0, duration: 0.3, ease: 'sine.inOut' }, '>')
        .to(pose, { shoulder: 0, yaw: 0, lean: 0, sway: 0, nod: -0.2, duration: 0.6, ease: 'power2.inOut' })
        .to(pose, { nod: 0, duration: 0.3, ease: 'sine.out' });
      return;
    }
    const y0 = g.rotation.y;
    gsap
      .timeline({ onComplete: () => { g.rotation.y = y0; this.evaBusy = false; } })
      .to(g.scale, { x: 1.06, y: 0.9, z: 1.06, duration: 0.2, ease: 'power2.out' })
      .to(g.scale, { x: 0.96, y: 1.08, z: 0.96, duration: 0.15, ease: 'power2.out' })
      .to(g.position, { y: 1.1, duration: 0.45, ease: 'power2.out' }, '<')
      .to(g.rotation, { y: y0 + Math.PI * 2, duration: 0.95, ease: 'power2.inOut' }, '<')
      .to(g.position, { y: 0, duration: 0.4, ease: 'bounce.out' }, '>-0.05')
      .to(g.scale, { x: 1, y: 1, z: 1, duration: 0.3, ease: 'back.out(3)' }, '<')
      .fromTo(light, { intensity: 70 }, { intensity: 0, duration: 1.4, ease: 'power2.out' }, '<');
  }

  private catPath: THREE.Vector2[] = [];
  private catStride = 0;
  private catSpeed = 0;
  private catBusy = false;
  private catWalkTime = 0;
  private catAdj: number[][] | null = null;
  private catRecent: THREE.Vector2[] = [];

  /** Vecinos de cada nodo de la cuadricula (8 direcciones) con el segmento libre. */
  private catNeighbours(): number[][] {
    if (this.catAdj) return this.catAdj;
    this.catAdj = CAT_NODES.map((a, i) => {
      const out: number[] = [];
      CAT_NODES.forEach((b, j) => {
        if (i !== j && a.distanceTo(b) < CAT_STEP * 1.5 && catSegmentFree(a.x, a.y, b.x, b.y)) out.push(j);
      });
      return out;
    });
    return this.catAdj;
  }

  private nearestCatNode(x: number, z: number): number {
    let best = 0;
    let bd = Infinity;
    CAT_NODES.forEach((n, i) => {
      const d = Math.hypot(n.x - x, n.y - z);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  /** Camino mas corto sobre la cuadricula (Dijkstra) y luego se quitan los giros innecesarios. */
  private catRoute(from: THREE.Vector3, to: THREE.Vector2): THREE.Vector2[] {
    const adj = this.catNeighbours();
    const n = CAT_NODES.length;
    const start = this.nearestCatNode(from.x, from.z);
    const goal = this.nearestCatNode(to.x, to.y);
    const dist = new Array<number>(n).fill(Infinity);
    const prev = new Array<number>(n).fill(-1);
    const done = new Array<boolean>(n).fill(false);
    dist[start] = 0;
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
      if (u < 0 || dist[u] === Infinity || u === goal) break;
      done[u] = true;
      for (const v of adj[u]) {
        const d = dist[u] + CAT_NODES[u].distanceTo(CAT_NODES[v]);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      }
    }
    const pts: THREE.Vector2[] = [new THREE.Vector2(from.x, from.z)];
    const chain: number[] = [];
    for (let c = goal; c >= 0; c = prev[c]) chain.unshift(c);
    if (chain[0] === start) chain.forEach((i) => pts.push(CAT_NODES[i].clone()));
    else pts.push(to.clone());
    // se queda con los puntos que de verdad hacen falta: desde cada punto va al mas lejano que ve en linea recta
    const out: THREE.Vector2[] = [];
    let i = 0;
    while (i < pts.length - 1) {
      let j = pts.length - 1;
      while (j > i + 1 && !catSegmentFree(pts[i].x, pts[i].y, pts[j].x, pts[j].y)) j--;
      out.push(pts[j]);
      i = j;
    }
    return out;
  }

  private readonly catRay = new THREE.Ray();
  private readonly catHit = new THREE.Vector3();
  private catOccluders: THREE.Box3[] | null = null;

  /** Cajas reales (ya con los modelos cargados) de los muebles que pueden tapar al gato. Se calculan una vez. */
  private occluders(): THREE.Box3[] {
    if (this.catOccluders) return this.catOccluders;
    const r = this.room;
    const fit = (g: THREE.Object3D, maxY?: number) => {
      g.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(g).expandByScalar(0.05);
      // la caja de un grupo incluye zonas de clic invisibles: se recorta a la altura real del mueble
      if (maxY !== undefined) b.max.y = Math.min(b.max.y, maxY);
      return b;
    };
    const fixed = (o: (typeof CAT_OBSTACLES)[number]) => new THREE.Box3(new THREE.Vector3(o.x0, 0, o.z0), new THREE.Vector3(o.x1, o.h, o.z1));
    // pinball (su grupo trae zonas de clic enormes) y anfitrion no tienen una caja fiable: se usan sus zonas fijas
    const boxes = [fit(r.pool, 1.2), fit(r.foosball, 1.15), fit(r.arcade), fit(r.jukebox), fit(r.eva), fixed(CAT_OBSTACLES[4]), fixed(CAT_OBSTACLES[5])];
    this.catOccluders = boxes;
    return boxes;
  }

  /** El punto sirve si el gato se veria desde la camara actual: dentro de pantalla y sin un mueble delante. */
  private catSpotVisible(x: number, z: number): boolean {
    const cam = this.camera.position;
    const boxes = this.occluders();
    const v = new THREE.Vector3();
    // el centro a dos alturas y las cuatro esquinas del cuerpo del gato
    const samples: [number, number, number][] = [
      [0, 0.15, 0], [0, 0.55, 0], [0.22, 0.3, 0.22], [-0.22, 0.3, 0.22], [0.22, 0.3, -0.22], [-0.22, 0.3, -0.22],
    ];
    for (const [ox, y, oz] of samples) {
      v.set(x + ox, y, z + oz);
      const ndc = v.clone().project(this.camera);
      // margen para no quedar bajo los botones de abajo ni pegado a los bordes
      if (ndc.z > 1 || Math.abs(ndc.x) > 0.88 || ndc.y < -0.76 || ndc.y > 0.85) return false;
      const dir = v.clone().sub(cam);
      const dist = dir.length();
      this.catRay.set(cam, dir.normalize());
      for (const box of boxes) {
        const hit = this.catRay.intersectBox(box, this.catHit);
        if (hit && hit.distanceTo(cam) < dist - 0.05) return false;
      }
    }
    return true;
  }

  /** Comprueba que el gato se vea durante todo el recorrido (se muestrea cada ~0.7 unidades). */
  private catPathVisible(from: THREE.Vector3, route: THREE.Vector2[]): boolean {
    let ax = from.x;
    let az = from.z;
    for (const p of route) {
      const n = Math.max(1, Math.ceil(Math.hypot(p.x - ax, p.y - az) / 0.7));
      for (let i = 1; i <= n; i++) {
        if (!this.catSpotVisible(ax + ((p.x - ax) * i) / n, az + ((p.y - az) * i) / n)) return false;
      }
      ax = p.x;
      az = p.y;
    }
    return true;
  }

  private catVisits = new Map<number, number>();

  /** Destinos posibles (visibles desde la camara, lejos del gato), los menos visitados primero y con desempate al azar. */
  private catCandidates(useRecent: boolean): number[] {
    const here = this.room.cat.root.position;
    const list: { i: number; visits: number; r: number }[] = [];
    CAT_NODES.forEach((n, i) => {
      if (Math.hypot(n.x - here.x, n.y - here.z) < 1.6) return;
      if (useRecent && this.catRecent.some((rc) => rc.distanceTo(n) < 1.8)) return;
      if (!this.catSpotVisible(n.x, n.y)) return;
      list.push({ i, visits: this.catVisits.get(i) ?? 0, r: Math.random() });
    });
    list.sort((a, b) => a.visits - b.visits || a.r - b.r);
    return list.map((c) => c.i);
  }

  /** Clic en el gato: se levanta, camina hasta otro punto visible de la sala y se vuelve a sentar. */
  private catWalkToNewSpot(): void {
    const cat = this.room.cat;
    if (this.catBusy) return;
    this.sounds.meow();
    // elige el destino visible menos visitado; primero con el recorrido tambien visible y, si no hay, se va relajando
    let to: THREE.Vector2 | null = null;
    let toIndex = -1;
    let path: THREE.Vector2[] = [];
    const rules = [
      { recent: true, wholePath: true },
      { recent: false, wholePath: true },
      { recent: false, wholePath: false },
    ];
    for (const rule of rules) {
      for (const i of this.catCandidates(rule.recent).slice(0, 25)) {
        const route = this.catRoute(cat.root.position, CAT_NODES[i]);
        if (rule.wholePath && !this.catPathVisible(cat.root.position, route)) continue;
        to = CAT_NODES[i];
        toIndex = i;
        path = route;
        break;
      }
      if (to) break;
    }
    if (!to) {
      // ningun punto visible desde esta camara: un saltito para avisar que no se puede ir a ningun lado
      gsap.fromTo(cat.sit.position, { y: 0 }, { y: 0.12, duration: 0.15, yoyo: true, repeat: 1, ease: 'power2.out' });
      return;
    }
    this.catRecent.push(to);
    this.catVisits.set(toIndex, (this.catVisits.get(toIndex) ?? 0) + 1);
    if (this.catRecent.length > 4) this.catRecent.shift();
    if (this.store.reducedMotion()) {
      cat.root.position.set(to.x, cat.root.position.y, to.y);
      cat.root.rotation.y = Math.atan2(this.camera.position.x - to.x, this.camera.position.z - to.y);
      return;
    }
    this.catPath = path;
    this.catBusy = true;
    this.catStride = 0;
    this.catSpeed = 0;
    this.catWalkTime = 0;
    // se pone de pie con un pequeno estiron
    cat.sit.visible = false;
    cat.walk.visible = true;
    gsap.fromTo(cat.walk.scale, { y: 0.8 }, { y: 1, duration: 0.35, ease: 'back.out(2.5)' });
  }

  private updateCat(dt: number): void {
    const cat = this.room.cat;
    if (!this.catPath.length) return;
    // seguro por si algo lo atasca: pasados 25 s se coloca en el destino y se sienta
    this.catWalkTime += dt;
    if (this.catWalkTime > 25) {
      const end = this.catPath[this.catPath.length - 1];
      cat.root.position.set(end.x, cat.root.position.y, end.y);
      this.catPath = [];
      this.catSitDown();
      return;
    }
    const target = this.catPath[0];
    const last = this.catPath.length === 1;
    const pos = cat.root.position;
    const dx = target.x - pos.x;
    const dz = target.y - pos.z;
    const dist = Math.hypot(dx, dz);
    // gira suave hacia donde va (el modelo mira hacia +Z)
    const diff = wrapAngle(Math.atan2(dx, dz) - cat.root.rotation.y);
    cat.root.rotation.y += diff * Math.min(1, dt * 7);
    // acelera y frena; casi se detiene si tiene que dar un giro grande y baja la velocidad al llegar
    const facing = Math.max(0, Math.cos(diff));
    let want = CAT_SPEED * (0.12 + 0.88 * facing * facing);
    if (last) want = Math.min(want, 0.3 + dist * 1.6);
    this.catSpeed += (want - this.catSpeed) * Math.min(1, dt * 6);
    const step = Math.min(dist, this.catSpeed * dt);
    if (dist > 0) { pos.x += (dx / dist) * step; pos.z += (dz / dist) * step; }
    // marcha: las patas avanzan con la distancia recorrida y, si gira casi en el sitio, dan pasitos
    this.catStride += step * 8.5 + (Math.abs(diff) > 0.4 ? dt * 3.5 : 0);
    const s = this.catStride;
    const k = Math.min(1, this.catSpeed / CAT_SPEED);
    const swing = 0.3 + 0.4 * k;
    cat.legs.forEach((leg, i) => {
      const phase = i === 0 || i === 3 ? s : s + Math.PI;
      leg.rotation.x = Math.sin(phase) * swing;
      leg.position.y = 0.22 + Math.max(0, -Math.cos(phase)) * 0.02 * (0.5 + k);
    });
    cat.walk.position.y = Math.abs(Math.sin(s)) * 0.012 * (0.4 + k);
    cat.walk.rotation.z = Math.sin(s) * 0.035 * (0.4 + k);
    cat.walk.rotation.x = Math.sin(s * 2) * 0.02 * (0.4 + k);
    cat.walkHead.rotation.x = 0.06 - Math.sin(s * 2) * 0.04;
    cat.walkHead.rotation.y = Math.sin(s) * 0.06;
    cat.tail.rotation.z = Math.sin(s * 0.5) * 0.4;
    cat.tail.rotation.x = Math.sin(s * 0.8) * 0.12;
    if (dist < (last ? 0.06 : 0.18)) {
      this.catPath.shift();
      if (!this.catPath.length) this.catSitDown();
    }
  }

  /** Llego: se agacha, se sienta mirando hacia la camara (con algo de variacion) y vuelve a lamerse la pata. */
  private catSitDown(): void {
    const cat = this.room.cat;
    const pos = cat.root.position;
    const toCam = Math.atan2(this.camera.position.x - pos.x, this.camera.position.z - pos.z) + (Math.random() - 0.5) * 0.9;
    const turn = wrapAngle(toCam - cat.root.rotation.y);
    gsap
      .timeline({ onComplete: () => { this.catBusy = false; } })
      .to(cat.root.rotation, { y: cat.root.rotation.y + turn, duration: 0.5, ease: 'power2.inOut' })
      .to(cat.walk.scale, { y: 0.8, duration: 0.15, ease: 'power2.in' }, '>-0.1')
      .add(() => {
        cat.walk.visible = false;
        cat.walk.scale.y = 1;
        cat.walk.position.y = 0;
        cat.walk.rotation.set(0, 0, 0);
        cat.legs.forEach((leg) => { leg.rotation.x = 0; leg.position.y = 0.22; });
        cat.sit.visible = true;
      })
      .fromTo(cat.sit.scale, { y: 0.88 }, { y: 1, duration: 0.35, ease: 'back.out(2.5)' });
  }

  private async loadArcade(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('models/arcade/arcade.glb');
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const group = this.room.arcade;
    const s = ARCADE_HEIGHT / (size.y * group.scale.y);
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    holder.rotation.y = ARCADE_YAW;
    group.clear();
    group.add(holder);
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    if (gltf.animations.length) {
      this.arcadeMixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) this.arcadeMixer.clipAction(clip).play();
    }
  }

  private async loadPinball(): Promise<void> {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync('models/pinball/pinball.glb');
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const group = this.room.pinball;
    const worldHeight = 4.2;
    const s = worldHeight / (size.y * group.scale.y);
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -box.min.y * s, -center.z * s);
    const holder = new THREE.Group();
    holder.add(model);
    holder.rotation.y = PINBALL_YAW;
    for (const child of [...group.children]) {
      if (child.userData['action'] !== 'pinball') group.remove(child);
    }
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) mesh.castShadow = true;
    });
    group.add(holder);
    // Con el giro y el tamaño el modelo puede atravesar la pared izquierda (x = -8) o la del fondo (z = -6):
    // se mide su caja ya colocada y se empuja hacia dentro de la sala.
    group.updateWorldMatrix(true, true);
    const placed = new THREE.Box3().setFromObject(holder);
    const wallGap = 0.4;
    if (placed.min.x < -8 + wallGap) group.position.x += -8 + wallGap - placed.min.x;
    if (placed.min.z < -6 + wallGap) group.position.z += -6 + wallGap - placed.min.z;
  }

  /** Texturas PBR (Poly Haven, CC0): piso, madera, cuero y mármol. */
  private async loadPbr(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const tex = (url: string | null, srgb: boolean, rep: [number, number]) =>
      url
        ? loader
            .loadAsync(url)
            .then((t) => {
              t.wrapS = t.wrapT = THREE.RepeatWrapping;
              t.repeat.set(rep[0], rep[1]);
              t.anisotropy = 8;
              if (srgb) t.colorSpace = THREE.SRGBColorSpace;
              return t;
            })
            .catch(() => null)
        : Promise.resolve(null);

    const sets = {
      floor: { diff: 'tex/floor_diff.webp', nor: 'tex/floor_nor.webp', rough: 'tex/floor_rough.webp', rep: [7, 6] as [number, number] },
      wood: { diff: 'tex/wood_diff.webp', nor: 'tex/wood_nor.webp', rough: null, rep: [1, 1] as [number, number] },
    };
    for (const role of Object.keys(sets) as Array<keyof typeof sets>) {
      const s = sets[role];
      const [diff, nor, rough] = await Promise.all([
        tex(s.diff, true, s.rep),
        tex(s.nor, false, s.rep),
        tex(s.rough, false, s.rep),
      ]);
      for (const m of this.room.pbr[role]) {
        if (diff) {
          m.map = diff;
          m.color.set((m.userData['tint'] as string | undefined) ?? '#ffffff').multiplyScalar((m.userData['gain'] as number | undefined) ?? 1);
        }
        if (nor) {
          m.normalMap = nor;
          m.normalScale.set(0.8, 0.8);
        }
        if (rough) {
          m.roughnessMap = rough;
          m.roughness = 1;
        }
        m.needsUpdate = true;
      }
    }
  }


  /** Mapa de entorno HDRI para reflejos creíbles en latón, mármol y vidrio. */
  private async loadHdr(): Promise<void> {
    try {
      const hdr = await new RGBELoader().loadAsync('hdri/interior.hdr');
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const env = this.pmrem.fromEquirectangular(hdr).texture;
      this.scene.environment = env;
      this.scene.environmentIntensity = 0.26;
      hdr.dispose();
    } catch {
      /* se queda el entorno por defecto */
    }
  }

  /** Dos focos con sombra desde el techo; todos los objetos proyectan y reciben. */
  private setupShadows(): void {
    const spot = (x: number, z: number, tx: number, tz: number) => {
      const l = new THREE.SpotLight('#ffd7a0', 38, 0, Math.PI / 2.6, 0.7, 1.4);
      l.position.set(x, 6.5, z);
      l.target.position.set(tx, 0, tz);
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0004;
      l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 1;
      l.shadow.camera.far = 14;
      this.room.root.add(l, l.target);
    };
    spot(-1, 2.5, -1, 0);
    spot(4.5, 0.5, 4.8, -0.5);
    this.room.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mat = m.material as THREE.Material;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }

  /** Focos de sección: iluminan suavemente el cartel o el cuadro al abrir About / Projects. */
  private setupSpotlights(): void {
    const mk = (mode: Mode, from: THREE.Vector3, to: THREE.Vector3) => {
      const l = new THREE.SpotLight('#fff0d2', 0, 14, 0.42, 0.85, 1.6);
      l.position.copy(from);
      l.target.position.copy(to);
      this.scene.add(l, l.target);
      this.spots[mode] = l;
    };
    mk('about', V(-1.4, 6.0, -1.8), V(-1.4, 1.9, -5.4));
    mk('projects', V(4.8, 5.4, -0.5), V(7.94, 3.2, -0.5));
  }

  private updateBottles(): void {
    const k = 0.35 + 0.65 * this.vis.v;
    this.room.vitrina.bottles.forEach((b, i) => {
      const st = this.bState[i];
      if (!st) return;
      b.group.position.y = b.baseY + st.lift * 0.055;
      b.spot.intensity = 5.2 * st.lit * k;
    });
  }

  private updateSpotlights(mode: Mode): void {
    const peaks: Partial<Record<Mode, number>> = { about: 70, projects: 8 };
    for (const key of Object.keys(this.spots) as Mode[]) {
      const l = this.spots[key]!;
      gsap.to(l, { intensity: key === mode ? (peaks[key] ?? 0) : 0, duration: this.store.reducedMotion() ? 0 : 1.2, ease: 'power2.out' });
    }
  }

  /** Resalta el objeto interactivo bajo el cursor (panel más brillante o halo cálido). */
  private setHover(obj: THREE.Object3D | null, action: Action | null = null, index?: number): void {
    this.hovered = obj;
    this.setOutline(action, obj, index);
  }

  /** Objetos visibles que se resaltan para cada accion (los de clic son cajas invisibles). */
  private outlineTargets(action: Action, obj: THREE.Object3D | null, index?: number): THREE.Object3D[] {
    const r = this.room;
    switch (action) {
      case 'pinball': return [r.pinball];
      case 'arcade': return [r.arcade];
      case 'foosball': return [r.foosball];
      case 'pool': return [r.pool];
      case 'chess': return [r.chessTable];
      case 'mask': return [r.mask];
      case 'eva': return [r.eva];
      case 'record': return [r.jukebox];
      case 'cat': return [r.cat.root];
      case 'sign:contact': return [r.bartender.root];
      case 'panel:board': return this.currentMode === 'menu' ? [r.tv] : [];
      // Vitrina de proyectos: marco completo desde fuera; cada cartucho cuando ya estas dentro
      case 'vitrina':
      case 'panel:display': return this.currentMode === 'projects' ? [] : [r.vitrina.root];
      case 'bottle': {
        const b = index !== undefined ? r.vitrina.bottles[index] : undefined;
        return b ? [b.group] : obj ? [obj] : [];
      }
      default: return [];
    }
  }

  /** Activa el contorno luminoso sobre el objeto de esa accion (o lo apaga con null). */
  private setOutline(action: Action | null, obj: THREE.Object3D | null = null, index?: number): void {
    const targets = action ? this.outlineTargets(action, obj, index) : [];
    const key = action ? action + ':' + targets.map((t) => t.id).join(',') : '';
    if (key === this.outlineKey) return;
    this.outlineKey = key;
    this.outline.selectedObjects = targets;
    this.outline.enabled = targets.length > 0;
  }

  /** Resalta desde la interfaz (dock y lista de juegos) el objeto 3D correspondiente. */
  highlight(key: string | null): void {
    const r = this.room;
    const map: Record<string, THREE.Object3D[]> = {
      about: [r.mask],
      projects: [r.vitrina.root],
      music: [r.jukebox],
      contact: [r.bartender.root],
      pinball: [r.pinball],
      arcade: [r.arcade],
      foosball: [r.foosball],
      pool: [r.pool],
      chess: [r.chessTable],
      snes: [r.tv],
    };
    const targets = key ? (map[key] ?? []) : [];
    const k = key ? 'ui:' + key : '';
    if (k === this.outlineKey) return;
    this.outlineKey = k;
    this.outline.selectedObjects = targets;
    this.outline.enabled = targets.length > 0;
  }

  /** Abre un juego desde la lista del dock. */
  playGame(game: string): void {
    this.sounds.click();
    this.setOutline(null);
    switch (game) {
      case 'pinball': this.store.pinballOpen.set(true); break;
      case 'arcade': this.store.arcadeOpen.set(true); break;
      case 'foosball': this.store.foosballOpen.set(true); break;
      case 'pool': this.store.poolOpen.set(true); break;
      case 'chess': this.store.chessOpen.set(true); break;
      case 'snes': this.store.snesOpen.set(true); break;
    }
  }

  // ---------- Contenido en las pantallas ----------

  /** Redibuja todas las texturas con el idioma y estado actuales. */
  sync(): void {
    const c = this.store.content();
    const tab = this.store.aboutTab();
    const mode = this.store.mode();
    const prog = this.reveal.v;
    this.room.board.redraw((ctx, w, h) =>
      drawWelcome(ctx, w, h, c, prog),
    );
    this.room.display.redraw((ctx, w, h) => drawVitrinaTitle(ctx, w, h, c));
    this.room.credits.redraw((ctx, w, h) => drawCredits(ctx, w, h, c));
    this.room.bartender.menuPanel.redraw((ctx, w, h) => drawGameBoyScreen(ctx, w, h, c));
  }

  // ---------- Modo y cámara ----------

  private fitPosition(view: View): THREE.Vector3 {
    const aspect = this.camera.aspect || 1;
    const factor = THREE.MathUtils.clamp(1.15 / aspect, 1, 2.2);
    return view.target.clone().add(view.pos.clone().sub(view.target).multiplyScalar(factor));
  }

  goTo(mode: Mode, silent = false): void {
    if (this.locked && !silent) return;
    const prev = this.currentMode;
    this.currentMode = mode;
    this.store.focused.set(false);
    if (mode === 'contact' && prev !== 'contact') this.bartenderCome();
    else if (prev === 'contact' && mode !== 'contact') this.bartenderLeave();
    this.store.mode.set(mode);
    if (mode !== 'projects') this.store.projectIndex.set(null);
    if (mode !== 'about') this.store.aboutTab.set('about');
    this.setHover(null);
    this.store.hoverProject.set(null);
    this.updateSpotlights(mode);
    this.refreshBottles();
    gsap.to(this.vis, { v: mode === 'projects' ? 1 : 0, duration: this.store.reducedMotion() ? 0 : 1.2, ease: 'power2.out' });
    gsap.to(this, { bloomBase: mode === 'projects' ? 0.14 : 0.3, duration: 1, ease: 'power2.out' });
    this.playReveal();
    if (!silent) this.sounds.whoosh();
    this.moveCamera(VIEWS[mode]);
  }

  /** Hace aparecer el contenido de las pantallas paso a paso. */
  private playReveal(): void {
    gsap.killTweensOf(this.reveal);
    if (this.store.reducedMotion()) {
      this.reveal.v = 1;
      this.sync();
      return;
    }
    this.reveal.v = 0;
    this.sync();
    gsap.to(this.reveal, {
      v: 1,
      duration: 1.5,
      delay: 0.35,
      ease: 'none',
      onUpdate: () => this.sync(),
    });
  }

  private moveCamera(view: View): void {
    const dest = this.fitPosition(view);
    const duration = this.store.reducedMotion() ? 0 : 1.5;
    this.locked = true;
    gsap.to(this.basePos, {
      x: dest.x,
      y: dest.y,
      z: dest.z,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
    });
    gsap.to(this.orbit, { az: 0, el: 0, zoom: 1, duration, ease: 'power2.inOut' });
    gsap.to(this.look, {
      x: view.target.x,
      y: view.target.y,
      z: view.target.z,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => {
        this.locked = false;
      },
    });
  }

  /** Doble clic: acerca la camara al objeto bajo el cursor para verlo de cerca. */
  private focusAt(e: PointerEvent): void {
    if (!this.store.started() || this.locked || this.store.lightbox() || this.store.projectIndex() !== null) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const box = new THREE.Box3();
    const hit = this.pick(e);
    const targets = hit ? this.outlineTargets(hit.action, hit.object, hit.index) : [];
    if (targets.length) {
      targets.forEach((t) => box.expandByObject(t));
    } else {
      const solid = this.raycaster.intersectObjects(this.scene.children, true).find((h) => {
        const m = (h.object as THREE.Mesh).material as THREE.Material | undefined;
        return (h.object as THREE.Mesh).isMesh && m && m.visible !== false && !m.transparent;
      });
      if (!solid) return;
      box.setFromCenterAndSize(solid.point, new THREE.Vector3(0.8, 0.8, 0.8));
    }
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(0.4, box.getSize(new THREE.Vector3()).length() / 2);
    const dir = this.camera.position.clone().sub(center).normalize();
    const dist = THREE.MathUtils.clamp(radius * 2.4, 1.4, 6);
    const dest = center.clone().add(dir.multiplyScalar(dist));
    this.sounds.whoosh();
    this.store.focused.set(true);
    this.setHover(null);
    const duration = this.store.reducedMotion() ? 0 : 1.1;
    this.locked = true;
    gsap.to(this.basePos, { x: dest.x, y: dest.y, z: dest.z, duration, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.orbit, { az: 0, el: 0, zoom: 1, duration, ease: 'power2.inOut' });
    gsap.to(this.look, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => {
        this.locked = false;
      },
    });
  }

  /** Sale del enfoque de cerca y vuelve a la vista del modo actual. */
  private unfocus(): void {
    this.store.focused.set(false);
    this.sounds.click();
    this.moveCamera(VIEWS[this.currentMode]);
  }

  back(): void {
    if (this.store.focused()) {
      this.unfocus();
      return;
    }
    if (this.currentMode === 'projects' && this.store.projectIndex() !== null) {
      this.openProject(null);
      return;
    }
    this.sounds.click();
    this.goTo('menu');
  }

  setAboutTab(tab: AboutTab): void {
    this.sounds.bloop();
    this.store.aboutTab.set(tab);
    this.playReveal();
  }

  /** Avanza Perfil → Habilidades → Experiencia (y vuelve al inicio). */
  nextAboutTab(): void {
    const order: AboutTab[] = ['about', 'skills', 'experience', 'personal'];
    const i = order.indexOf(this.store.aboutTab());
    this.setAboutTab(order[(i + 1) % order.length]);
  }

  openProject(index: number | null): void {
    const count = this.store.content().projects.length;
    if (index !== null && (index < 0 || index >= count)) return;
    this.sounds.bloop();
    this.store.projectIndex.set(index);
    this.store.shotIndex.set(0);
    this.store.lightbox.set(false);
    this.refreshBottles();
    this.nudgeCamera(index !== null);
    this.playReveal();
  }

  /** Cambia la captura de la galería de la ficha abierta (circular). */
  stepShot(delta: number): void {
    const i = this.store.projectIndex();
    if (i === null) return;
    const n = this.store.content().projects[i].gallery?.length ?? 0;
    if (n < 2) return;
    this.store.shotIndex.set((this.store.shotIndex() + delta + n) % n);
  }

  /** Aplica la elevación y la luz de cada botella según cuál está seleccionada o bajo el cursor. */
  private refreshBottles(): void {
    const focus = this.store.projectIndex() ?? this.store.hoverProject();
    const quick = this.store.reducedMotion();
    this.bState.forEach((st, i) => {
      const sel = this.store.projectIndex() === i;
      const hov = this.store.hoverProject() === i;
      gsap.to(st, {
        lift: sel ? 1 : hov ? 0.7 : 0,
        lit: focus === null ? 0.55 : focus === i ? 1 : 0.22,
        duration: quick ? 0 : 0.6,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }

  /** Con la ficha abierta, desplaza la vitrina a la derecha para no quedar tapada. */
  private nudgeCamera(open: boolean): void {
    if (this.currentMode !== 'projects') return;
    const shift = open && window.innerWidth > 900 ? -0.65 : 0;
    const dest = this.fitPosition(VIEWS.projects);
    const d = this.store.reducedMotion() ? 0 : 0.9;
    gsap.to(this.basePos, { z: dest.z + shift, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
    gsap.to(this.look, { z: VIEWS.projects.target.z + shift, duration: d, ease: 'power2.inOut', overwrite: 'auto' });
  }

  /** Coloca las etiquetas HTML bajo cada botella proyectando su posición 3D a pantalla. */
  private placeTags(): void {
    if (this.currentMode !== 'projects') return;
    const n = Math.min(this.bState.length, this.store.content().projects.length);
    if (this.tagEls.length !== n || !this.tagEls[0]?.isConnected) {
      this.tagEls = Array.from(document.querySelectorAll<HTMLElement>('.bottle-tag'));
    }
    const root = this.room.vitrina.root;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const toScreen = (p: THREE.Vector3) => {
      const v = root.localToWorld(p).project(this.camera);
      return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
    };
    this.tagEls.forEach((el, i) => {
      const c = toScreen(tagLocal(i));
      const l = toScreen(tagLocal(i, -TAG_W / 2));
      const r = toScreen(tagLocal(i, TAG_W / 2));
      const width = Math.abs(r.x - l.x);
      el.style.setProperty('--w', width.toFixed(1) + 'px');
      el.style.transform = `translate3d(${(c.x - width / 2).toFixed(1)}px, ${(c.y - width * 0.25).toFixed(1)}px, 0)`;
      el.style.visibility = c.behind ? 'hidden' : 'visible';
    });
  }

  // ---------- Música ----------

  setVolume(v: number): void {
    this.store.setVolume(v);
    this.music.setVolume(this.store.volume(), this.store.muted());
  }

  toggleMute(): void {
    this.store.muted.set(!this.store.muted());
    this.music.setVolume(this.store.volume(), this.store.muted());
  }

  /** Muestra la carta de contacto de inmediato; el barista sigue su camino sin bloquear. */
  showContactNow(): void {
    window.clearTimeout(this.contactTimer);
    this.store.menuOpen.set(true);
  }

  dismissHelp(): void {
    this.store.helpVisible.set(false);
  }

  private ensureAudio(): void {
    this.sounds.unlock();
    const ctx = this.sounds.context;
    if (ctx) this.music.attach(ctx);
  }

  toggleMusic(): void {
    void this.togglePlay();
  }

  async togglePlay(): Promise<void> {
    this.ensureAudio();
    if (this.changing) return;
    this.sounds.click();
    if (this.music.index < 0) {
      await this.changeRecord(this.store.trackIndex());
      return;
    }
    if (this.music.playing) {
      this.music.pause();
      this.armTarget = 0.5;
    } else {
      this.armTarget = -0.28;
      await this.music.play();
    }
  }

  /** Elige una pista: cambia el disco con animación y la reproduce. */
  async selectTrack(i: number): Promise<void> {
    this.ensureAudio();
    if (i < 0 || i >= TRACKS.length || this.changing) return;
    if (this.currentMode !== 'music') this.goTo('music');
    if (i === this.music.index) {
      await this.togglePlay();
      return;
    }
    await this.changeRecord(i);
  }

  async next(): Promise<void> {
    await this.selectTrack((this.store.trackIndex() + 1) % TRACKS.length);
  }

  async prev(): Promise<void> {
    await this.selectTrack((this.store.trackIndex() - 1 + TRACKS.length) % TRACKS.length);
  }

  seek(ratio: number): void {
    this.music.seek(ratio);
  }

  private async changeRecord(i: number): Promise<void> {
    if (this.changing) return;
    this.changing = true;
    this.store.trackChanging.set(true);
    this.store.trackIndex.set(i);
    const v = this.room.vinyl;
    const k = this.store.reducedMotion() ? 0.01 : 1;
    this.armTarget = 0.75; // el brazo se levanta
    if (this.music.playing) void this.music.fadeOut(300);
    this.sounds.whoosh();
    await new Promise<void>((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .to(v.position, { z: -1.25, duration: 0.55 * k, ease: 'power2.in' }, 0.25 * k)
        .to(v.scale, { x: 0.3, y: 0.3, z: 0.3, duration: 0.55 * k, ease: 'power2.in' }, 0.25 * k)
        .add(() => {
          this.room.setLabel(i, TRACKS[i].color);
          v.position.z = 1.25;
          this.sounds.click();
        })
        .to(v.position, { z: 0, duration: 0.65 * k, ease: 'back.out(1.5)' })
        .to(v.scale, { x: 1, y: 1, z: 1, duration: 0.65 * k, ease: 'back.out(1.5)' }, '<')
        .to({}, { duration: 0.2 * k });
    });
    this.music.load(i);
    this.armTarget = -0.28; // el brazo baja al disco
    gsap.fromTo(this.room.lights.record, { intensity: 22 }, { intensity: 6, duration: 1.2, ease: 'power2.out' });
    await new Promise((r) => setTimeout(r, 450 * k));
    await this.music.play();
    this.changing = false;
    this.store.trackChanging.set(false);
  }

  /** Llamado desde el botón ENTRAR (gesto del usuario: desbloquea audio). */
  enter(): void {
    this.ensureAudio();
    this.store.started.set(true);
    this.sounds.whoosh();
    window.setTimeout(() => this.sounds.ding(), 400);
    this.store.helpVisible.set(true);
    window.setTimeout(() => this.store.helpVisible.set(false), 9000);
    // Si el enlace trae una seccion (#proyectos), se va directo a ella al entrar
    const target = HASH_MODE[decodeURIComponent(location.hash.replace(/^#\/?/, '')).toLowerCase()];
    if (target) {
      // La camara puede seguir bloqueada por la animacion de entrada: se reintenta hasta que acepte el cambio
      let tries = 0;
      const timer = window.setInterval(() => {
        if (!this.locked) this.goTo(target);
        if (this.currentMode === target || ++tries > 25) window.clearInterval(timer);
      }, 400);
    }
  }

  // ---------- Interacción ----------

  private pick(e: PointerEvent): { action: Action; uv?: THREE.Vector2; object: THREE.Object3D; index?: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.room.clickable, false);
    const first = hits.find((h) => h.object.userData['action'] === 'bottle') ?? hits.find((h) => h.object.userData['action'] === 'cat') ?? hits[0];
    if (!first) return null;
    const action = first.object.userData['action'] as Action | undefined;
    return action ? { action, uv: first.uv, object: first.object, index: first.object.userData['index'] as number | undefined } : null;
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.store.started() || this.store.pinballOpen() || this.store.arcadeOpen() || this.store.foosballOpen() || this.store.poolOpen() || this.store.chessOpen() || this.store.snesOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (this.store.lightbox()) {
      if (e.key === 'Escape') this.store.lightbox.set(false);
      else if (e.key === 'ArrowRight') this.stepShot(1);
      else if (e.key === 'ArrowLeft') this.stepShot(-1);
      return;
    }
    const idx = ORDER.indexOf(this.currentMode);
    const go = (m: Mode) => {
      e.preventDefault();
      this.goTo(m);
    };
    switch (e.key) {
      case 'ArrowRight':
        go(ORDER[(idx + 1) % ORDER.length]);
        break;
      case 'ArrowLeft':
        go(ORDER[(idx - 1 + ORDER.length) % ORDER.length]);
        break;
      case 'Escape':
        if (this.currentMode !== 'menu' || this.store.focused()) this.back();
        break;
      case '1':
        go('about');
        break;
      case '2':
        go('projects');
        break;
      case '3':
        go('music');
        break;
      case '4':
        go('contact');
        break;
    }
  }

  private handleMove(e: PointerEvent): void {
    if (!this.store.started()) return;
    if (this.touches.has(e.pointerId)) this.touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.touches.size === 2) {
      const d = this.touchDistance();
      if (this.pinchDist > 0 && d > 0) {
        this.orbit.zoom = THREE.MathUtils.clamp(this.orbit.zoom * (this.pinchDist / d), 0.3, 1.25);
      }
      this.pinchDist = d;
      return;
    }
    if (this.dragging) {
      const dx = e.clientX - this.dragging.x;
      const dy = e.clientY - this.dragging.y;
      this.dragging = { x: e.clientX, y: e.clientY };
      this.orbit.az = THREE.MathUtils.clamp(this.orbit.az - dx * 0.004, -1.0, 1.0);
      this.orbit.el = THREE.MathUtils.clamp(this.orbit.el + dy * 0.003, -0.3, 0.45);
    }
    const rect = this.canvas.getBoundingClientRect();
    this.parallax.set(((e.clientX - rect.left) / rect.width) * 2 - 1, ((e.clientY - rect.top) / rect.height) * 2 - 1);
    const hit = this.dragging ? null : this.pick(e);
    this.canvas.style.cursor = hit ? 'pointer' : 'default';
    this.setHover(hit ? hit.object : null, hit ? hit.action : null, hit?.index);
    let hp: number | null = null;
    if (hit && hit.action === 'bottle' && this.currentMode === 'projects') hp = hit.index ?? null;
    if (hp !== this.store.hoverProject()) {
      this.store.hoverProject.set(hp);
      this.refreshBottles();
    }
  }

  private handleUp(e: PointerEvent): void {
    const d = this.downAt;
    this.downAt = null;
    if (!d || !this.store.started() || this.locked) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return; // fue un arrastre
    const hit = this.pick(e);
    if (!hit) return;
    this.dispatch(hit.action, hit.index);
  }

  private dispatch(action: Action, index?: number): void {
    const mode = this.currentMode;
    switch (action) {
      case 'vitrina':
        if (mode !== 'projects') this.goTo('projects');
        break;
      case 'panel:board':
        // La pantalla de la TV es la consola: abre el Super Nintendo
        this.store.snesOpen.set(true);
        break;
      case 'sign:contact':
        this.sounds.click();
        this.goTo('contact');
        break;
      case 'record':
        if (mode !== 'music') this.goTo('music');
        else void this.togglePlay();
        break;
      case 'panel:display':
        if (mode !== 'projects') this.goTo('projects');
        break;
      case 'bottle':
        if (mode !== 'projects') this.goTo('projects');
        else if (index !== undefined && index !== this.store.projectIndex()) this.openProject(index);
        break;
      case 'pinball':
        this.sounds.click();
        this.store.pinballOpen.set(true);
        break;
      case 'arcade':
        this.store.arcadeOpen.set(true);
        break;
      case 'foosball':
        this.store.foosballOpen.set(true);
        break;
      case 'eva':
        this.evaRoar();
        break;
      case 'cat':
        this.catWalkToNewSpot();
        break;
      case 'pool':
        this.store.poolOpen.set(true);
        break;
      case 'chess':
        this.store.chessOpen.set(true);
        break;
      case 'mask':
        this.sounds.click();
        if (mode !== 'about') this.goTo('about');
        break;
    }
  }

  // ---------- Bucle ----------

  private start(): void {
    this.clock.start();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) return;
      const dt = Math.min(this.clock.getDelta(), 0.1);
      // Con el Super Nintendo o el arcade abiertos la escena se congela: los emuladores necesitan la GPU y la CPU
      if (this.store.snesOpen() || this.store.arcadeOpen()) return;
      this.update(dt);
      this.renderer.shadowMap.needsUpdate = (this.frameNo++ & 1) === 0;
      this.composer.render();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private update(dt: number): void {
    const t = this.clock.elapsedTime;
    const reduce = this.store.reducedMotion();
    this.frameMs += (dt * 1000 - this.frameMs) / 5;
    this.perfTimer += dt;
    if (this.perfTimer > 3) {
      this.perfTimer = 0;
      this.degradeIfSlow();
    }

    if (!reduce) {
      const playing = this.store.musicPlaying();
      this.room.platter.rotation.y -= dt * (playing ? 3.2 : 0.15);
      this.room.gear.rotation.z += dt * (playing ? 1.2 : 0.2);
      this.arcadeMixer?.update(dt);
    }
    // La máscara se mece despacio y flota un poco
    this.room.mask.rotation.y = reduce ? 0 : Math.sin(t * 0.7) * 0.4;
    this.room.mask.position.y = 3.55 - MASK_HEIGHT / 2 + (reduce ? 0 : Math.sin(t * 1.3) * 0.04);
    this.updateBottles();
    this.placeTags();
    this.room.tonearm.rotation.z += (this.armTarget - this.room.tonearm.rotation.z) * Math.min(1, dt * 3);
    this.animateLights(t, dt, reduce);
    this.animateBartender(t, dt, reduce);

    // Mirada con un poco de paralaje
    const px = reduce ? 0 : this.parallax.x * 0.35;
    const py = reduce ? 0 : this.parallax.y * 0.15;
    const off = this.basePos.clone().sub(this.look).multiplyScalar(this.orbit.zoom);
    off.applyAxisAngle(UP, this.orbit.az);
    const side = new THREE.Vector3().crossVectors(UP, off).normalize();
    off.applyAxisAngle(side, this.orbit.el);
    this.camera.position.copy(this.look).add(off);
    const target = this.look.clone();
    target.x += px;
    target.y -= py;
    if (!reduce) target.y += Math.sin(t * 0.5) * 0.04;
    this.camera.lookAt(target);
  }


  // ---------- Barista ----------

  private btCurve: THREE.CatmullRomCurve3 | null = null;
  private readonly btState = { u: 0, offer: 0 };
  private btWalking = false;
  /** Mezcla suavizada (0 = quieto, 1 = caminando) y suavizado de la pose de los brazos del anfitrion. */
  private btWalkAmt = 0;
  private btArmLift = 0;
  private btReturning = false;
  private btHeading = 0;
  private btPhase = 0;

  private btPath(): THREE.CatmullRomCurve3 {
    if (this.btCurve) return this.btCurve;
    const p = this.room.bartender.post;
    const pts: Array<[number, number]> = [
      [p.x, p.z],
      [-3.2, -1.6],
      [-0.6, 0.0],
      [1.0, 1.4],
    ];
    this.btCurve = new THREE.CatmullRomCurve3(
      pts.map(([x, z]) => new THREE.Vector3(x, 0, z)),
      false,
      'centripetal',
    );
    return this.btCurve;
  }

  private placeBartender(): void {
    const curve = this.btPath();
    const u = THREE.MathUtils.clamp(this.btState.u, 0, 1);
    const pos = curve.getPoint(u);
    const tan = curve.getTangent(u);
    if (this.btReturning) tan.negate();
    this.room.bartender.root.position.set(pos.x, 0, pos.z);
    if (tan.lengthSq() > 0.0001) this.btHeading = Math.atan2(tan.x, tan.z);
  }

  /** El barista sale de la barra y trae la carta. */
  private bartenderCome(): void {
    this.store.menuOpen.set(false);
    gsap.killTweensOf(this.btState);
    this.btReturning = false;
    this.btWalking = true;
    const quick = this.store.reducedMotion();
    const remaining = 1 - this.btState.u;
    gsap.to(this.btState, {
      u: 1,
      duration: quick ? 0.01 : Math.max(0.4, remaining * 4.2),
      ease: 'power1.inOut',
      onUpdate: () => this.placeBartender(),
      onComplete: () => {
        this.btWalking = false;
        // De frente a la cámara, ofrece la carta
        this.btHeading = Math.atan2(0.8 - this.room.bartender.root.position.x, 5.9 - this.room.bartender.root.position.z);
        gsap.to(this.btState, { offer: 1, duration: quick ? 0.01 : 0.9, ease: 'power2.out' });
        window.clearTimeout(this.contactTimer);
        this.contactTimer = window.setTimeout(() => {
          if (this.currentMode === 'contact' && !this.store.menuOpen()) {
            this.sounds.ding();
            this.store.menuOpen.set(true);
          }
        }, quick ? 0 : 700);
      },
    });
  }

  /** Vuelve a su puesto detrás de la barra. */
  private bartenderLeave(): void {
    window.clearTimeout(this.contactTimer);
    this.store.menuOpen.set(false);
    gsap.killTweensOf(this.btState);
    gsap.to(this.btState, { offer: 0, duration: 0.3 });
    this.btReturning = true;
    this.btWalking = true;
    const quick = this.store.reducedMotion();
    gsap.to(this.btState, {
      u: 0,
      duration: quick ? 0.01 : Math.max(0.4, this.btState.u * 3.6),
      ease: 'power1.inOut',
      onUpdate: () => this.placeBartender(),
      onComplete: () => {
        this.btWalking = false;
        this.btReturning = false;
        this.btHeading = this.room.bartender.post.rot;
      },
    });
  }

  private animateBartender(t: number, dt: number, reduce: boolean): void {
    const b = this.room.bartender;
    const w = this.btState.offer;
    const walk = this.btWalking ? 1 : 0;
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 5);
    this.btWalkAmt += (walk - this.btWalkAmt) * k;
    this.btPhase += dt * (this.host ? 6.2 * this.btWalkAmt : 8.5 * walk);
    const swing = Math.sin(this.btPhase) * 0.6 * walk;

    // Siempre que esta quieto se queda mirando directamente a la camara (antes miraba la TV)
    if (!this.btWalking && (this.currentMode !== 'contact' || w > 0.3)) {
      this.btHeading = Math.atan2(this.camera.position.x - b.root.position.x, this.camera.position.z - b.root.position.z);
    }

    // Orientación suave
    let diff = this.btHeading - b.root.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    b.root.rotation.y += diff * Math.min(1, dt * 7);

    b.legL.rotation.x = swing;
    b.legR.rotation.x = -swing;
    b.body.position.y = (reduce ? 0 : Math.sin(t * 2) * 0.008) + Math.abs(Math.sin(this.btPhase)) * 0.03 * walk;

    // Brazo derecho: balanceo al caminar, extendido con la carta al ofrecer
    const idleR = -0.15 - swing * 0.8;
    b.armR.shoulder.rotation.x = THREE.MathUtils.lerp(idleR, -1.25, w);
    b.armR.elbow.rotation.x = THREE.MathUtils.lerp(0, -0.55, w);
    b.armR.shoulder.rotation.z = THREE.MathUtils.lerp(0, -0.1, w);

    // Brazo izquierdo: seca un vaso en reposo; se balancea al caminar
    const wipe = reduce ? 0 : Math.sin(t * 3.2) * 0.03; // sostiene el mando mientras mira la TV
    b.armL.shoulder.rotation.x = walk ? swing * 0.8 : -0.75 + wipe * 0.4;
    b.armL.elbow.rotation.x = walk ? 0 : -1.15 + wipe;

    b.head.rotation.y = reduce ? 0 : Math.sin(t * 0.7) * 0.3 * (1 - w);
    if (this.host) {
      const { bones, rest, model, baseY } = this.host;
      const wk = this.btWalkAmt;
      const ph = this.btPhase;
      const calm = reduce ? 0 : 1;
      const kk = 1 - Math.exp(-Math.min(dt, 0.1) * 6);

      // Rotaciones en el espacio del anfitrion (+Z al frente, +Y arriba), aplicadas sobre la pose de reposo del hueso
      const btQ = b.root.getWorldQuaternion(new THREE.Quaternion());
      const parentQ = new THREE.Quaternion();
      const pose = (bone: THREE.Bone | undefined, x: number, y = 0, z = 0) => {
        if (!bone?.parent) return;
        bone.parent.getWorldQuaternion(parentQ);
        const r = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
        const world = btQ.clone().multiply(r).multiply(btQ.clone().invert());
        bone.quaternion.copy(parentQ.clone().invert().multiply(world).multiply(parentQ).multiply(rest.get(bone)!));
        bone.updateMatrixWorld(true);
      };

      // Marcha: muslo y rodilla alternados, cuerpo que sube y baja, leve inclinacion y balanceo de cadera
      const s1 = Math.sin(ph);
      const s2 = Math.sin(ph + Math.PI);
      const stride = 0.46 * wk;
      const idleShift = calm * Math.sin(t * 0.7) * 0.02 * (1 - wk);
      pose(bones['legL'], -stride * s1, 0, idleShift);
      pose(bones['legR'], -stride * s2, 0, idleShift);
      pose(bones['kneeL'], 0.75 * wk * Math.max(0, Math.cos(ph)) + 0.04 * wk);
      pose(bones['kneeR'], 0.75 * wk * Math.max(0, Math.cos(ph + Math.PI)) + 0.04 * wk);
      model.position.y = baseY - 0.035 * wk * Math.abs(s1);
      model.position.x = Math.sin(ph) * 0.012 * wk + idleShift * 0.5;
      const breath = calm * Math.sin(t * 1.6) * 0.012;
      pose(bones['spine'], 0.06 * wk + breath, Math.sin(ph) * 0.06 * wk, -Math.sin(ph) * 0.03 * wk);
      pose(bones['chest'], 0.03 * wk + 0.04 * w + breath * 0.6, -Math.sin(ph) * 0.05 * wk);

      // Cabeza: mira alrededor con calma; al ofrecer el Game Boy mira a la camara
      const look = calm * Math.sin(t * 0.55) * 0.3 * (1 - w) * (1 - wk);
      pose(bones['neck'], 0.03 * wk + 0.06 * w, look * 0.4 * (1 - w));
      pose(bones['head'], 0.02 * wk + 0.14 * w, look * 0.6 * (1 - w));

      // Brazos sueltos a los costados, con balanceo de respiracion y de paso; al recibirte, la mano derecha se levanta un poco
      const greet = this.btArmLift;
      this.btArmLift += (w - greet) * kk;
      const bob = calm * Math.sin(t * 1.6);
      const sway = Math.sin(ph) * 0.45 * wk;
      const drift = calm * Math.sin(t * 0.9) * 0.05 * (1 - wk);
      pose(bones['armL'], -0.1 + sway + drift, 0, -1.3 + bob * 0.02);
      pose(bones['armR'], -0.1 - sway - drift - this.btArmLift * 0.7, 0, 1.3 - bob * 0.02 - this.btArmLift * 0.35);
      pose(bones['elbowL'], -0.25 - 0.3 * wk * Math.max(0, Math.cos(ph)) + bob * 0.03);
      pose(bones['elbowR'], -0.25 - 0.3 * wk * Math.max(0, Math.cos(ph + Math.PI)) - bob * 0.03 - this.btArmLift * 0.5);

      // Sin Game Boy en las manos: el contacto se muestra en la tarjeta
      b.menu.visible = false;
    } else {
      b.menu.visible = w > 0.02;
      b.menu.scale.setScalar(Math.max(0.01, w));
    }
  }

  private animateLights(t: number, dt: number, reduce: boolean): void {
    const L = this.music.sample();
    const playing = this.music.playing;
    this.store.musicPlaying.set(playing);
    this.uiTimer += dt;
    if (this.uiTimer > 0.25) {
      this.uiTimer = 0;
      this.store.trackTime.set(this.music.time);
      this.store.trackDuration.set(this.music.duration);
    }

    // Ecualizador del jukebox
    this.room.eqBars.forEach((b, i) => {
      const idle = 0.12 + (Math.sin(t * 1.6 + i * 0.6) * 0.5 + 0.5) * 0.05;
      const target = playing ? 0.12 + L.bars[i] * 1.15 : idle;
      b.scale.y += (target - b.scale.y) * Math.min(1, dt * 14);
    });
    for (const g of this.jukeboxGlow) g.mat.emissiveIntensity = g.base * (playing ? 1 + L.bass * 1.4 : 0.85 + Math.sin(t * 1.6) * 0.1);
    if (this.bloomEnabled) this.bloom.strength = this.bloomBase + L.bass * 0.2;
    this.grade.uniforms['time'].value = t % 100;
    // Marquesina: las bombillas del cartel parpadean alternadas
    const phase = Math.floor(t * (this.currentMode === 'about' ? 4 : 2)) % 2;
    for (const m of this.room.glowMaterials) {
      const mq = m.userData['marquee'] as number | undefined;
      if (mq !== undefined) m.emissiveIntensity = mq === phase ? 3.4 : 0.8;
    }
    const [rec] = this.room.accent;
    if (!this.changing) rec.intensity = 6 + L.bass * 10;
    const wave = 1 + (reduce ? 0 : Math.sin(t * 2.2) * 0.12) + L.bass * 0.35;
    for (const m of this.room.glowMaterials) {
      const base = m.userData['pulse'] as number | undefined;
      if (base) m.emissiveIntensity = base * wave;
    }

    if (reduce) return;

    // Ambiente: ventilador, lamparas, polvo, poste, emblema
    this.room.fan.rotation.y += dt * (1.3 + L.mid * 3);
    const lick = Math.sin(t * 5.5);
    this.room.cat.paw.rotation.x = -1.85 + lick * 0.13;
    this.room.cat.head.rotation.x = 0.2 + Math.max(0, lick) * 0.12;
    this.room.cat.head.rotation.z = -0.12;
    this.updateCat(dt);
    const flick = Math.sin(t * 17) > 0.992 ? 0.45 : 0.9 + 0.1 * Math.sin(t * 3.1);
    (this.room.emblem.mesh.material as THREE.MeshBasicMaterial).color.setScalar(flick);

    const pos = this.room.dust.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + dt * (0.05 + (i % 5) * 0.012);
      if (y > 6.6) y = 0.4;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.4 + i) * dt * 0.03);
    }
    pos.needsUpdate = true;
  }

  private degradeIfSlow(): void {
    const fps = 1000 / this.frameMs;
    if (fps > 40) return;
    // Escalera de calidad: cada comprobación lenta baja un peldaño, nunca sube
    switch (this.perfLevel++) {
      case 0:
        if (this.renderer.getPixelRatio() > 1) {
          this.renderer.setPixelRatio(1);
          this.resize();
        }
        break;
      case 1:
        this.gtao.enabled = false;
        break;
      case 2:
        this.outline.edgeThickness = 1.5;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.scene.traverse((o) => {
          const l = o as THREE.SpotLight;
          if (l.isSpotLight) l.shadow.mapSize.set(512, 512), l.shadow.map?.dispose(), (l.shadow.map = null);
        });
        break;
      default:
        if (this.bloomEnabled) {
          this.bloomEnabled = false;
          this.bloom.enabled = false;
        }
    }
  }

  // ---------- Ciclo de vida ----------

  private resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.bloom.setSize(w, h);
    this.gtao.setSize(w * 0.6, h * 0.6); // el AO a resolución reducida apenas se nota y cuesta mucho menos
    if (!this.locked && !this.store.focused()) this.basePos.copy(this.fitPosition(VIEWS[this.currentMode]));
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('dblclick', this.onDblClick);
    window.removeEventListener('keydown', this.onKey);
    window.clearTimeout(this.contactTimer);
    gsap.killTweensOf(this.btState);
    gsap.killTweensOf(this.reveal);
    gsap.killTweensOf(this.basePos);
    gsap.killTweensOf(this.orbit);
    gsap.killTweensOf(this.look);
    this.music.dispose();
    this.sounds.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.pmrem.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
