// The fight as a whole: the twin sticks end to end, and a full swarm for the look.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { drag, fight, game, ready, stage, storyArgs, storyControls, type StoryArgs } from './stage';

export default {
  title: 'Arena',
  args: storyArgs,
  ...storyControls,
} satisfies Meta<StoryArgs>;
type Story = StoryObj<StoryArgs>;

export const TwinSticks: Story = {
  render: () => stage(() => ({ run: fight([['drone', 10, -6]], { px: 0, py: 0 }), ui: { screen: 'play' } })),
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
        ['bulwark', 5, -4], ['mender', 12, -6], ['wasp', 2, 5], ['wasp', 6, 7], ['splitter', 9, 2], ['lancer', 13, 3],
        ['drone', 3, -7], ['drone', 4, -8], ['drone', 7, 0], ['mortar', 14, -1], ['phantom', -2, -6], ['hive', 13, 7],
        ['mite', 0, 3], ['mite', 1, 4], ['mite', 0.5, 5], ['bomber', -4, 7],
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
