// Balance sim: `npm run sim [runs] [minutes]`. The bot plays whole runs headless; prints how deep it gets and what kills it.
import { botInput } from '../src/bot';
import { newRun, pickUpgrade, step } from '../src/game';

declare const process: { argv: string[] };
const runs = Number(process.argv[2] ?? 30), minutes = Number(process.argv[3] ?? 10), DT = 1 / 60;
const waves: number[] = [], killers: Record<string, number> = {};
let scoreSum = 0;
for (let seed = 1; seed <= runs; seed++) {
  let s = newRun(seed), lastHurt = '';
  for (let t = 0; t < minutes * 60 && s.phase !== 'dead'; t += DT) {
    s = step(s, botInput(s), DT);
    if (s.events.some((e) => e.type === 'hurt')) {
      const p = s.player, near = [...s.enemies].sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
      lastHurt = near?.kind ?? 'shot';
    }
    if (s.phase === 'upgrade') s = pickUpgrade(s, s.offer[0]!);
  }
  waves.push(s.wave); scoreSum += s.score;
  if (s.phase === 'dead') killers[lastHurt] = (killers[lastHurt] ?? 0) + 1;
}
waves.sort((a, b) => a - b);
console.log(`${runs} runs, ${minutes} min cap: wave median ${waves[runs >> 1]}, min ${waves[0]}, max ${waves[runs - 1]}, mean score ${Math.round(scoreSum / runs)}`);
console.log('last hurt by:', killers);
