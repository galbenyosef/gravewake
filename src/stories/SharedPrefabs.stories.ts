// Every shared prefab and custom element in its states, on a demo screen of its own (sized by its CSS, as a real
// consumer's would be). The taps prove each prefab's `tap`/`pick` binding reaches its handler.
import type { Meta, StoryObj } from '@storybook/html-vite';
import { expect } from 'storybook/test';
import { use } from '../decl/engine';
import { newRun } from '../game';
import { bar, btn, enemyCard, screenUi, upgradeCard } from '../screens/shared';
import { press, ready, stage, storyScreen, storyArgs, storyControls, type StoryArgs } from './stage';

const demoKdl = `
prefab "demo" {
    panel class="demo" {
        panel class="demo-row" slot="buttons"
        panel class="demo-row" {
            pips class="demo-pips" count=6 value=4
            panel class="demo-bar" slot="bar"
        }
        panel class="demo-row" slot="cards"
        panel class="demo-row demo-enemies" slot="enemies"
    }
}`;
const demoCss = `
.demo { width: 100%; height: 100%; background-color: #050507; pointer-events: auto; padding: 8px 12px; gap: 8px; align-items: center }
.demo-row { flex-direction: row; gap: 10px; align-items: center }
.demo-pips { width: 150px; height: 16px; tint: #c9a462 }
.demo-bar { width: 300px }
.demo button { width: 150px; height: 36px }
.demo-pips, .demo-bar { height: 24px }
.demo .upgrade-card { width: 150px; height: 140px; padding: 8px 6px; gap: 6px }
.demo .shared-card-icon { width: 48px; height: 48px }
.demo .shared-card-glyph { font-size: 14px }
.demo .shared-card-blurb { width: 130px }
.demo-enemies { flex-wrap: wrap; width: 820px; justify-content: center }
.demo .enemy-card { width: 200px; height: 50px; padding: 3px 6px }
.demo .shared-enemy-glyph { width: 40px; height: 40px }
.demo .shared-enemy-blurb { width: 140px; font-size: 10px }
.demo .shared-enemy-tier { left: 126px }
`;
const demo = screenUi(demoKdl, demoCss);
storyScreen(() => demo.show(null));
const taps: string[] = [];
const hit = (what: string) => () => { taps.push(what); };

function draw() {
  demo.show(use('demo', {}, {
    buttons: [btn('PLAIN', hit('plain')), btn('PRIMARY', hit('primary'), 'primary'), btn('DANGER', hit('danger'), 'danger'), btn('OFF', hit('off'), 'off')],
    bar: [bar('BOSS', 0.62)],
    cards: ['quickened-tongue', 'hexed-embers', 'forked-flame', 'warding-salve'].map((id, i) => upgradeCard(id, i % 3, hit(id))),
    enemies: ['skeleton', 'ghoul', 'warden', 'barrow', 'lich', 'colossus'].map(enemyCard),
  }));
}

export default {
  title: 'Shared Prefabs',
  args: storyArgs,
  ...storyControls,
} satisfies Meta<StoryArgs>;

export const AllPrefabs: StoryObj<StoryArgs> = {
  render: () => stage(() => { draw(); return { run: newRun(1), ui: { screen: 'play' } }; }),
  play: async ({ args }) => {
    if (!args.runInteraction) return;
    await ready();
    taps.length = 0;
    await press('PRIMARY');
    await press('HEXED EMBERS');
    await expect(taps).toEqual(['primary', 'hexed-embers']);
  },
};
