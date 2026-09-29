# Tick (the Mite): a fast little beetle. Arrowhead shell, glowing abdomen, snapping mandibles, six skittering legs.
from kit import *

shell = smooth(ball('shell', 0.6, 'body', 12, 8))
deform(shell, lambda v: Vector((v.x * 1.3, v.y * (1 - 0.35 * max(0, v.x)) * 1.05, v.z * (0.7 if v.z > 0 else 0.35) + 0.1)))
ridge = at(slab('ridge', [(-0.7, 0), (0.7, 0), (0.55, 0.07), (-0.6, 0.07)], 0.07, 'trim', 0.02), (0, 0, 0.47), (90, 0, 0))
head = at(smooth(ball('head', 0.28, 'trim', 10, 6)), (0.72, 0, 0.12), scale=(1, 1.1, 0.7))
eyes = [at(ball('eye', 0.07, 'glow', 6, 4), (0.9, s * 0.13, 0.2)) for s in (1, -1)]
abd = at(smooth(ball('abd', 0.34, 'glow', 10, 6)), (-0.78, 0, 0.12), scale=(1.1, 0.9, 0.7))
body = part('shell', shell, ridge, head, *eyes, abd)

jaws = []
for s in (1, -1):
    m = slab('jaw', [(0, 0), (0.35, -0.02 * s), (0.42, -0.14 * s), (0.28, -0.08 * s), (0, 0.08 * s)], 0.08, 'trim', 0.02)
    jaws.append(part('jaw_l' if s > 0 else 'jaw_r', at(m, (0.88, s * 0.14, 0.08)), pivot=(0.88, s * 0.14, 0.08), parent=body))

legs = []
for s in (1, -1):
    ls = []
    for i, x in enumerate((0.4, 0, -0.4)):
        l = slab('leg', [(0, 0), (0.08, 0), (0.12, 0.55), (0.02, 0.6)], 0.07, 'trim', 0.02)
        at(l, (x, s * 0.35, -0.02), (0, 0, -25 + i * 25) if s > 0 else (180, 0, 25 - i * 25))
        deform(l, lambda v: Vector((v.x, v.y, v.z - 0.25 * max(0, v.y - 0.3))))
        ls.append(l)
    legs.append(part('legs_l' if s > 0 else 'legs_r', *ls, pivot=(0, s * 0.35, 0), parent=body))

loop(body, 0.8, n=1, rot=(3, 2, 0), loc=(0, 0, 0.03))
loop(legs[0], 4 / 30, n=6, steps=4, rot=(14, 0, 0))
loop(legs[1], 4 / 30, n=6, steps=4, phase=0.5, rot=(14, 0, 0))
for i, j in enumerate(jaws): loop(j, 0.8, rot=(0, 0, 10 * (-1 if i else 1)))
for i, j in enumerate(jaws):
    sgn = -1 if i else 1
    key(j, 'attack', [(0, {}), (0.08, {'rot': (0, 0, 35 * sgn)}), (0.16, {'rot': (0, 0, -20 * sgn)}), (0.3, {})])
key(body, 'attack', [(0, {}), (0.08, {'loc': (-0.1, 0, 0)}), (0.16, {'loc': (0.25, 0, 0), 'rot': (0, 10, 0)}), (0.3, {})])
key(RIG, 'die', [(0, {'rot': (0, 0, 0), 'scale': 1}), (0.25, {'rot': (180, 0, 40), 'scale': 1.1}), (0.5, {'rot': (180, 0, 60), 'scale': 0.01})])
for p in (body, *legs, *jaws): key(p, 'die', [(0, {}), (0.5, {'rot': (0, 0, 0)})])
export(__file__)
