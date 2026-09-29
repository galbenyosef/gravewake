# Hornet (the Wasp): thorax, a striped abdomen with a glowing stinger, bug eyes, four wings in a blur.
from kit import *

thorax = at(smooth(ball('thorax', 0.34, 'body', 12, 8)), (0.1, 0, 0.1), scale=(1.1, 0.9, 0.85))
head = at(smooth(ball('head', 0.24, 'trim', 10, 7)), (0.52, 0, 0.12), scale=(0.9, 1.1, 0.9))
eyes = [at(smooth(ball('eye', 0.12, 'glow', 8, 6)), (0.6, s * 0.15, 0.18), scale=(0.8, 0.7, 1)) for s in (1, -1)]
mand = [at(cone('mand', 0.05, 0.0, 0.2, 'trim', 5), (0.7, s * 0.07, 0.02), (0, 100, -s * 25)) for s in (1, -1)]
body = part('thorax', thorax, head, *eyes, *mand)

abd = smooth(lathe('abd', [(0, 0), (0.22, 0.05), (0.33, 0.3), (0.3, 0.6), (0.16, 0.85), (0, 0.92)], seg=12))
at(abd, (-0.15, 0, 0.1), (0, -90, 0))
stripes = [at(torus('stripe', r, 0.05, 'trim', 14, 5), (-0.15 - x, 0, 0.1), (0, 90, 0)) for x, r in ((0.3, 0.33), (0.52, 0.3), (0.72, 0.21))]
sting = at(cone('sting', 0.09, 0.0, 0.32, 'glow', 6), (-1.02, 0, 0.1), (0, -90, 0))
tail = part('abdomen', abd, *stripes, sting, pivot=(-0.12, 0, 0.1), parent=body)

wings = []
for s in (1, -1):
    for i, (x, ang, ln) in enumerate(((0.12, 20, 0.9), (-0.08, -10, 0.7))):
        w = slab('wing', [(0, 0), (0.12, ln * 0.4), (0.02, ln), (-0.14, ln * 0.85), (-0.1, 0.2)], 0.025, 'glow', 0.01)
        at(w, (x, s * 0.15, 0.32), (0 if s > 0 else 180, 0, ang * s if s > 0 else -ang) if s > 0 else (180, 0, -ang))
        wings.append(part(f'wing_{"l" if s > 0 else "r"}{i}', w, pivot=(x, s * 0.15, 0.32), parent=body))

loop(body, 1.6, loc=(0, 0, 0.06), rot=(0, 5, 0))
loop(tail, 1.6, rot=(0, 10, 6), phase=0.25)
for k, w in enumerate(wings): loop(w, 4 / 30, n=12, steps=4, phase=0.5 * (k % 2), rot=(28 * (1 if k < 2 else -1), 0, 0))
key(tail, 'attack', [(0, {}), (0.15, {'rot': (0, -25, 0)}), (0.3, {'rot': (0, 55, 0), 'loc': (-0.05, 0, -0.1)}), (0.6, {})])
key(body, 'attack', [(0, {}), (0.15, {'rot': (0, 10, 0)}), (0.3, {'rot': (0, -12, 0)}), (0.6, {})])
burst_apart([body, tail, *wings])
export(__file__)
