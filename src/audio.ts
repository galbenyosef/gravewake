// Synthesised sound effects (no asset files): a few oscillator and noise envelopes. Silent until the first user gesture
// unlocks the AudioContext (browsers require it), when muted, and in stories.
import { game } from './store';

export type Sfx = 'tap' | 'fire' | 'hit' | 'kill' | 'big-kill' | 'hurt' | 'pickup' | 'warp' | 'blast' | 'wave' | 'upgrade' | 'dead' | 'enemy-fire';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** Per-sound minimum gap, so 60 hits in a frame don't stack into a roar. */
const MIN_GAP_S: Partial<Record<Sfx, number>> = { fire: 0.06, hit: 0.04, 'enemy-fire': 0.08, pickup: 0.03, kill: 0.03 };
const lastAt: Partial<Record<Sfx, number>> = {};

export function unlockAudio() {
  if (ctx || import.meta.env.STORYBOOK) return;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch { ctx = null; }
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number) {
  const t = ctx!.currentTime, o = ctx!.createOscillator(), g = ctx!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t); o.stop(t + dur);
}
function hiss(dur: number, vol: number, cutoff: number) {
  const t = ctx!.currentTime, s = ctx!.createBufferSource(), f = ctx!.createBiquadFilter(), g = ctx!.createGain();
  s.buffer = noise; f.type = 'lowpass';
  f.frequency.setValueAtTime(cutoff, t);
  f.frequency.exponentialRampToValueAtTime(80, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(master!);
  s.start(t); s.stop(t + dur);
}

export function sfx(name: Sfx) {
  if (!ctx || game.getState().meta.muted) return;
  const now = ctx.currentTime, gap = MIN_GAP_S[name] ?? 0;
  if (now - (lastAt[name] ?? -1) < gap) return;
  lastAt[name] = now;
  switch (name) {
    case 'tap': tone('square', 880, 1320, 0.06, 0.12); break;
    case 'fire': tone('square', 1400, 500, 0.05, 0.035); break;
    case 'enemy-fire': tone('sawtooth', 420, 260, 0.08, 0.04); break;
    case 'hit': tone('triangle', 300, 120, 0.05, 0.08); break;
    case 'kill': hiss(0.25, 0.35, 2400); tone('sine', 180, 50, 0.2, 0.2); break;
    case 'big-kill': hiss(0.9, 0.6, 3000); tone('sine', 120, 30, 0.8, 0.5); break;
    case 'hurt': hiss(0.35, 0.5, 1200); tone('sawtooth', 220, 60, 0.35, 0.25); break;
    case 'pickup': tone('sine', 1200 + Math.random() * 300, 2200, 0.07, 0.07); break;
    case 'warp': tone('sine', 200, 900, 0.5, 0.06); break;
    case 'blast': hiss(0.5, 0.45, 1800); break;
    case 'wave': tone('triangle', 330, 660, 0.35, 0.15); tone('triangle', 495, 990, 0.45, 0.1); break;
    case 'upgrade': tone('square', 660, 1320, 0.2, 0.1); tone('sine', 990, 1980, 0.3, 0.1); break;
    case 'dead': hiss(1.4, 0.6, 1500); tone('sawtooth', 300, 30, 1.4, 0.3); break;
  }
}
