// The one impure boundary for state: every tap and every frame lands here and reaches the core through a namespace.
import * as Game from './game';
import * as Meta from './meta';
import { botInput } from './bot';
import { game, ui } from './store';
import type { Input } from './world';

/** One frame of the world. On the title the bot flies an attract-mode run behind the menu. */
export function frame(dt: number, input: Input) {
  const { screen, paused, portrait } = ui.getState();
  const { run, meta } = game.getState();
  if (screen === 'title' || screen === 'codex') {
    let next = Game.step(run, botInput(run), dt);
    if (next.phase === 'upgrade') next = Game.pickUpgrade(next, next.offer[0]!);
    if (next.phase === 'dead') next = Game.newRun(next.seed);
    if (next !== run) game.setState({ run: next });
    return;
  }
  if (paused || portrait) return;
  const next = Game.step(run, input, dt);
  if (next === run) return;
  const died = next.events.some((e) => e.type === 'dead');
  game.setState({ run: next, meta: died ? Meta.recordRun(meta, next.score, next.wave) : meta });
}

/** A fresh run with a fresh seed, straight into play. */
export function start(seed = Date.now() % 2 ** 31) {
  game.setState({ run: Game.newRun(seed) });
  ui.setState({ screen: 'play', paused: false });
}

export function pickUpgrade(id: string) {
  game.setState({ run: Game.pickUpgrade(game.getState().run, id) });
}

export const pause = () => { if (ui.getState().screen === 'play') ui.setState({ paused: true }); };
export const resume = () => { ui.setState({ paused: false }); };

/** Back to the title; the abandoned run becomes the attract-mode run. */
export function quit() {
  ui.setState({ screen: 'title', paused: false });
  game.setState({ run: Game.newRun(1) });
}

export const toggleMute = () => { const { meta } = game.getState(); game.setState({ meta: { ...meta, muted: !meta.muted } }); };

export const setPortrait = (portrait: boolean) => { if (ui.getState().portrait !== portrait) ui.setState({ portrait }); };

export const openCodex = () => { ui.setState({ screen: 'codex' }); };
export const closeCodex = () => { ui.setState({ screen: 'title' }); };
