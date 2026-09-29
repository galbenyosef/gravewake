// Foundation guards: vocabulary is defined in one home, colours in one palette.
import { describe, expect, it } from 'vitest';
import { ENEMY_IDS, WAVES } from '../content';
import { TOKENS } from '../tokens';

const SRC = import.meta.glob<string>(['../**/*.ts', '!../**/*.test.ts', '!../stories/**'], { query: '?raw', import: 'default', eager: true });
const CSS = import.meta.glob<string>('./*.css', { query: '?raw', import: 'default', eager: true });
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

describe('foundation guards', () => {
  it('only screens/shared.ts calls defineProp or defineElement', () => {
    const callers = Object.entries(SRC).filter(([p, s]) => !p.startsWith('../decl/') && /\bdefine(Prop|Element)\(/.test(s)).map(([p]) => p);
    expect(callers).toEqual(['./shared.ts']);
  });
  it('only shared.css has a :root', () => {
    expect(Object.entries(CSS).filter(([p, s]) => p !== './shared.css' && /:root/.test(strip(s))).map(([p]) => p)).toEqual([]);
  });
  it('no hex colour is repeated across screen stylesheets (put it in the palette)', () => {
    const seen = new Map<string, string>(), dupes: string[] = [];
    for (const [p, s] of Object.entries(CSS)) {
      if (p === './shared.css') continue;
      for (const hex of new Set(strip(s).match(/#[0-9a-f]{3,6}\b/gi) ?? [])) {
        const k = hex.toLowerCase(), other = seen.get(k);
        if (other && other !== p) dupes.push(`${k} in ${other} and ${p}`);
        seen.set(k, p);
      }
    }
    expect(dupes).toEqual([]);
  });
  it('every enemy has a palette colour, and every enemy colour has an enemy', () => {
    const tokens = Object.keys(TOKENS).filter((k) => k.startsWith('--enemy-')).map((k) => k.slice(8));
    expect(tokens.sort()).toEqual([...ENEMY_IDS].sort());
  });
  it('every wave tint is a palette colour', () => {
    expect(WAVES.filter((w) => w.tint && !(w.tint in TOKENS)).map((w) => `${w.id}: ${w.tint}`)).toEqual([]);
  });
});
