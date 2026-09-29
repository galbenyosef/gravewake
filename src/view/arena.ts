// The 3D arena: reads the run each frame and keeps Three objects in step with it (the core owns positions; this
// owns meshes, materials, camera and post-processing), and turns the step's events into particles, rings, floor
// ripples, screen shake and sound. Colours come from the palette through tokens.ts.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { enemyDef } from '../content';
import { sfx } from '../audio';
import { T } from '../tuning';
import { enemyColor, token } from '../tokens';
import type { GameEvent, GameState } from '../world';
import { createParticles, createRings } from './fx';
import { bodyMaterial, buildEnemy, buildShield, buildShip, glowMaterial, shared, type Part } from './models';

const HALF_W = T.ARENA_W_U / 2, HALF_H = T.ARENA_H_U / 2;
/** Camera: tilt from straight down, and how much it follows the ship (0 = fixed on the centre, 1 = locked to the ship). */
const TILT_RAD = 0.52, FOLLOW = 0.32, FOV_DEG = 38;
/** Distance that fits the arena's height (with the follow slack) on screen. */
const CAM_DIST_U = 31;
const MAX_RIPPLES = 8;
const LOB_ARC_U = 3.2;
const SHAKE_DECAY_PER_S = 5;

const floorShader = {
  uniforms: {
    uTime: { value: 0 }, uGrid: { value: new THREE.Color() }, uFloor: { value: new THREE.Color() }, uWall: { value: new THREE.Color() },
    uPlayer: { value: new THREE.Vector2() }, uHalf: { value: new THREE.Vector2(HALF_W, HALF_H) },
    uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0)) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vPos;
    void main() { vPos = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; uniform vec3 uGrid; uniform vec3 uFloor; uniform vec3 uWall; uniform vec2 uPlayer; uniform vec2 uHalf;
    uniform vec4 uRipples[${MAX_RIPPLES}];
    varying vec2 vPos;
    float gridLine(vec2 p, float cell, float width) {
      vec2 g = abs(fract(p / cell - 0.5) - 0.5) / (fwidth(p / cell) * width);
      return 1.0 - min(min(g.x, g.y), 1.0);
    }
    void main() {
      vec2 p = vPos; float wave = 0.0;
      for (int i = 0; i < ${MAX_RIPPLES}; i++) {
        vec4 r = uRipples[i];
        if (r.w <= 0.0) continue;
        vec2 d = p - r.xy; float dist = length(d), front = r.z * 16.0;
        float band = exp(-pow((dist - front) * 0.9, 2.0)) * r.w * max(0.0, 1.0 - r.z / 1.4);
        wave += band;
        p -= normalize(d + 1e-4) * band * 0.35;
      }
      float minor = gridLine(p, 1.0, 1.2), major = gridLine(p, 4.0, 1.6);
      vec2 inside = step(abs(vPos), uHalf);
      float inArena = inside.x * inside.y;
      float dp = length(vPos - uPlayer), pool = exp(-dp * dp * 0.015);
      float edge = max(abs(vPos.x) - uHalf.x, abs(vPos.y) - uHalf.y);
      float rim = exp(-abs(edge) * 2.5) * 0.6;
      float pulse = 0.85 + 0.15 * sin(uTime * 1.3 + vPos.x * 0.15);
      vec3 col = uFloor;
      col += uGrid * (minor * 0.10 + major * 0.28) * (0.45 + pool * 1.4) * pulse * mix(0.25, 1.0, inArena);
      col += uGrid * wave * 0.5 + vec3(0.9, 0.95, 1.0) * wave * wave * 0.08;
      col += uWall * rim * 0.35;
      float fade = exp(-max(edge, 0.0) * 0.12);
      gl_FragColor = vec4(col * fade, 1.0);
    }`,
};

/** Vignette, chromatic aberration and a red hurt wash, after tone mapping. */
const finalShader = {
  uniforms: { tDiffuse: { value: null }, uHurt: { value: 0 }, uAberration: { value: 0.0015 }, uTime: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uHurt; uniform float uAberration; uniform float uTime; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5; float d = length(c);
      float ab = uAberration * (1.0 + uHurt * 5.0) * d * 2.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ab).b);
      col *= 1.0 - smoothstep(0.45, 0.95, d) * 0.65;
      col = mix(col, vec3(1.0, 0.1, 0.18), smoothstep(0.25, 0.8, d) * uHurt * 0.7);
      float grain = fract(sin(dot(vUv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * 0.025;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

type EnemyView = { obj: THREE.Group; body: THREE.MeshStandardMaterial; parts: Part[]; shield?: THREE.Mesh };

export type Arena = ReturnType<typeof createArena>;

export function createArena(el: HTMLElement, cssW: number, cssH: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!import.meta.env.STORYBOOK });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(cssW, cssH);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', display: 'block' });
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(token('--floor')).multiplyScalar(0.5);
  scene.fog = new THREE.Fog(scene.background, 30, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(new THREE.HemisphereLight(0x8aa8ff, 0x100818, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(-8, 20, 6);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(FOV_DEG, cssW / cssH, 0.5, 150);
  const camTarget = new THREE.Vector3();

  // Floor and walls
  const floorU = THREE.UniformsUtils.clone(floorShader.uniforms);
  floorU.uGrid.value.set(token('--grid')); floorU.uFloor.value.set(token('--floor')); floorU.uWall.value.set(token('--wall'));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 100).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ ...floorShader, uniforms: floorU, extensions: { derivatives: true } as never }));
  scene.add(floor);
  const walls = new THREE.Group();
  const wallMat = glowMaterial(token('--wall'), 1.3), wallAlt = glowMaterial(token('--wall-alt'), 1.3);
  for (const [x, z, w, d, m] of [[0, -HALF_H, T.ARENA_W_U, 0.12, wallMat], [0, HALF_H, T.ARENA_W_U, 0.12, wallMat], [-HALF_W, 0, 0.12, T.ARENA_H_U, wallAlt], [HALF_W, 0, 0.12, T.ARENA_H_U, wallAlt]] as const) {
    const bar = new THREE.Mesh(shared.box, m);
    bar.scale.set(w, 0.25, d); bar.position.set(x, 0.12, z);
    walls.add(bar);
  }
  const pylonMat = bodyMaterial(token('--wall-alt'));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const py = new THREE.Mesh(shared.octa, pylonMat);
    py.scale.set(0.55, 1.4, 0.55); py.position.set(sx * HALF_W, 1.2, sz * HALF_H);
    py.userData.spin = true;
    walls.add(py);
  }
  scene.add(walls);

  // The ship
  const ship = buildShip(token('--player'), token('--player-glow'));
  scene.add(ship);
  const shipLight = new THREE.PointLight(token('--player-glow'), 30, 12, 1.6);
  scene.add(shipLight);
  const aimLine = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0), glowMaterial(token('--player-glow'), 1.5, 0.25));
  scene.add(aimLine);

  // Instanced shots and pickups
  const inst = (g: THREE.BufferGeometry, m: THREE.Material, n: number) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.count = 0; scene.add(im); return im; };
  const bolts = inst(new THREE.CapsuleGeometry(0.09, 0.7, 2, 6).rotateZ(Math.PI / 2), glowMaterial(token('--player-shot'), 3), 600);
  const orbs = inst(new THREE.SphereGeometry(1, 12, 8), glowMaterial(token('--enemy-shot'), 2.6), 800);
  const halos = inst(new THREE.SphereGeometry(1, 12, 8), glowMaterial(token('--enemy-shot'), 1.2, 0.35), 800);
  const lobs = inst(new THREE.IcosahedronGeometry(0.4, 0), glowMaterial(token('--lob'), 3), 64);
  const shards = inst(new THREE.OctahedronGeometry(0.22, 0), glowMaterial(token('--shard'), 2.4), 600);
  const repairs = inst(new THREE.OctahedronGeometry(0.4, 0), glowMaterial(token('--repair'), 2.6), 16);

  const particles = createParticles(scene);
  const rings = createRings(scene);

  // Post
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(cssW / 2, cssH / 2), 0.85, 0.4, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const final = new ShaderPass(finalShader);
  composer.addPass(final);

  const enemies = new Map<number, EnemyView>();
  const warps = new Map<number, THREE.Object3D>();
  const ripples: THREE.Vector4[] = floorU.uRipples.value;
  let rippleNext = 0, shake = 0, hurt = 0, time = 0, last: GameState | null = null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  const ripple = (x: number, z: number, strength: number) => { ripples[rippleNext]!.set(x, z, 0, strength); rippleNext = (rippleNext + 1) % MAX_RIPPLES; };

  function makeEnemy(kind: string): EnemyView {
    const d = enemyDef(kind), col = enemyColor(kind), body = bodyMaterial(col);
    const obj = buildEnemy(d.model, d.r, body, glowMaterial(col, 3));
    const parts: Part[] = [];
    obj.traverse((o) => { if ((o as Part).userData.spin) parts.push(o as Part); });
    const arc = d.behaviours.find((b) => b.shieldArcDeg)?.shieldArcDeg;
    let shield: THREE.Mesh | undefined;
    if (arc) { shield = buildShield(arc, token('--shield')); scene.add(shield); }
    scene.add(obj);
    return { obj, body, parts, shield };
  }
  function dropEnemy(v: EnemyView) {
    scene.remove(v.obj); v.body.dispose();
    if (v.shield) { scene.remove(v.shield); (v.shield.material as THREE.Material).dispose(); v.shield.geometry.dispose(); }
  }

  function onEvent(e: GameEvent, s: GameState) {
    switch (e.type) {
      case 'fire': {
        sfx('fire');
        const nx = Math.cos(e.angle), nz = Math.sin(e.angle);
        for (let i = 0; i < 2; i++) particles.spark(e.x + nx * 0.6, e.y + nz * 0.6, nx * 6 + (Math.random() - 0.5) * 3, nz * 6 + (Math.random() - 0.5) * 3, token('--player-shot'), 0.07, 0.12);
        break;
      }
      case 'hit': sfx('hit'); particles.burst(e.x, e.y, enemyColor(e.kind), 4, 7, 0.08, 0.25); break;
      case 'kill': {
        const d = enemyDef(e.kind), col = enemyColor(e.kind), big = d.tier === 'boss';
        sfx(big || d.tier === 'elite' ? 'big-kill' : 'kill');
        particles.burst(e.x, e.y, col, big ? 260 : 16 + d.r * 30, big ? 22 : 9 + d.r * 5, big ? 0.3 : 0.14 + d.r * 0.05, big ? 1.6 : 0.8);
        particles.burst(e.x, e.y, 0xffffff, big ? 60 : 6, big ? 16 : 6, 0.08, 0.4);
        rings.ring(e.x, e.y, d.r * 0.5, d.r * (big ? 12 : 4), big ? 1.4 : 0.5, col);
        if (big) rings.column(e.x, e.y, 2.5, 14, 1.2, col);
        ripple(e.x, e.y, big ? 2.5 : Math.min(1.2, 0.35 + d.r * 0.5));
        shake = Math.max(shake, big ? 1.4 : Math.min(0.5, d.r * 0.3));
        break;
      }
      case 'hurt': sfx('hurt'); hurt = 1; shake = Math.max(shake, 0.8); particles.burst(e.x, e.y, token('--danger'), 30, 10, 0.12, 0.6); ripple(e.x, e.y, 1); break;
      case 'warp': sfx('warp'); break;
      case 'arrive': { const d = enemyDef(e.kind); particles.burst(e.x, e.y, token('--warp'), 12 + d.r * 10, 5, 0.1, 0.5); rings.ring(e.x, e.y, d.r, d.r * 2.5, 0.4, token('--warp')); break; }
      case 'telegraph':
        if (e.what === 'dash') rings.line(e.x, e.y, e.tx, e.ty, 0.9, e.dur + 0.2, token('--telegraph'));
        else if (e.what === 'lob') { const r = s.shots.find((b) => b.lob && b.tx === e.tx && b.ty === e.ty)?.blast ?? 2; rings.ring(e.tx, e.ty, r, r, e.dur, token('--lob'), { blink: true }); rings.ring(e.tx, e.ty, 0.1, r, e.dur, token('--lob'), { fill: true }); }
        else { rings.ring(e.tx, e.ty, 1.4, 0.4, e.dur, token('--blink'), { blink: true }); rings.column(e.tx, e.ty, 0.5, 5, e.dur + 0.2, token('--blink')); }
        break;
      case 'blast': sfx('blast'); particles.burst(e.x, e.y, token('--enemy-shot'), 40, e.r * 5, 0.16, 0.7); rings.ring(e.x, e.y, 0.3, e.r * 1.3, 0.45, token('--lob')); ripple(e.x, e.y, 1.1); shake = Math.max(shake, 0.35); break;
      case 'block': particles.burst(e.x, e.y, token('--shield'), 6, 8, 0.07, 0.25); break;
      case 'heal': particles.burst(e.x, e.y, token('--heal'), 3, 1.5, 0.1, 0.8, 0.6, 2); break;
      case 'enemy-fire': sfx('enemy-fire'); break;
      case 'pickup': sfx('pickup'); particles.burst(e.x, e.y, e.kind === 'shard' ? token('--shard') : token('--repair'), e.kind === 'shard' ? 3 : 20, 3, 0.07, 0.3); break;
      case 'wave': sfx('wave'); break;
      case 'cleared': ripple(s.player.x, s.player.y, 2); rings.ring(s.player.x, s.player.y, 0.5, 30, 1.6, token('--player-glow')); break;
      case 'upgrade': sfx('upgrade'); rings.ring(s.player.x, s.player.y, 0.5, 3, 0.6, token('--shard')); break;
      case 'dead': sfx('dead'); particles.burst(s.player.x, s.player.y, token('--player-glow'), 300, 18, 0.2, 1.8); rings.ring(s.player.x, s.player.y, 0.5, 20, 1.5, token('--danger')); ripple(s.player.x, s.player.y, 3); shake = 1.6; break;
    }
  }

  /** Bring the scene in step with the run and advance effects by dt (game-clock seconds). */
  function sync(s: GameState, dt: number) {
    time += dt;
    if (s !== last) { for (const e of s.events) onEvent(e, s); last = s; }

    // ship
    const p = s.player, dead = s.phase === 'dead';
    ship.visible = !dead && !(p.invuln > 0 && Math.floor(time * 14) % 2 === 0);
    ship.position.set(p.x, 0.35 + Math.sin(time * 3) * 0.05, p.y);
    ship.rotation.set(0, -Math.atan2(p.ay, p.ax), 0);
    ship.rotateX(-p.vy * 0.02 * Math.sign(p.ax || 1));
    shipLight.position.set(p.x, 2.2, p.y);
    shipLight.visible = !dead;
    aimLine.visible = !dead && s.phase === 'fight';
    aimLine.position.set(p.x, 0.08, p.y); aimLine.rotation.y = -Math.atan2(p.ay, p.ax); aimLine.scale.set(5, 1, 0.05);
    const speed = Math.hypot(p.vx, p.vy);
    if (!dead && speed > 1 && dt > 0) {
      const bx = p.x - (p.vx / speed) * 0.45, bz = p.y - (p.vy / speed) * 0.45;
      particles.spark(bx, bz, -p.vx * 0.3 + (Math.random() - 0.5), -p.vy * 0.3 + (Math.random() - 0.5), token('--player-glow'), 0.1, 0.3, 0.35);
    }
    floorU.uPlayer.value.set(p.x, p.y);

    // enemies
    const seen = new Set<number>();
    for (const e of s.enemies) {
      seen.add(e.id);
      let v = enemies.get(e.id);
      if (!v) { v = makeEnemy(e.kind); enemies.set(e.id, v); }
      const d = enemyDef(e.kind), grow = Math.min(1, e.age / 0.25);
      v.obj.position.set(e.x, d.r * 0.9 + Math.sin(time * 2 + e.id) * 0.08, e.y);
      v.obj.rotation.y = -e.facing;
      v.obj.scale.setScalar(d.r * (0.3 + 0.7 * grow) * (1 + (e.flash > 0 ? 0.12 : 0)));
      v.body.emissiveIntensity = e.flash > 0 ? 3 : 0.35 + (1 - e.hp / e.maxHp) * 0.4 + Math.sin(time * 4 + e.id) * 0.08;
      for (const part of v.parts) { const w = part.userData.spin!; part.rotation.x += w.x * dt; part.rotation.y += w.y * dt; part.rotation.z += w.z * dt; }
      if (v.shield) { v.shield.position.set(e.x, d.r * 0.9, e.y); v.shield.rotation.y = -e.facing; v.shield.scale.setScalar(d.r); }
    }
    for (const [id, v] of enemies) if (!seen.has(id)) { dropEnemy(v); enemies.delete(id); }

    // warp gates
    const gates = new Set<number>();
    for (const g of s.warps) {
      gates.add(g.id);
      let o = warps.get(g.id);
      if (!o) {
        const r = enemyDef(g.kind).r;
        o = new THREE.Group();
        const ringMesh = new THREE.Mesh(shared.thinTorus, glowMaterial(token('--warp'), 3));
        ringMesh.rotation.x = Math.PI / 2;
        o.add(ringMesh, new THREE.Mesh(shared.torus, glowMaterial(enemyColor(g.kind), 2, 0.5)));
        o.scale.setScalar(r * 1.6);
        o.position.set(g.x, 0.1, g.y);
        scene.add(o);
        warps.set(g.id, o);
        rings.column(g.x, g.y, r * 0.9, 6, T.WARP_S + 0.2, token('--warp'));
      }
      const k = 1 - g.t / T.WARP_S;
      o.rotation.y += dt * 6;
      o.children[1]!.rotation.x = Math.PI / 2; o.children[1]!.scale.setScalar(1 - k * 0.7);
      o.children[0]!.scale.setScalar(0.4 + k);
    }
    for (const [id, o] of warps) if (!gates.has(id)) { scene.remove(o); warps.delete(id); }

    // shots
    let nb = 0, no = 0, nl = 0;
    for (const b of s.shots) {
      if (b.lob) {
        const t = 1 - b.life / T.LOB_FLIGHT_S;
        m4.compose(v3.set(b.x, 0.6 + 4 * LOB_ARC_U * t * (1 - t), b.y), q.setFromAxisAngle(up, time * 5), s3.set(1, 1, 1));
        lobs.setMatrixAt(nl++, m4);
      } else if (b.hostile) {
        const pulse = 1 + Math.sin(time * 20 + b.id) * 0.15;
        m4.compose(v3.set(b.x, 0.5, b.y), q.identity(), s3.setScalar(b.r * pulse));
        orbs.setMatrixAt(no, m4);
        m4.compose(v3, q, s3.setScalar(b.r * 2.2 * pulse));
        halos.setMatrixAt(no++, m4);
      } else {
        m4.compose(v3.set(b.x, 0.45, b.y), q.setFromAxisAngle(up, -Math.atan2(b.vy, b.vx)), s3.set(1, 1, 1));
        bolts.setMatrixAt(nb++, m4);
      }
    }
    bolts.count = nb; orbs.count = no; halos.count = no; lobs.count = nl;
    let ns = 0, nr = 0;
    for (const k of s.pickups) {
      const blink = k.life < 2 && Math.floor(time * 10) % 2 === 0 ? 0.001 : 1;
      m4.compose(v3.set(k.x, 0.4 + Math.sin(time * 4 + k.id) * 0.1, k.y), q.setFromAxisAngle(up, time * 3 + k.id), s3.setScalar(blink));
      if (k.kind === 'shard') shards.setMatrixAt(ns++, m4); else repairs.setMatrixAt(nr++, m4);
    }
    shards.count = ns; repairs.count = nr;
    for (const im of [bolts, orbs, halos, lobs, shards, repairs]) im.instanceMatrix.needsUpdate = true;

    // effects
    particles.update(dt);
    rings.update(dt);
    for (const r of ripples) if (r.w > 0) { r.z += dt; if (r.z > 1.4) r.w = 0; }
    for (const o of walls.children) if (o.userData.spin) o.rotation.y += dt * 1.2;
    floorU.uTime.value = time;
    shake = Math.max(0, shake - dt * SHAKE_DECAY_PER_S * Math.max(0.3, shake));
    hurt = Math.max(0, hurt - dt * 1.8);
    final.uniforms.uHurt!.value = hurt;
    final.uniforms.uTime!.value = time % 100;

    // camera
    camTarget.lerp(v3.set(p.x * FOLLOW, 0, p.y * FOLLOW), dt > 0 ? Math.min(1, dt * 4) : 0);
    const jx = (Math.random() - 0.5) * shake, jz = (Math.random() - 0.5) * shake;
    camera.position.set(camTarget.x + jx, camTarget.y + Math.cos(TILT_RAD) * CAM_DIST_U, camTarget.z + Math.sin(TILT_RAD) * CAM_DIST_U + jz);
    camera.lookAt(camTarget.x + jx * 0.5, 0, camTarget.z + jz * 0.5);
  }

  return {
    sync,
    render: () => composer.render(),
    resize(w: number, h: number) {
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.resolution.set(w / 2, h / 2);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    /** A world point's position in CSS px on the canvas (mouse aiming). */
    toScreen(x: number, y: number) {
      const v = new THREE.Vector3(x, 0.35, y).project(camera), r = renderer.domElement.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    /** Snap the camera to the ship (a story's first frame shouldn't pan in from the centre). */
    snap(s: GameState) { camTarget.set(s.player.x * FOLLOW, 0, s.player.y * FOLLOW); last = null; },
    canvas: renderer.domElement,
  };
}
