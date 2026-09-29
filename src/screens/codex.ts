// Codex bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { ENEMY_IDS } from '../content';
import { ui } from '../store';
import { btn, enemyCard, screenUi } from './shared';
import codexKdl from './codex.kdl?raw';
import codexCss from './codex.css?raw';

export const codexUi = screenUi(codexKdl, codexCss);
if (import.meta.hot) import.meta.hot.accept(['./codex.kdl?raw', './codex.css?raw'], ([k, c]) => codexUi.reload(k?.default, c?.default));

export function drawCodex() {
  if (ui.getState().screen !== 'codex') return codexUi.show(null);
  codexUi.show(use('codex', {}, { cards: ENEMY_IDS.map(enemyCard), back: [btn('BACK', Actions.closeCodex)] }));
}
