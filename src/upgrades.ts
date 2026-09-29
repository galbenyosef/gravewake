// Upgrade effect words. content/upgrades.kdl lists them under each upgrade (`fire-rate 1.2`); content.ts hands this
// registry to `combinators()`. Each word maps the ship's stats to new stats: multipliers are `x` factors, the rest add.
import type { Stats } from './world';

export type Effect = (s: Stats) => Stats;

export const BASE_STATS: Stats = { damage: 1, fireRate: 1, shotSpeed: 1, barrels: 1, pierce: 0, moveSpeed: 1, magnet: 1, maxHp: 0 };

export const EFFECTS: Record<string, (...args: number[]) => Effect> = {
  /** Shots hit `x` times harder. */
  damage: (x) => (s) => ({ ...s, damage: s.damage * x }),
  /** The gun fires `x` times as often. */
  'fire-rate': (x) => (s) => ({ ...s, fireRate: s.fireRate * x }),
  /** Shots fly `x` times faster (and so further). */
  'shot-speed': (x) => (s) => ({ ...s, shotSpeed: s.shotSpeed * x }),
  /** `n` more barrels, fanned. */
  barrels: (n) => (s) => ({ ...s, barrels: s.barrels + n }),
  /** Shots pass through `n` more enemies. */
  pierce: (n) => (s) => ({ ...s, pierce: s.pierce + n }),
  /** The ship moves `x` times faster. */
  thrust: (x) => (s) => ({ ...s, moveSpeed: s.moveSpeed * x }),
  /** Shards are pulled in from `x` times as far. */
  magnet: (x) => (s) => ({ ...s, magnet: s.magnet * x }),
  /** `n` more hull points (the upgrade also repairs, see game.ts pickUpgrade). */
  hull: (n) => (s) => ({ ...s, maxHp: s.maxHp + n }),
};
