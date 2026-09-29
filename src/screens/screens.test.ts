// Every screen compiles against the registries and renders from real store states (static KDL/CSS mistakes throw at
// import, binding mistakes at draw). Text is measured by a fixed-size stub: there is no canvas under node.
import 'pixi.js/events';
import { CanvasTextMetrics } from 'pixi.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { newRun, step } from '../game';
import { initialUi, game, ui } from '../store';
import { IDLE } from '../world';
import { drawHud } from './hud';
import { drawUpgrade } from './upgrade';
import { drawGameover } from './gameover';
import { drawPause } from './pause';
import { drawTitle } from './title';
import { drawCodex } from './codex';
import { drawRotate } from './rotate';
import { layers } from '../stage';

const drawAll = () => { drawHud(); drawUpgrade(); drawGameover(); drawPause(); drawTitle(); drawCodex(); drawRotate(); };
const texts = () => { const out: string[] = []; const walk = (n: { children?: unknown[]; text?: unknown; visible?: boolean }) => { if (n.visible === false) return; if (typeof n.text === 'string') out.push(n.text); (n.children ?? []).forEach((c) => walk(c as never)); }; walk(layers.ui as never); return out; };

beforeAll(() => {
  vi.spyOn(CanvasTextMetrics, 'measureText').mockReturnValue({ width: 10, height: 10, lines: [''], lineWidths: [10], lineHeight: 10, maxLineWidth: 10, fontProperties: { ascent: 8, descent: 2, fontSize: 10 } } as never);
});

describe('screens render from the stores', () => {
  it('title', () => {
    ui.setState(initialUi); drawAll();
    expect(texts()).toContain('PRISMFALL');
  });
  it('codex lists every enemy', () => {
    ui.setState({ ...initialUi, screen: 'codex' }); drawAll();
    expect(texts()).toContain('COLOSSUS');
  });
  it('hud with a boss bar', () => {
    let run = newRun(5);
    run = { ...run, wave: 5, spawnIdx: 0, waveTime: 0 };
    for (let i = 0; i < 90; i++) run = step(run, IDLE, 1 / 60);
    game.setState({ run }); ui.setState({ ...initialUi, screen: 'play' }); drawAll();
    expect(texts()).toContain('SERAPH');
  });
  it('upgrade picker, pause, game over, rotate', () => {
    const run = newRun(5);
    game.setState({ run: { ...run, phase: 'upgrade', offer: ['overclock', 'plating', 'lance'] } }); ui.setState({ ...initialUi, screen: 'play' }); drawAll();
    expect(texts()).toContain('CHOOSE AN UPGRADE');
    ui.setState({ paused: true }); drawAll();
    expect(texts()).toContain('PAUSED');
    game.setState({ run: { ...run, phase: 'dead', score: 1234 } }); ui.setState({ paused: false }); drawAll();
    expect(texts()).toContain('SIGNAL LOST');
    ui.setState({ portrait: true }); drawAll();
    expect(texts()).toContain('ROTATE TO LANDSCAPE');
  });
});
