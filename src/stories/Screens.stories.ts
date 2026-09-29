import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { newRun } from '../game';
import { fight, game, press, ready, screenText, stage, storyArgs, storyControls, tap, ui, type StoryArgs } from './stage';

export default {
  title: 'Screens',
  args: storyArgs,
  ...storyControls,
} satisfies Meta<StoryArgs>;
type Story = StoryObj<StoryArgs>;

export const Title: Story = {
  render: () => stage(() => ({ run: newRun(1), ui: { screen: 'title' } }), 2500),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText()).toContain('PRISMFALL');
    await press('CODEX');
    await expect(ui.getState().screen).toBe('codex');
    await press('BACK');
    await press('DEPLOY');
    await expect(ui.getState().screen).toBe('play');
    await expect(game.getState().run.wave).toBe(1);
  },
};

export const Codex: Story = {
  render: () => stage(() => ({ run: newRun(1), ui: { screen: 'codex' } }), 1500),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    for (const name of ['MITE', 'BULWARK', 'PHANTOM', 'SERAPH', 'COLOSSUS']) await expect(screenText()).toContain(name);
  },
};

export const Hud: Story = {
  render: () => stage(() => ({
    run: { ...fight([['drone', 4, -4], ['drone', 6, 3], ['lancer', 10, -1], ['wasp', 2, 6], ['bomber', 12, 5]], { px: -6 }), score: 12840, mult: 2.35 },
    ui: { screen: 'play' },
  }), 700),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText()).toContain('12,840');
    await expect(screenText()).toContain('x2.35');
  },
};

export const Upgrade: Story = {
  render: () => stage(() => ({ run: { ...fight([]), phase: 'upgrade', offer: ['overclock', 'split-barrel', 'plating'] }, ui: { screen: 'play' } })),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText()).toContain('CHOOSE AN UPGRADE');
    await press('SPLIT BARREL');
    const s = game.getState().run;
    await expect([s.phase, s.wave, s.stats.barrels, s.taken]).toEqual(['fight', 4, 2, ['split-barrel']]);
  },
};

export const GameOver: Story = {
  render: () => stage(() => {
    game.setState({ meta: { best: 50210, bestWave: 9, runs: 12, muted: false } });
    return { run: { ...fight([['drone', 3, 3], ['hive', 8, -4]]), phase: 'dead', score: 48210, wave: 7, kills: 312, player: { ...newRun(1).player, hp: 0 } }, ui: { screen: 'play' } };
  }),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText()).toContain('SIGNAL LOST');
    await expect(screenText()).toContain('BEST 50,210');
    await press('RETRY');
    const s = game.getState().run;
    await expect([s.phase, s.wave, s.score]).toEqual(['fight', 1, 0]);
  },
};

export const Pause: Story = {
  render: () => stage(() => ({ run: fight([['drone', 4, -2], ['splitter', 8, 4]]), ui: { screen: 'play' } }), 300),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await press('II');
    await expect(ui.getState().paused).toBe(true);
    const frozen = game.getState().run;
    await tap(422, 360); // a tap on the scrim does nothing
    await expect(game.getState().run).toBe(frozen);
    await press('RESUME');
    await expect(ui.getState().paused).toBe(false);
  },
};

export const Rotate: Story = {
  render: () => stage(() => ({ run: newRun(1), ui: { screen: 'title', portrait: true } })),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    await expect(screenText()).toContain('ROTATE TO LANDSCAPE');
  },
};
