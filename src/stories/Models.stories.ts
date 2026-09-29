// The model viewer: every character close up, in its palette colour, on a turntable, three times over: idle, attack
// and die, each clip looping in its own panel. Not the game (no stage): its own small Three scene, lit like the arena.
// The play function proves the rig contract (three clips, only body/trim/glow materials) on the loaded model.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ENEMIES } from '../content';
import { enemyColor, token } from '../tokens';
import { buildRig, buildShip, CLIPS, lightNight, loadModels, paintMaterial, type Rig, type RigName } from '../view/models';

const W = 844, H = 390;
/** How often the attack and die panels replay, s. */
const REPLAY_S = 1.6;
/** Stills (the `still` arg, for screenshots): a three-quarter view, each clip this far through. */
const STILL_TURN_RAD = -0.7, STILL_AT = [0.3, 0.4, 0.3];

let view: ReturnType<typeof viewer> | null = null;

function viewer() {
  const el = document.createElement('div');
  Object.assign(el.style, { width: `${W}px`, height: `${H}px`, position: 'relative', background: '#000' });
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  el.appendChild(renderer.domElement);
  const labels = document.createElement('div');
  Object.assign(labels.style, { position: 'absolute', inset: '0', display: 'flex', pointerEvents: 'none', font: '12px Cinzel, serif', letterSpacing: '3px', color: '#8a93b8' });
  for (const c of CLIPS) {
    const l = document.createElement('div');
    l.textContent = c.toUpperCase();
    Object.assign(l.style, { flex: '1', textAlign: 'center', paddingTop: '10px' });
    labels.appendChild(l);
  }
  el.appendChild(labels);

  const scene = new THREE.Scene();
  lightNight(scene, renderer);
  // A pool of the wizard's light on the ground, so each model is seen the way it is in a fight: moonlit, and warm near him.
  const glow = new THREE.PointLight(token('--player-glow'), 10, 6, 1.4);
  glow.position.set(1.5, 2.2, 2.5);
  scene.add(glow);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: token('--floor') }));
  const camera = new THREE.PerspectiveCamera(24, W / H, 0.1, 50);
  camera.position.set(0, 8.5, 9.5);
  camera.lookAt(0, 0.1, 0);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.85, 0.4, 0.78));
  composer.addPass(new OutputPass());

  let rigs: Rig[] = [], raf = 0, last = 0, time = 0;
  const stage = new THREE.Group();
  scene.add(stage);

  function show(name: RigName, still: boolean) {
    stage.clear();
    const scenery: Record<string, string> = { tree: '--wood', roots: '--wood', grave: '--stone' };
    const col = name === 'ship' ? token('--player') : scenery[name] ? token(scenery[name]) : enemyColor(Object.values(ENEMIES).find((e) => e.model === name)!.id);
    rigs = CLIPS.map((c, i) => {
      const rig = name === 'ship' ? buildShip(token('--player'), token('--player-glow')) : buildRig(name, paintMaterial(col, token('--soulfire')));
      const holder = new THREE.Group();
      holder.add(rig.obj, floor.clone());
      rig.obj.position.y = 0.9;
      if (scenery[name]) { rig.obj.scale.setScalar(0.4); rig.obj.position.y = 0; }
      holder.position.x = (i - 1) * 3.4;
      stage.add(holder);
      if (c !== 'idle') rig.pose(c, 0);
      return rig;
    });
    cancelAnimationFrame(raf);
    last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now; time += dt;
      rigs.forEach((r, i) => {
        const c = CLIPS[i]!;
        r.obj.parent!.rotation.y = still ? STILL_TURN_RAD : time * 0.5 - 0.6;
        if (still) r.pose(c, r.duration(c) * STILL_AT[i]!);
        else if (i === 0) r.update(dt);
        else r.pose(c, Math.min(time % REPLAY_S, r.duration(c)));
      });
      composer.render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return rigs;
  }
  return { el, show };
}

type Args = { still: boolean };
function model(name: RigName): StoryObj<Args> {
  return {
    render: ({ still }) => {
      view ??= viewer();
      void loadModels().then(() => view!.show(name, still));
      return view.el;
    },
    play: async ({ args }) => {
      await loadModels();
      const rig = view!.show(name, args.still)[0]!;
      const meshes: THREE.Mesh[] = [];
      rig.obj.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
      await expect(CLIPS.map((c) => rig.duration(c) > 0)).toEqual([true, true, true]);
      // One paint material for the whole model, each vertex knowing its slot (so a part is one draw).
      await expect(meshes.length).toBeGreaterThan(0);
      await expect(meshes.every((m) => m.material === rig.body && !!m.geometry.getAttribute('slot'))).toBe(true);
    },
  };
}

export default {
  title: 'Models',
  args: { still: false },
  argTypes: { still: { control: 'boolean', description: 'Freeze each panel mid-clip in a three-quarter view (screenshots).' } },
} satisfies Meta<Args>;

export const Ship = model('ship');
export const Skeleton = model('skeleton');
export const Tick = model('tick');
export const Lance = model('lance');
export const Hornet = model('hornet');
export const Urchin = model('urchin');
export const Bastion = model('bastion');
export const Nest = model('nest');
export const Wraith = model('wraith');
export const Geode = model('geode');
export const Jelly = model('jelly');
export const Crab = model('crab');
export const Angel = model('angel');
export const Walker = model('walker');
export const Rail = model('rail');
export const Tree = model('tree');
export const Grave = model('grave');
export const Roots = model('roots');
