// The fight as a whole: the twin sticks end to end, and a full swarm for the look.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { drag, fight, game, ready, screenText, stage, storyArgs, storyControls, type StoryArgs } from './stage';

export default {
  title: 'Arena',
  args: storyArgs,
  ...storyControls,
} satisfies Meta<StoryArgs>;
type Story = StoryObj<StoryArgs>;

export const TwinSticks: Story = {
  render: () => stage(() => ({ run: fight([['skeleton', 10, -6]], { px: 0, py: 0 }), ui: { screen: 'play' } })),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    // Left thumb: push right for half a second.
    await drag(150, 280, 60, 0, 500, 1);
    await expect(game.getState().run.player.x).toBeGreaterThan(2);
    // Right thumb: aim up-right; the gun fires that way.
    const before = game.getState().run.player;
    await drag(700, 280, 40, -40, 300, 2);
    const p = game.getState().run.player;
    await expect([p.ax > 0.5, p.ay < -0.5, p.fireCd !== before.fireCd]).toEqual([true, true, true]);
  },
};

export const FullSwarm: Story = {
  render: () => stage(() => ({
    run: {
      ...fight([
        ['warden', 5, -4], ['necromancer', 12, -6], ['banshee', 2, 5], ['banshee', 6, 7], ['bloat', 9, 2], ['ghoul', 13, 3],
        ['skeleton', 3, -7], ['skeleton', 4, -8], ['skeleton', 7, 0], ['catapult', 14, -1], ['wraith', -2, -6], ['barrow', 13, 7],
        ['crawler', 0, 3], ['crawler', 1, 4], ['crawler', 0.5, 5], ['blightskull', -4, 7],
      ], { px: -9, py: 1, wave: 9 }),
      score: 84120, mult: 4.2,
    },
    ui: { screen: 'play' },
  }), 1600),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(game.getState().run.enemies.length).toBeGreaterThan(10);
  },
};

/** Wave 7, the frost wave: every enemy in `--ice`, and its double-size Bone Colossus. */
export const IceStorm: Story = {
  render: () => stage(() => {
    const s = fight([['colossus', 7, 0], ['skeleton', 2, -6], ['skeleton', 3, 6], ['banshee', -2, 6], ['ghoul', 12, -7], ['bloat', 13, 6]], { px: -11, py: 0, wave: 7 });
    return { run: { ...s, enemies: s.enemies.map((e) => (e.kind === 'colossus' ? { ...e, scale: 2 } : e)) }, ui: { screen: 'play' } };
  }, 400),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText().some((t) => t.includes('HOARFROST'))).toBe(true);
    await expect(game.getState().run.enemies.find((e) => e.kind === 'colossus')?.scale).toBe(2);
  },
};

/** A volley's worth of kills on one frame: every model mid-`die`, parts flying, where each enemy fell. */
export const Deaths: Story = {
  render: () => stage(() => {
    const s = fight([['warden', 4, -4], ['banshee', 2, 4], ['bloat', 8, 1], ['ghoul', 11, -4], ['skeleton', 5, 0], ['catapult', 12, 4], ['barrow', 1, -8], ['blightskull', 9, 7]], { px: -8, py: 0 });
    return { run: { ...s, enemies: s.enemies.map((e) => ({ ...e, hp: 0 })) }, ui: { screen: 'play' } };
  }, 100),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(game.getState().run.enemies.filter((e) => e.kind !== 'crawler').length).toBe(0);
  },
};
