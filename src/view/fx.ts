// Pooled 3D effects the arena spawns from game events: additive particles (one InstancedMesh) and rings/lines
// (shockwaves, landing zones, dash lanes). Stepped with the game clock's dt, so stories replay them exactly.
import * as THREE from 'three';

const DRAG_PER_S = 2.2;

/** Glowing sparks (`additive`, colours boosted over the bloom threshold) or lit debris: bone dust, dirt. */
export function createParticles(scene: THREE.Scene, max = 2400, additive = true) {
  const mat = additive
    ? new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    : new THREE.MeshLambertMaterial({ color: 0xffffff });
  const boost = additive ? 2.2 : 1;
  const mesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1, 0), mat, max);
  mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const p = new Float32Array(max * 3), v = new Float32Array(max * 3), life = new Float32Array(max), total = new Float32Array(max), size = new Float32Array(max);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), c = new THREE.Color(), zero = new THREE.Matrix4().makeScale(0, 0, 0), eul = new THREE.Euler();
  let next = 0;
  for (let i = 0; i < max; i++) { mesh.setMatrixAt(i, zero); mesh.setColorAt(i, c.set(0)); }

  /** `count` sparks from (x, y, z) outward at up to `speed` u/s, `sz` u big, living ~`dur` s. */
  function burst(x: number, z: number, color: number, count: number, speed: number, sz = 0.12, dur = 0.6, y = 0.4, up = 0.4) {
    c.set(color).multiplyScalar(boost);
    for (let k = 0; k < count; k++) {
      const i = next; next = (next + 1) % max;
      const a = Math.random() * Math.PI * 2, sp = speed * (0.25 + Math.random() * 0.75);
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
      v[i * 3] = Math.cos(a) * sp; v[i * 3 + 1] = (Math.random() - 0.3) * speed * up; v[i * 3 + 2] = Math.sin(a) * sp;
      total[i] = life[i] = dur * (0.5 + Math.random() * 0.5);
      size[i] = sz * (0.6 + Math.random() * 0.8);
      mesh.setColorAt(i, c);
    }
  }
  /** One spark with a given velocity (engine trails, muzzle flashes). */
  function spark(x: number, z: number, vx: number, vz: number, color: number, sz: number, dur: number, y = 0.3) {
    const i = next; next = (next + 1) % max;
    p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
    v[i * 3] = vx; v[i * 3 + 1] = 0; v[i * 3 + 2] = vz;
    total[i] = life[i] = dur; size[i] = sz;
    mesh.setColorAt(i, c.set(color).multiplyScalar(boost));
  }
  function update(dt: number) {
    const drag = Math.exp(-DRAG_PER_S * dt);
    for (let i = 0; i < max; i++) {
      if (life[i]! <= 0) continue;
      life[i]! -= dt;
      if (life[i]! <= 0) { mesh.setMatrixAt(i, zero); continue; }
      v[i * 3]! *= drag; v[i * 3 + 1]! *= drag; v[i * 3 + 2]! *= drag;
      p[i * 3]! += v[i * 3]! * dt; p[i * 3 + 1]! += v[i * 3 + 1]! * dt; p[i * 3 + 2]! += v[i * 3 + 2]! * dt;
      const k = size[i]! * (life[i]! / total[i]!);
      q.setFromEuler(eul.set(life[i]! * 7, i, life[i]! * 5));
      m.compose(pos.set(p[i * 3]!, p[i * 3 + 1]!, p[i * 3 + 2]!), q, s.set(k, k, k));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }
  return { burst, spark, update };
}

/**
 * The telegraph material: not flat vector shapes but carved sigils. A ring is a band of rune ticks with a noisy,
 * flickering edge; a landing zone is a filled circle of concentric bands with a rune rim; a lane is a runner of
 * chevrons crawling along it; a column fades up. `uKind` picks which (0 ring, 1 fill, 2 line, 3 column).
 */
function sigilMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 1 }, uTime: { value: 0 }, uKind: { value: 0 } },
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec3 vLocal; varying vec2 vUv;
      void main() { vLocal = position; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity, uTime; uniform int uKind;
      varying vec3 vLocal; varying vec2 vUv;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      void main() {
        float a = 0.0;
        if (uKind == 0 || uKind == 1) {
          float r = length(vLocal.xz), ang = atan(vLocal.z, vLocal.x);
          float seg = floor((ang + 3.14159) / 6.28318 * 36.0), f = fract((ang + 3.14159) / 6.28318 * 36.0);
          // Rune ticks: each of 36 segments carries a short mark at a hashed depth.
          float tick = step(0.3, f) * step(f, 0.55) * step(abs(r - 0.93 + 0.04 * (hash(seg) - 0.5)), 0.035);
          float edge = smoothstep(0.012, 0.0, abs(r - 0.995)) + smoothstep(0.012, 0.0, abs(r - 0.865));
          float flicker = 0.75 + 0.25 * sin(uTime * 17.0 + seg * 1.7);
          if (uKind == 0) a = (edge * 0.9 + tick * 1.2) * flicker;
          else a = smoothstep(1.0, 0.0, r) * 0.25 * (0.6 + 0.4 * sin(r * 40.0 - uTime * 6.0)) + (smoothstep(0.02, 0.0, abs(r - 0.97)) + tick * step(0.86, r)) * flicker;
        } else if (uKind == 2) {
          // Chevrons crawling from the start of the lane to its end, brighter at the edges.
          float x = vUv.x, y = abs(vUv.y - 0.5) * 2.0;
          float chev = step(fract(x * 10.0 - y * 0.6 - uTime * 3.0), 0.35);
          a = chev * 0.8 + smoothstep(0.8, 1.0, y) * 0.7;
        } else {
          a = 1.0 - vUv.y;
        }
        gl_FragColor = vec4(uColor * a, 1.0) * uOpacity;
      }`,
  });
}

type Fx = { mesh: THREE.Mesh; t: number; dur: number; r0: number; r1: number; kind: 'ring' | 'fill' | 'line' | 'column'; blink: boolean };

/** Rings on the floor (expanding shockwaves, closing landing zones), glowing lanes and light columns. */
export function createRings(scene: THREE.Scene, max = 64) {
  const ringGeo = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  const lineGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const colGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0);
  const pool: Fx[] = [];
  for (let i = 0; i < max; i++) {
    const mesh = new THREE.Mesh(ringGeo, sigilMaterial());
    mesh.visible = false;
    mesh.renderOrder = 2;
    scene.add(mesh);
    pool.push({ mesh, t: 0, dur: 0, r0: 0, r1: 0, kind: 'ring', blink: false });
  }
  let next = 0;
  function take(kind: Fx['kind'], color: number, dur: number, boost: number) {
    const f = pool[next]!; next = (next + 1) % max;
    f.kind = kind; f.t = 0; f.dur = dur; f.blink = false;
    f.mesh.geometry = kind === 'fill' ? discGeo : kind === 'line' ? lineGeo : kind === 'column' ? colGeo : ringGeo;
    const u = (f.mesh.material as THREE.ShaderMaterial).uniforms;
    u.uColor!.value.set(color).multiplyScalar(boost);
    u.uKind!.value = { ring: 0, fill: 1, line: 2, column: 3 }[kind];
    f.mesh.visible = true;
    f.mesh.rotation.set(0, 0, 0);
    return f;
  }
  return {
    /** An expanding ring from r0 to r1 u over dur s (a shockwave), or with fill a disc closing in (a landing zone). */
    ring(x: number, z: number, r0: number, r1: number, dur: number, color: number, o: { fill?: boolean; blink?: boolean; boost?: number } = {}) {
      const f = take(o.fill ? 'fill' : 'ring', color, dur, o.boost ?? 2);
      f.r0 = r0; f.r1 = r1; f.blink = !!o.blink;
      f.mesh.position.set(x, 0.05, z);
    },
    /** A lane from (x, z) to (tx, tz), `w` u wide: a dash warning. */
    line(x: number, z: number, tx: number, tz: number, w: number, dur: number, color: number) {
      const f = take('line', color, dur, 2.2);
      f.blink = true;
      f.r0 = f.r1 = w;
      const len = Math.hypot(tx - x, tz - z);
      f.mesh.position.set((x + tx) / 2, 0.06, (z + tz) / 2);
      f.mesh.rotation.y = -Math.atan2(tz - z, tx - x);
      f.mesh.scale.set(len, 1, w);
    },
    /** A column of light rising from the floor (warp gates, blink marks). */
    column(x: number, z: number, r: number, h: number, dur: number, color: number) {
      const f = take('column', color, dur, 1.6);
      f.r0 = r; f.r1 = h;
      f.mesh.position.set(x, 0, z);
    },
    update(dt: number) {
      for (const f of pool) {
        if (!f.mesh.visible) continue;
        f.t += dt;
        const k = Math.min(1, f.t / f.dur), u = (f.mesh.material as THREE.ShaderMaterial).uniforms, mat = { set opacity(v: number) { u.uOpacity!.value = v; } };
        u.uTime!.value = f.t;
        if (k >= 1) { f.mesh.visible = false; continue; }
        const flick = f.blink ? 0.55 + 0.45 * Math.sin(f.t * 30) : 1;
        if (f.kind === 'ring') { const r = f.r0 + (f.r1 - f.r0) * (1 - (1 - k) ** 3); f.mesh.scale.set(r, 1, r); mat.opacity = (1 - k) * flick; }
        else if (f.kind === 'fill') { const r = f.r0 + (f.r1 - f.r0) * k; f.mesh.scale.set(r, 1, r); mat.opacity = (0.15 + 0.5 * k) * flick; }
        else if (f.kind === 'line') { mat.opacity = 0.3 * flick * (1 - k * 0.3); }
        else { const grow = Math.sin(k * Math.PI); f.mesh.scale.set(f.r0 * (0.4 + grow * 0.6), f.r1 * grow, f.r0 * (0.4 + grow * 0.6)); mat.opacity = 0.3 * grow; }
      }
    },
  };
}
