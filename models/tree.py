# Tree (scenery): a dead oak at the edge of the clearing. A flared, split trunk on clawing roots, and a crown of bare
# branches that forks and thins to twigs. Scenery stands on z = 0 (the floor) and is placed and scaled by the arena;
# 1 unit is about a metre. It creaks in the wind (idle); attack and die hold still.
from kit import *
import random

rnd = random.Random(7)


def branch(p, d, length, r, depth, out):
    """A crooked branch from p along d, forking until it is a twig."""
    pts, radii = [p], [r]
    q = Vector(p)
    for i in range(4):
        d = (d + Vector((rnd.uniform(-0.35, 0.35), rnd.uniform(-0.35, 0.35), rnd.uniform(-0.15, 0.25)))).normalized()
        q = q + d * length / 4
        pts.append(q.copy())
        radii.append(r * (1 - 0.7 * (i + 1) / 4))
    radii[-1] = r * 0.08 if depth == 0 else radii[-1]
    out.append(tube('branch', [tuple(v) for v in pts], radii, 'body', 5 if depth > 2 else 4 if depth else 3))
    if depth == 0: return
    for k in range(2 if depth > 1 else 3):
        t = rnd.uniform(0.45, 0.95)
        j = min(3, int(t * 4))
        side = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0.1, 0.8))).normalized()
        branch(pts[j + 1], (d * 0.5 + side).normalized(), length * rnd.uniform(0.5, 0.7), radii[j + 1] * 0.8, depth - 1, out)


trunk = tube('trunk', [(0, 0, -0.1), (0.05, 0, 0.6), (-0.1, 0.05, 1.4), (0.08, -0.05, 2.2), (0.0, 0.0, 2.7)], [0.42, 0.3, 0.26, 0.22, 0.16], 'body', 12)
smooth(trunk)
rough(trunk, 0.05, 2.5, 1)
deform(trunk, lambda v: Vector((v.x * (1 + 0.25 * math.sin(v.z * 3)), v.y * (1 + 0.2 * math.cos(v.z * 2.3)), v.z)))
roots = []
for i in range(6):
    a = i / 6 * math.tau + rnd.uniform(-0.3, 0.3)
    ln = rnd.uniform(0.6, 1.0)
    pts = [(math.cos(a) * 0.15, math.sin(a) * 0.15, 0.45), (math.cos(a) * 0.45, math.sin(a) * 0.45, 0.12),
           (math.cos(a) * ln * 0.7, math.sin(a) * ln * 0.7 + 0.1, 0.02), (math.cos(a + 0.2) * ln, math.sin(a + 0.2) * ln, -0.05)]
    roots.append(tube('root', pts, [0.2, 0.14, 0.07, 0.02], 'body', 6))
hollow = at(smooth(ball('hollow', 0.13, 'trim', 8, 6)), (0.3, 0.02, 1.0), scale=(0.5, 1, 1.6))
base = part('trunk', trunk, *roots, hollow)

limbs = []
for a, z, ln in ((0.3, 2.0, 1.9), (2.4, 2.3, 1.6), (4.2, 1.7, 1.8), (1.4, 2.65, 1.3), (5.3, 2.5, 1.4)):
    d = Vector((math.cos(a), math.sin(a), 0.9)).normalized()
    branch(Vector((0, 0, z)), d, ln, 0.13, 3, limbs)
crown = part('crown', *limbs, pivot=(0, 0, 1.8), parent=base)

loop(crown, 4.0, rot=(1.6, 1.2, 0))
still(crown, ('attack', 'die'))
export(__file__)
