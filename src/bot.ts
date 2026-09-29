// A pilot for the sim, the golden-run test and the title screen's attract mode: leads its shots at the nearest enemy,
// circles round shields, kites away from crowds and shots, drifts back toward the middle. Pure: state in, input out.
import { enemyDef } from './content';
import { T } from './tuning';
import type { Enemy, GameState, Input } from './world';

const shielded = (e: Enemy) => enemyDef(e.kind).behaviours.some((b) => b.shieldArcDeg);

export function botInput(s: GameState): Input {
  const p = s.player;
  let mx = -p.x * 0.04, my = -p.y * 0.06; // home toward the centre
  let target: Enemy | null = null, best = Infinity;
  for (const e of s.enemies) {
    const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1, r = enemyDef(e.kind).r;
    const score = d + (shielded(e) ? 6 : 0); // anything unshielded first
    if (score < best) { best = score; target = e; }
    const fear = (r + 3) / d; // flee what's close, harder the closer
    mx -= (dx / d) * fear * fear; my -= (dy / d) * fear * fear;
  }
  for (const b of s.shots) {
    if (!b.hostile) continue;
    const tx = b.lob ? b.tx : b.x, ty = b.lob ? b.ty : b.y, reach = b.lob ? b.blast + 1 : 2.5;
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
    if (d < reach) { mx -= (dx / d) * 1.5; my -= (dy / d) * 1.5; }
  }
  let aim: Input['aim'] = null;
  if (target) {
    // Lead: aim where the target will be when a shot gets there (one refinement is plenty at these speeds).
    const speed = T.SHOT_SPEED_U_PER_S * s.stats.shotSpeed;
    const t = Math.hypot(target.x - p.x, target.y - p.y) / speed;
    const ax = target.x + target.vx * t - p.x, ay = target.y + target.vy * t - p.y, l = Math.hypot(ax, ay) || 1;
    aim = { x: ax / l, y: ay / l };
    if (shielded(target)) { mx += (-ay / l) * 1.6; my += (ax / l) * 1.6; } // circle round to its back
  }
  const len = Math.hypot(mx, my);
  if (len > 1) { mx /= len; my /= len; }
  if (len < T.STICK_DEADZONE) { mx = 0; my = 0; }
  return { mx, my, aim };
}
