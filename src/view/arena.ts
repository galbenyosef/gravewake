// The 3D arena: reads the run each frame and keeps Three objects in step with it (the core owns positions; this
// owns meshes, materials, camera and post-processing), and turns the step's events into particles, rings, floor
// ripples, screen shake and sound. Colours come from the palette through tokens.ts.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { enemyDef, radius, SCATTERS, waveDef, type ScatterDef } from '../content';
import { sfx } from '../audio';
import { T } from '../tuning';
import { enemyColor, token } from '../tokens';
import { rayToWall, type GameEvent, type GameState } from '../world';
import { createParticles, createRings } from './fx';
import { BODY_GLOW, MOON_DIR, buildRig, buildShield, buildShip, glowMaterial, lightNight, paintMaterial, restGeometry, shared, type Rig } from './models';
import { LOOK } from './look';

const HALF_W = T.ARENA_W_U / 2, HALF_H = T.ARENA_H_U / 2;
/** Camera: tilt from straight down, and how much it follows the ship (0 = fixed on the centre, 1 = locked to the ship). */
const TILT_RAD = 0.52, FOLLOW = 0.32, FOV_DEG = 38;
/** Distance that fits the arena's height (with the follow slack) on screen. */
const CAM_DIST_U = 31;
const MAX_RIPPLES = 8;
const LOB_ARC_U = 3.2;
const SHAKE_DECAY_PER_S = 5;

/** Floor lights: the ground under each spell, enemy bolt and lobbed round is lit by it (the brightest few). */
const MAX_FLOOR_LIGHTS = LOOK.FLOOR_LIGHTS;

// Shared GLSL: value noise and fbm (the clearing's earth, moss, moon dapple and ground fog are all procedural).
const NOISE = /* glsl */ `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
  // Distance to the nearest cell centre (x) and to the nearest cell edge (y), and the cell's hash (z).
  vec3 cells(vec2 p) {
    vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(x, y), o = vec2(hash(i + g), hash(i + g + 5.3)), r = g + o - f; float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; id = hash(i + g + 9.1); } else if (d < d2) d2 = d;
    }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id);
  }`;

/**
 * The clearing's floor, all procedural, on a lit standard material so the moon's shadows (trees, the dead, the canopy)
 * fall on it: dark earth with rot and moss, leaf litter, sunk stones, root-furrows and standing water, given relief by a
 * height from the same noise. The spells in flight add their own light (uLights, cheap: no point light each).
 */
function floorMaterial() {
  const uniforms = {
    uTime: { value: 0 }, uEarth: { value: new THREE.Color(token('--floor')) }, uMoss: { value: new THREE.Color(token('--moss')) },
    uStone: { value: new THREE.Color(token('--stone')) }, uRelief: { value: LOOK.FLOOR_RELIEF }, uHalf: { value: new THREE.Vector2(HALF_W, HALF_H) },
    uMoon: { value: new THREE.Color(token('--moon')) },
    uRipples: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uLights: { value: Array.from({ length: MAX_FLOOR_LIGHTS }, () => new THREE.Vector4(0, 0, 1, 0)) },
    uLightCol: { value: Array.from({ length: MAX_FLOOR_LIGHTS }, () => new THREE.Color()) },
  };
  const m = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, envMapIntensity: 0.6 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPos = position.xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uRelief; uniform vec3 uEarth, uMoss, uStone, uMoon; uniform vec2 uHalf;
        uniform vec4 uRipples[${MAX_RIPPLES}]; uniform vec4 uLights[${MAX_FLOOR_LIGHTS}]; uniform vec3 uLightCol[${MAX_FLOOR_LIGHTS}];
        varying vec2 vPos;
        ${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec2 p = vPos; float wave = 0.0;
        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          vec4 r = uRipples[i];
          if (r.w <= 0.0) continue;
          float dist = length(p - r.xy), front = r.z * 16.0;
          wave += exp(-pow((dist - front) * 2.2, 2.0)) * r.w * max(0.0, 1.0 - r.z / 1.4);
        }
        // Albedo: earth in broad patches, moss and rot, leaf litter, sunk stones, root-furrows, standing water.
        vec2 warp = p + 1.6 * vec2(fbm(p * 0.15), fbm(p * 0.15 + 5.2));
        float broad = fbm(p * 0.21), fine = vnoise(p * 5.0);
        vec3 alb = uEarth * (0.5 + 1.0 * broad) * (0.85 + 0.3 * fine);
        float moss = smoothstep(0.5, 0.72, fbm(warp * 0.33 + 3.1));
        alb = mix(alb, uMoss * (0.7 + 0.6 * fbm(p * 1.7)), moss * 0.85);
        vec3 leaf = cells(p * 2.6);
        float litter = step(0.55, leaf.z) * smoothstep(0.34, 0.18, leaf.x);
        alb *= 1.0 + litter * (fract(leaf.z * 13.7) - 0.35) * 1.0;
        vec3 stones = cells(p * 0.8 + 40.0);
        float stone = step(0.82, stones.z) * smoothstep(0.28, 0.16, stones.x);
        alb = mix(alb, uStone * 0.3 * (0.6 + fine), stone);
        // Furrows: where old roots ran, soft dark grooves winding through (domain-warped, not a crack net).
        float furrow = smoothstep(0.06, 0.0, abs(fbm(warp * 0.35 + 11.0) - 0.5)) * smoothstep(0.3, 0.6, fbm(p * 0.2 + 2.0));
        alb *= 1.0 - furrow * 0.6;
        float low = 0.5 * broad + stone * 0.3 * smoothstep(0.28, 0.0, stones.x) - furrow * 0.15;
        float wet = smoothstep(0.34, 0.26, low) * smoothstep(0.45, 0.65, fbm(p * 0.4 + 8.0));
        alb *= 1.0 - 0.45 * wet;
        float edge = max(abs(vPos.x) - uHalf.x, abs(vPos.y) - uHalf.y);
        alb *= mix(1.0, 0.4, smoothstep(-1.0, 4.0, edge));
        diffuseColor.rgb = alb;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.95, 0.4, wet);')
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // Relief from the height: the moon rakes across stones, mounds and furrows (three's perturbNormalArb).
          float h = low * uRelief * (1.0 - 0.8 * wet);
          vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
          vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          normal = normalize(abs(det) * normal - grad);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 spell = vec3(0.0);
        for (int i = 0; i < ${MAX_FLOOR_LIGHTS}; i++) {
          vec4 l = uLights[i];
          if (l.w <= 0.0) continue;
          float d = length(p - l.xy) / l.z;
          spell += uLightCol[i] * l.w * exp(-d * d);
        }
        totalEmissiveRadiance += alb * spell + uMoon * wave * 0.012 * (0.5 + broad);`);
  };
  return { material: m, uniforms };
}

/** Low ground fog: drifting fbm veils a hand's height over the floor, moonlit, thicker under the trees. */
const fogShader = {
  uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color() }, uHalf: { value: new THREE.Vector2(HALF_W, HALF_H) }, uVeil: { value: new THREE.Vector2(LOOK.FOG_VEIL, LOOK.FOG_EDGE) } },
  vertexShader: /* glsl */ `
    varying vec2 vPos;
    void main() { vPos = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform float uTime; uniform vec3 uColor; uniform vec2 uHalf, uVeil; varying vec2 vPos;
    ${NOISE}
    void main() {
      vec2 p = vPos * 0.12;
      float f = fbm(p + vec2(uTime * 0.03, uTime * 0.012)) * fbm(p * 1.9 - vec2(uTime * 0.02, -uTime * 0.017) + 4.0);
      float edge = max(abs(vPos.x) - uHalf.x, abs(vPos.y) - uHalf.y);
      float a = smoothstep(0.12, 0.45, f) * uVeil.x + smoothstep(-4.0, 4.0, edge) * uVeil.y;
      gl_FragColor = vec4(uColor, a);
    }`,
};

/** Vignette, a cold grade in the shadows, film grain and a red hurt wash, after tone mapping. */
const finalShader = {
  uniforms: { tDiffuse: { value: null }, uHurt: { value: 0 }, uAberration: { value: 0.0012 }, uTime: { value: 0 }, uHurtCol: { value: new THREE.Color() }, uGradeCol: { value: new THREE.Color() }, uLook: { value: new THREE.Vector4(LOOK.VIGNETTE, LOOK.GRADE, LOOK.GRAIN, LOOK.SATURATION) } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uHurt; uniform float uAberration; uniform float uTime; uniform vec3 uHurtCol, uGradeCol; uniform vec4 uLook; varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5; float d = length(c * vec2(1.0, 0.8));
      float ab = uAberration * (1.0 + uHurt * 5.0) * d * 2.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ab).b);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, mix(uLook.w, 1.0, smoothstep(0.35, 0.8, lum)));
      col = mix(col, vec3(lum) * uGradeCol, uLook.y * (1.0 - smoothstep(0.05, 0.4, lum)));
      col *= 1.0 - smoothstep(0.3, 0.85, d) * uLook.x;
      col = mix(col, uHurtCol, smoothstep(0.25, 0.8, d) * uHurt * 0.7);
      float grain = fract(sin(dot(vUv * (uTime + 1.0), vec2(12.9898, 78.233))) * 43758.5453);
      col += (grain - 0.5) * uLook.z;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

type EnemyView = { rig: Rig; body: THREE.MeshStandardMaterial; shield?: THREE.Mesh; laser?: THREE.Mesh };
/** A killed enemy playing its `die` clip where it fell, `t` s left. */
type Corpse = { rig: Rig; body: THREE.Material; t: number };
/** A melee enemy within this many u of its own edge from the ship lunges (its attack clip). */
const LUNGE_U = 1.4;
const LEGIBLE_U = LOOK.CHARACTER_PAD_U;
/** Spells that leave an ember trail each frame (the rest don't: a full barrage would flood the particle pool). */
const TRAILED_BOLTS = 40;


/**
 * The dead canopy over the clearing, seen only by the moon: a high plane cut by noise into branches and gaps, casting a
 * slow-drifting dapple of shadow on the floor and everyone crossing it. Thin over the middle, thick over the edges.
 */
function canopy() {
  const n = 256, data = new Uint8Array(n * n * 4);
  const h = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vn = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const w = (a: number, b: number) => h(((ix + a) % 16 + 16) % 16, ((iy + b) % 16 + 16) % 16); // tiles every 16 cells
    return (w(0, 0) * (1 - ux) + w(1, 0) * ux) * (1 - uy) + (w(0, 1) * (1 - ux) + w(1, 1) * ux) * uy;
  };
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const u = (x / n) * 16, v = (y / n) * 16;
    const f = 0.5 * vn(u, v) + 0.3 * vn(u * 2, v * 2) + 0.2 * vn(u * 4, v * 4);
    const dx = x / n - 0.5, dy = y / n - 0.5, thin = Math.exp(-(dx * dx + dy * dy) * 9);
    const leaf = f > 0.5 + 0.18 * thin ? 255 : 0;
    data.set([leaf, leaf, leaf, 255], (y * n + x) * 4);
  }
  const tex = new THREE.DataTexture(data, n, n);
  tex.needsUpdate = true;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(110, 80).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }));
  plane.position.y = LOOK.CANOPY_Y_U;
  plane.castShadow = true;
  plane.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaMap: tex, alphaTest: 0.5 });
  return plane;
}

/** A soft round shadow (alpha falls off from the centre), made in code: no image files. */
function blobTexture() {
  const n = 64, data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const d = Math.hypot(x - n / 2 + 0.5, y - n / 2 + 0.5) / (n / 2), a = Math.max(0, 1 - d) ** 1.6;
    const v = Math.round(a * 255);
    data.set([v, v, v, 255], (y * n + x) * 4); // alphaMap reads green
  }
  const t = new THREE.DataTexture(data, n, n);
  t.needsUpdate = true;
  return t;
}

/** The scenery round the clearing (content/arena.kdl): one instanced draw per model and paint, its rest pose, as it
 *  never moves. */
function plantClearing(scene: THREE.Scene) {
  const groups = new Map<string, ScatterDef[]>();
  for (const sc of SCATTERS) { const k = `${sc.model} ${sc.paint} ${sc.glow}`; groups.set(k, [...(groups.get(k) ?? []), sc]); }
  for (const scs of groups.values()) {
    const { model, paint, glow } = scs[0]!, spots = scs.flatMap((sc) => sc.placements);
    const im = new THREE.InstancedMesh(restGeometry(model), paintMaterial(token(paint), token(glow ?? paint), undefined, LOOK.SCENERY_RIM), spots.length);
    im.castShadow = true; im.receiveShadow = true;
    spots.forEach((p, i) => im.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(p.x, 0, p.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -p.yaw), new THREE.Vector3(p.scale, p.scale, p.scale))));
    im.frustumCulled = false;
    (im.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.05;
    scene.add(im);
  }
}

export type Arena = ReturnType<typeof createArena>;

export function createArena(el: HTMLElement, cssW: number, cssH: number) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!import.meta.env.STORYBOOK });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(cssW, cssH);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LOOK.EXPOSURE;
  Object.assign(renderer.domElement.style, { position: 'absolute', inset: '0', display: 'block' });
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const moon = lightNight(scene, renderer);
  // Moon shadows over the whole clearing: trees, graves, the dead and the wizard all cast them.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  moon.castShadow = true;
  moon.position.copy(MOON_DIR).normalize().multiplyScalar(40);
  moon.shadow.mapSize.set(LOOK.SHADOW_MAP, LOOK.SHADOW_MAP);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 24, bottom: -24, near: 1, far: 90 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.03;
  scene.add(moon.target);
  scene.add(canopy());
  scene.fog = new THREE.Fog(token('--fog'), LOOK.FOG_NEAR_U, LOOK.FOG_FAR_U);

  const camera = new THREE.PerspectiveCamera(FOV_DEG, cssW / cssH, 0.5, 150);
  const camTarget = new THREE.Vector3();

  // The clearing: procedural floor, ground fog, and the dead wood, graves and roots round its edge.
  const { material: floorMat, uniforms: floorU } = floorMaterial();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 100).rotateX(-Math.PI / 2), floorMat);
  floor.receiveShadow = true;
  scene.add(floor);
  const fogU = THREE.UniformsUtils.clone(fogShader.uniforms);
  fogU.uColor.value.set(token('--moon')).multiplyScalar(LOOK.FOG_BRIGHT);
  const groundFog = new THREE.Mesh(new THREE.PlaneGeometry(140, 100).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ ...fogShader, uniforms: fogU, transparent: true, depthWrite: false }));
  groundFog.position.y = LOOK.FOG_Y_U;
  groundFog.renderOrder = 1;
  scene.add(groundFog);
  plantClearing(scene);

  // The wizard, and the light he carries (lights the floor through floorU.uPlayer and the characters round him).
  const ship = buildShip(token('--player'), token('--player-glow'));
  ship.obj.traverse((o) => { o.castShadow = true; });
  scene.add(ship.obj);
  const shipLight = new THREE.PointLight(token('--player-glow'), LOOK.PLAYER_LIGHT, LOOK.PLAYER_LIGHT_U, 1.4);
  scene.add(shipLight);
  const beamGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
  const aimLine = new THREE.Mesh(beamGeo, glowMaterial(token('--player-shot'), 1.2, 0.16));
  /** Sniper sight lines share one material; each painting enemy gets its own mesh. */
  const laserMat = glowMaterial(token('--laser'), 2.4, 0.6);
  scene.add(aimLine);
  /** Warm flashes where spells land: a few pooled point lights so a hit lights the enemy it hits. Always in the scene
   *  (intensity 0 when idle): adding or removing a light recompiles every lit material. */
  const flashes = Array.from({ length: LOOK.FLASH_LIGHTS }, () => { const l = new THREE.PointLight(token('--player-shot'), 0, 6, 1.6); scene.add(l); return { l, t: 0, peak: 0 }; });
  let flashNext = 0;
  const flash = (x: number, z: number, peak: number, color = token('--player-shot')) => {
    const f = flashes[flashNext]!; flashNext = (flashNext + 1) % LOOK.FLASH_LIGHTS;
    f.l.position.set(x, 1.2, z); f.l.color.set(color); f.t = LOOK.FLASH_S; f.peak = peak;
  };

  // Blob shadows under every character: the moon is too faint to cast, but in the dark a figure needs ground under it.
  const shadows = inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTexture(), transparent: true, opacity: LOOK.SHADOW, depthWrite: false }), 400);
  shadows.renderOrder = 0;

  // Scorch: a kill burns a dark mark into the ground that fades over SCORCH_S (a shrinking disc: instanced, one draw).
  const SCORCH_N = 48, SCORCH_S = 4;
  const scorches = inst(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: blobTexture(), transparent: true, opacity: 0.7, depthWrite: false }), SCORCH_N);
  const scorchLife = Array.from({ length: SCORCH_N }, () => ({ x: 0, z: 0, r: 0, t: 0 }));
  let scorchNext = 0;
  const scorch = (x: number, z: number, r: number) => { scorchLife[scorchNext] = { x, z, r, t: SCORCH_S }; scorchNext = (scorchNext + 1) % SCORCH_N; };

  // Instanced spells and pickups
  function inst(g: THREE.BufferGeometry, m: THREE.Material, n: number) { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.count = 0; scene.add(im); return im; }
  const bolts = inst(new THREE.CapsuleGeometry(0.1, 0.5, 2, 6).rotateZ(Math.PI / 2), glowMaterial(token('--player-shot'), 3.2), 600);
  const boltHalos = inst(new THREE.SphereGeometry(1, 10, 6), glowMaterial(token('--player-shot'), 0.9, 0.22), 600);
  const orbs = inst(new THREE.SphereGeometry(1, 12, 8), glowMaterial(token('--hostile-shot'), 1.5), 800);
  const halos = inst(new THREE.SphereGeometry(1, 12, 8), glowMaterial(token('--hostile-shot'), 0.5, 0.12), 800);
  const lobs = inst(new THREE.IcosahedronGeometry(0.4, 1), glowMaterial(token('--lob'), 3), 64);
  const shards = inst(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 1.8, 1), glowMaterial(token('--shard'), 2.4), 600);
  const repairs = inst(new THREE.CapsuleGeometry(0.16, 0.26, 3, 8), glowMaterial(token('--repair'), 2.2), 16);

  const particles = createParticles(scene);
  /** Bone dust and grave dirt: lit, not glowing. */
  const dust = createParticles(scene, 800, false);
  const rings = createRings(scene);

  // Post: bloom only catches magic (glow parts, spells, souls); everything lit sits well under its threshold.
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(cssW / 2, cssH / 2), LOOK.BLOOM, LOOK.BLOOM_RADIUS, LOOK.BLOOM_THRESHOLD);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const final = new ShaderPass(finalShader);
  final.uniforms.uHurtCol!.value.set(token('--danger'));
  // The grade leans shadows towards moonlight: --moon at luminance 1.
  const grade = new THREE.Color(token('--moon'));
  final.uniforms.uGradeCol!.value.copy(grade.multiplyScalar(1 / (0.299 * grade.r + 0.587 * grade.g + 0.114 * grade.b)));
  composer.addPass(final);

  const enemies = new Map<number, EnemyView>();
  const corpses: Corpse[] = [];
  /** Ids killed in the step being drawn: they leave a corpse; anything else that vanishes (a new run) just goes. */
  const killed = new Set<number>();
  const strike = (id: number) => enemies.get(id)?.rig.play('attack');
  const warps = new Map<number, THREE.Object3D>();
  const pitMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.9, depthWrite: false });
  const ripples: THREE.Vector4[] = floorU.uRipples.value;
  let rippleNext = 0, shake = 0, hurt = 0, time = 0, last: GameState | null = null;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

  // Adaptive quality: a phone that can't hold ~45 fps drops to 1x pixels, then loses bloom. Measured on wall time
  // between rendered frames (not game time), over SLOW_WINDOW_MS; never steps back up (no oscillation).
  const SLOW_FRAME_MS = 22, SLOW_WINDOW_MS = 2500;
  let lastFrame = 0, slowSince = 0, tier = 0;
  function adapt() {
    if (import.meta.env.STORYBOOK) return; // stories and shots keep full quality
    const now = performance.now(), dtMs = now - lastFrame;
    lastFrame = now;
    if (dtMs > 200) { slowSince = 0; return; } // a stall (tab switch), not a slow device
    if (dtMs < SLOW_FRAME_MS) { slowSince = 0; return; }
    if (!slowSince) slowSince = now;
    if (now - slowSince < SLOW_WINDOW_MS || tier >= 2) return;
    tier++; slowSince = 0;
    if (tier === 1) { renderer.setPixelRatio(1); composer.setPixelRatio(1); }
    else { bloom.enabled = false; moon.castShadow = false; }
  }

  const ripple = (x: number, z: number, strength: number) => { ripples[rippleNext]!.set(x, z, 0, strength); rippleNext = (rippleNext + 1) % MAX_RIPPLES; };

  /** An enemy's colour: its own, or the wave's tint (`wave tint="--ice"`) when the wave has one. */
  const hue = (kind: string, s: GameState) => { const t = waveDef(s.wave).def.tint; return t ? token(t) : enemyColor(kind); };

  function makeEnemy(id: number, kind: string, s: GameState): EnemyView {
    const d = enemyDef(kind), body = paintMaterial(hue(kind, s), token('--soulfire'));
    const rig = buildRig(d.model, body, id * 0.37);
    rig.obj.traverse((o) => { o.castShadow = true; });
    const arc = d.behaviours.find((b) => b.shieldArcDeg)?.shieldArcDeg;
    let shield: THREE.Mesh | undefined;
    if (arc) { shield = buildShield(arc, token('--shield')); scene.add(shield); }
    scene.add(rig.obj);
    return { rig, body, shield };
  }
  function dropEnemy(v: EnemyView, died: boolean) {
    if (died) corpses.push({ rig: v.rig, body: v.body, t: v.rig.play('die') });
    else { scene.remove(v.rig.obj); v.body.dispose(); }
    if (v.laser) scene.remove(v.laser);
    if (v.shield) { scene.remove(v.shield); (v.shield.material as THREE.Material).dispose(); v.shield.geometry.dispose(); }
  }

  function onEvent(e: GameEvent, s: GameState) {
    switch (e.type) {
      case 'fire': {
        sfx('fire');
        ship.play('attack');
        const nx = Math.cos(e.angle), nz = Math.sin(e.angle);
        for (let i = 0; i < 2; i++) particles.spark(e.x + nx * 0.6, e.y + nz * 0.6, nx * 6 + (Math.random() - 0.5) * 3, nz * 6 + (Math.random() - 0.5) * 3, token('--player-shot'), 0.07, 0.12);
        break;
      }
      case 'hit': sfx('hit'); particles.burst(e.x, e.y, token('--player-shot'), 4, 7, 0.07, 0.25); flash(e.x, e.y, LOOK.FLASH_HIT); break;
      case 'kill': {
        killed.add(e.id);
        const d = enemyDef(e.kind), col = hue(e.kind, s), big = d.tier === 'boss';
        sfx(big || d.tier === 'elite' ? 'big-kill' : 'kill');
        // The spell's fire flares on the body, bone dust falls, and the soul goes up out of it in soulfire.
        flash(e.x, e.y, big ? LOOK.FLASH_BOSS : LOOK.FLASH_KILL);
        dust.burst(e.x, e.y, col, big ? 200 : 10 + d.r * 24, big ? 14 : 4 + d.r * 4, big ? 0.22 : 0.08 + d.r * 0.04, big ? 1.6 : 0.9, 0.6, 0.9);
        particles.burst(e.x, e.y, token('--player-shot'), big ? 80 : 8, big ? 16 : 6, 0.08, 0.4);
        particles.burst(e.x, e.y, token('--soulfire'), big ? 60 : 5, 1.5, 0.12, big ? 2 : 1.1, 0.8, 4);
        if (big) rings.ring(e.x, e.y, d.r * 0.5, d.r * 12, 1.4, token('--player-shot'), { boost: 0.4 });
        scorch(e.x, e.y, 0.5 + d.r * 0.8);
        if (big) rings.column(e.x, e.y, 2.5, 14, 1.2, token('--soulfire'));
        ripple(e.x, e.y, big ? 2.5 : Math.min(1.2, 0.35 + d.r * 0.5));
        shake = Math.max(shake, big ? 1.4 : Math.min(0.5, d.r * 0.3));
        break;
      }
      case 'hurt': sfx('hurt'); if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(60); hurt = 1; shake = Math.max(shake, 0.8); particles.burst(e.x, e.y, token('--danger'), 30, 10, 0.12, 0.6); ripple(e.x, e.y, 1); break;
      case 'warp': sfx('warp'); break;
      case 'arrive': { const d = enemyDef(e.kind); dust.burst(e.x, e.y, token('--floor'), 14 + d.r * 16, 4, 0.1, 0.7, 0.2, 1.2); particles.burst(e.x, e.y, token('--warp'), 6 + d.r * 6, 3, 0.08, 0.6, 0.3, 1.5); rings.ring(e.x, e.y, d.r, d.r * 2.5, 0.4, token('--warp'), { boost: 1.2 }); break; }
      case 'telegraph':
        strike(e.id);
        if (e.what === 'dash') rings.line(e.x, e.y, e.tx, e.ty, 0.45, e.dur + 0.2, token('--telegraph'));
        else if (e.what === 'lob') { const r = s.shots.find((b) => b.lob && b.tx === e.tx && b.ty === e.ty)?.blast ?? 2; rings.ring(e.tx, e.ty, r, r, e.dur, token('--lob'), { blink: true }); rings.ring(e.tx, e.ty, 0.1, r, e.dur, token('--lob'), { fill: true }); }
        else if (e.what === 'snipe') rings.line(e.x, e.y, e.tx, e.ty, 0.32, e.dur, token('--laser'));
        else { rings.ring(e.tx, e.ty, 1.4, 0.4, e.dur, token('--blink'), { blink: true }); rings.column(e.tx, e.ty, 0.5, 5, e.dur + 0.2, token('--blink')); }
        break;
      case 'blast': sfx('blast'); particles.burst(e.x, e.y, token('--hostile-shot'), 40, e.r * 5, 0.16, 0.7); rings.ring(e.x, e.y, 0.3, e.r * 1.3, 0.45, token('--lob')); ripple(e.x, e.y, 1.1); shake = Math.max(shake, 0.35); break;
      case 'block': particles.burst(e.x, e.y, token('--shield'), 6, 8, 0.07, 0.25); break;
      case 'heal': strike(e.by); particles.burst(e.x, e.y, token('--heal'), 3, 1.5, 0.1, 0.8, 0.6, 2); break;
      case 'enemy-fire': sfx('enemy-fire'); strike(e.id); break;
      case 'pickup': sfx('pickup'); particles.burst(e.x, e.y, e.kind === 'shard' ? token('--shard') : token('--repair'), e.kind === 'shard' ? 3 : 20, 3, 0.07, 0.3); break;
      case 'wave': sfx('wave'); break;
      case 'cleared': ripple(s.player.x, s.player.y, 2); rings.ring(s.player.x, s.player.y, 0.5, 30, 1.6, token('--player-glow')); break;
      case 'upgrade': sfx('upgrade'); rings.ring(s.player.x, s.player.y, 0.5, 3, 0.6, token('--shard')); break;
      case 'dead': sfx('dead'); ship.play('die'); particles.burst(s.player.x, s.player.y, token('--player-glow'), 300, 18, 0.2, 1.8); rings.ring(s.player.x, s.player.y, 0.5, 20, 1.5, token('--danger')); ripple(s.player.x, s.player.y, 3); shake = 1.6; break;
    }
  }

  /** Bring the scene in step with the run and advance effects by dt (game-clock seconds). */
  function sync(s: GameState, dt: number) {
    time += dt;
    const fresh = s !== last;
    killed.clear();
    if (fresh) { for (const e of s.events) onEvent(e, s); last = s; }

    // ship
    const p = s.player, dead = s.phase === 'dead';
    ship.obj.visible = !(p.invuln > 0 && !dead && Math.floor(time * 14) % 2 === 0);
    ship.obj.position.set(p.x, 0.35 + Math.sin(time * 3) * 0.05, p.y);
    ship.obj.rotation.set(0, -Math.atan2(p.ay, p.ax), 0);
    ship.obj.rotateX(-p.vy * 0.02 * Math.sign(p.ax || 1));
    if (!dead && ship.dead) ship.revive();
    ship.update(dt);
    // The light sits in the staff's witchfire, ahead and to the right of him.
    const aimA = Math.atan2(p.ay, p.ax);
    shipLight.position.set(p.x + Math.cos(aimA) * 0.7 - Math.sin(aimA) * 0.35, 2.3, p.y + Math.sin(aimA) * 0.7 + Math.cos(aimA) * 0.35);
    shipLight.visible = !dead;
    aimLine.visible = !dead && s.phase === 'fight';
    aimLine.position.set(p.x, 0.08, p.y); aimLine.rotation.y = -Math.atan2(p.ay, p.ax); aimLine.scale.set(5, 1, 0.05);
    const speed = Math.hypot(p.vx, p.vy);
    if (!dead && speed > 1 && dt > 0) {
      const bx = p.x - (p.vx / speed) * 0.45, bz = p.y - (p.vy / speed) * 0.45;
      particles.spark(bx, bz, -p.vx * 0.3 + (Math.random() - 0.5), -p.vy * 0.3 + (Math.random() - 0.5), token('--player-glow'), 0.1, 0.3, 0.35);
    }

    // enemies
    const seen = new Set<number>();
    for (const e of s.enemies) {
      seen.add(e.id);
      let v = enemies.get(e.id);
      if (!v) { v = makeEnemy(e.id, e.kind, s); enemies.set(e.id, v); }
      const r = radius(e), grow = Math.min(1, e.age / 0.25);
      const o = v.rig.obj;
      o.position.set(e.x, (r + LEGIBLE_U) * 0.9, e.y);
      o.rotation.y = -e.facing;
      o.scale.setScalar((r + LEGIBLE_U) * (0.3 + 0.7 * grow) * (1 + (e.flash > 0 ? 0.12 : 0)));
      v.body.emissiveIntensity = e.flash > 0 ? 3 : BODY_GLOW + (1 - e.hp / e.maxHp) * 0.4;
      if (fresh && !v.rig.attacking && Math.hypot(e.x - p.x, e.y - p.y) < r + LUNGE_U) v.rig.play('attack');
      v.rig.update(dt);
      if (v.shield) { v.shield.position.set(e.x, r * 0.9, e.y); v.shield.rotation.y = -e.facing; v.shield.scale.setScalar(r); }
      if (e.laser !== undefined) {
        if (!v.laser) { v.laser = new THREE.Mesh(beamGeo, laserMat); scene.add(v.laser); }
        const [tx, ty] = rayToWall(e.x, e.y, e.laser);
        v.laser.visible = true;
        v.laser.position.set(e.x, r * 0.9, e.y);
        v.laser.rotation.y = -e.laser;
        v.laser.scale.set(Math.hypot(tx - e.x, ty - e.y), 1, 0.05 + Math.sin(time * 40) * 0.015);
      } else if (v.laser) v.laser.visible = false;
    }
    for (const [id, v] of enemies) if (!seen.has(id)) { dropEnemy(v, killed.has(id)); enemies.delete(id); }
    for (let i = corpses.length - 1; i >= 0; i--) {
      const c = corpses[i]!;
      c.rig.update(dt);
      if ((c.t -= dt) <= 0) { scene.remove(c.rig.obj); c.body.dispose(); corpses.splice(i, 1); }
    }

    // Every opening grave and spell in flight also lights the ground under it (the first MAX_FLOOR_LIGHTS of them).
    let nf = 0;
    const floorLight = (x: number, z: number, radius: number, power: number, color: number) => {
      if (nf >= MAX_FLOOR_LIGHTS) return;
      floorU.uLights.value[nf]!.set(x, z, radius, power); floorU.uLightCol.value[nf++]!.set(color);
    };

    // warp gates
    const gates = new Set<number>();
    for (const g of s.warps) {
      gates.add(g.id);
      let o = warps.get(g.id);
      if (!o) {
        const r = radius(g);
        // The ground opens: a black pit ringed in grave-light, widening until the dead climb out.
        o = new THREE.Group();
        const ringMesh = new THREE.Mesh(shared.thinTorus, glowMaterial(token('--warp'), 2.2));
        ringMesh.rotation.x = Math.PI / 2;
        o.add(ringMesh, new THREE.Mesh(shared.disc, pitMat));
        o.scale.setScalar(r * 1.3);
        o.position.set(g.x, 0.1, g.y);
        scene.add(o);
        warps.set(g.id, o);
        rings.column(g.x, g.y, r * 0.9, 6, T.WARP_S + 0.2, token('--warp'));
      }
      const k = 1 - g.t / T.WARP_S;
      o.rotation.y += dt * 1.5;
      o.children[1]!.scale.setScalar(0.2 + k * 0.8);
      o.children[0]!.scale.setScalar(0.3 + k * 0.8);
      if (dt > 0 && Math.random() < dt * 30) dust.burst(g.x, g.y, token('--floor'), 1, 2.5, 0.07, 0.6, 0.1, 1.4);
      floorLight(g.x, g.y, radius(g) * 2, 0.8 * k, token('--warp'));
    }
    for (const [id, o] of warps) if (!gates.has(id)) { scene.remove(o); warps.delete(id); }

    // shots
    let nb = 0, no = 0, nl = 0;
    for (const b of s.shots) {
      if (b.lob) {
        const t = 1 - b.life / T.LOB_FLIGHT_S;
        m4.compose(v3.set(b.x, 0.6 + 4 * LOB_ARC_U * t * (1 - t), b.y), q.setFromAxisAngle(up, time * 5), s3.set(1, 1, 1));
        lobs.setMatrixAt(nl++, m4);
        floorLight(b.x, b.y, 1.6, 1.2, token('--lob'));
      } else if (b.hostile) {
        const pulse = 1 + Math.sin(time * 20 + b.id) * 0.15;
        m4.compose(v3.set(b.x, 0.5, b.y), q.identity(), s3.setScalar(b.r * pulse));
        orbs.setMatrixAt(no, m4);
        m4.compose(v3, q, s3.setScalar(b.r * 1.7 * pulse));
        halos.setMatrixAt(no++, m4);
        floorLight(b.x, b.y, 1.2, 0.45, token('--hostile-shot'));
      } else {
        m4.compose(v3.set(b.x, 0.45, b.y), q.setFromAxisAngle(up, -Math.atan2(b.vy, b.vx)), s3.set(1, 1, 1));
        bolts.setMatrixAt(nb, m4);
        m4.compose(v3, q, s3.setScalar(0.34 + Math.sin(time * 30 + b.id) * 0.05));
        boltHalos.setMatrixAt(nb++, m4);
        // A trail of embers behind each spell.
        if (dt > 0 && nb < TRAILED_BOLTS) particles.spark(b.x, b.y, -b.vx * 0.05 + (Math.random() - 0.5) * 0.6, -b.vy * 0.05 + (Math.random() - 0.5) * 0.6, token('--player-shot'), 0.05, 0.25, 0.45);
        floorLight(b.x, b.y, 2.2, 1.5, token('--player-shot'));
      }
    }
    for (let i = nf; i < MAX_FLOOR_LIGHTS; i++) floorU.uLights.value[i]!.w = 0;
    bolts.count = nb; boltHalos.count = nb; orbs.count = no; halos.count = no; lobs.count = nl;
    let ns = 0, nr = 0;
    for (const k of s.pickups) {
      const blink = k.life < 2 && Math.floor(time * 10) % 2 === 0 ? 0.001 : 1;
      m4.compose(v3.set(k.x, 0.4 + Math.sin(time * 4 + k.id) * 0.1, k.y), q.setFromAxisAngle(up, time * 3 + k.id), s3.setScalar(blink));
      if (k.kind === 'shard') shards.setMatrixAt(ns++, m4); else repairs.setMatrixAt(nr++, m4);
    }
    shards.count = ns; repairs.count = nr;
    // Blob shadows: the wizard and every standing or fallen character.
    let nsh = 0;
    // Contact shadow: the dark where a figure meets the ground (the moon casts the long one).
    const blob = (x: number, z: number, r: number) => { m4.compose(v3.set(x, 0.02, z), q.identity(), s3.set(r * 1.9, 1, r * 1.9)); shadows.setMatrixAt(nsh++, m4); };
    if (!dead) blob(p.x, p.y, 0.55);
    for (const e of s.enemies) blob(e.x, e.y, radius(e) + LEGIBLE_U);
    shadows.count = nsh;
    let nsc = 0;
    for (const sc of scorchLife) {
      if (sc.t <= 0) continue;
      sc.t -= dt;
      const k = Math.max(0, sc.t / SCORCH_S);
      m4.compose(v3.set(sc.x, 0.015, sc.z), q.identity(), s3.set(sc.r * 2 * (0.6 + 0.4 * k), 1, sc.r * 2 * (0.6 + 0.4 * k)));
      scorches.setMatrixAt(nsc++, m4);
    }
    scorches.count = nsc;
    for (const im of [bolts, boltHalos, orbs, halos, lobs, shards, repairs, shadows, scorches]) im.instanceMatrix.needsUpdate = true;

    // effects
    particles.update(dt);
    dust.update(dt);
    rings.update(dt);
    for (const r of ripples) if (r.w > 0) { r.z += dt; if (r.z > 1.4) r.w = 0; }
    floorU.uTime.value = time; fogU.uTime.value = time;
    for (const f of flashes) { f.t = Math.max(0, f.t - dt); f.l.intensity = f.peak * (f.t / LOOK.FLASH_S) ** 2; }
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
    render() {
      adapt();
      composer.render();
    },
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
    /** Jump the view to `s`: the camera on the ship (a story's first frame shouldn't pan in from the centre), no corpses. */
    snap(s: GameState) {
      camTarget.set(s.player.x * FOLLOW, 0, s.player.y * FOLLOW); last = null;
      for (const c of corpses) { scene.remove(c.rig.obj); c.body.dispose(); }
      for (const sc of scorchLife) sc.t = 0;
      corpses.length = 0;
      sync(s, 0); // meshes for everything already in play, so the next step can animate from them (a kill leaves a corpse)
    },
    canvas: renderer.domElement,
  };
}
