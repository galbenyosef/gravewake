// The rig contract between models/kit.py and view/models.ts, checked on the committed exports: every model the
// content can name (plus the ship) has a Blender script and a .glb, and each .glb has only the three material slots,
// exactly the three clips, and one `rig` root. A failure here means `npm run models` wasn't rerun after a change.
import { describe, expect, it } from 'vitest';
import { CLIPS, RIGS, SLOTS } from './view/models';

/** Each export as a base64 data URL (vite's ?inline), and the scripts' names. */
const GLBS = import.meta.glob<string>('../models/*.glb', { query: '?inline', import: 'default', eager: true });
const SCRIPTS = Object.keys(import.meta.glob('../models/*.py', { query: '?raw', eager: true }));
const files = [...Object.keys(GLBS), ...SCRIPTS].map((p) => p.slice('../models/'.length));

/** The JSON chunk of a binary glTF. */
function gltf(name: string): { materials: { name: string }[]; animations: { name: string }[]; scenes: { nodes: number[] }[]; nodes: { name: string }[] } {
  const bin = atob(GLBS[`../models/${name}.glb`]!.split(',')[1]!), b = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  const v = new DataView(b.buffer);
  expect(v.getUint32(0, true), `${name}.glb magic`).toBe(0x46546c67);
  return JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + v.getUint32(12, true))));
}

describe('models', () => {
  it('every model has a script and an export, and nothing else is exported', () => {
    expect(RIGS.filter((n) => !files.includes(`${n}.py`) || !files.includes(`${n}.glb`))).toEqual([]);
    expect(files.filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4)).sort()).toEqual([...RIGS].sort());
  });
  for (const name of RIGS) {
    it(`${name}: body/trim/glow materials, idle/attack/die clips, one rig root`, () => {
      const g = gltf(name);
      expect(g.materials.map((m) => m.name).filter((m) => !(SLOTS as readonly string[]).includes(m))).toEqual([]);
      expect(g.materials.map((m) => m.name)).toContain('body');
      expect(g.animations.map((a) => a.name).sort()).toEqual([...CLIPS].sort());
      expect(g.scenes[0]!.nodes.map((i) => g.nodes[i]!.name)).toEqual(['rig']);
    });
  }
});
