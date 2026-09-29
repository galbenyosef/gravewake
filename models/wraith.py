# Wraith (the Phantom): a hooded eye. A cowl of armour around one staring eye, a torn cloak trailing behind, three
# shards orbiting. It flares open when it blinks in and fires.
from kit import *

hood = smooth(ball('hood', 0.62, 'body', 14, 10))
cut(hood, lambda c: not (c.x > 0.25 and abs(c.z - 0.05) < 0.42 and abs(c.y) < 0.45))
deform(hood, lambda v: Vector((v.x * 1.05, v.y * 0.95, v.z * 0.9 + 0.12 * max(0, -v.x) * (v.z > 0))))
shell(hood, 0.07)
brow = at(slab('brow', [(-0.1, -0.35), (0.12, -0.3), (0.2, 0), (0.12, 0.3), (-0.1, 0.35)], 0.07, 'trim', 0.02), (0.44, 0, 0.36), (0, 20, 0))
horns = [aim(cone('horn', 0.08, 0.0, 0.45, 'trim', 6), (-0.6, s * 0.4, 0.8), (-0.1, s * 0.3, 0.45)) for s in (1, -1)]
body = part('hood', hood, brow, *horns)

eye = smooth(ball('eye', 0.34, 'glow', 12, 8))
pupil = at(smooth(ball('pupil', 0.15, 'trim', 8, 6)), (0.28, 0, 0), scale=(0.4, 1, 1.25))
eye = part('eye', at(eye, (0.12, 0, 0.02)), at(pupil, (0.42, 0, 0.02)), pivot=(0.12, 0, 0.02), parent=body)

tails = []
for i, (y, ln) in enumerate(((0.28, 0.85), (0, 1.05), (-0.28, 0.85))):
    t = slab('rag', [(0, -0.14), (-ln * 0.6, -0.1), (-ln, 0), (-ln * 0.75, 0.04), (-ln * 0.55, 0.1), (0, 0.14)], 0.05, 'body', 0.015)
    at(t, (-0.4, y, -0.15 - abs(y) * 0.2), (0, -12, math.degrees(y) * 0.8))
    deform(t, lambda v: Vector((v.x, v.y, v.z + 0.12 * math.sin(v.x * 5))))
    tails.append(part(f'rag_{i}', t, pivot=(-0.4, y, -0.15), parent=body))

orbit = []
for i in range(3):
    a = i / 3 * math.tau
    s = ball('shard', 0.1, 'glow', 4, 2)
    at(s, (math.cos(a) * 0.95, math.sin(a) * 0.95, 0.1 * (i - 1)), scale=(0.7, 0.7, 1.8))
    orbit.append(s)
shards = part('shards', *orbit, parent=body)

loop(body, 2.0, loc=(0, 0, 0.08), rot=(4, 3, 0))
key(eye, 'idle', [(0, {}), (0.4, {'rot': (0, 0, 25)}), (0.8, {'rot': (0, 0, 25)}), (1.2, {'rot': (0, -8, -20)}), (1.6, {'rot': (0, -8, -20)}), (2.0, {})])
for i, t in enumerate(tails): loop(t, 1.0, n=2, phase=i * 0.3, rot=(10, 12, 8))
spin(shards, 'idle', 2.0, 1)
key(body, 'attack', [(0, {'scale': 1}), (0.12, {'scale': 1.25, 'rot': (0, -10, 0)}), (0.5, {'scale': 1.1}), (0.8, {'scale': 1})])
key(eye, 'attack', [(0, {'scale': 1}), (0.12, {'scale': 1.4}), (0.5, {'scale': 1.3}), (0.8, {'scale': 1})])
spin(shards, 'attack', 0.8, 2)
burst_apart([body, eye, *tails, shards], dur=0.7)
export(__file__)
