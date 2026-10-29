import * as THREE from 'three';

/** Brazo articulado de la figura de Evangelion: hombro y codo, ambos giran sobre el mismo eje horizontal. */
export interface EvaArm {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  /** Cabeza con pivote en el cuello; se gira sobre el eje vertical (mirar) y sobre `lateral` (asentir). */
  head: THREE.Group | null;
  lateral: THREE.Vector3;
  /** Eje (en el espacio del modelo) alrededor del cual el brazo se abre hacia afuera con angulo positivo. */
  axis: THREE.Vector3;
}

// Umbrales como fraccion de la altura total: el brazo cuelga al lado del torso entre la cadera y el hombro.
const ARM_MIN_SIDE = 0.093;
const ARM_Y_MIN = 0.352;
const ARM_Y_MAX = 0.75;
// por debajo de ARM_Y_MIN solo cuenta lo bien separado del torso (la mano), para no arrastrar la pierna
const HAND_MIN_SIDE = 0.15;
const HAND_Y_MIN = 0.22;
const ARM_SEED_SIDE = 0.157;
const ARM_SEED_Y = 0.556;
const ELBOW_Y = 0.56;
const MIN_ARM_VERTS = 500;
const HEAD_Y_MIN = 0.76;
const HEAD_SEED_SIDE = 0.12;
const HEAD_HALF_WIDTH = 0.085;
const HEAD_CENTER_Y0 = 0.84;
const HEAD_CENTER_Y1 = 0.9;
const MIN_HEAD_VERTS = 200;
const SMALL_PART_VERTS = 400;
const SMALL_PART_SIDE = 0.1;

/**
 * El modelo es una sola malla sin brazos articulados. Se detecta el brazo (componente conectada junto al
 * torso), se separan sus triangulos del cuerpo y se arma una malla de antebrazo y otra de brazo con pivotes.
 * Se llama antes de escalar el modelo. Devuelve null si no encuentra el brazo.
 */
export function buildEvaArm(model: THREE.Object3D): EvaArm | null {
  model.updateMatrixWorld(true);
  let body: THREE.SkinnedMesh | undefined;
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh && (!body || m.geometry.attributes['position'].count > body.geometry.attributes['position'].count)) body = m;
  });
  if (!body || !body.geometry.index) return null;
  const mesh = body;
  const geo = mesh.geometry;
  const n = geo.attributes['position'].count;

  // posiciones en el espacio del modelo (ya con el esqueleto aplicado)
  const P = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  const box = new THREE.Box3();
  for (let i = 0; i < n; i++) {
    mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
    P[3 * i] = v.x;
    P[3 * i + 1] = v.y;
    P[3 * i + 2] = v.z;
    box.expandByPoint(v);
  }
  const H = box.max.y - box.min.y;

  // eje lateral = direccion horizontal de mayor dispersion (hombro a hombro)
  let mx = 0, mz = 0;
  for (let i = 0; i < n; i++) { mx += P[3 * i]; mz += P[3 * i + 2]; }
  mx /= n; mz /= n;
  let sxx = 0, szz = 0, sxz = 0;
  for (let i = 0; i < n; i++) {
    const a = P[3 * i] - mx, b = P[3 * i + 2] - mz;
    sxx += a * a; szz += b * b; sxz += a * b;
  }
  const th = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  const ux = Math.cos(th), uz = Math.sin(th);
  const U = new Float32Array(n), Y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    U[i] = ((P[3 * i] - mx) * ux + (P[3 * i + 2] - mz) * uz) / H;
    Y[i] = (P[3 * i + 1] - box.min.y) / H;
  }

  // vertices soldados por posicion (las costuras de UV duplican vertices)
  const rep = new Int32Array(n);
  const seen = new Map<string, number>();
  const q = 1 / (H * 0.0008);
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(P[3 * i] * q)},${Math.round(P[3 * i + 1] * q)},${Math.round(P[3 * i + 2] * q)}`;
    const r = seen.get(k);
    if (r === undefined) { seen.set(k, i); rep[i] = i; } else rep[i] = r;
  }
  const idx = geo.index!.array;
  const adj = new Map<number, number[]>();
  const link = (a: number, b: number) => { let l = adj.get(a); if (!l) adj.set(a, (l = [])); l.push(b); };
  for (let t = 0; t < idx.length; t += 3) {
    const a = rep[idx[t]], b = rep[idx[t + 1]], c = rep[idx[t + 2]];
    link(a, b); link(b, a); link(b, c); link(c, b); link(a, c); link(c, a);
  }

  // flood fill desde el brazo hacia cada lado; gana el lado con mas vertices
  let side = 0;
  let armSet = new Set<number>();
  for (const s of [1, -1]) {
    let seed = -1, best = Infinity;
    for (let i = 0; i < n; i++) {
      if (rep[i] !== i) continue;
      const d = Math.abs(s * U[i] - ARM_SEED_SIDE) + Math.abs(Y[i] - ARM_SEED_Y);
      if (d < best) { best = d; seed = i; }
    }
    const inRegion = (i: number) =>
      Y[i] < ARM_Y_MAX && (Y[i] > ARM_Y_MIN ? s * U[i] > ARM_MIN_SIDE : Y[i] > HAND_Y_MIN && s * U[i] > HAND_MIN_SIDE);
    const set = new Set<number>([seed]);
    const stack = [seed];
    while (stack.length) {
      const a = stack.pop()!;
      for (const b of adj.get(a) ?? []) {
        if (!set.has(b) && inRegion(b)) { set.add(b); stack.push(b); }
      }
    }
    if (set.size > armSet.size) { armSet = set; side = s; }
  }
  // piezas sueltas (cuchilla del antebrazo, puntas de la mano): mallas pequenas sin conexion junto al brazo
  const visited = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (rep[i] !== i || visited.has(i) || armSet.has(i)) continue;
    const comp = [i];
    visited.add(i);
    for (let k = 0; k < comp.length; k++) {
      for (const b of adj.get(comp[k]) ?? []) if (!visited.has(b)) { visited.add(b); comp.push(b); }
    }
    if (comp.length > SMALL_PART_VERTS) continue;
    let uMin = Infinity, yMin = Infinity, yMax = -Infinity;
    for (const r of comp) { uMin = Math.min(uMin, side * U[r]); yMin = Math.min(yMin, Y[r]); yMax = Math.max(yMax, Y[r]); }
    if (uMin > SMALL_PART_SIDE && yMin > HAND_Y_MIN && yMax < ARM_Y_MAX - 0.1) for (const r of comp) armSet.add(r);
  }
  if (armSet.size < MIN_ARM_VERTS) return null;

  // pivotes: hombro arriba del brazo, codo a media altura
  const pivotAt = (yLo: number, yHi: number) => {
    const c = new THREE.Vector3();
    let k = 0;
    armSet.forEach((r) => {
      if (Y[r] >= yLo && Y[r] <= yHi) { c.x += P[3 * r]; c.y += P[3 * r + 1]; c.z += P[3 * r + 2]; k++; }
    });
    return k ? c.divideScalar(k) : null;
  };
  let top = 0;
  armSet.forEach((r) => { top = Math.max(top, Y[r]); });
  const shoulderPos = pivotAt(top - 0.03, top);
  const elbowPos = pivotAt(ELBOW_Y - 0.02, ELBOW_Y + 0.02);
  if (!shoulderPos || !elbowPos) return null;
  shoulderPos.y = box.min.y + (top - 0.02) * H;
  elbowPos.y = box.min.y + ELBOW_Y * H;

  // cabeza: la parte conectada por encima del cuello. El modelo la tiene ladeada, asi que no se corta por el eje central.
  const headSet = new Set<number>();
  {
    // cuerpo principal = todo lo conectado al brazo; la cabeza se alcanza desde su punto mas alto
    let start = -1;
    armSet.forEach((r) => { if (start < 0) start = r; });
    const main = new Set<number>([start]);
    const stack = [start];
    while (stack.length) {
      const a = stack.pop()!;
      for (const b of adj.get(a) ?? []) if (!main.has(b)) { main.add(b); stack.push(b); }
    }
    let seed = -1, top = -Infinity;
    main.forEach((r) => { if (Y[r] > top && Math.abs(U[r]) < HEAD_SEED_SIDE) { top = Y[r]; seed = r; } });
    // centro lateral de la cabeza: promedio de la zona estrecha de arriba (el modelo la tiene ladeada)
    let uc = 0, ucN = 0;
    main.forEach((r) => { if (Y[r] >= HEAD_CENTER_Y0 && Y[r] <= HEAD_CENTER_Y1 && Math.abs(U[r]) < HEAD_SEED_SIDE) { uc += U[r]; ucN++; } });
    uc = ucN ? uc / ucN : 0;
    if (seed >= 0) {
      headSet.add(seed);
      const st = [seed];
      while (st.length) {
        const a = st.pop()!;
        for (const b of adj.get(a) ?? []) {
          if (!headSet.has(b) && !armSet.has(b) && Y[b] > HEAD_Y_MIN && Math.abs(U[b] - uc) < HEAD_HALF_WIDTH) { headSet.add(b); st.push(b); }
        }
      }
    }
    // piezas sueltas de esa zona (visor, detalles)
    const seenH = new Set<number>(main);
    for (let i = 0; i < n; i++) {
      if (rep[i] !== i || seenH.has(i)) continue;
      const comp = [i];
      seenH.add(i);
      for (let k = 0; k < comp.length; k++) {
        for (const b of adj.get(comp[k]) ?? []) if (!seenH.has(b)) { seenH.add(b); comp.push(b); }
      }
      if (comp.length > SMALL_PART_VERTS) continue;
      let uMax = 0, yMin = Infinity;
      for (const r of comp) { uMax = Math.max(uMax, Math.abs(U[r])); yMin = Math.min(yMin, Y[r]); }
      if (uMax < HEAD_SEED_SIDE && yMin > HEAD_Y_MIN - 0.03) for (const r of comp) headSet.add(r);
    }
  }
  const headOk = headSet.size >= MIN_HEAD_VERTS;
  const neck = new THREE.Vector3();
  if (headOk) {
    let k = 0;
    headSet.forEach((r) => {
      if (Y[r] < HEAD_Y_MIN + 0.03) { neck.x += P[3 * r]; neck.z += P[3 * r + 2]; k++; }
    });
    if (k) { neck.x /= k; neck.z /= k; } else { neck.x = mx; neck.z = mz; }
    neck.y = box.min.y + HEAD_Y_MIN * H;
  }

  // separar triangulos: dos de tres vertices en el brazo => del brazo
  const bodyIdx: number[] = [];
  const upperTris: number[] = [];
  const foreTris: number[] = [];
  const headTris: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    const votes = +armSet.has(rep[a]) + +armSet.has(rep[b]) + +armSet.has(rep[c]);
    const hv = headOk ? +headSet.has(rep[a]) + +headSet.has(rep[b]) + +headSet.has(rep[c]) : 0;
    if (votes < 2 && hv >= 2) { headTris.push(a, b, c); continue; }
    if (votes < 2) { bodyIdx.push(a, b, c); continue; }
    const cy = (Y[a] + Y[b] + Y[c]) / 3;
    (cy < ELBOW_Y ? foreTris : upperTris).push(a, b, c);
  }
  geo.setIndex(bodyIdx);

  // normales: se rotan con la parte lineal de (esqueleto + matrixWorld), medida sobre una base unitaria
  const lin = new THREE.Matrix3();
  {
    const rawPos = new THREE.Vector3().fromBufferAttribute(geo.attributes['position'] as THREE.BufferAttribute, 0);
    const toModel = (p: THREE.Vector3) => mesh.applyBoneTransform(0, p).applyMatrix4(mesh.matrixWorld);
    const origin = toModel(rawPos.clone());
    const cols = [0, 1, 2].map((k) => toModel(rawPos.clone().setComponent(k, rawPos.getComponent(k) + 1)).sub(origin));
    lin.set(cols[0].x, cols[1].x, cols[2].x, cols[0].y, cols[1].y, cols[2].y, cols[0].z, cols[1].z, cols[2].z);
  }
  const nrm = lin.clone().invert().transpose();

  const nAttr = geo.attributes['normal'] as THREE.BufferAttribute | undefined;
  const uvAttr = geo.attributes['uv'] as THREE.BufferAttribute | undefined;
  const makePart = (tris: number[], pivot: THREE.Vector3): THREE.Mesh => {
    const map = new Map<number, number>();
    const pos: number[] = [], nor: number[] = [], uv: number[] = [], ind: number[] = [];
    const nv = new THREE.Vector3();
    for (const i of tris) {
      let k = map.get(i);
      if (k === undefined) {
        k = map.size;
        map.set(i, k);
        pos.push(P[3 * i] - pivot.x, P[3 * i + 1] - pivot.y, P[3 * i + 2] - pivot.z);
        if (nAttr) nv.fromBufferAttribute(nAttr, i).applyMatrix3(nrm).normalize();
        nor.push(nv.x, nv.y, nv.z);
        if (uvAttr) uv.push(uvAttr.getX(i), uvAttr.getY(i));
      }
      ind.push(k);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    if (nAttr) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    if (uvAttr) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(ind);
    const m = new THREE.Mesh(g, mesh.material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  const shoulder = new THREE.Group();
  shoulder.position.copy(shoulderPos);
  shoulder.add(makePart(upperTris, shoulderPos));
  const elbow = new THREE.Group();
  elbow.position.copy(elbowPos).sub(shoulderPos);
  elbow.add(makePart(foreTris, elbowPos));
  shoulder.add(elbow);
  model.add(shoulder);
  let head: THREE.Group | null = null;
  if (headOk) {
    head = new THREE.Group();
    head.position.copy(neck);
    head.add(makePart(headTris, neck));
    model.add(head);
  }

  // eje horizontal perpendicular al lateral; el signo hace que un angulo positivo abra el brazo hacia afuera
  const out = new THREE.Vector3(ux * side, 0, uz * side);
  const axis = new THREE.Vector3(0, 1, 0).cross(out).normalize();
  const probe = new THREE.Vector3(0, -1, 0).applyAxisAngle(axis, 0.3);
  if (probe.dot(out) < 0) axis.negate();
  return { shoulder, elbow, axis, head, lateral: new THREE.Vector3(ux, 0, uz) };
}
