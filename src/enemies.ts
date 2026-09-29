// Enemy behaviour words. content/enemies.kdl lists them under each enemy (`chase 3`, `shield 120`), and content.ts
// hands this registry to `combinators()`, so a word in content is exactly one entry here. Each word is a small rule
// over the enemy's own scratch (`mem`, a number array per behaviour) and the World handle for this tick.
//
// An enemy has at most one word that moves it (chase, keep-away, orbit, dash, blink, anchor); the others shoot, guard or
// react. Arguments are numbers in the units named below (u = world units, s = seconds, deg = degrees).
import { T } from './tuning';
import { angleDiff, clamp, dist, rayToWall, type Enemy, type World } from './world';

export type Behaviour = {
  /** Fresh scratch for a new enemy; `rand` staggers timers so a squad doesn't fire in lockstep. */
  mem: (rand: () => number) => number[];
  tick?: (m: number[], w: World, e: Enemy, dt: number, spawns: string) => void;
  /** Damage it lets through from a shot arriving from (fx, fy). */
  guard?: (m: number[], w: World, e: Enemy, dmg: number, fx: number, fy: number) => number;
  death?: (m: number[], w: World, e: Enemy, spawns: string) => void;
  /** Touching the ship destroys it (and so triggers its death words). */
  kamikaze?: boolean;
  /** A shield's width in degrees, for the shell to draw the arc. */
  shieldArcDeg?: number;
  /** Steers the enemy; an enemy has at most one such word. */
  moves?: boolean;
  /** Words that need a `spawns` kind on the enemy. */
  needsSpawns?: boolean;
};

const DEG = Math.PI / 180;
const none = () => [];

/** Unit vector and distance from the enemy to a point. */
function toward(e: Enemy, x: number, y: number): [number, number, number] {
  const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1;
  return [dx / d, dy / d, d];
}
/** Ease velocity toward (vx, vy): enemies have mass, the ship's steering is what feels tight. */
function steer(e: Enemy, vx: number, vy: number, dt: number, accel: number = T.ENEMY_ACCEL_PER_S) {
  const a = Math.min(1, accel * dt);
  e.vx += (vx - e.vx) * a;
  e.vy += (vy - e.vy) * a;
}
const aimAt = (e: Enemy, w: World) => Math.atan2(w.s.player.y - e.y, w.s.player.x - e.x);
/** Counts a timer up; true (and resets) once it passes `every`. */
function every(m: number[], i: number, dt: number, period: number) {
  m[i] = (m[i] ?? 0) + dt;
  if (m[i]! < period) return false;
  m[i] = 0;
  return true;
}
const inArena = (x: number, y: number, pad: number): [number, number] =>
  [clamp(x, -T.ARENA_W_U / 2 + pad, T.ARENA_W_U / 2 - pad), clamp(y, -T.ARENA_H_U / 2 + pad, T.ARENA_H_U / 2 - pad)];

export const BEHAVIOURS: Record<string, (...args: number[]) => Behaviour> = {
  /** Home on the ship at `speed` u/s. */
  chase: (speed) => ({
    mem: none,
    moves: true,
    tick: (_m, w, e, dt) => { const [ux, uy] = toward(e, w.s.player.x, w.s.player.y); steer(e, ux * speed, uy * speed, dt); },
  }),

  /** Hold `range` u from the ship, strafing sideways while in the band; `speed` u/s. */
  'keep-away': (range, speed) => ({
    mem: (r) => [r() < 0.5 ? 1 : -1],
    moves: true,
    tick: (m, w, e, dt) => {
      const [ux, uy, d] = toward(e, w.s.player.x, w.s.player.y);
      const radial = d > range + 1 ? 1 : d < range - 1 ? -1 : 0, side = m[0]! * 0.6;
      steer(e, (ux * radial - uy * side) * speed, (uy * radial + ux * side) * speed, dt);
      if (Math.abs(e.x) > T.ARENA_W_U / 2 - 1.5 || Math.abs(e.y) > T.ARENA_H_U / 2 - 1.5) m[0] = -m[0]!; // turn back at the walls
    },
  }),

  /** Circle the ship at `radius` u, `speed` u/s along the circle. */
  orbit: (radius, speed) => ({
    mem: (r) => [r() < 0.5 ? 1 : -1],
    moves: true,
    tick: (m, w, e, dt) => {
      const [ux, uy, d] = toward(e, w.s.player.x, w.s.player.y), dir = m[0]!;
      const pull = clamp((d - radius) / 2, -1, 1); // radial correction toward the ring
      steer(e, (-uy * dir + ux * pull) * speed, (ux * dir + uy * pull) * speed, dt);
    },
  }),

  /** Creep, then stop and wind up for `windup` s (telegraphed), then charge in a straight line at `speed` u/s. */
  dash: (windup, speed) => ({
    // mode (0 creep, 1 windup, 2 charge), timer, charge direction x, y
    mem: (r) => [0, -r() * 1.5, 0, 0],
    moves: true,
    tick: (m, w, e, dt) => {
      m[1]! += dt;
      const p = w.s.player;
      if (m[0] === 0) {
        const [ux, uy, d] = toward(e, p.x, p.y);
        steer(e, ux * speed * T.DASH_CREEP, uy * speed * T.DASH_CREEP, dt);
        e.facing = Math.atan2(uy, ux);
        if (m[1]! > T.DASH_REST_S && d < T.DASH_RANGE_U) {
          m[0] = 1; m[1] = 0; m[2] = ux; m[3] = uy;
          w.emit({ type: 'telegraph', id: e.id, what: 'dash', x: e.x, y: e.y, tx: e.x + ux * speed * T.DASH_S, ty: e.y + uy * speed * T.DASH_S, dur: windup });
        }
      } else if (m[0] === 1) {
        steer(e, 0, 0, dt, 10);
        if (m[1]! > windup) { m[0] = 2; m[1] = 0; }
      } else {
        e.vx = m[2]! * speed; e.vy = m[3]! * speed;
        if (m[1]! > T.DASH_S) { m[0] = 0; m[1] = 0; }
      }
    },
  }),

  /** Every `interval` s, mark a spot `range` u from the ship, then vanish and reappear there. */
  blink: (interval, range) => ({
    // timer, mode (0 drifting, 1 marked), target x, y
    mem: (r) => [-r() * interval, 0, 0, 0],
    moves: true,
    tick: (m, w, e, dt) => {
      m[0]! += dt;
      const p = w.s.player;
      if (m[1] === 0) {
        const [ux, uy] = toward(e, p.x, p.y);
        steer(e, ux * T.BLINK_DRIFT_U_PER_S, uy * T.BLINK_DRIFT_U_PER_S, dt);
        if (m[0]! > interval) {
          const a = w.rand() * Math.PI * 2, [tx, ty] = inArena(p.x + Math.cos(a) * range, p.y + Math.sin(a) * range, 1);
          m[1] = 1; m[0] = 0; m[2] = tx; m[3] = ty;
          w.emit({ type: 'telegraph', id: e.id, what: 'blink', x: e.x, y: e.y, tx, ty, dur: T.BLINK_MARK_S });
        }
      } else if (m[0]! > T.BLINK_MARK_S) {
        e.x = m[2]!; e.y = m[3]!; e.vx = 0; e.vy = 0; m[1] = 0; m[0] = 0;
      }
    },
  }),

  /** Doesn't move; turns slowly (hives, turrets). */
  anchor: () => ({ mem: none, moves: true, tick: (_m, _w, e, dt) => { steer(e, 0, 0, dt, 10); e.facing += dt * 0.4; } }),

  /** An aimed shot every `interval` s at `speed` u/s. */
  shoot: (interval, speed) => ({
    mem: (r) => [r() * interval * 0.5],
    tick: (m, w, e, dt) => { if (every(m, 0, dt, interval)) { w.shoot(e.x, e.y, aimAt(e, w), speed); w.emit({ type: 'enemy-fire', id: e.id, x: e.x, y: e.y }); } },
  }),

  /** A fan of `count` shots across `arc` degrees aimed at the ship, every `interval` s (360 is a ring). */
  burst: (interval, count, arc) => ({
    mem: (r) => [r() * interval * 0.5],
    tick: (m, w, e, dt) => {
      if (!every(m, 0, dt, interval)) return;
      const mid = aimAt(e, w), full = arc >= 360, step = full ? (Math.PI * 2) / count : count > 1 ? (arc * DEG) / (count - 1) : 0;
      for (let i = 0; i < count; i++) w.shoot(e.x, e.y, mid + (full ? i * step : (i - (count - 1) / 2) * step), T.BURST_SHOT_U_PER_S);
      w.emit({ type: 'enemy-fire', id: e.id, x: e.x, y: e.y });
    },
  }),

  /** `arms` evenly spaced shots every `interval` s, the whole pattern turning between volleys: a bullet-hell spiral. */
  spiral: (interval, arms) => ({
    mem: (r) => [0, r() * Math.PI * 2],
    tick: (m, w, e, dt) => {
      if (!every(m, 0, dt, interval)) return;
      m[1]! += T.SPIRAL_TURN_RAD;
      for (let i = 0; i < arms; i++) w.shoot(e.x, e.y, m[1]! + (i * Math.PI * 2) / arms, T.SPIRAL_SHOT_U_PER_S);
    },
  }),

  /** Every `interval` s, lob a round at where the ship is heading; it lands after the flight time, hurting within `blast` u. */
  mortar: (interval, blast) => ({
    mem: (r) => [r() * interval * 0.5],
    tick: (m, w, e, dt) => {
      if (!every(m, 0, dt, interval)) return;
      const p = w.s.player, lead = T.LOB_FLIGHT_S * T.LOB_LEAD;
      const [tx, ty] = inArena(p.x + p.vx * lead, p.y + p.vy * lead, 0.5);
      w.lob(e.x, e.y, tx, ty, blast);
      w.emit({ type: 'telegraph', id: e.id, what: 'lob', x: e.x, y: e.y, tx, ty, dur: T.LOB_FLIGHT_S });
    },
  }),

  /** Every `interval` s, hold still and paint a laser on the ship for `paint` s (tracking, then locked for the last
   *  SNIPE_LOCK_S so a sidestep dodges), then fire one shot along it at `speed` u/s. */
  snipe: (interval, paint, speed) => ({
    // timer, mode (0 cooling, 1 painting, 2 locked)
    mem: (r) => [r() * interval * 0.5, 0],
    tick: (m, w, e, dt) => {
      m[0]! += dt;
      if (m[1] === 0) { if (m[0]! > interval) { m[0] = 0; m[1] = 1; } return; }
      e.vx = 0; e.vy = 0;
      if (m[1] === 1) {
        e.laser = e.facing = aimAt(e, w);
        if (m[0]! < paint - T.SNIPE_LOCK_S) return;
        m[1] = 2;
        const [tx, ty] = rayToWall(e.x, e.y, e.laser);
        w.emit({ type: 'telegraph', id: e.id, what: 'snipe', x: e.x, y: e.y, tx, ty, dur: T.SNIPE_LOCK_S });
      } else if (m[0]! >= paint) {
        w.shoot(e.x, e.y, e.laser!, speed);
        w.emit({ type: 'enemy-fire', id: e.id, x: e.x, y: e.y });
        delete e.laser; m[0] = 0; m[1] = 0;
      }
    },
  }),

  /** A frontal shield `arc` degrees wide that eats shots; it turns toward the ship at a limited rate, so flank it. */
  shield: (arc) => ({
    mem: none,
    shieldArcDeg: arc,
    tick: (_m, w, e, dt) => {
      const d = angleDiff(e.facing, aimAt(e, w)), turn = T.ENEMY_TURN_RAD_PER_S * dt;
      e.facing += clamp(d, -turn, turn);
    },
    guard: (_m, w, e, dmg, fx, fy) => {
      if (Math.abs(angleDiff(e.facing, Math.atan2(fy - e.y, fx - e.x))) > (arc * DEG) / 2) return dmg;
      w.emit({ type: 'block', x: fx, y: fy });
      return 0;
    },
  }),

  /** Detonates on death or on touching the ship, hurting the ship within `blast` u. */
  explode: (blast) => ({
    mem: none,
    kamikaze: true,
    death: (_m, w, e) => {
      w.emit({ type: 'blast', x: e.x, y: e.y, r: blast });
      if (dist(e.x, e.y, w.s.player.x, w.s.player.y) < blast + T.PLAYER_R_U) w.hurtPlayer(1);
    },
  }),

  /** Bursts into `count` of its `spawns` kind on death. */
  split: (count) => ({
    mem: none,
    needsSpawns: true,
    death: (_m, w, e, spawns) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + w.rand();
        const c = w.spawn(spawns, e.x + Math.cos(a) * 0.6, e.y + Math.sin(a) * 0.6, e.id);
        c.vx = Math.cos(a) * T.SPLIT_KICK_U_PER_S; c.vy = Math.sin(a) * T.SPLIT_KICK_U_PER_S;
      }
    },
  }),

  /** Mends every other enemy within `radius` u by `rate` hp/s. Kill it first. */
  heal: (radius, rate) => ({
    mem: () => [0],
    tick: (m, w, e, dt) => {
      const pulse = every(m, 0, dt, T.HEAL_PULSE_S);
      for (const o of w.s.enemies) {
        if (o === e || o.hp >= o.maxHp || o.hp <= 0 || dist(e.x, e.y, o.x, o.y) > radius) continue;
        o.hp = Math.min(o.maxHp, o.hp + rate * dt);
        if (pulse) w.emit({ type: 'heal', id: o.id, by: e.id, x: o.x, y: o.y });
      }
    },
  }),

  /** Opens a gate for one of its `spawns` kind every `interval` s while it has fewer than `max` alive. */
  summon: (interval, max) => ({
    mem: (r) => [r() * interval * 0.5],
    needsSpawns: true,
    tick: (m, w, e, dt, spawns) => {
      if (!every(m, 0, dt, interval)) return;
      const brood = w.s.enemies.filter((o) => o.parent === e.id).length + w.s.warps.filter((o) => o.parent === e.id).length;
      if (brood >= max) return;
      const a = w.rand() * Math.PI * 2, [x, y] = inArena(e.x + Math.cos(a) * 2, e.y + Math.sin(a) * 2, 1);
      w.summon(spawns, x, y, e.id);
    },
  }),
};
