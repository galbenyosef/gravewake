// The shapes of a run: plain data only, so a run can be copied, compared, snapshotted into a story and replayed by the
// sim. game.ts owns the rules that change it; enemies.ts owns the behaviour words; this module owns only the types and
// the World handle a behaviour gets for one tick.
import { T } from './tuning';

export type Vec2 = { x: number; y: number };

export type Enemy = {
  id: number;
  kind: string;
  x: number; y: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  /** Seconds since it stepped out of its warp gate. */
  age: number;
  /** Radians; what a shield or a gun points along. */
  facing: number;
  /** Seconds of hit flash left (the shell brightens the mesh). */
  flash: number;
  /** Scratch per behaviour, `mem[i]` belongs to the enemy's i-th behaviour (timers, modes, a target point). */
  mem: number[][];
  /** Who summoned it, so a hive counts its own brood. */
  parent: number;
  /** Size multiplier from its wave's `spawn scale=` (absent = 1): collision and mesh both. */
  scale?: number;
  /** Radians of the laser it is painting on the ship (a `snipe` word), absent when not aiming. */
  laser?: number;
};

export type Shot = {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  dmg: number;
  r: number;
  /** Player shots pass through this many more enemies. */
  pierce: number;
  hostile: boolean;
  /** A lob flies over everything and lands at (tx, ty) when life runs out, hurting within `blast`. */
  lob: boolean;
  tx: number; ty: number; blast: number;
  /** Enemies a piercing shot already hit, so it doesn't hit one twice. */
  hit: number[];
};

export type Pickup = { id: number; kind: 'shard' | 'repair'; x: number; y: number; life: number };

/** A gate opening: `kind` steps out at (x, y) when `t` (seconds left) runs out. */
export type Warp = { id: number; kind: string; x: number; y: number; t: number; parent: number; scale?: number };

export type Player = {
  x: number; y: number;
  vx: number; vy: number;
  /** Aim direction (unit vector) of the last shot, for the ship's heading. */
  ax: number; ay: number;
  hp: number;
  invuln: number;
  fireCd: number;
};

/** What upgrades change. Numbers multiply or add onto tuning. */
export type Stats = {
  damage: number;
  fireRate: number;
  shotSpeed: number;
  barrels: number;
  pierce: number;
  moveSpeed: number;
  magnet: number;
  maxHp: number;
};

export type Phase = 'fight' | 'cleared' | 'upgrade' | 'dead';

export type GameEvent =
  | { type: 'fire'; x: number; y: number; angle: number }
  | { type: 'hit'; id: number; x: number; y: number; kind: string }
  | { type: 'kill'; id: number; x: number; y: number; kind: string; score: number }
  | { type: 'hurt'; x: number; y: number }
  | { type: 'warp'; x: number; y: number; kind: string }
  | { type: 'arrive'; id: number; kind: string; x: number; y: number }
  | { type: 'telegraph'; id: number; what: 'dash' | 'lob' | 'blink' | 'snipe'; x: number; y: number; tx: number; ty: number; dur: number }
  | { type: 'blast'; x: number; y: number; r: number }
  | { type: 'block'; x: number; y: number }
  /** `id` was mended by `by`. */
  | { type: 'heal'; id: number; by: number; x: number; y: number }
  /** Enemy `id` fired (the shell plays its attack clip). */
  | { type: 'enemy-fire'; id: number; x: number; y: number }
  | { type: 'pickup'; kind: Pickup['kind']; x: number; y: number }
  | { type: 'wave'; n: number; boss: string | null }
  | { type: 'cleared'; n: number }
  | { type: 'upgrade'; id: string }
  | { type: 'dead'; score: number };

export type GameState = {
  seed: number;
  time: number;
  phase: Phase;
  /** 1-based wave number. */
  wave: number;
  /** Seconds since the wave began: its spawn list is keyed on this. */
  waveTime: number;
  /** Seconds left in the `cleared` beat before the upgrade picker. */
  phaseT: number;
  /** Index into the current wave's expanded spawn list of the next spawn to open a gate. */
  spawnIdx: number;
  player: Player;
  stats: Stats;
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
  warps: Warp[];
  score: number;
  mult: number;
  kills: number;
  /** Upgrade ids on offer in the `upgrade` phase. */
  offer: string[];
  taken: string[];
  nextId: number;
  /** What happened in the last step, for the shell to animate. Replaced every step. */
  events: GameEvent[];
};

/** Where to aim and where to go, from sticks or keys or a bot. Vectors up to length 1; `aim` null holds fire. */
export type Input = { mx: number; my: number; aim: Vec2 | null };
export const IDLE: Input = { mx: 0, my: 0, aim: null };

/** What a behaviour can reach during one tick. The state is a private draft: behaviours mutate it freely. */
export type World = {
  s: GameState;
  rand: () => number;
  emit: (e: GameEvent) => void;
  /** Open a warp gate for `kind` that delivers it at (x, y) after the warp time; `parent` is the summoner. */
  summon: (kind: string, x: number, y: number, parent: number, scale?: number) => void;
  /** Put `kind` straight into play (a splitter's children don't wait for a gate). */
  spawn: (kind: string, x: number, y: number, parent: number) => Enemy;
  shoot: (x: number, y: number, angle: number, speed: number) => void;
  lob: (x: number, y: number, tx: number, ty: number, blast: number) => void;
  hurtPlayer: (dmg: number) => void;
};

export const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(bx - ax, by - ay);
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
/** Where a ray from (x, y) along `a` radians meets the arena wall (a laser's far end). */
export function rayToWall(x: number, y: number, a: number, halfW = T.ARENA_W_U / 2, halfH = T.ARENA_H_U / 2): [number, number] {
  const dx = Math.cos(a), dy = Math.sin(a);
  const t = Math.min(dx ? ((dx > 0 ? halfW : -halfW) - x) / dx : Infinity, dy ? ((dy > 0 ? halfH : -halfH) - y) / dy : Infinity);
  return [x + dx * Math.max(0, t), y + dy * Math.max(0, t)];
}
/** Shortest signed difference between two angles, in (-PI, PI]. */
export const angleDiff = (a: number, b: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d <= -Math.PI) d += Math.PI * 2; return d; };
