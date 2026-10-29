import * as THREE from 'three';
import { canvasTex, std } from './kit';

/** Gato siames: modelo sentado (lamiendose la pata) y modelo de pie para caminar, con color por vertices y pelo. */
export interface CatParts {
  root: THREE.Group;
  sit: THREE.Group;
  walk: THREE.Group;
  head: THREE.Group;
  paw: THREE.Group;
  legs: THREE.Group[];
  walkHead: THREE.Group;
  tail: THREE.Group;
}

const CREAM = new THREE.Color('#f3e7d0');
const FAWN = new THREE.Color('#d9c29b');
const POINT = new THREE.Color('#3b261b');
const POINT_SOFT = new THREE.Color('#6a4a38');

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Pinta el color de cada vertice segun su posicion local (el material multiplica por la textura de pelo). */
function tint(geo: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => THREE.Color): THREE.BufferGeometry {
  const p = geo.attributes['position'] as THREE.BufferAttribute;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const col = fn(p.getX(i), p.getY(i), p.getZ(i));
    c[3 * i] = col.r;
    c[3 * i + 1] = col.g;
    c[3 * i + 2] = col.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}

function furTexture(): THREE.CanvasTexture {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#f2f2f2';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const a = (Math.random() - 0.5) * 0.7;
        const len = 5 + Math.random() * 11;
        g.strokeStyle = Math.random() < 0.55 ? `rgba(0,0,0,${0.05 + Math.random() * 0.12})` : `rgba(255,255,255,${0.25 + Math.random() * 0.3})`;
        g.lineWidth = 0.8 + Math.random() * 0.8;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(a) * len, y + Math.cos(a) * len);
        g.stroke();
      }
    },
    [2, 2],
  );
}

/** Mapa de transparencia con mechones: da el efecto de pelusa en las capas exteriores. */
function furAlpha(): THREE.CanvasTexture {
  return canvasTex(
    256,
    256,
    (g, w, h) => {
      g.fillStyle = '#000000';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        const len = 4 + Math.random() * 9;
        const a = (Math.random() - 0.5) * 0.6;
        g.strokeStyle = `rgba(255,255,255,${0.5 + Math.random() * 0.5})`;
        g.lineWidth = 1 + Math.random();
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + Math.sin(a) * len, y + Math.cos(a) * len);
        g.stroke();
      }
    },
    [3, 3],
  );
}

export function buildCat(): CatParts {
  const fur = furTexture();
  const furMat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map: fur, bumpMap: fur, bumpScale: 0.8, roughness: 0.95 });
  const shellAlpha = furAlpha();
  const shellMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    alphaMap: shellAlpha,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    roughness: 1,
  });
  let furM = furMat;
  let shellM = shellMat;
  const eyeMat = std('#5db6ff', { emissive: '#2a78c8', emissiveIntensity: 0.9, roughness: 0.2 });
  const pupilMat = std('#050505', { roughness: 0.3 });
  const noseMat = std('#d98a8a', { roughness: 0.6 });
  const innerEarMat = std('#c9908a', { roughness: 0.8 });
  const whiskerMat = std('#f6efe2', { roughness: 0.6 });

  const root = new THREE.Group();

  /** Elipsoide con pelo: cuerpo + dos capas de pelusa un poco mas grandes. */
  const furEll = (
    parent: THREE.Object3D,
    sc: [number, number, number],
    pos: [number, number, number],
    color: (x: number, y: number, z: number) => THREE.Color,
    shells = true,
  ) => {
    const geo = tint(new THREE.SphereGeometry(1, 24, 18), color);
    const m = new THREE.Mesh(geo, furM);
    m.scale.set(...sc);
    m.position.set(...pos);
    parent.add(m);
    if (shells) {
      // Grosor del pelo constante en unidades del mundo: en cuerpos mas finos la capa relativa es mayor
      const r = (sc[0] + sc[1] + sc[2]) / 3;
      [0.007, 0.014].forEach((th) => {
        const k = 1 + th / r;
        const s = new THREE.Mesh(geo, shellM);
        s.scale.setScalar(k);
        m.add(s);
      });
    }
    return m;
  };
  const bodyColor = (_x: number, y: number) => CREAM.clone().lerp(FAWN, smooth(-0.2, 1, y) * 0.55);
  const dark = () => POINT.clone();

  /** Cilindro con degradado: crema arriba y oscuro hacia la pata. */
  const limb = (parent: THREE.Object3D, rTop: number, rBot: number, h: number, pos: [number, number, number], from = 0.1) => {
    const geo = tint(new THREE.CylinderGeometry(rTop, rBot, h, 12), (_x, y) => CREAM.clone().lerp(POINT, smooth(from * h, -0.5 * h, y)));
    const m = new THREE.Mesh(geo, furM);
    m.position.set(...pos);
    parent.add(m);
    return m;
  };
  const pawBlob = (parent: THREE.Object3D, pos: [number, number, number], sc: [number, number, number]) =>
    furEll(parent, sc, pos, dark, false);

  /** Cabeza siamesa: mascara oscura, orejas, ojos azules rasgados, nariz y bigotes. s = escala. */
  const buildHead = (head: THREE.Group, s: number) => {
    furEll(
      head,
      [0.13 * s, 0.115 * s, 0.12 * s],
      [0, 0, 0],
      (x, y, z) => {
        const mask = smooth(0.05, 0.75, z) * (1 - smooth(0.2, 0.95, Math.abs(x))) * smooth(0.55, -0.55, y) * 1.15;
        const sides = smooth(0.55, 0.95, Math.abs(x)) * smooth(0.1, 0.9, y) * 0.5;
        return CREAM.clone().lerp(POINT_SOFT, Math.min(1, Math.max(mask, sides)));
      },
    );
    furEll(head, [0.07 * s, 0.055 * s, 0.05 * s], [0, -0.035 * s, 0.085 * s], () => POINT_SOFT.clone().lerp(CREAM, 0.15), false);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(tint(new THREE.ConeGeometry(0.06 * s, 0.15 * s, 4), () => POINT.clone()), furM);
      ear.position.set(side * 0.082 * s, 0.125 * s, -0.012 * s);
      ear.rotation.z = -side * 0.28;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.036 * s, 0.1 * s, 4), innerEarMat);
      inner.position.set(side * 0.08 * s, 0.115 * s, 0.006 * s);
      inner.rotation.z = -side * 0.28;
      head.add(inner);
      // ojo almendrado azul con pupila vertical
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02 * s, 14, 10), eyeMat);
      eye.scale.set(1.25, 0.8, 0.7);
      eye.position.set(side * 0.05 * s, 0.022 * s, 0.1 * s);
      eye.rotation.z = side * 0.25;
      head.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.01 * s, 8, 8), pupilMat);
      pupil.scale.set(0.3, 1.1, 0.4);
      pupil.position.set(side * 0.05 * s, 0.022 * s, 0.114 * s);
      head.add(pupil);
      // bigotes
      [-0.18, 0, 0.18].forEach((tilt) => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0016 * s, 0.0008 * s, 0.14 * s, 4), whiskerMat);
        w.rotation.z = Math.PI / 2 + side * tilt;
        w.rotation.y = side * 0.35;
        w.position.set(side * 0.1 * s, -0.04 * s + tilt * 0.05 * s, 0.1 * s);
        head.add(w);
      });
    });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014 * s, 8, 8), noseMat);
    nose.scale.set(1, 0.7, 0.7);
    nose.position.set(0, -0.012 * s, 0.138 * s);
    head.add(nose);
  };

  const tailTube = (pts: THREE.Vector3[], r: number) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, 20, r, 8);
    const p = geo.attributes['position'] as THREE.BufferAttribute;
    const base = pts[0];
    const maxD = pts.reduce((m, q) => Math.max(m, q.distanceTo(base)), 0.01);
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const d = Math.hypot(p.getX(i) - base.x, p.getY(i) - base.y, p.getZ(i) - base.z) / maxD;
      const c = CREAM.clone().lerp(POINT, smooth(0.05, 0.55, d));
      col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(geo, furM);
    const tip = pawBlob(m, [pts[pts.length - 1].x, pts[pts.length - 1].y, pts[pts.length - 1].z], [r * 1.05, r * 1.05, r * 1.05]);
    void tip;
    return m;
  };

  // ================= Modelo sentado =================
  const sit = new THREE.Group();
  root.add(sit);
  furEll(sit, [0.17, 0.25, 0.18], [0, 0.27, 0], bodyColor);
  furEll(sit, [0.13, 0.15, 0.19], [-0.1, 0.15, -0.05], bodyColor);
  furEll(sit, [0.13, 0.15, 0.19], [0.1, 0.15, -0.05], bodyColor);
  furEll(sit, [0.14, 0.13, 0.11], [0, 0.34, 0.1], () => CREAM.clone(), false);
  furEll(sit, [0.1, 0.1, 0.1], [0, 0.47, 0.06], () => CREAM.clone(), false);
  sit.add(tailTube([new THREE.Vector3(-0.06, 0.1, -0.16), new THREE.Vector3(-0.24, 0.07, -0.1), new THREE.Vector3(-0.32, 0.08, 0.1), new THREE.Vector3(-0.22, 0.1, 0.24)], 0.038));
  [-1, 1].forEach((s) => pawBlob(sit, [s * 0.16, 0.05, 0.08], [0.065, 0.05, 0.12]));
  limb(sit, 0.045, 0.04, 0.3, [-0.08, 0.17, 0.12]);
  pawBlob(sit, [-0.08, 0.02, 0.17], [0.055, 0.04, 0.075]);
  const paw = new THREE.Group();
  paw.position.set(0.09, 0.42, 0.1);
  sit.add(paw);
  limb(paw, 0.045, 0.04, 0.24, [0, -0.12, 0], 0.2);
  pawBlob(paw, [0, -0.25, 0], [0.055, 0.055, 0.065]);
  const head = new THREE.Group();
  head.position.set(0, 0.58, 0.08);
  sit.add(head);
  buildHead(head, 1);

  // ================= Modelo de pie (camina) =================
  // El cuerpo de pie es mas fino: se escala la textura del pelo para que los mechones tengan el mismo tamano que en el modelo sentado
  const walkFur = fur.clone();
  walkFur.repeat.set(1.8, 1.8);
  walkFur.needsUpdate = true;
  const walkShellAlpha = shellAlpha.clone();
  walkShellAlpha.repeat.set(2.7, 2.7);
  walkShellAlpha.needsUpdate = true;
  const walkFurMat = furMat.clone();
  walkFurMat.map = walkFur;
  walkFurMat.bumpMap = walkFur;
  const walkShellMat = shellMat.clone();
  walkShellMat.alphaMap = walkShellAlpha;
  furM = walkFurMat;
  shellM = walkShellMat;
  const walk = new THREE.Group();
  walk.visible = false;
  root.add(walk);
  furEll(walk, [0.155, 0.16, 0.22], [0, 0.285, 0.04], bodyColor);
  furEll(walk, [0.15, 0.15, 0.17], [0, 0.275, -0.14], bodyColor);
  furEll(walk, [0.12, 0.125, 0.11], [0, 0.31, 0.2], () => CREAM.clone(), false);
  furEll(walk, [0.085, 0.095, 0.1], [0, 0.35, 0.26], () => CREAM.clone(), false);
  const legs: THREE.Group[] = [];
  [[-0.09, 0.17], [0.09, 0.17], [-0.09, -0.14], [0.09, -0.14]].forEach(([x, z]) => {
    const leg = new THREE.Group();
    leg.position.set(x, 0.22, z);
    walk.add(leg);
    limb(leg, 0.052, 0.044, 0.2, [0, -0.1, 0], 0.0);
    pawBlob(leg, [0, -0.2, 0.02], [0.062, 0.04, 0.08]);
    legs.push(leg);
  });
  const walkHead = new THREE.Group();
  walkHead.position.set(0, 0.4, 0.3);
  walk.add(walkHead);
  buildHead(walkHead, 0.95);
  const tail = new THREE.Group();
  tail.position.set(0, 0.3, -0.29);
  walk.add(tail);
  tail.add(tailTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.1, -0.06), new THREE.Vector3(0, 0.22, -0.05), new THREE.Vector3(0, 0.33, 0.02)], 0.04));

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = m.material !== shellMat && m.material !== walkShellMat;
  });

  return { root, sit, walk, head, paw, legs, walkHead, tail };
}
