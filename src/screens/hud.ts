// HUD bindings.
import * as Actions from '../actions';
import { use } from '../decl/engine';
import { boss, maxHp, waveTitle } from '../game';
import { enemyDef } from '../content';
import { game, ui } from '../store';
import { bar, screenUi } from './shared';
import hudKdl from './hud.kdl?raw';
import hudCss from './hud.css?raw';

export const hudUi = screenUi(hudKdl, hudCss);
if (import.meta.hot) import.meta.hot.accept(['./hud.kdl?raw', './hud.css?raw'], ([k, c]) => hudUi.reload(k?.default, c?.default));

/** How long the wave banner stays up, s (matches the banner-in animation). */
const BANNER_S = 2.4;

export function drawHud() {
  const { run: s } = game.getState(), { screen } = ui.getState();
  if (screen !== 'play') return hudUi.show(null);
  const b = boss(s);
  const starting = s.phase === 'fight' && s.waveTime < BANNER_S, cleared = s.phase === 'cleared';
  hudUi.show(use('hud', {
    maxHp: maxHp(s), hp: s.player.hp,
    score: s.score.toLocaleString('en-US'),
    wave: `WAVE ${s.wave} · ${waveTitle(s).toUpperCase()}`,
    mult: `x${s.mult.toFixed(2)}`, multState: s.mult >= 2 ? 'hot' : '',
    pause: Actions.pause,
    banner: starting ? waveTitle(s).toUpperCase() : cleared ? 'CLEARED' : undefined,
    bannerKicker: `WAVE ${s.wave}`,
    bannerKey: `${s.wave}-${cleared ? 'c' : 's'}`,
    // The pulse plays when the class arrives, i.e. once per hit.
    hurt: s.player.invuln > 0.6 ? 'on' : '',
  }, { boss: b ? [bar(enemyDef(b.kind).name.toUpperCase(), b.hp / b.maxHp)] : [] }));
}
