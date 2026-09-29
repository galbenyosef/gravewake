// Story harness: boots the real game once per page into a persistent #app element, then each story sets core and UI
// state directly (no replay from the title) and drives the real canvas: taps and stick drags in design coordinates,
// then `settle()`/`advance()` on the held game clock so every run is the same.
import type { Container } from 'pixi.js';
import { expect } from 'storybook/test';
import { advance, rewind, settle } from '../clock';
import { arena, boot } from '../runtime';
import { layers, pixi, view } from '../stage';
import { game, initialUi, ui, type UiState } from '../store';
import { newRun } from '../game';
import { enemyDef } from '../content';
import type { Enemy, GameState } from '../world';

export type StoryArgs = { runInteraction: boolean };
export const storyArgs: StoryArgs = { runInteraction: true };
export const storyControls = {
  argTypes: { runInteraction: { control: 'boolean' as const, description: 'Turn off to explore this starting state live (the play function then does nothing).' } },
};

const W = 844, H = 390;
let el: HTMLElement | null = null;
let booted: Promise<unknown> | null = null;

function host() {
  if (!el) {
    el = document.createElement('div');
    el.id = 'app';
    Object.assign(el.style, { width: `${W}px`, height: `${H}px` });
    booted = boot(el);
  }
  return el;
}

/** The story's canvas host, with `setup` applied once the game has booted. */
export function stage(setup: () => { run: GameState; ui?: Partial<UiState> }, warmMs = 0) {
  const node = host();
  void booted!.then(() => apply(setup, warmMs));
  return node;
}

/** Hiders for story-only screens (a demo screen stays attached to the page across stories otherwise). */
const extras = new Set<() => void>();
export const storyScreen = (hide: () => void) => { extras.add(hide); };

async function apply(setup: () => { run: GameState; ui?: Partial<UiState> }, warmMs: number) {
  extras.forEach((hide) => hide());
  const s = setup();
  rewind();
  game.setState({ run: s.run });
  ui.setState({ ...initialUi, ...s.ui });
  arena!.snap(s.run);
  if (warmMs) advance(warmMs);
  settle();
}

/** Resolves when the story's state is on screen (call first in every play). */
export async function ready() {
  host();
  await booted;
  await new Promise((r) => setTimeout(r, 0)); // the stage's .then above runs first
}

// ---------- state builders ----------

/** A run in the middle of a fight with exactly these enemies, no scheduled spawns left, ship at (px, py). */
export function fight(enemies: [kind: string, x: number, y: number][], o: { seed?: number; wave?: number; px?: number; py?: number } = {}): GameState {
  let s = newRun(o.seed ?? 11);
  s = { ...s, wave: o.wave ?? 3, spawnIdx: 999, waveTime: 10, events: [], player: { ...s.player, x: o.px ?? -8, y: o.py ?? 0 } };
  const es: Enemy[] = enemies.map(([kind, x, y], i) => {
    const d = enemyDef(kind);
    return { id: 1000 + i, kind, x, y, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, age: 1, facing: Math.atan2(s.player.y - y, s.player.x - x), flash: 0, mem: d.behaviours.map((b) => b.mem(() => 0.5)), parent: 0 };
  });
  return { ...s, enemies: es, nextId: 2000 };
}

// ---------- driver ----------

const canvas = () => pixi.canvas;
const at = (x: number, y: number) => { const r = canvas().getBoundingClientRect(); return { clientX: r.left + x * view.scale, clientY: r.top + y * view.scale }; };
function send(type: string, x: number, y: number, id = 1) {
  // Dispatched on the canvas and bubbling: Pixi hears pointerdown there and move/up on document/window, as input.ts does.
  canvas().dispatchEvent(new PointerEvent(type, { ...at(x, y), pointerId: id, pointerType: 'touch', isPrimary: id === 1, bubbles: true, cancelable: true, button: 0, buttons: type === 'pointerup' ? 0 : 1 }));
}

/** A tap at design coordinates, then the clock settles (and renders, so the next hit test sees the new layout). */
export async function tap(x: number, y: number) {
  send('pointerdown', x, y);
  send('pointerup', x, y);
  settle();
}

/** A thumb held on a stick: down at (x, y), dragged by (dx, dy) design px, held for `ms` of game time, released. */
export async function drag(x: number, y: number, dx: number, dy: number, ms: number, id = 1) {
  send('pointerdown', x, y, id);
  send('pointermove', x + dx, y + dy, id);
  advance(ms);
  send('pointerup', x + dx, y + dy, id);
  settle();
}

export const descendants = (n: Container): Container[] => n.children.flatMap((c) => [c, ...descendants(c as Container)]);
/** Visible all the way up (Pixi v8 dropped worldVisible). */
const shown = (n: Container | null): boolean => !n || (n.visible && n.alpha > 0 && shown(n.parent));
const textOf = (n: Container) => (n as Container & { text?: unknown }).text;
export const screenText = () => descendants(layers.ui).filter((n) => shown(n)).map(textOf).filter((t): t is string => typeof t === 'string');

/** Tap the tappable node holding the text `label`. */
export async function press(label: string) {
  const t = descendants(layers.ui).find((n) => shown(n) && textOf(n) === label);
  await expect(t, `a visible "${label}"`).toBeDefined();
  let n: Container | null = t!;
  while (n && n.eventMode !== 'static') n = n.parent;
  await expect(n, `a tappable ancestor of "${label}"`).toBeTruthy();
  const b = n!.getBounds();
  await tap((b.x + b.width / 2) / view.scale, (b.y + b.height / 2) / view.scale);
}

export { advance, settle, game, ui };
