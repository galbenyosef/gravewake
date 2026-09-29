// Game over bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { game, ui } from '../store';
import { btn, screenUi } from './shared';
import gameoverKdl from './gameover.kdl?raw';
import gameoverCss from './gameover.css?raw';

export const gameoverUi = screenUi(gameoverKdl, gameoverCss);
if (import.meta.hot) import.meta.hot.accept(['./gameover.kdl?raw', './gameover.css?raw'], ([k, c]) => gameoverUi.reload(k?.default, c?.default));

export function drawGameover() {
  const { run: s, meta } = game.getState(), { screen } = ui.getState();
  if (screen !== 'play' || s.phase !== 'dead') return gameoverUi.show(null);
  const isBest = s.score > 0 && s.score >= meta.best;
  gameoverUi.show(use('gameover', {
    score: s.score.toLocaleString('en-US'),
    best: isBest ? 'NEW BEST' : `BEST ${meta.best.toLocaleString('en-US')}`,
    bestState: isBest ? 'new' : '',
    wave: `Reached wave ${s.wave}`,
    kills: `${s.kills} kills`,
  }, { buttons: [btn('RISE AGAIN', () => Actions.start(), 'primary'), btn('TITLE', Actions.quit)] }));
}
