# Altar (scenery): the old ritual circle at the heart of the clearing, sunk flush with the earth. A broken ring of
# flagstones round a cracked round stone, runes cut between them that still smoulder faintly, and guttered candles.
# Flat enough to fight on. Stands on z = 0; about 3 units across.
from kit import *
import random

rnd = random.Random(9)
stones = []
for i in range(14):
    if i in (3, 9): continue  # gaps where stones were taken
    a0, a1 = i / 14 * math.tau + 0.03, (i + 1) / 14 * math.tau - 0.03
    r0, r1 = 1.15, 1.6 + rnd.uniform(-0.05, 0.08)
    pts = [(math.cos(a) * r, math.sin(a) * r) for r, a in ((r0, a0), (r1, a0), (r1, (a0 + a1) / 2), (r1, a1), (r0, a1))]
    st = slab('flag', pts, 0.08, 'body', 0.02)
    at(st, (0, 0, 0.01 + rnd.uniform(-0.02, 0.02)), (rnd.uniform(-3, 3), rnd.uniform(-3, 3), 0))
    stones.append(st)
centre = lathe('centre', [(0.0, -0.02), (0.72, -0.02), (0.74, 0.04), (0.7, 0.07), (0.0, 0.08)], 'body', 24)
rough(centre, 0.01, 6, 1)
crack = tube('crack', [(-0.5, 0.1, 0.085), (-0.1, -0.05, 0.085), (0.2, 0.15, 0.085), (0.55, -0.1, 0.085)], 0.018, 'trim', 4)
runes = []
for i in range(7):
    a = i / 7 * math.tau + 0.2
    c = Vector((math.cos(a) * 0.95, math.sin(a) * 0.95, 0.03))
    t = Vector((-math.sin(a), math.cos(a), 0)) * 0.12
    runes.append(tube('rune', [tuple(c - t), tuple(c + Vector((0, 0, 0.005)) + t * 0.2), tuple(c + t)], 0.02, 'glow', 3))
    runes.append(tube('rune', [tuple(c - t * 0.5 - Vector((math.cos(a), math.sin(a), 0)) * 0.1), tuple(c + t * 0.5 + Vector((math.cos(a), math.sin(a), 0)) * 0.1)], 0.018, 'glow', 3))
ring = torus('ring', 0.62, 0.02, 'glow', 40, 3)
at(ring, (0, 0, 0.09))
candles = [at(cone('candle', 0.05, 0.045, 0.12 + 0.08 * rnd.random(), 'body', 6), (math.cos(a) * 1.75, math.sin(a) * 1.75, 0)) for a in (0.5, 1.9, 3.4, 4.6, 5.8)]
body = part('altar', *stones, centre, crack, *runes, ring, *candles)
still(body)
export(__file__)
