import * as THREE from 'three';
const FIELD_W = 420;
const FIELD_H = 720;

/** Dibujo de la mesa para la textura del campo de juego. */
function drawField(g: CanvasRenderingContext2D): void {
  g.scale(2, 2);
  const grad = g.createLinearGradient(0, 0, 0, FIELD_H);
  grad.addColorStop(0, '#2a1a62');
  grad.addColorStop(1, '#0a0720');
  g.fillStyle = grad;
  g.fillRect(0, 0, FIELD_W, FIELD_H);
  g.fillStyle = 'rgba(232,246,255,0.4)';
  for (let i = 0; i < 60; i++) g.fillRect(26 + ((i * 97) % 340), 24 + ((i * 53) % 560), 2, 2);
  g.strokeStyle = '#5df2ff';
  g.shadowColor = '#5df2ff';
  g.shadowBlur = 12;
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(210, 210, 190, Math.PI, 0);
  g.moveTo(20, 210);
  g.lineTo(20, 550);
  g.lineTo(126, 640);
  g.moveTo(400, 210);
  g.lineTo(400, 676);
  g.moveTo(372, 190);
  g.lineTo(372, 550);
  g.lineTo(266, 640);
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = '#ff3ea5';
  for (const [x, y] of [[150, 218], [270, 218], [210, 290]]) {
    g.beginPath();
    g.arc(x, y, 24, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = '#ffd84d';
  g.lineWidth = 13;
  g.beginPath();
  g.moveTo(126, 640);
  g.lineTo(180, 666);
  g.moveTo(266, 640);
  g.lineTo(212, 666);
  g.stroke();
}

const std = (color: string, opts: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...opts });

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Máquina de pinball arcade. Su frente (lado del jugador) mira a +Z local;
 * quien la coloca la orienta. Devuelve el grupo y la caja de clic.
 */
export function buildPinballMachine(glow: (color: string, intensity?: number) => THREE.MeshStandardMaterial): {
  group: THREE.Group;
  hit: THREE.Mesh;
} {
  const group = new THREE.Group();
  const body = std('#1a1240', { roughness: 0.4, metalness: 0.3 });
  const trim = std('#ff3ea5', { roughness: 0.3, metalness: 0.4 });
  const metal = std('#8f94b8', { roughness: 0.35, metalness: 0.85 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    group.add(m);
    return m;
  };

  // Patas
  for (const x of [-0.34, 0.34]) {
    for (const z of [-0.78, 0.78]) add(new THREE.BoxGeometry(0.07, 0.8, 0.07), metal, x, 0.4, z);
  }

  // Cuerpo y bordes de la mesa
  add(new THREE.BoxGeometry(0.8, 0.24, 1.76), body, 0, 0.9, 0);
  add(new THREE.BoxGeometry(0.04, 0.12, 1.76), trim, -0.4, 1.06, 0);
  add(new THREE.BoxGeometry(0.04, 0.12, 1.76), trim, 0.4, 1.06, 0);
  add(new THREE.BoxGeometry(0.84, 0.12, 0.04), trim, 0, 1.06, 0.88);

  // Campo de juego inclinado (más alto atrás), con la misma mesa del minijuego
  const tilt = new THREE.Group();
  tilt.position.set(0, 1.03, 0.02);
  tilt.rotation.x = 0.11;
  group.add(tilt);
  const fieldTex = canvasTexture(FIELD_W * 2, FIELD_H * 2, drawField);
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.72 * (FIELD_H / FIELD_W)),
    new THREE.MeshStandardMaterial({ map: fieldTex, emissive: '#ffffff', emissiveMap: fieldTex, emissiveIntensity: 0.55, roughness: 0.4 }),
  );
  field.rotation.x = -Math.PI / 2;
  tilt.add(field);

  // Caja trasera con el marcador
  add(new THREE.BoxGeometry(0.84, 0.78, 0.2), body, 0, 1.52, -0.86);
  add(new THREE.BoxGeometry(0.88, 0.05, 0.24), trim, 0, 1.93, -0.86);
  const topTex = canvasTexture(512, 384, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, '#2a1860');
    grad.addColorStop(1, '#0a0720');
    g.fillStyle = grad;
    g.fillRect(0, 0, 512, 384);
    g.textAlign = 'center';
    g.font = '58px "Press Start 2P", monospace';
    g.fillStyle = '#ff3ea5';
    g.shadowColor = '#ff3ea5';
    g.shadowBlur = 24;
    g.fillText('PINBALL', 256, 170);
    g.fillStyle = '#5df2ff';
    g.shadowColor = '#5df2ff';
    g.font = '26px "Press Start 2P", monospace';
    g.fillText('INSERT COIN', 256, 260);
    g.shadowBlur = 0;
    g.fillStyle = '#ffd84d';
    for (let i = 0; i < 12; i++) g.fillRect(40 + i * 38, 320, 22, 10);
  });
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.7),
    new THREE.MeshStandardMaterial({ map: topTex, emissive: '#ffffff', emissiveMap: topTex, emissiveIntensity: 0.9 }),
  );
  face.position.set(0, 1.52, -0.755);
  group.add(face);

  // Neón en los costados y botones de paleta
  add(new THREE.BoxGeometry(0.02, 0.03, 1.7), glow('#5df2ff', 2.2), -0.41, 0.84, 0);
  add(new THREE.BoxGeometry(0.02, 0.03, 1.7), glow('#5df2ff', 2.2), 0.41, 0.84, 0);
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), glow('#ffd84d', 2), -0.42, 1.0, 0.55).rotation.z = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16), glow('#ffd84d', 2), 0.42, 1.0, 0.55).rotation.z = Math.PI / 2;

  // Caja de clic generosa (la máquina completa)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 1.9), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 1.0, 0);
  hit.userData['action'] = 'pinball';
  group.add(hit);

  return { group, hit };
}
