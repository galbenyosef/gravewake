// What outlives a run: records and settings. Saved by the store; zod checks a save on load (saves are untrusted).
import { z } from 'zod';

export const MetaSchema = z.object({
  best: z.number().int().nonnegative(),
  bestWave: z.number().int().nonnegative(),
  runs: z.number().int().nonnegative(),
  muted: z.boolean(),
});
export type Meta = z.infer<typeof MetaSchema>;

export const newMeta = (): Meta => ({ best: 0, bestWave: 0, runs: 0, muted: false });

/** A finished run's records folded in. */
export const recordRun = (m: Meta, score: number, wave: number): Meta =>
  ({ ...m, runs: m.runs + 1, best: Math.max(m.best, score), bestWave: Math.max(m.bestWave, wave) });

/** A save's meta, or null when it isn't one. */
export const parseMeta = (raw: unknown): Meta | null => { const r = MetaSchema.safeParse(raw); return r.success ? r.data : null; };
