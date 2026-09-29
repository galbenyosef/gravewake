# Roots (scenery): a rotten stump and the roots it throws across the ground, flat enough to walk over. Stands on
# z = 0; the arena turns and scales each one. It holds still in every clip.
from kit import *
import random

rnd = random.Random(3)
stump = tube('stump', [(0, 0, -0.1), (0.02, 0, 0.35), (0, 0.02, 0.62)], [0.42, 0.34, 0.3], 'body', 10)
smooth(stump)
rough(stump, 0.06, 3, 5)
deform(stump, lambda v: Vector((v.x, v.y, v.z - 0.2 * max(0, v.x) * (v.z > 0.4))))  # snapped off at a slant
rot = at(lathe('rot', [(0, 0.5), (0.24, 0.52), (0.26, 0.56), (0, 0.6)], 'trim', 10), (0, 0, -0.05))
roots = []
for i in range(7):
    a = i / 7 * math.tau + rnd.uniform(-0.3, 0.3)
    pts, r = [], 0.18
    x, y, d = math.cos(a) * 0.3, math.sin(a) * 0.3, a
    for k in range(7):
        pts.append((x, y, max(0.0, 0.25 - k * 0.07)))
        d += rnd.uniform(-0.5, 0.5)
        step = rnd.uniform(0.3, 0.5)
        x, y = x + math.cos(d) * step, y + math.sin(d) * step
    roots.append(tube('root', pts, [0.16, 0.12, 0.09, 0.07, 0.05, 0.035, 0.0], 'body', 6))
body = part('roots', stump, rot, *roots)

still(body)
export(__file__)
