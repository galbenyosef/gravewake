// Upgrade picker bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { game, ui } from '../store';
import { screenUi, upgradeCard } from './shared';
import upgradeKdl from './upgrade.kdl?raw';
import upgradeCss from './upgrade.css?raw';

export const upgradeUi = screenUi(upgradeKdl, upgradeCss);
if (import.meta.hot) import.meta.hot.accept(['./upgrade.kdl?raw', './upgrade.css?raw'], ([k, c]) => upgradeUi.reload(k?.default, c?.default));

export function drawUpgrade() {
  const { run: s } = game.getState(), { screen } = ui.getState();
  if (screen !== 'play' || s.phase !== 'upgrade') return upgradeUi.show(null);
  upgradeUi.show(use('upgrade', { key: s.wave, kicker: `WAVE ${s.wave} CLEARED` }, {
    cards: s.offer.map((id, i) => upgradeCard(id, i, () => Actions.pickUpgrade(id))),
  }));
}
