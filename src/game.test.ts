import { describe, expect, it } from 'vitest';
import { botInput } from './bot';
import { ENEMIES, ENEMY_IDS, EnemySchema, UPGRADE_IDS, WaveSchema, WAVES } from './content';
import { loadKdl } from './content-load';
import { boss, maxHp, newRun, pickUpgrade, step } from './game';
import { T } from './tuning';
import { BEHAVIOURS } from './enemies';
import { IDLE, type Enemy, type GameEvent, type GameState, type Input, type World } from './world';

const DT = 1 / 60;
const run = (s: GameState, secs: number, input: Input | ((s: GameState) => Input) = IDLE) => {
  for (let t = 0; t < secs; t += DT) s = step(s, typeof input === 'function' ? input(s) : input, DT);
  return s;
};
/** A run with no wave schedule left and exactly these enemies on the field. */
function arena(kinds: [string, number, number][], seed = 7): GameState {
  let s = newRun(seed);
  s = { ...s, spawnIdx: 999, events: [] };
  for (const [kind, x, y] of kinds) {
    const d = ENEMIES[kind]!;
    const e: Enemy = { id: s.nextId, kind, x, y, vx: 0, vy: 0, hp: d.hp, maxHp: d.hp, age: 0, facing: Math.PI, flash: 0, mem: d.behaviours.map((b) => b.mem(() => 0.5)), parent: 0 };
    s = { ...s, nextId: s.nextId + 1, enemies: [...s.enemies, e] };
  }
  return s;
}
const types = (s: GameState) => s.events.map((e) => e.type);

describe('content', () => {
  it('loads a diverse roster', () => {
    expect(ENEMY_IDS.length).toBeGreaterThanOrEqual(12);
    expect(new Set(ENEMY_IDS.map((k) => ENEMIES[k]!.model)).size).toBe(ENEMY_IDS.length); // every enemy has its own shape
    expect(WAVES.length).toBe(11);
    expect(UPGRADE_IDS.length).toBeGreaterThanOrEqual(6);
  });
  it('refuses two movement words', () => {
    expect(() => loadKdl('enemy "x" name="X" blurb="b" hp=1 r=1 score=1 model="orb" {\n chase 1\n orbit 2 3\n}', { enemy: EnemySchema })).toThrow(/enemy "x": children: more than one movement word/);
  });
  it('refuses split without spawns', () => {
    expect(() => loadKdl('enemy "x" name="X" blurb="b" hp=1 r=1 score=1 model="orb" {\n split 2\n}', { enemy: EnemySchema })).toThrow(/enemy "x": spawns:/);
  });
  it('names unknown behaviour words', () => {
    expect(() => loadKdl('enemy "x" name="X" blurb="b" hp=1 r=1 score=1 model="orb" {\n sneeze 1\n}', { enemy: EnemySchema })).toThrow(/unknown behaviour "sneeze" \(known: chase, keep-away/);
  });
});

describe('the ship', () => {
  it('moves with the stick and stays in the arena', () => {
    const s = run(newRun(1), 5, { mx: 1, my: 0, aim: null });
    expect(s.player.x).toBeCloseTo(T.ARENA_W_U / 2 - T.PLAYER_R_U);
  });
  it('fires at the fire rate while aiming', () => {
    let fired = 0;
    run(newRun(1), 1, (x) => { fired += x.events.filter((e) => e.type === 'fire').length; return { mx: 0, my: 0, aim: { x: 0, y: 1 } }; });
    expect(fired).toBeGreaterThanOrEqual(T.FIRE_RATE_PER_S - 1);
  });
  it('ignores a resting thumb', () => {
    const s = run(newRun(1), 1, { mx: 0.1, my: 0, aim: { x: 0.1, y: 0 } });
    expect([s.player.x, s.shots.length]).toEqual([0, 0]);
  });
  it('is pure: the previous state is untouched', () => {
    const a = newRun(3), snap = JSON.stringify(a);
    run(a, 2, botInput);
    expect(JSON.stringify(a)).toBe(snap);
  });
});

describe('waves', () => {
  it('opens gates, which deliver enemies after the warp', () => {
    let s = run(newRun(1), 0.1);
    expect(s.warps.length).toBeGreaterThan(0);
    s = run(s, T.WARP_S);
    expect(s.enemies.length).toBeGreaterThan(0);
  });
  it('clears into the upgrade picker, and a pick starts the next wave', () => {
    let s = run(arena([]), T.CLEAR_PAUSE_S + 0.1);
    expect(s.phase).toBe('upgrade');
    expect(s.offer).toHaveLength(T.UPGRADE_CHOICES);
    expect(step(s, IDLE, DT)).toBe(s); // frozen while picking
    expect(pickUpgrade(s, 'nope')).toBe(s);
    s = pickUpgrade(s, s.offer[0]!);
    expect([s.phase, s.wave, s.taken.length]).toEqual(['fight', 2, 1]);
  });
  it('reads tint= and spawn scale=, and a scaled enemy collides at its scaled size', () => {
    const w = loadKdl('wave "x" title="X" tint="--ice" {\n spawn "drone" scale=2\n}', { wave: WaveSchema }).wave.x!;
    expect([w.tint, w.spawns[0]!.scale]).toEqual(['--ice', 2]);
    const gap = ENEMIES.drone!.r * 1.5 + T.PLAYER_R_U; // inside 2r, outside r
    const touches = (scale?: number) => { const s0 = arena([['drone', gap, 0]]); return types(step({ ...s0, enemies: [{ ...s0.enemies[0]!, scale }] }, IDLE, DT)).includes('hurt'); };
    expect([touches(), touches(2)]).toEqual([false, true]);
  });
  it('plating repairs to the new maximum', () => {
    const s0 = run(arena([]), T.CLEAR_PAUSE_S + 0.1);
    const s = pickUpgrade({ ...s0, offer: ['plating'], player: { ...s0.player, hp: 1 } }, 'plating');
    expect([s.player.hp, maxHp(s)]).toEqual([T.PLAYER_HP + 1, T.PLAYER_HP + 1]);
  });
});

describe('the roster behaves', () => {
  it('drones chase', () => {
    const s = run(arena([['drone', 10, 0]]), 1);
    expect(s.enemies[0]!.x).toBeLessThan(9);
  });
  it('splitters burst into mites', () => {
    const s0 = arena([['splitter', 5, 0]]);
    const s = step({ ...s0, enemies: [{ ...s0.enemies[0]!, hp: 0 }] }, IDLE, DT);
    expect(s.enemies.map((e) => e.kind)).toEqual(['mite', 'mite', 'mite', 'mite']);
  });
  it('bulwark shields eat frontal shots but not shots from behind', () => {
    const hitFrom = (x: number) => {
      const s0 = arena([['bulwark', 0, 5]]);
      const e = { ...s0.enemies[0]!, facing: x < 0 ? Math.PI : 0 }; // shield faces the incoming side, or away from it
      let s: GameState = { ...s0, player: { ...s0.player, x: -10, y: 5 }, enemies: [e] };
      s = run(s, 0.4, { mx: 0, my: 0, aim: { x: 1, y: 0 } });
      return s;
    };
    const front = hitFrom(-1), back = hitFrom(1);
    expect(front.enemies[0]!.hp).toBe(ENEMIES.bulwark!.hp);
    expect(back.enemies[0]!.hp).toBeLessThan(ENEMIES.bulwark!.hp);
  });
  it('bombers explode on contact', () => {
    const s0 = arena([['bomber', 0.5, 0]]);
    const s = step(s0, IDLE, DT);
    expect(types(s)).toContain('blast');
    expect(s.player.hp).toBe(T.PLAYER_HP - 1);
  });
  it('menders heal the wounded', () => {
    const s0 = arena([['mender', 8, 0], ['drone', 9, 0]]);
    const s = run({ ...s0, enemies: [s0.enemies[0]!, { ...s0.enemies[1]!, hp: 1 }] }, 0.5);
    expect(s.enemies[1]!.hp).toBeGreaterThan(1);
  });
  it('hives summon drones', () => {
    const s = run(arena([['hive', 10, 5]]), 4);
    expect(s.enemies.filter((e) => e.kind === 'drone').length + s.warps.length).toBeGreaterThan(0);
  });
  it('lancers telegraph, then charge', () => {
    let warned = false, charged = false;
    run(arena([['lancer', 8, 0]]), 4, (x) => {
      warned ||= x.events.some((e) => e.type === 'telegraph' && e.what === 'dash');
      charged ||= warned && x.enemies.some((e) => Math.hypot(e.vx, e.vy) > 10);
      return IDLE;
    });
    expect([warned, charged]).toEqual([true, true]);
  });
  it('mortars lob rounds that land as blasts', () => {
    let blasts = 0;
    run(arena([['mortar', 10, 0]]), 5, (x) => { blasts += x.events.filter((e) => e.type === 'blast').length; return IDLE; });
    expect(blasts).toBeGreaterThan(0);
  });
  it('phantoms blink', () => {
    const s = run(arena([['phantom', 12, 8]]), 4);
    expect(Math.hypot(s.enemies[0]!.x - 12, s.enemies[0]!.y - 8)).toBeGreaterThan(3);
  });
  it('wasps orbit and shoot', () => {
    let fired = 0;
    const s = run(arena([['wasp', 6.5, 0]]), 3, (x) => { fired += x.events.filter((e) => e.type === 'enemy-fire').length; return IDLE; });
    expect(fired).toBeGreaterThan(0);
    expect(Math.hypot(s.enemies[0]!.x, s.enemies[0]!.y)).toBeGreaterThan(4); // still out on its ring
  });
  it('snipers hang back at the wall and land one fast shot', () => {
    let fast = 0;
    const s = run(arena([['sniper', 6, 0]]), 5, (x) => { fast = Math.max(fast, ...x.shots.filter((b) => b.hostile).map((b) => Math.hypot(b.vx, b.vy))); return IDLE; });
    const e = s.enemies[0]!;
    expect(Math.max(Math.abs(e.x) - T.ARENA_W_U / 2, Math.abs(e.y) - T.ARENA_H_U / 2)).toBeGreaterThan(-2); // within 2u of a wall
    expect(fast).toBeGreaterThan(30);
    expect(s.player.hp).toBe(T.PLAYER_HP - 1); // a ship that stands still gets hit
  });
  it('the seraph fills the air', () => {
    const s = run(arena([['seraph', 8, 0]]), 2);
    expect(s.shots.filter((b) => b.hostile).length).toBeGreaterThan(20);
    expect(boss(s)?.kind).toBe('seraph');
  });
  it('being hit resets the multiplier and grants invulnerability', () => {
    const s0 = arena([['drone', 0, 0]]);
    const s = step({ ...s0, mult: 3 }, IDLE, DT);
    expect([s.mult, s.player.hp, s.player.invuln > 0]).toEqual([1, T.PLAYER_HP - 1, true]);
  });
});

describe('behaviour words', () => {
  it('snipe paints a tracking laser, locks, then fires one fast shot along the locked line', () => {
    const b = BEHAVIOURS.snipe!(1, 1, 40), m = b.mem(() => 0);
    const e = arena([['drone', 10, 0]]).enemies[0]!;
    const s = newRun(1), shots: [number, number][] = [], events: GameEvent[] = [];
    const w = { s, emit: (x: GameEvent) => events.push(x), shoot: (_x: number, _y: number, a: number, v: number) => shots.push([a, v]) } as unknown as World;
    const tick = (secs: number) => { for (let t = 0; t < secs; t += DT) b.tick!(m, w, e, DT, ''); };
    tick(0.95); // cooling
    expect(e.laser).toBeUndefined();
    s.player = { ...s.player, x: -10, y: 0 };
    tick(0.4);
    expect(e.laser).toBeCloseTo(Math.PI); // on the ship
    s.player = { ...s.player, y: 5 }; // the ship moves: the laser follows until the lock
    tick(0.4);
    const locked = e.laser!;
    expect(locked).toBeCloseTo(Math.atan2(5, -20));
    expect(events.filter((x) => x.type === 'telegraph' && x.what === 'snipe')).toHaveLength(1);
    s.player = { ...s.player, y: -5 }; // moving after the lock doesn't drag the aim
    tick(0.5);
    expect(shots).toEqual([[locked, 40]]);
    expect(e.laser).toBeUndefined();
  });
});

describe('golden run', () => {
  it('the bot plays seed 1 the same way every time', () => {
    const play = () => {
      let s = newRun(1);
      for (let t = 0; t < 120 && s.phase !== 'dead'; t += DT) {
        s = step(s, botInput(s), DT);
        if (s.phase === 'upgrade') s = pickUpgrade(s, s.offer[0]!);
      }
      return { wave: s.wave, score: s.score, kills: s.kills, hp: s.player.hp };
    };
    const a = play();
    expect(play()).toEqual(a);
    expect(a.wave).toBeGreaterThanOrEqual(2);
  });
});
