// The rules of a run: (state, input, dt) -> state, pure. Randomness is the seeded RNG in state.seed; time arrives as dt.
// Each step copies the state into a private draft, mutates the draft, and returns it, so callers see a pure function
// (the previous state is never touched). `events` lists what happened in the step, for the shell to animate.
import { bossOf, enemyDef, radius, UPGRADE_IDS, upgradeDef, waveDef, type EnemyDef } from './content';
import { rand as nextRand, shuffle } from './rng';
import { T } from './tuning';
import { BASE_STATS } from './upgrades';
import { clamp, dist, type Enemy, type GameEvent, type GameState, type Input, type Shot, type Stats, type World } from './world';

const HALF_W = T.ARENA_W_U / 2, HALF_H = T.ARENA_H_U / 2;

export function newRun(seed: number): GameState {
  return {
    seed, time: 0, phase: 'fight', wave: 1, waveTime: 0, phaseT: 0, spawnIdx: 0,
    player: { x: 0, y: 0, vx: 0, vy: 0, ax: 1, ay: 0, hp: T.PLAYER_HP, invuln: 0, fireCd: 0 },
    stats: { ...BASE_STATS },
    enemies: [], shots: [], pickups: [], warps: [],
    score: 0, mult: 1, kills: 0, offer: [], taken: [], nextId: 1,
    events: [{ type: 'wave', n: 1, boss: bossOf(waveDef(1).def) }],
  };
}

// ---------- queries ----------

export const maxHp = (s: GameState) => T.PLAYER_HP + s.stats.maxHp;
/** The boss on the field, if any (for the HUD's boss bar). */
export const boss = (s: GameState) => s.enemies.find((e) => enemyDef(e.kind).tier === 'boss');
export const waveTitle = (s: GameState) => waveDef(s.wave).def.title;
/** Seconds between shots after upgrades. */
export const fireInterval = (st: Stats) => 1 / (T.FIRE_RATE_PER_S * st.fireRate);

// ---------- transitions ----------

/** Take an offered upgrade and start the next wave. A pick that isn't on offer is a no-op (same state back). */
export function pickUpgrade(prev: GameState, id: string): GameState {
  if (prev.phase !== 'upgrade' || !prev.offer.includes(id)) return prev;
  const stats = upgradeDef(id).effects.reduce((st, fx) => fx(st), prev.stats);
  const grew = stats.maxHp > prev.stats.maxHp;
  const hp = grew ? T.PLAYER_HP + stats.maxHp : prev.player.hp;
  const wave = prev.wave + 1;
  return {
    ...prev, stats, phase: 'fight', wave, waveTime: 0, spawnIdx: 0, offer: [], taken: [...prev.taken, id],
    player: { ...prev.player, hp },
    events: [{ type: 'upgrade', id }, { type: 'wave', n: wave, boss: bossOf(waveDef(wave).def) }],
  };
}

function draft(p: GameState): GameState {
  return {
    ...p,
    player: { ...p.player },
    enemies: p.enemies.map((e) => ({ ...e, mem: e.mem.map((m) => m.slice()) })),
    shots: p.shots.map((b) => ({ ...b, hit: b.hit.slice() })),
    pickups: p.pickups.map((k) => ({ ...k })),
    warps: p.warps.map((w) => ({ ...w })),
    offer: p.offer.slice(),
    events: [],
  };
}

/** One tick of play. In the upgrade picker or after death nothing moves, and the same state comes back. */
export function step(prev: GameState, input: Input, dt: number): GameState {
  if (prev.phase === 'upgrade' || prev.phase === 'dead' || dt <= 0) return prev;
  const s = draft(prev);
  const rng = { seed: s.seed };
  const rand = () => nextRand(rng);
  const emit = (e: GameEvent) => { s.events.push(e); };
  const { def: wave, loop } = waveDef(s.wave);
  const hpScale = T.LOOP_HP_MULT ** loop;

  const makeEnemy = (kind: string, x: number, y: number, parent: number, scale?: number): Enemy => {
    const d = enemyDef(kind), hp = d.hp * hpScale;
    const e: Enemy = { id: s.nextId++, kind, x, y, vx: 0, vy: 0, hp, maxHp: hp, age: 0, facing: Math.atan2(s.player.y - y, s.player.x - x), flash: 0, mem: d.behaviours.map((b) => b.mem(rand)), parent };
    if (scale !== undefined && scale !== 1) e.scale = scale;
    s.enemies.push(e);
    return e;
  };
  const hurtPlayer = (dmg: number) => {
    const p = s.player;
    if (p.invuln > 0 || s.phase === 'dead') return;
    p.hp -= dmg;
    p.invuln = T.HURT_INVULN_S;
    s.mult = 1;
    emit({ type: 'hurt', x: p.x, y: p.y });
  };
  const shot = (x: number, y: number, vx: number, vy: number, o: Partial<Shot>): Shot => ({
    id: s.nextId++, x, y, vx, vy, life: T.ENEMY_SHOT_LIFE_S, dmg: T.ENEMY_SHOT_DAMAGE, r: T.ENEMY_SHOT_R_U, pierce: 0, hostile: true, lob: false, tx: 0, ty: 0, blast: 0, hit: [], ...o,
  });
  const w: World = {
    s, rand, emit, hurtPlayer,
    summon: (kind, x, y, parent, scale) => { s.warps.push({ id: s.nextId++, kind, x, y, t: T.GRAVE_OPEN_S, parent, ...(scale !== undefined && scale !== 1 && { scale }) }); emit({ type: 'warp', x, y, kind }); },
    spawn: (kind, x, y, parent) => makeEnemy(kind, x, y, parent),
    shoot: (x, y, a, speed) => { s.shots.push(shot(x, y, Math.cos(a) * speed, Math.sin(a) * speed, {})); },
    lob: (x, y, tx, ty, blast) => { s.shots.push(shot(x, y, (tx - x) / T.HURL_FLIGHT_S, (ty - y) / T.HURL_FLIGHT_S, { life: T.HURL_FLIGHT_S, lob: true, tx, ty, blast })); },
  };

  s.time += dt;
  s.waveTime += dt;

  // --- the wizard ---
  const p = s.player, st = s.stats;
  const mlen = Math.hypot(input.mx, input.my);
  const mk = mlen < T.STICK_DEADZONE ? 0 : Math.min(1, mlen) / mlen;
  const top = T.PLAYER_SPEED_U_PER_S * st.moveSpeed, a = Math.min(1, T.PLAYER_ACCEL_PER_S * dt);
  p.vx += (input.mx * mk * top - p.vx) * a;
  p.vy += (input.my * mk * top - p.vy) * a;
  p.x = clamp(p.x + p.vx * dt, -HALF_W + T.PLAYER_R_U, HALF_W - T.PLAYER_R_U);
  p.y = clamp(p.y + p.vy * dt, -HALF_H + T.PLAYER_R_U, HALF_H - T.PLAYER_R_U);
  p.invuln = Math.max(0, p.invuln - dt);
  const alen = input.aim ? Math.hypot(input.aim.x, input.aim.y) : 0;
  if (input.aim && alen >= T.STICK_DEADZONE && s.phase === 'fight') {
    p.ax = input.aim.x / alen; p.ay = input.aim.y / alen;
    p.fireCd -= dt;
    const angle = Math.atan2(p.ay, p.ax), speed = T.SHOT_SPEED_U_PER_S * st.shotSpeed, stepRad = (T.SPREAD_STEP_DEG * Math.PI) / 180;
    while (p.fireCd <= 0) {
      for (let i = 0; i < st.barrels; i++) {
        const ang = angle + (i - (st.barrels - 1) / 2) * stepRad;
        s.shots.push(shot(p.x + p.ax * 0.5, p.y + p.ay * 0.5, Math.cos(ang) * speed, Math.sin(ang) * speed,
          { hostile: false, life: T.SHOT_LIFE_S, dmg: T.SHOT_DAMAGE * st.damage, r: T.SHOT_R_U, pierce: st.pierce }));
      }
      emit({ type: 'fire', x: p.x, y: p.y, angle });
      p.fireCd += fireInterval(st);
    }
  } else p.fireCd = Math.max(0, p.fireCd - dt);

  // --- gates open on the wave's schedule ---
  if (s.phase === 'fight') {
    while (s.spawnIdx < wave.spawns.length && wave.spawns[s.spawnIdx]!.at <= s.waveTime) {
      const { kind, scale } = wave.spawns[s.spawnIdx++]!;
      const [x, y] = gatePoint(s, rand, enemyDef(kind), radius({ kind, scale }));
      w.summon(kind, x, y, 0, scale);
    }
  }
  for (const g of s.warps) {
    g.t -= dt;
    if (g.t <= 0) { const e = makeEnemy(g.kind, g.x, g.y, g.parent, g.scale); emit({ type: 'arrive', id: e.id, kind: e.kind, x: e.x, y: e.y }); }
  }
  s.warps = s.warps.filter((g) => g.t > 0);

  // --- enemies act ---
  for (const e of s.enemies.slice()) {
    const d = enemyDef(e.kind);
    e.age += dt;
    e.flash = Math.max(0, e.flash - dt);
    d.behaviours.forEach((b, i) => b.tick?.(e.mem[i]!, w, e, dt, d.spawns ?? ''));
  }
  separate(s.enemies, dt);
  for (const e of s.enemies) {
    const r = radius(e);
    e.x = clamp(e.x + e.vx * dt, -HALF_W + r, HALF_W - r);
    e.y = clamp(e.y + e.vy * dt, -HALF_H + r, HALF_H - r);
    if (!enemyDef(e.kind).behaviours.some((b) => b.guard)) {
      const v = Math.hypot(e.vx, e.vy);
      if (v > 0.3) e.facing = Math.atan2(e.vy, e.vx);
    }
  }

  // --- shots fly and land ---
  for (const b of s.shots) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.lob && b.life <= 0) {
      emit({ type: 'blast', x: b.tx, y: b.ty, r: b.blast });
      if (dist(b.tx, b.ty, p.x, p.y) < b.blast + T.PLAYER_R_U) hurtPlayer(b.dmg);
    }
    if (!b.lob && (Math.abs(b.x) > HALF_W + 1 || Math.abs(b.y) > HALF_H + 1)) b.life = 0;
  }
  for (const b of s.shots) {
    if (b.life <= 0 || b.lob) continue;
    if (b.hostile) {
      if (dist(b.x, b.y, p.x, p.y) < b.r + T.PLAYER_R_U && p.invuln <= 0) { hurtPlayer(b.dmg); b.life = 0; }
      continue;
    }
    for (const e of s.enemies) {
      if (e.hp <= 0 || b.hit.includes(e.id)) continue;
      const d = enemyDef(e.kind);
      if (dist(b.x, b.y, e.x, e.y) > b.r + radius(e)) continue;
      const fx = b.x - b.vx * 0.02, fy = b.y - b.vy * 0.02; // where it came from, for shields
      const dmg = d.behaviours.reduce((acc, bh, i) => (bh.guard ? bh.guard(e.mem[i]!, w, e, acc, fx, fy) : acc), b.dmg);
      b.hit.push(e.id);
      if (dmg <= 0) { b.life = 0; break; } // a shield stops the shot outright
      e.hp -= dmg; e.flash = T.HIT_FLASH_S;
      emit({ type: 'hit', id: e.id, x: b.x, y: b.y, kind: e.kind });
      if (b.pierce-- <= 0) { b.life = 0; break; }
    }
  }
  s.shots = s.shots.filter((b) => b.life > 0);

  // --- contact ---
  for (const e of s.enemies) {
    const d = enemyDef(e.kind);
    if (e.hp <= 0 || dist(e.x, e.y, p.x, p.y) > radius(e) + T.PLAYER_R_U) continue;
    if (d.behaviours.some((b) => b.kamikaze)) e.hp = 0;
    else if (d.touch > 0) hurtPlayer(d.touch);
  }

  // --- deaths (a death can spawn more enemies, which can't die this same tick) ---
  for (const e of s.enemies.filter((x) => x.hp <= 0)) {
    const d = enemyDef(e.kind);
    d.behaviours.forEach((b, i) => b.death?.(e.mem[i]!, w, e, d.spawns ?? ''));
    const score = Math.round(d.score * s.mult);
    s.score += score; s.kills++;
    emit({ type: 'kill', id: e.id, x: e.x, y: e.y, kind: e.kind, score });
    const shards = d.tier === 'boss' ? T.BOSS_SOULS : d.tier === 'elite' ? T.ELITE_SOULS : 1;
    for (let i = 0; i < shards; i++) s.pickups.push({ id: s.nextId++, kind: 'soul', x: e.x + (rand() - 0.5) * radius(e) * 2, y: e.y + (rand() - 0.5) * radius(e) * 2, life: T.SOUL_LIFE_S });
    if (rand() < T.VIAL_DROP_CHANCE) s.pickups.push({ id: s.nextId++, kind: 'vial', x: e.x, y: e.y, life: T.SOUL_LIFE_S });
  }
  s.enemies = s.enemies.filter((e) => e.hp > 0);

  // --- pickups drift in and are collected ---
  const vacuum = s.phase === 'cleared', reach = T.LURE_U * st.magnet;
  for (const k of s.pickups) {
    k.life -= dt;
    const d = dist(k.x, k.y, p.x, p.y);
    if (vacuum || d < reach) { const v = (T.SOUL_SPEED_U_PER_S * dt) / (d || 1); k.x += (p.x - k.x) * Math.min(1, v); k.y += (p.y - k.y) * Math.min(1, v); }
    if (dist(k.x, k.y, p.x, p.y) < T.SOUL_R_U + T.PLAYER_R_U) {
      k.life = 0;
      if (k.kind === 'soul') { s.mult = Math.min(T.MULT_MAX, s.mult + T.MULT_PER_SOUL); s.score += Math.round(T.SOUL_SCORE * s.mult); }
      else p.hp = Math.min(maxHp(s), p.hp + 1);
      emit({ type: 'pickup', kind: k.kind, x: k.x, y: k.y });
    }
  }
  s.pickups = s.pickups.filter((k) => k.life > 0);

  // --- the wave's end, the picker, death ---
  if (p.hp <= 0) {
    p.hp = 0;
    s.phase = 'dead';
    emit({ type: 'dead', score: s.score });
  } else if (s.phase === 'fight' && s.spawnIdx >= wave.spawns.length && !s.warps.length && !s.enemies.length) {
    s.phase = 'cleared';
    s.phaseT = T.CLEAR_PAUSE_S;
    s.shots = s.shots.filter((b) => !b.hostile);
    emit({ type: 'cleared', n: s.wave });
  } else if (s.phase === 'cleared') {
    s.phaseT -= dt;
    if (s.phaseT <= 0) {
      s.phase = 'upgrade';
      s.offer = shuffle(rng, UPGRADE_IDS).slice(0, T.UPGRADE_CHOICES);
      s.shots = [];
    }
  }
  s.seed = rng.seed;
  return s;
}

/** A gate on the arena's rim, at least SPAWN_MIN_DIST_U from the wizard; bosses take the far side. */
function gatePoint(s: GameState, rand: () => number, d: EnemyDef, r: number): [number, number] {
  const pad = r + 0.6;
  if (d.tier === 'boss') return [s.player.x > 0 ? -HALF_W / 2 : HALF_W / 2, 0];
  for (let tries = 0; ; tries++) {
    const side = Math.floor(rand() * 4), t = rand() * 2 - 1;
    const x = side < 2 ? (side === 0 ? -1 : 1) * (HALF_W - pad) : t * (HALF_W - pad);
    const y = side < 2 ? t * (HALF_H - pad) : (side === 2 ? -1 : 1) * (HALF_H - pad);
    if (tries > 8 || dist(x, y, s.player.x, s.player.y) >= T.SPAWN_MIN_DIST_U) return [x, y];
  }
}

/** Overlapping enemies push apart (pairwise; ponytail: O(n²), a grid if waves pass ~200 alive). */
function separate(es: Enemy[], dt: number) {
  for (let i = 0; i < es.length; i++) {
    const a = es[i]!, ra = radius(a);
    for (let j = i + 1; j < es.length; j++) {
      const b = es[j]!, rb = radius(b), dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = ra + rb;
      if (d >= min || d === 0) continue;
      const push = ((min - d) / d) * Math.min(1, T.SEPARATION_PER_S * dt) * 0.5;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
    }
  }
}
