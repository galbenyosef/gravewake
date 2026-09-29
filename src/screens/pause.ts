// Pause menu bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { game, ui } from '../store';
import { btn, screenUi } from './shared';
import pauseKdl from './pause.kdl?raw';
import pauseCss from './pause.css?raw';

export const pauseUi = screenUi(pauseKdl, pauseCss);
if (import.meta.hot) import.meta.hot.accept(['./pause.kdl?raw', './pause.css?raw'], ([k, c]) => pauseUi.reload(k?.default, c?.default));

export function drawPause() {
  const { screen, paused } = ui.getState(), { meta } = game.getState();
  if (screen !== 'play' || !paused) return pauseUi.show(null);
  pauseUi.show(use('pause', {}, { buttons: [btn('RESUME', Actions.resume, 'primary'), btn(meta.muted ? 'SOUND OFF' : 'SOUND ON', Actions.toggleMute), btn('QUIT', Actions.quit, 'danger')] }));
}
