// Synthesised sound effects (no asset files): each sound in content/sounds.kdl is a few oscillator and noise voices.
// Silent until the first user gesture unlocks the AudioContext (browsers require it), when muted, and in stories.
import { MASTER_VOLUME, SOUNDS } from './content';
import { game } from './store';

export const SFX = ['tap', 'cast', 'hit', 'kill', 'big-kill', 'hurt', 'pickup', 'grave-open', 'blast', 'wave', 'boon', 'dead', 'enemy-cast'] as const;
export type Sfx = (typeof SFX)[number];
for (const n of SFX) if (!SOUNDS[n]) throw new Error(`audio: no sound "${n}" in content/sounds.kdl`);

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
const lastAt: Partial<Record<Sfx, number>> = {};

export function unlockAudio() {
  if (ctx || import.meta.env.STORYBOOK) return;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
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
  const d = SOUNDS[name]!, now = ctx.currentTime;
  if (now - (lastAt[name] ?? -1) < d.gap) return;
  lastAt[name] = now;
  for (const v of d.voices) {
    if (v.kind === 'tone') tone(v.wave, v.jitter ? v.from + Math.random() * v.jitter : v.from, v.to, v.s, v.vol);
    else hiss(v.s, v.vol, v.cutoff);
  }
}
