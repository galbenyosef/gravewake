# Snag (scenery): a tall dead pine, bark sloughed off, top snapped, a few broken spurs of branch left. Stands on z = 0;
# about 5 units tall. Thin enough that the clearing behind it still shows.
from kit import *
import random

rnd = random.Random(12)
trunk = tube('trunk', [(0, 0, -0.1), (0.05, 0.02, 1.5), (-0.05, 0.0, 3.0), (0.08, -0.03, 4.3), (0.04, 0.0, 4.9)], [0.3, 0.22, 0.18, 0.13, 0.09], 'body', 10)
smooth(trunk)
rough(trunk, 0.04, 3, 1)
deform(trunk, lambda v: Vector((v.x, v.y, v.z - 0.35 * max(0, v.x) * (v.z > 4.6))))  # snapped top
spurs = []
for i in range(9):
    z = rnd.uniform(1.4, 4.4)
    a = rnd.uniform(0, math.tau)
    ln = rnd.uniform(0.4, 1.3) * (1.2 - z / 6)
    d = Vector((math.cos(a), math.sin(a), rnd.uniform(-0.4, 0.1))).normalized()
    b = Vector((0, 0, z))
    spurs.append(tube('spur', [tuple(b), tuple(b + d * ln * 0.6 + Vector((0, 0, -0.05))), tuple(b + d * ln)], [0.07, 0.04, 0.0], 'body', 4))
flare = [tube('flare', [(math.cos(a) * 0.1, math.sin(a) * 0.1, 0.5), (math.cos(a) * 0.4, math.sin(a) * 0.4, 0.05), (math.cos(a) * 0.55, math.sin(a) * 0.55, -0.05)], [0.14, 0.08, 0.0], 'body', 5) for a in (0.3, 1.9, 3.5, 5.0)]
body = part('snag', trunk, *spurs, *flare)
still(body)
export(__file__)
