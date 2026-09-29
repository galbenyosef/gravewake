// A pilot for the sim, the golden-run test and the title screen's attract mode: aims at the nearest enemy, kites away
// from crowds and shots, drifts back toward the middle, and picks upgrades in offer order. Pure: state in, input out.
import { enemyDef } from './content';
import { T } from './tuning';
import type { GameState, Input } from './world';

export function botInput(s: GameState): Input {
  const p = s.player;
  let mx = -p.x * 0.04, my = -p.y * 0.06; // home toward the centre
  let aim: Input['aim'] = null, best = Infinity;
  for (const e of s.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1, r = enemyDef(e.kind).r;
    if (d < best) { best = d; aim = { x: dx / d, y: dy / d }; }
    const fear = (r + 3) / d; // flee what's close, harder the closer
    mx -= (dx / d) * fear * fear; my -= (dy / d) * fear * fear;
  }
  for (const b of s.shots) {
    if (!b.hostile) continue;
    const tx = b.lob ? b.tx : b.x, ty = b.lob ? b.ty : b.y, reach = b.lob ? b.blast + 1 : 2.5;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < reach) { mx -= (dx / d) * 1.5; my -= (dy / d) * 1.5; }
  }
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  if (len < T.STICK_DEADZONE) { mx = 0; my = 0; }
  return { mx, my, aim };
}
