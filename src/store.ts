// Two stores, plain data only, changed only through ./actions with setState (never mutated in place).
// `game` holds the run and the meta; only the meta is saved (a twin-stick run mid-fight isn't worth resuming), under
// one raw key, and zod checks it on load. `ui` is the view's own state and is never saved.
import { createStore } from 'zustand/vanilla';
import { persist, type PersistStorage } from 'zustand/middleware';
import { newRun } from './game';
import { newMeta, parseMeta, type Meta } from './meta';
import type { GameState } from './world';

export const META_KEY = 'prismfall.meta';

export type GameStore = { run: GameState; meta: Meta };

export type Screen = 'title' | 'codex' | 'play';
export type UiState = {
  screen: Screen;
  paused: boolean;
  /** The device is held upright: the rotate prompt covers everything. */
  portrait: boolean;
};
export const initialUi: UiState = { screen: 'title', paused: false, portrait: false };

function disk<T>(fn: (ls: Storage) => T): T | null {
  if (import.meta.env.STORYBOOK) return null; // stories never read or write saves
  try { return fn(localStorage); } catch { return null; } // private mode
}

// The run changes every frame; persist calls setItem on every set, so only write when the meta object changed.
let written: Meta | null = null;
const storage: PersistStorage<{ meta: unknown }> = {
  getItem: () => ({ state: { meta: disk((ls) => JSON.parse(ls.getItem(META_KEY) ?? 'null')) }, version: 0 }),
  setItem: (_, { state }) => { if (state.meta === written) return; written = state.meta as Meta; disk((ls) => ls.setItem(META_KEY, JSON.stringify(state.meta))); },
  removeItem: () => { disk((ls) => ls.removeItem(META_KEY)); },
};

export const game = createStore<GameStore>()(persist((): GameStore => ({ run: newRun(1), meta: newMeta() }), {
  name: 'prismfall',
  storage,
  partialize: (g) => ({ meta: g.meta }),
  merge: (saved, cur) => ({ ...cur, meta: parseMeta((saved as { meta: unknown } | undefined)?.meta) ?? cur.meta }),
}));
// persist doesn't write after hydrating; an identity set saves once, replacing a corrupt save with the default.
game.setState((s) => s);

export const ui = createStore<UiState>()(() => initialUi);
