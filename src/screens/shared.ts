// Game-wide declarative-UI registrations (the only module that calls defineProp/defineElement), the screenUi factory
// every screen is made with, and binding builders for the shared prefabs so a screen's .ts stays bindings-only.
import { Container, Graphics } from 'pixi.js';
import { color, defineProp, lerpColor } from '../decl/css';
import { createUi, defineElement, use, type Use, type UiNode } from '../decl/engine';
import { enemyDef, upgradeDef, type Model } from '../content';
import { sfx } from '../audio';
import { enemyColor } from '../tokens';
import { layers, view } from '../stage';
import sharedKdl from './shared.kdl?raw';
import sharedCss from './shared.css?raw';

// ---------- properties ----------

/** Multiplies a node's colours: a `meter`'s fill, `pips`, `corners` are drawn white and coloured by this. */
defineProp('tint', {
  parse: color, initial: 0xffffff, lerp: lerpColor,
  apply: (n: UiNode, v: number) => { n.el.tint = v; },
});

// ---------- elements ----------

/** A bar's fill: a rect of the box's width * `value` (0..1), coloured by `tint`: `meter value=(bind)"fill"`. */
defineElement('meter', ({ value }, { w, h }) => {
  const c = new Container();
  c.addChild(new Graphics().rect(0, 0, w * Math.min(1, Math.max(0, value as number)), h).fill(0xffffff));
  return c;
});

/** Hull pips: `count` diamonds across the box, the first `value` lit, the rest dim; coloured by `tint`. */
const PIP_GAP_PX = 5;
defineElement('pips', ({ count, value }, { w, h }) => {
  const c = new Container(), n = count as number, size = Math.min(h, (w - PIP_GAP_PX * (n - 1)) / Math.max(1, n));
  for (let i = 0; i < n; i++) {
    const x = i * (size + PIP_GAP_PX) + size / 2, y = h / 2, r = size / 2;
    const g = new Graphics().poly([x, y - r, x + r * 0.8, y, x, y + r, x - r * 0.8, y]);
    if (i < (value as number)) g.fill(0xffffff); else g.fill({ color: 0xffffff, alpha: 0.12 }).stroke({ color: 0xffffff, alpha: 0.4, width: 1.5 });
    c.addChild(g);
  }
  return c;
});

/** Sci-fi corner brackets on the box's four corners, coloured by `tint`: `corners` (CSS makes it full-size). */
const CORNER_PX = 12;
defineElement('corners', (_p, { w, h }) => {
  const g = new Graphics(), k = CORNER_PX;
  g.moveTo(0, k).lineTo(0, 0).lineTo(k, 0).moveTo(w - k, 0).lineTo(w, 0).lineTo(w, k)
    .moveTo(w, h - k).lineTo(w, h).lineTo(w - k, h).moveTo(k, h).lineTo(0, h).lineTo(0, h - k)
    .stroke({ color: 0xffffff, width: 3 });
  const c = new Container();
  c.addChild(g);
  return c;
});

/** Flat outlines of each enemy model seen from above, forward up, on a unit circle: the 2D face of the 3D roster. */
type Pt = readonly [number, number];
const ring = (n: number, r = 1, cx = 0, cy = 0, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [cx + Math.cos(a0 + (i / n) * Math.PI * 2) * r, cy + Math.sin(a0 + (i / n) * Math.PI * 2) * r] as const);
const star = (n: number, inner: number, outer = 1) => Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? inner : outer; return [Math.cos(a) * r, Math.sin(a) * r] as const; });
/** A left-right symmetric outline from its right half, top to bottom. */
const sym = (half: Pt[]): Pt[] => [...half, ...half.slice().reverse().map(([x, y]) => [-x, y] as const)];
/** A shape and its mirror image across the vertical axis (paired wings, legs, guns). */
const pair = (pts: Pt[]): Pt[][] => [pts, pts.map(([x, y]) => [-x, y] as const)];
const GLYPHS: Record<Model, readonly (readonly Pt[])[]> = {
  pod: [ring(16, 0.7, 0, 0.05), ring(10, 0.22, 0, -0.55), ...pair(ring(8, 0.2, 0.88, 0.1))],
  tick: [sym([[0, -1], [0.22, -0.8], [0.42, -0.25], [0.38, 0.45], [0, 0.95]]), ...pair([[0.4, -0.3], [0.85, -0.55]]), ...pair([[0.42, 0.05], [0.9, 0.05]]), ...pair([[0.38, 0.35], [0.8, 0.65]])],
  lance: [sym([[0, -1], [0.12, -0.3], [0.7, -0.15], [0.55, 0.3], [0.2, 0.35], [0.4, 0.9], [0, 0.7]])],
  hornet: [sym([[0, -0.95], [0.2, -0.75], [0.26, -0.3], [0.3, 0.25], [0.18, 0.8], [0, 1]]), ...pair([[0.24, -0.35], [0.95, -0.7], [0.98, -0.42], [0.28, -0.12]])],
  urchin: [star(12, 0.58), ring(14, 0.45)],
  bastion: [sym([[0, -0.95], [0.85, -0.7], [0.85, -0.5], [0, -0.72]]), ring(4, 0.62, 0, 0.2, -Math.PI / 4), ...pair(ring(8, 0.3, 0.6, 0.15))],
  nest: [ring(18, 0.95), star(6, 0.18, 0.55), ...Array.from({ length: 6 }, (_, i) => ring(6, 0.12, Math.cos(i * 1.047 + 0.3) * 0.75, Math.sin(i * 1.047 + 0.3) * 0.75))],
  wraith: [ring(16, 0.65, 0, -0.05), ring(10, 0.28, 0, -0.35), sym([[0.3, 0.5], [0.12, 1], [0, 0.75]])],
  geode: [...Array.from({ length: 4 }, (_, q) => Array.from({ length: 6 }, (_, i) => { const a = q * Math.PI / 2 + 0.2 + i * 0.23; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9] as const; })), star(5, 0.25, 0.5)],
  jelly: [Array.from({ length: 32 }, (_, i) => { const a = (i / 32) * Math.PI * 2, r = 0.72 + 0.08 * Math.cos(a * 8); return [Math.cos(a) * r, Math.sin(a) * r] as const; }), sym([[0.08, -0.3], [0.08, -0.08], [0.3, -0.08], [0.3, 0.08], [0.08, 0.08], [0.08, 0.3]])],
  crab: [ring(18, 0.72, 0, 0.1).map(([x, y]) => [x * 1.15, y] as const), [[-0.12, -1], [0.12, -1], [0.12, -0.1], [-0.12, -0.1]], ...pair([[0.75, -0.2], [1, -0.55]]), ...pair([[0.75, 0.35], [1, 0.75]])],
  rail: [[[-0.06, -1], [0.06, -1], [0.06, 0.05], [-0.06, 0.05]], sym([[0, 0], [0.22, 0.05], [0.25, 0.45], [0, 0.5]]), ...pair([[0.2, 0.4], [0.7, 0.9]]), [[0, 0.5], [0, 1]]],
  angel: [star(6, 0.32), ring(12, 0.3)],
  walker: [ring(4, 0.55, 0, 0.1, -Math.PI / 4), ...pair([[0.45, -0.3], [0.9, -0.3], [0.9, 0.25], [0.45, 0.25]]), ...pair([[0.62, -0.3], [0.62, -0.9], [0.74, -0.9], [0.74, -0.3]])],
};

/** An enemy's glyph in its palette colour, fitted to the box: `enemy-glyph kind=(bind)"kind"`. */
defineElement('enemy-glyph', ({ kind }, { w, h }) => {
  const g = new Graphics(), col = enemyColor(kind as string), r = Math.min(w, h) / 2 - 3;
  const shapes = GLYPHS[enemyDef(kind as string).model];
  for (const [width, alpha] of [[6, 0.25], [2, 1]] as const) {
    for (const pts of shapes) g.poly(pts.flatMap(([x, y]) => [w / 2 + x * r, h / 2 + y * r])).stroke({ color: col, width, alpha, join: 'round' });
  }
  const c = new Container();
  c.addChild(g);
  return c;
});

// ---------- the screen factory ----------

const screens: ReturnType<typeof createUi>[] = [];

/**
 * Every screen's Ui: the shared prefabs and styles come first (a screen's own CSS wins ties). Screens draw in creation
 * order: each gets its own layer now, because the engine adds a root to its parent when it first renders, which would
 * otherwise stack a screen by when it last appeared rather than by the order the runtime imports them.
 */
export function screenUi(kdl: string, css: string) {
  const layer = new Container();
  layers.ui.addChild(layer);
  const ui = createUi(layer, sharedKdl + kdl, sharedCss + css, {
    texture: (name) => { throw new Error(`no texture atlas in this game (asked for "${name}"); draw it with a defineElement in screens/shared.ts`); },
    onTap: () => sfx('tap'),
    viewport: () => ({ width: view.width, height: view.height, touch: view.touch }),
  });
  screens.push(ui);
  let last = 'null';
  return {
    ...ui,
    reload: (k?: string, c?: string) => ui.reload(k && sharedKdl + k, c && sharedCss + c),
    /** Render when the tree differs from the last one shown (bindings compared as JSON; handlers are assumed stable per data). */
    show(u: Use | null) {
      const k = JSON.stringify(u);
      if (k === last) return;
      last = k;
      ui.render(u);
    },
  };
}

/** Steps every screen's styles and layout; true while any of them is mid-animation. */
export const tickScreens = (dt: number) => screens.reduce((busy, s) => { s.tick(dt); return s.busy() || busy; }, false);

// ---------- binding builders ----------

/** Space-joined names of the true flags: the `state` string a prefab's CSS matches on. */
export const states = (flags: Record<string, boolean>) => Object.keys(flags).filter((k) => flags[k]).join(' ');

export const btn = (label: string, tap: () => void, state = '') => use('btn', { key: label, label, tap, state });

export const bar = (label: string, fill: number) => use('bar', { label, fill });

/** The i-th card of an upgrade offer (i staggers its entry). */
export function upgradeCard(id: string, i: number, pick: () => void) {
  const d = upgradeDef(id);
  return use('upgrade-card', { key: id, name: d.name.toUpperCase(), blurb: d.blurb, icon: d.icon, state: `n${i}`, pick });
}

const TIER_LABEL = { minion: 'MINION', regular: 'HOSTILE', elite: 'ELITE', boss: 'BOSS' } as const;
export function enemyCard(kind: string) {
  const d = enemyDef(kind);
  return use('enemy-card', { key: kind, kind, name: d.name.toUpperCase(), blurb: d.blurb, tier: d.tier, tierLabel: TIER_LABEL[d.tier] });
}
