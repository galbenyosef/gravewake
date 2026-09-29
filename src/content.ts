// Content kinds: enemy, wave, upgrade, scatter, sound, mix. Each is a zod schema handed to loadKdl, so the schema is the type and the only
// parser; behaviour words attach through `combinators()` with the registry of the module that owns the rule.
import { z } from 'zod';
import { combinators, loadKdl } from './content-load';
import { BEHAVIOURS } from './enemies';
import { EFFECTS } from './upgrades';
import enemiesKdl from '../content/enemies.kdl?raw';
import wavesKdl from '../content/waves.kdl?raw';
import upgradesKdl from '../content/upgrades.kdl?raw';
import arenaKdl from '../content/arena.kdl?raw';
import soundsKdl from '../content/sounds.kdl?raw';
import { rand } from './rng';
import { T } from './tuning';

/** Characters the shell can build: each is models/<name>.py, exported to models/<name>.glb (view/models.ts loads them). */
export const MODELS = ['skeleton', 'crawler', 'ghoul', 'banshee', 'blightskull', 'warden', 'barrow', 'wraith', 'bloat', 'necromancer', 'catapult', 'lich', 'colossus', 'archer'] as const;
export type Model = (typeof MODELS)[number];
/** Scenery models round the clearing (models/<name>.py like the characters; content/arena.kdl places them). */
export const SCENERY = ['tree', 'grave', 'roots', 'rocks', 'bones', 'grass', 'altar', 'ruin', 'lantern', 'statue', 'snag'] as const;

const pos = z.number().positive();

export const EnemySchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  blurb: z.string(),
  hp: pos,
  /** Collision radius and visual size, u. */
  r: pos,
  /** Contact damage to the ship. */
  touch: z.number().int().nonnegative().default(1),
  score: z.number().int().nonnegative(),
  model: z.enum(MODELS),
  tier: z.enum(['minion', 'regular', 'elite', 'boss']).default('regular'),
  /** The kind a `split` or `summon` word produces. */
  spawns: z.string().optional(),
  children: combinators(BEHAVIOURS, 'behaviour'),
}).transform(({ children, ...e }) => ({ ...e, behaviours: children })).superRefine((e, ctx) => {
  if (e.behaviours.filter((b) => b.moves).length > 1) ctx.addIssue({ code: 'custom', message: 'more than one movement word (chase, keep-away, orbit, dash, blink, anchor)', path: ['children'] });
  if (e.behaviours.some((b) => b.needsSpawns) && !e.spawns) ctx.addIssue({ code: 'custom', message: 'split/summon need spawns="<enemy id>"', path: ['spawns'] });
});
export type EnemyDef = z.output<typeof EnemySchema>;

export const ENEMIES = loadKdl(enemiesKdl, { enemy: EnemySchema }).enemy;
export const ENEMY_IDS = Object.keys(ENEMIES);
for (const e of Object.values(ENEMIES)) if (e.spawns && !ENEMIES[e.spawns]) throw new Error(`enemy "${e.id}": spawns: unknown enemy "${e.spawns}" (known: ${ENEMY_IDS.join(', ')})`);

export function enemyDef(kind: string): EnemyDef {
  const d = ENEMIES[kind];
  if (!d) throw new Error(`unknown enemy "${kind}"`);
  return d;
}

const kind = z.string().refine((k) => k in ENEMIES, { error: (iss) => `unknown enemy "${String(iss.input)}" (known: ${ENEMY_IDS.join(', ')})` });
const SpawnSchema = z.strictObject({
  name: z.literal('spawn'),
  args: z.tuple([kind]),
  /** `count` gates, `gap` s apart, the first `at` s into the wave. */
  /** `scale` multiplies the enemy's size (collision and mesh). */
  props: z.strictObject({ count: z.number().int().positive().default(1), gap: z.number().nonnegative().default(0.4), at: z.number().nonnegative().default(0), scale: pos.default(1) }),
});

export const WaveSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  /** A palette token (`--ice`) that colours every enemy in the wave instead of its own `--enemy-<id>`. */
  tint: z.string().regex(/^--[\w-]+$/, 'a palette token like "--ice"').optional(),
  children: z.array(SpawnSchema).min(1),
}).transform(({ children, ...w }) => ({
  ...w,
  /** One entry per gate, sorted by when it opens. */
  spawns: children.flatMap((c) => Array.from({ length: c.props.count }, (_, i) => ({ kind: c.args[0], at: c.props.at + i * c.props.gap, scale: c.props.scale }))).sort((a, b) => a.at - b.at),
}));
export type WaveDef = z.output<typeof WaveSchema>;
export const WAVES = Object.values(loadKdl(wavesKdl, { wave: WaveSchema }).wave);

export const UpgradeSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  blurb: z.string(),
  /** A short glyph for the card (two or three characters). */
  icon: z.string(),
  children: combinators(EFFECTS, 'effect').refine((es) => es.length > 0, 'needs at least one effect'),
}).transform(({ children, ...u }) => ({ ...u, effects: children }));
export type UpgradeDef = z.output<typeof UpgradeSchema>;
export const UPGRADES = loadKdl(upgradesKdl, { upgrade: UpgradeSchema }).upgrade;
export const UPGRADE_IDS = Object.keys(UPGRADES);

export function upgradeDef(id: string): UpgradeDef {
  const d = UPGRADES[id];
  if (!d) throw new Error(`unknown upgrade "${id}"`);
  return d;
}

/** An enemy's (or its gate's) collision radius, u: its kind's `r` times its spawn scale. */
export const radius = (e: { kind: string; scale?: number }) => enemyDef(e.kind).r * (e.scale ?? 1);

/** The wave list loops past its end; `loop` counts completed passes (0 on the first). */
export function waveDef(n: number): { def: WaveDef; loop: number } {
  const i = (n - 1) % WAVES.length;
  return { def: WAVES[i]!, loop: Math.floor((n - 1) / WAVES.length) };
}

/** The boss a wave brings, if any. */
export const bossOf = (w: WaveDef) => w.spawns.map((s) => ENEMIES[s.kind]!).find((e) => e.tier === 'boss')?.id ?? null;

const EDGES = { top: ['top'], bottom: ['bottom'], sides: ['left', 'right'], all: ['top', 'bottom', 'left', 'right'], field: [], ring: [] } as const;
const nonneg = z.number().nonnegative();
export const ScatterSchema = z.strictObject({
  id: z.string(),
  model: z.enum(SCENERY),
  /** Palette token the model is painted in. */
  paint: z.string().regex(/^--[\w-]+$/, 'a palette token like "--wood"'),
  /** Palette token its glow parts burn in (default: the paint). */
  glow: z.string().regex(/^--[\w-]+$/, 'a palette token like "--soulfire"').optional(),
  /** Edges to walk, `field` (a grid over the whole clearing) or `ring` (round the centre at radius `out`; radius 0 is
   *  one slot at the centre). */
  along: z.enum(['top', 'bottom', 'sides', 'all', 'field', 'ring']),
  /** Past the edge, u (negative is inside); `spread` adds up to that much more. Unused by `field`. */
  out: z.number().default(0), spread: nonneg.default(0),
  /** Slot spacing along the edge, how far a slot may slide, and how far the row runs past the edge's ends, u. */
  step: pos, jitter: nonneg.default(0), extend: nonneg.default(0),
  scale: pos, vary: nonneg.default(0),
  chance: z.number().min(0).max(1).default(1),
  face: z.enum(['in', 'any']).default('any'),
  /** Contact shadow under each one: its footprint radius at scale 1, u (0: none). */
  shadow: nonneg.default(0),
  /** Each one lights the ground round it, this radius (u), in its glow colour. */
  light: pos.optional(),
  seed: z.number().int(),
  children: z.array(z.never()).max(0),
}).transform(({ children: _c, ...sc }) => {
  // The same slots every run: a seeded walk along each edge. `yaw` is where the model's +X faces, radians from +x
  // towards +z (like an enemy's facing).
  const rng = { seed: sc.seed }, r = () => rand(rng), hw = T.ARENA_W_U / 2, hh = T.ARENA_H_U / 2;
  const placements: { x: number; z: number; scale: number; yaw: number }[] = [];
  if (sc.along === 'field') {
    for (let x = -hw - sc.extend; x <= hw + sc.extend + 1e-6; x += sc.step) for (let zz = -hh - sc.extend; zz <= hh + sc.extend + 1e-6; zz += sc.step) {
      const px = x + (r() - 0.5) * sc.jitter, pz = zz + (r() - 0.5) * sc.jitter, keep = r() < sc.chance, scale = sc.scale + (r() - 0.5) * sc.vary, yaw = r() * Math.PI * 2;
      if (keep) placements.push({ x: px, z: pz, scale, yaw });
    }
  }
  if (sc.along === 'ring') {
    const n = Math.max(1, Math.round((Math.PI * 2 * sc.out) / sc.step));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (r() - 0.5) * sc.jitter / Math.max(sc.out, 1), rad = sc.out + r() * sc.spread, keep = r() < sc.chance, scale = sc.scale + (r() - 0.5) * sc.vary, turn = r();
      const x = Math.cos(a) * rad, zz = Math.sin(a) * rad;
      if (keep) placements.push({ x, z: zz, scale, yaw: sc.face === 'in' && rad > 0 ? Math.atan2(-zz, -x) + (turn - 0.5) * 0.7 : turn * Math.PI * 2 });
    }
  }
  for (const edge of EDGES[sc.along]) {
    const horiz = edge === 'top' || edge === 'bottom', half = (horiz ? hw : hh) + sc.extend, sign = edge === 'top' || edge === 'left' ? -1 : 1;
    // A step longer than the edge is one slot at its middle.
    for (let t = sc.step > 2 * half ? 0 : -half; t <= half + 1e-6; t += sc.step) {
      const along = t + (r() - 0.5) * sc.jitter, away = sign * ((horiz ? hh : hw) + sc.out + r() * sc.spread), keep = r() < sc.chance;
      const scale = sc.scale + (r() - 0.5) * sc.vary, turn = r();
      if (!keep) continue;
      const [x, zz] = horiz ? [along, away] : [away, along];
      placements.push({ x, z: zz, scale, yaw: sc.face === 'in' ? Math.atan2(-zz, -x) + (turn - 0.5) * 0.7 : turn * Math.PI * 2 });
    }
  }
  return { ...sc, placements };
});
export type ScatterDef = z.output<typeof ScatterSchema>;
export const SCATTERS = Object.values(loadKdl(arenaKdl, { scatter: ScatterSchema }).scatter);

const Voice = z.discriminatedUnion('name', [
  /** An oscillator sweeping `from` Hz to `to` Hz over `s` seconds, fading from `vol`; `jitter` adds up to that many Hz. */
  z.strictObject({ name: z.literal('tone'), args: z.tuple([z.enum(['sine', 'square', 'sawtooth', 'triangle'])]), props: z.strictObject({ from: pos, to: pos, s: pos, vol: pos, jitter: nonneg.default(0) }) }),
  /** Low-passed noise, the cutoff falling from `cutoff` Hz over `s` seconds, fading from `vol`. */
  z.strictObject({ name: z.literal('hiss'), args: z.tuple([]), props: z.strictObject({ s: pos, vol: pos, cutoff: pos }) }),
]);
export const SoundSchema = z.strictObject({
  id: z.string(),
  /** The least time between two of this sound, s. */
  gap: nonneg.default(0),
  children: z.array(Voice).min(1),
}).transform(({ children, ...s }) => ({ ...s, voices: children.map((v) => (v.name === 'tone' ? { kind: 'tone' as const, wave: v.args[0], ...v.props } : { kind: 'hiss' as const, ...v.props })) }));
export type SoundDef = z.output<typeof SoundSchema>;
export const MixSchema = z.strictObject({ id: z.string(), volume: z.number().min(0).max(1), children: z.array(z.never()).max(0) });
const soundContent = loadKdl(soundsKdl, { sound: SoundSchema, mix: MixSchema });
export const SOUNDS = soundContent.sound;
export const MASTER_VOLUME = soundContent.mix.master?.volume ?? (() => { throw new Error('content/sounds.kdl: no mix "master" volume='); })();
