// Content kinds: enemy, wave, upgrade. Each is a zod schema handed to loadKdl, so the schema is the type and the only
// parser; behaviour words attach through `combinators()` with the registry of the module that owns the rule.
import { z } from 'zod';
import { combinators, loadKdl } from './content-load';
import { BEHAVIOURS } from './enemies';
import { EFFECTS } from './upgrades';
import enemiesKdl from '../content/enemies.kdl?raw';
import wavesKdl from '../content/waves.kdl?raw';
import upgradesKdl from '../content/upgrades.kdl?raw';

/** Mesh shapes the shell knows how to build (view/models.ts implements every one; the type makes it total). */
export const MODELS = ['orb', 'shard', 'dart', 'ring', 'spike', 'cube', 'hive', 'eye', 'prism', 'star', 'crown', 'core', 'titan'] as const;
export type Model = (typeof MODELS)[number];

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
