// One mesh factory per enemy model (content.ts MODELS; the Record type makes the set total), plus the ship.
// Every model is built at unit radius from shared geometry, lit faceted metal with an emissive body in the enemy's
// palette colour, so bloom makes it glow. Parts tagged `spin` turn on their own; the arena spins them.
import * as THREE from 'three';
import type { Model } from '../content';

export type Part = THREE.Object3D & { userData: { spin?: THREE.Vector3; body?: boolean } };

const geo = {
  ico1: new THREE.IcosahedronGeometry(1, 1),
  ico0: new THREE.IcosahedronGeometry(1, 0),
  octa: new THREE.OctahedronGeometry(1, 0),
  tetra: new THREE.TetrahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cone4: new THREE.ConeGeometry(1, 1, 4),
  cone6: new THREE.ConeGeometry(1, 1, 6),
  torus: new THREE.TorusGeometry(1, 0.16, 8, 32),
  thinTorus: new THREE.TorusGeometry(1, 0.05, 6, 48),
  star: (() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 0.42 : 1; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    return new THREE.ExtrudeGeometry(s, { depth: 0.35, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 1 }).rotateX(-Math.PI / 2).translate(0, 0.17, 0);
  })(),
  ship: (() => {
    const s = new THREE.Shape();
    s.moveTo(1.1, 0); s.lineTo(-0.7, 0.72); s.lineTo(-0.35, 0); s.lineTo(-0.7, -0.72); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.06, bevelSegments: 1 }).rotateX(-Math.PI / 2).translate(0, 0.1, 0);
  })(),
};

/** The shared body material for one enemy colour; each enemy gets a clone so its hit flash is its own. */
export function bodyMaterial(color: number) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.7), emissive: c, emissiveIntensity: 0.35, metalness: 0.55, roughness: 0.3, flatShading: true });
}
/** Unlit, over-bright, so bloom picks it up: cores, halos, wires. */
export function glowMaterial(color: number, boost = 2.5, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), transparent: opacity < 1, opacity, blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: opacity >= 1 });
}

function part(g: THREE.BufferGeometry, m: THREE.Material, o: { s?: [number, number, number] | number; p?: [number, number, number]; r?: [number, number, number]; spin?: [number, number, number]; body?: boolean } = {}): Part {
  const mesh = new THREE.Mesh(g, m) as unknown as Part;
  const s = o.s ?? 1;
  if (typeof s === 'number') mesh.scale.setScalar(s); else mesh.scale.set(...s);
  if (o.p) mesh.position.set(...o.p);
  if (o.r) mesh.rotation.set(...o.r);
  if (o.spin) mesh.userData.spin = new THREE.Vector3(...o.spin);
  mesh.userData.body = o.body ?? true;
  return mesh;
}
const group = (...parts: THREE.Object3D[]) => { const g = new THREE.Group(); g.add(...parts); return g; };
/** `n` copies of a part around the Y axis. */
const around = (n: number, make: (a: number) => THREE.Object3D) => group(...Array.from({ length: n }, (_, i) => make((i / n) * Math.PI * 2)));

/** The edges of a geometry as glowing lines, spinning. */
function wire(g: THREE.BufferGeometry, glow: THREE.Material, scale: number, spin: [number, number, number]): Part {
  const w = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: (glow as THREE.MeshBasicMaterial).color })) as unknown as Part;
  w.scale.setScalar(scale);
  w.userData.spin = new THREE.Vector3(...spin);
  return w;
}

type Build = (body: THREE.Material, glow: THREE.Material) => THREE.Object3D;

const MODELS: Record<Model, Build> = {
  orb: (b, g) => group(part(geo.ico1, b, { s: 0.85, spin: [0.6, 1.1, 0] }), part(geo.sphere, g, { s: 0.38, body: false })),
  shard: (b) => part(geo.octa, b, { s: [0.55, 1, 0.55], r: [0, 0, Math.PI / 2], spin: [3, 0, 0] }),
  dart: (b, g) => group(part(geo.cone4, b, { s: [0.6, 1.9, 0.6], r: [0, 0, -Math.PI / 2] }), part(geo.sphere, g, { s: 0.22, p: [-0.75, 0, 0], body: false })),
  ring: (b, g) => group(part(geo.torus, b, { s: 0.85, r: [Math.PI / 2, 0, 0], spin: [0, 0, 2.5] }), part(geo.ico0, g, { s: 0.3, spin: [2, 3, 0], body: false }),
    part(geo.thinTorus, g, { s: 1.15, r: [Math.PI / 2 + 0.4, 0, 0], spin: [0, 1.5, 0], body: false })),
  spike: (b, g) => group(part(geo.ico0, b, { s: 0.6, spin: [1.5, 2.5, 0] }), around(8, (a) => part(geo.cone4, b, { s: [0.18, 0.7, 0.18], p: [Math.cos(a) * 0.65, 0, Math.sin(a) * 0.65], r: [Math.PI / 2, 0, -a + Math.PI / 2] })),
    part(geo.sphere, g, { s: 0.3, body: false })),
  cube: (b) => group(part(geo.box, b, { s: 1.25, spin: [0, 0.4, 0] }), part(geo.box, b, { s: [0.5, 1.7, 0.5] })),
  hive: (b, g) => group(part(geo.dodeca, b, { s: 0.9, spin: [0, 0.5, 0] }), wire(geo.ico1, g, 1.35, [0.3, -0.8, 0.2]), part(geo.sphere, g, { s: 0.35, body: false })),
  eye: (b, g) => group(part(geo.sphere, b, { s: [1, 0.55, 1] }), part(geo.torus, g, { s: 0.55, r: [Math.PI / 2, 0, 0], p: [0, 0.45, 0], body: false }), part(geo.sphere, g, { s: 0.22, p: [0, 0.5, 0], body: false }),
    part(geo.thinTorus, g, { s: 1.3, r: [Math.PI / 2, 0, 0], spin: [0, 0, -3], body: false })),
  prism: (b, g) => group(part(geo.tetra, b, { s: 1, spin: [0.9, 1.3, 0.4] }), part(geo.tetra, g, { s: 0.45, spin: [-1.2, -1, 0], body: false })),
  star: (b, g) => group(part(geo.star, b, { s: 1, spin: [0, 1.8, 0] }), part(geo.sphere, g, { s: 0.28, p: [0, 0.3, 0], body: false })),
  crown: (b, g) => group(part(geo.cone6, b, { s: [0.9, 0.8, 0.9], r: [Math.PI, 0, 0] }),
    around(6, (a) => part(geo.cone4, b, { s: [0.14, 0.6, 0.14], p: [Math.cos(a) * 0.75, 0.55, Math.sin(a) * 0.75] })), part(geo.sphere, g, { s: 0.3, p: [0, 0.45, 0], body: false })),
  core: (b, g) => group(part(geo.ico1, b, { s: 0.7, spin: [0.4, 0.9, 0] }), part(geo.sphere, g, { s: 0.45, body: false }),
    (() => { const wings = around(6, (a) => part(geo.octa, b, { s: [0.9, 0.08, 0.22], p: [Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35], r: [0, -a, 0] })) as Part; wings.userData.spin = new THREE.Vector3(0, 0.8, 0); return wings; })(),
    part(geo.thinTorus, g, { s: 1.05, r: [Math.PI / 2, 0, 0], spin: [0.2, 0, 1], body: false })),
  titan: (b, g) => group(part(geo.octa, b, { s: 1, spin: [0, 0.3, 0] }), part(geo.sphere, g, { s: 0.42, body: false }),
    part(geo.torus, b, { s: 1.25, r: [Math.PI / 2, 0, 0], spin: [0, 0, 0.7] }), part(geo.thinTorus, g, { s: 1.5, r: [1.2, 0, 0], spin: [0.5, 1, 0], body: false }),
    around(8, (a) => part(geo.cone4, b, { s: [0.16, 0.55, 0.16], p: [Math.cos(a) * 1.05, 0, Math.sin(a) * 1.05], r: [Math.PI / 2, 0, -a + Math.PI / 2] }))),
};

/** An enemy of `model` at radius `r`: a Group whose scale is r. Its body material is `body` (the caller disposes it). */
export function buildEnemy(model: Model, r: number, body: THREE.Material, glow: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(MODELS[model](body, glow));
  g.scale.setScalar(r);
  return g;
}

/** A frontal shield arc `deg` wide, facing +x at unit radius. */
export function buildShield(deg: number, color: number) {
  const rad = (deg * Math.PI) / 180;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.7, 24, 1, true, Math.PI / 2 - rad / 2, rad), glowMaterial(color, 1.6, 0.55));
  (m.material as THREE.Material).side = THREE.DoubleSide;
  return m;
}

export function buildShip(color: number, glow: number) {
  const hull = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.8), emissive: new THREE.Color(glow), emissiveIntensity: 0.55, metalness: 0.8, roughness: 0.2, flatShading: true });
  const g = group(new THREE.Mesh(geo.ship, hull), part(geo.sphere, glowMaterial(glow, 4), { s: [0.2, 0.12, 0.3], p: [-0.45, 0.15, 0], body: false }));
  g.scale.setScalar(0.85);
  return g;
}

export const shared = geo;
