# Statue (scenery): the clearing's landmark, a weeping angel of the old faith on a cracked plinth, hood drawn, face in
# its hands, wings half-spread and broken. Stands on z = 0; about 3.4 units tall. Soulfire weeps from under its hands.
from kit import *

plinth = at(smooth(box('plinth', (1.3, 1.3, 0.7), 'body', 0.08)), (0, 0, 0.35))
step = at(smooth(box('step', (1.7, 1.7, 0.25), 'body', 0.06)), (0, 0, 0.12))
for o in (plinth, step): rough(o, 0.03, 4, 1)
robe = lathe('robe', [(0.52, 0.7), (0.48, 1.2), (0.36, 1.9), (0.3, 2.4), (0.0, 2.55)], 'body', 14)
smooth(robe)
rough(robe, 0.03, 6, 2)
hood = at(smooth(ball('hood', 0.3, 'body', 12, 8)), (0.08, 0, 2.62), scale=(1, 0.95, 1.1))
hands = at(smooth(box('hands', (0.22, 0.34, 0.28), 'body', 0.08)), (0.3, 0, 2.5))
tears = [tube('tear', [(0.38, d * 0.08, 2.4), (0.42, d * 0.1, 2.0), (0.4, d * 0.1, 1.6)], [0.025, 0.02, 0.0], 'glow', 4) for d in (1, -1)]
wings = []
for sd in (1, -1):
    w = slab('wing', [(0, 0), (-0.3, 0.9), (-0.9, 1.5), (-1.1, 1.3), (-0.7, 0.7), (-0.6, 0.1)], 0.1, 'body', 0.03)
    deform(w, lambda v, sd=sd: Vector((v.x, sd * (0.15 + v.y * 0.7), v.z * 0.6 + 1.9 + v.y * 0.3)))
    rough(w, 0.03, 5, 3 + sd)
    wings.append(w)
cut(wings[1], lambda c: c.y > -0.9)  # one wing snapped
body = part('statue', plinth, step, robe, hood, hands, *tears, *wings)
still(body)
export(__file__)
