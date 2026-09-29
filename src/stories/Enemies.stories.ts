// One story per enemy: a squad of it against the ship, a moment into the fight, with its signature behaviour asserted.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { advance, fight, game, ready, stage, storyArgs, storyControls, type StoryArgs } from './stage';
import type { GameEvent, GameState } from '../world';

export default {
  title: 'Enemies',
  args: storyArgs,
  ...storyControls,
} satisfies Meta<StoryArgs>;
type Story = StoryObj<StoryArgs>;

const SPOTS: [number, number][] = [[6, -5], [9, 1], [5, 5], [12, -3], [11, 6], [3, 0]];

/** Events seen while advancing `ms` of game time. */
function watch(ms: number) {
  const seen: GameEvent[] = [];
  const off = game.subscribe((g) => { seen.push(...g.run.events); });
  advance(ms);
  off();
  return seen;
}

function enemy(kind: string, count: number, check: (s: GameState, events: GameEvent[]) => Promise<void> | void, watchMs = 2500): Story {
  return {
    render: () => stage(() => ({ run: fight(SPOTS.slice(0, count).map(([x, y]) => [kind, x, y]), { px: -8 }), ui: { screen: 'play' } }), 400),
    play: async ({ args }) => {
      if (!args.runInteraction) return;
      await ready();
      const events = watch(watchMs);
      await check(game.getState().run, events);
    },
  };
}
const has = (events: GameEvent[], type: GameEvent['type']) => events.some((e) => e.type === type);

export const Mite: Story = enemy('mite', 6, (s) => expect(s.enemies.some((e) => Math.hypot(e.vx, e.vy) > 4)).toBe(true));
export const Drone: Story = enemy('drone', 5, (s) => expect(Math.min(...s.enemies.map((e) => e.x))).toBeLessThan(3));
export const Lancer: Story = enemy('lancer', 3, (_s, ev) => expect(ev.some((e) => e.type === 'telegraph' && e.what === 'dash')).toBe(true), 3500);
export const Wasp: Story = enemy('wasp', 4, (_s, ev) => expect(has(ev, 'enemy-fire')).toBe(true));
export const Splitter: Story = enemy('splitter', 3, (s) => expect(s.enemies.every((e) => e.kind === 'splitter')).toBe(true));
export const Bulwark: Story = {
  ...enemy('bulwark', 2, () => {}),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    // Shoot straight at a shield: it holds.
    const s0 = game.getState().run, b = s0.enemies[0]!;
    game.setState({ run: { ...s0, enemies: s0.enemies.map((e) => (e === b ? { ...e, facing: Math.atan2(s0.player.y - e.y, s0.player.x - e.x) } : e)) } });
    const events = watch(10);
    await expect(events.some((e) => e.type === 'hit')).toBe(false);
    // Left alone, they walk up to the ship and hold off, shields up, instead of ramming it.
    const later = watch(9000), { player: p, enemies } = game.getState().run;
    await expect(has(later, 'hurt')).toBe(false);
    await expect(Math.min(...enemies.map((e) => Math.hypot(e.x - p.x, e.y - p.y)))).toBeLessThan(6);
  },
};
export const Bomber: Story = enemy('bomber', 4, (_s, ev) => expect(has(ev, 'blast')).toBe(true), 3000);
export const Mender: Story = {
  render: () => stage(() => {
    const run = fight([['mender', 9, 0], ['drone', 7, -2], ['drone', 7, 2]], { px: -10 });
    return { run: { ...run, enemies: run.enemies.map((e) => (e.kind === 'drone' ? { ...e, hp: 1 } : e)) }, ui: { screen: 'play' } };
  }, 300),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    const events = watch(1500);
    await expect(has(events, 'heal')).toBe(true);
  },
};
export const Hive: Story = enemy('hive', 2, (_s, ev) => expect(has(ev, 'warp')).toBe(true), 3500);
export const Phantom: Story = enemy('phantom', 3, (_s, ev) => expect(ev.some((e) => e.type === 'telegraph' && e.what === 'blink')).toBe(true), 4500);
export const Mortar: Story = enemy('mortar', 2, (_s, ev) => expect(ev.some((e) => e.type === 'telegraph' && e.what === 'lob')).toBe(true), 3000);
/** Ends in the lock: both lasers frozen on the ship, a beat before the shots. */
export const Sniper: Story = enemy('sniper', 2, (s, ev) => {
  expect(ev.some((e) => e.type === 'telegraph' && e.what === 'snipe')).toBe(true);
  expect(s.enemies.every((e) => e.laser !== undefined)).toBe(true);
}, 2800);
export const Seraph: Story = enemy('seraph', 1, (s) => expect(s.shots.filter((b) => b.hostile).length).toBeGreaterThan(20), 2000);
export const Colossus: Story = enemy('colossus', 1, (_s, ev) => expect(has(ev, 'enemy-fire')).toBe(true), 2000);
