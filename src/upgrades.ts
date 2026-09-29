// Upgrade effect words. content/upgrades.kdl lists them under each upgrade (`cast-rate 1.2`); content.ts hands this
// registry to `combinators()`. Each word maps the wizard's stats to new stats: multipliers are `x` factors, the rest add.
import type { Stats } from './world';

export type Effect = (s: Stats) => Stats;

export const BASE_STATS: Stats = { damage: 1, fireRate: 1, shotSpeed: 1, barrels: 1, pierce: 0, moveSpeed: 1, magnet: 1, maxHp: 0 };

export const EFFECTS: Record<string, (...args: number[]) => Effect> = {
  /** Spells hit `x` times harder. */
  damage: (x) => (s) => ({ ...s, damage: s.damage * x }),
  /** The wizard casts `x` times as often. */
  'cast-rate': (x) => (s) => ({ ...s, fireRate: s.fireRate * x }),
  /** Spells fly `x` times faster (and so further). */
  'spell-speed': (x) => (s) => ({ ...s, shotSpeed: s.shotSpeed * x }),
  /** `n` more bolts a cast, fanned. */
  bolts: (n) => (s) => ({ ...s, barrels: s.barrels + n }),
  /** Spells pass through `n` more enemies. */
  pierce: (n) => (s) => ({ ...s, pierce: s.pierce + n }),
  /** The wizard walks `x` times faster. */
  stride: (x) => (s) => ({ ...s, moveSpeed: s.moveSpeed * x }),
  /** Souls are drawn in from `x` times as far. */
  lure: (x) => (s) => ({ ...s, magnet: s.magnet * x }),
  /** `n` more vigour (the boon also mends to full, see game.ts pickUpgrade). */
  vigour: (n) => (s) => ({ ...s, maxHp: s.maxHp + n }),
};
