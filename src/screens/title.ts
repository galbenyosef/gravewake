// Title bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { game, ui } from '../store';
import { btn, screenUi } from './shared';
import titleKdl from './title.kdl?raw';
import titleCss from './title.css?raw';

export const titleUi = screenUi(titleKdl, titleCss);
if (import.meta.hot) import.meta.hot.accept(['./title.kdl?raw', './title.css?raw'], ([k, c]) => titleUi.reload(k?.default, c?.default));

export function drawTitle() {
  const { screen } = ui.getState(), { meta } = game.getState();
  if (screen !== 'title') return titleUi.show(null);
  titleUi.show(use('title', {
    best: meta.best ? `BEST ${meta.best.toLocaleString('en-US')} · WAVE ${meta.bestWave}` : 'NO RECORD YET',
    hint: 'Left thumb flies · right thumb aims and fires  (WASD + mouse on desktop)',
  }, { buttons: [btn('DEPLOY', () => Actions.start(), 'primary'), btn('CODEX', Actions.openCodex), btn(meta.muted ? 'SOUND OFF' : 'SOUND ON', Actions.toggleMute)] }));
}
