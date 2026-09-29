// The characters: one glTF per model (content.ts MODELS names them, plus the ship), built by the Blender scripts in
// models/ (`npm run models`) and loaded once at boot. A model is a rig of named parts, value-painted in its vertex
// colours, with three clips (idle loops, attack and die play once). Its materials are named `body`, `trim` and `glow`.
// At load each part's pieces are fused into one mesh that remembers its slot per vertex, and one paint material
// colours all three from the palette: one draw per part however many materials it had, hue from shared.css, and the
// wave tint for free.
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { MODELS } from '../content';
import { token } from '../tokens';

/** The rig contract with models/kit.py (src/models.test.ts checks every .glb against it). */
export const CLIPS = ['idle', 'attack', 'die'] as const;
export const SLOTS = ['body', 'trim', 'glow'] as const;
export const RIGS = [...MODELS, 'ship'] as const;
export type Clip = (typeof CLIPS)[number];
export type Slot = (typeof SLOTS)[number];
export type RigName = (typeof RIGS)[number];

/** How long an attack or idle clip takes to hand over to the other, s. */
const BLEND_S = 0.08;

const URLS = import.meta.glob<string>('../../models/*.glb', { query: '?url', import: 'default', eager: true });
const templates = new Map<string, { scene: THREE.Object3D; clips: Record<Clip, THREE.AnimationClip> }>();

/** Fetch and parse every model; boot awaits it before the arena builds anything. */
export async function loadModels() {
  const loader = new GLTFLoader();
  await Promise.all(RIGS.filter((n) => !templates.has(n)).map(async (name) => {
    const url = URLS[`../../models/${name}.glb`];
    if (!url) throw new Error(`models: no models/${name}.glb; run \`npm run models -- ${name}\``);
    const g = await loader.loadAsync(url);
    fuse(g, name);
    const clip = (c: Clip) => g.animations.find((a) => a.name === c) ?? (() => { throw new Error(`models/${name}.glb: no "${c}" clip`); })();
    templates.set(name, { scene: g.scene, clips: { idle: clip('idle'), attack: clip('attack'), die: clip('die') } });
  }));
}

/** Each part's pieces (one per material) as one mesh with a `slot` attribute (0 body, 1 trim, 2 glow). */
function fuse(g: GLTF, name: string) {
  const assoc = g.parser.associations;
  const slotted = (mesh: THREE.Mesh) => {
    const slot = SLOTS.indexOf((mesh.material as THREE.Material).name as Slot);
    if (slot < 0) throw new Error(`models/${name}.glb: material "${(mesh.material as THREE.Material).name}" isn't one of ${SLOTS.join(', ')}`);
    const geo = mesh.geometry.clone();
    geo.setAttribute('slot', new THREE.BufferAttribute(new Float32Array(geo.attributes.position!.count).fill(slot), 1));
    return geo;
  };
  const all: THREE.Object3D[] = [];
  g.scene.traverse((o) => { all.push(o); });
  for (const o of all) {
    const m = o as THREE.Mesh;
    // A part with one material is itself the mesh; a part with several is a group of primitive meshes (no node).
    if (m.isMesh && assoc.get(m)?.nodes !== undefined) { m.geometry = slotted(m); continue; }
    const prims = o.children.filter((c): c is THREE.Mesh => (c as THREE.Mesh).isMesh && assoc.get(c)?.nodes === undefined);
    if (!prims.length) continue;
    const fused = new THREE.Mesh(mergeGeometries(prims.map(slotted)));
    fused.name = `${o.name}-paint`;
    o.remove(...prims);
    o.add(fused);
  }
}

/** A body's resting self-glow (emissiveIntensity): enough to read on the dark floor, under the bloom threshold so
 *  only `glow` parts bloom and the paint stays visible. The arena raises it with damage and flashes it on a hit. */
export const BODY_GLOW = 0.2;

/** Body paint's brightest linear luminance: a pale palette colour (mint, lemon) is darkened to it, so it keeps its hue
 *  under the arena's lights instead of washing out to white. Trim is darker metal; glow sits over the bloom threshold. */
const BODY_LUM = 0.2, TRIM_LUM = 0.07, GLOW_LUM = 1.0;
/** `color` scaled to at most luminance `lum` (to exactly `lum` when `exact`). */
function atLum(color: number, lum: number, exact = false) {
  const c = new THREE.Color(color), l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return l > 0 && (exact || l > lum) ? c.multiplyScalar(lum / l) : c;
}

/**
 * The one material a model wears, per slot: `body` in `body` (matte: the light is painted into the vertices, and a
 * shiny top would mirror the sky from the game's high camera) with a faint emissive that follows the paint, `trim` in
 * --trim as dull metal, `glow` unlit in `glow`. `emissiveIntensity` is the body's glow: the arena flashes it on a hit.
 */
export function paintMaterial(body: number, glow = body, emissive = body) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, emissive: atLum(emissive, BODY_LUM * 2), emissiveIntensity: BODY_GLOW, metalness: 0.1, roughness: 0.8, envMapIntensity: 0.35 });
  const uniforms = { uBody: { value: atLum(body, BODY_LUM) }, uTrim: { value: atLum(token('--trim'), TRIM_LUM) }, uGlow: { value: atLum(glow, GLOW_LUM, true) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float slot;\nvarying float vSlot;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlot = slot;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uBody, uTrim, uGlow;\nvarying float vSlot;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float isTrim = step(0.5, vSlot) * step(vSlot, 1.5), isGlow = step(1.5, vSlot);
        diffuseColor.rgb *= mix(mix(uBody, uTrim, isTrim), vec3(0.0), isGlow);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, isTrim);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.6, isTrim);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance = mix(totalEmissiveRadiance * vColor.rgb * vColor.rgb * (1.0 - 0.7 * isTrim), uGlow * vColor.rgb, isGlow);`);
  };
  m.customProgramCacheKey = () => 'paint';
  return m;
}
/** Faceted metal for scenery (the walls' pylons): no vertex paint. */
export function metalMaterial(color: number) {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.7), emissive: c, emissiveIntensity: 0.35, metalness: 0.55, roughness: 0.3, flatShading: true });
}
/** Unlit, over-bright, so bloom picks it up: walls, shots, gates, shields. */
export function glowMaterial(color: number, boost = 2.5, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), transparent: opacity < 1, opacity, blending: opacity < 1 ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: opacity >= 1 });
}

export type Rig = ReturnType<typeof buildRig>;

/**
 * A live copy of `name` wearing `paint` (a paintMaterial; the caller disposes it). The caller scales and places
 * `obj`, calls `update(dt)` with game time each frame, and `play`s attack/die. `phase` offsets the idle loop so a
 * swarm doesn't breathe in step.
 */
export function buildRig(name: RigName, paint: THREE.MeshStandardMaterial, phase = 0) {
  const tpl = templates.get(name);
  if (!tpl) throw new Error(`models: "${name}" isn't loaded (await loadModels() first)`);
  const inner = tpl.scene.clone(true);
  inner.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = paint; });
  const obj = new THREE.Group();
  obj.add(inner);
  const mixer = new THREE.AnimationMixer(inner);
  const idle = mixer.clipAction(tpl.clips.idle).play();
  idle.time = phase % tpl.clips.idle.duration;
  const attack = mixer.clipAction(tpl.clips.attack).setLoop(THREE.LoopOnce, 1);
  const die = mixer.clipAction(tpl.clips.die).setLoop(THREE.LoopOnce, 1);
  die.clampWhenFinished = true;
  /** Seconds of attack left; the hand back to idle starts BLEND_S before the end. */
  let striking = 0, dead = false;
  return {
    obj,
    body: paint,
    /** Play a one-shot clip; an attack already under way isn't restarted. Returns the clip's length, s. */
    play(clip: 'attack' | 'die') {
      if (dead) return 0;
      if (clip === 'die') {
        dead = true;
        mixer.stopAllAction();
        die.reset().play();
        return tpl.clips.die.duration;
      }
      if (striking > 0) return 0;
      striking = tpl.clips.attack.duration;
      idle.fadeOut(BLEND_S);
      attack.reset().fadeIn(BLEND_S).play();
      return striking;
    },
    update(dt: number) {
      if (striking > 0) {
        const was = striking;
        striking -= dt;
        // A faded-out action is disabled (its time held), so re-enable idle before fading it back in.
        if (striking <= BLEND_S && was > BLEND_S) { attack.fadeOut(BLEND_S); idle.enabled = true; idle.fadeIn(BLEND_S); }
      }
      mixer.update(dt);
    },
    /** Pose at `t` s into `clip` (the model viewer's stills). */
    pose(clip: Clip, t: number) {
      mixer.stopAllAction();
      const a = { idle, attack, die }[clip];
      a.reset().play();
      a.time = Math.min(t, tpl.clips[clip].duration - 1e-3);
      mixer.update(0);
    },
    duration: (clip: Clip) => tpl.clips[clip].duration,
    /** Back from a `die` to the idle loop (the ship on a new run). */
    revive() {
      if (!dead) return;
      dead = false; striking = 0;
      mixer.stopAllAction();
      idle.reset().play();
    },
    get dead() { return dead; },
    get attacking() { return striking > 0; },
  };
}

/** A frontal shield arc `deg` wide, facing +x at unit radius. */
export function buildShield(deg: number, color: number) {
  const rad = (deg * Math.PI) / 180;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.7, 24, 1, true, Math.PI / 2 - rad / 2, rad), glowMaterial(color, 1.6, 0.55));
  (m.material as THREE.Material).side = THREE.DoubleSide;
  return m;
}

/** The player's ship: the `ship` model in the hull colour, glowing in its glow colour. */
export function buildShip(color: number, glow: number) {
  const paint = paintMaterial(color, glow, glow);
  paint.emissiveIntensity = 0.3;
  const rig = buildRig('ship', paint);
  rig.obj.scale.setScalar(0.85);
  return rig;
}

/** Scenery geometry the arena shares (walls, pylons, warp gates). */
export const shared = {
  box: new THREE.BoxGeometry(1, 1, 1),
  octa: new THREE.OctahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.16, 8, 32),
  thinTorus: new THREE.TorusGeometry(1, 0.05, 6, 48),
};
