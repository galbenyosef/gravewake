# Bloat: a corpse swollen to bursting. A drum of a belly held shut with stitches, skulls pressing out
# through the skin, grave-light leaking from the seams; a small lolling head and stumpy arms. It bursts, and what
# was inside comes skittering out.
from kit import *

belly = smooth(ball('belly', 0.72, 'body', 16, 11), 1)
deform(belly, lambda v: Vector((v.x * 1.05, v.y, v.z * 0.92 - 0.1)))
rough(belly, 0.06, 3.5, 1)
bumps = [at(smooth(ball('bump', 0.2, 'body', 8, 6)), (d.x * 0.62, d.y * 0.62, d.z * 0.56 - 0.1), scale=(1, 1, 0.8)) for d in sphere_dirs(9, -0.2)]
faces = [skull(0.22, (d.x * 0.7, d.y * 0.7, d.z * 0.6 - 0.1), eyes='glow') for d in (Vector((0.8, 0.4, 0.3)), Vector((0.6, -0.6, 0.1)), Vector((-0.2, 0.9, 0.2)))]
seams = [tube('seam', [(math.cos(a) * 0.74, math.sin(a) * 0.74, z) for z in (-0.5, -0.2, 0.1, 0.35)], 0.03, 'glow', 4) for a in (0.2, 2.3, 4.2)]
stitches = [at(box('stitch', (0.03, 0.16, 0.03), 'trim', 0.005), (math.cos(a) * 0.76, math.sin(a) * 0.76, z), (0, 0, math.degrees(a))) for a in (0.2, 2.3, 4.2) for z in (-0.4, -0.1, 0.2)]
body = part('belly', belly, *bumps, *[o for f in faces for o in f], *seams, *stitches)

skl = skull(0.34, (0.22, 0, 0.72), jaw=25, tilt=25)
neck = tube('neck', [(0.1, 0, 0.5), (0.18, 0, 0.62)], 0.12, 'body', 6)
head = part('head', *skl, neck, pivot=(0.12, 0, 0.56), parent=body)
arms = []
for s in (1, -1):
    obs = [tube('arm', [(0.2, s * 0.62, 0.15), (0.45, s * 0.78, -0.1), (0.55, s * 0.72, -0.35)], [0.12, 0.1, 0.08], 'body', 6),
           at(smooth(ball('fist', 0.1, 'body', 6, 4)), (0.58, s * 0.72, -0.4))]
    arms.append(part('arm_l' if s > 0 else 'arm_r', *obs, pivot=(0.2, s * 0.6, 0.15), parent=body))
legs = [part('leg_l' if s > 0 else 'leg_r', tube('leg', [(0, s * 0.35, -0.6), (0.05, s * 0.4, -0.86)], [0.13, 0.1], 'body', 6),
             at(smooth(box('foot', (0.22, 0.14, 0.07), 'body', 0.03)), (0.1, s * 0.4, -0.88)), pivot=(0, s * 0.35, -0.6), parent=body) for s in (1, -1)]

# Idle: a heaving, waddling breath.
loop(body, 1.4, scale=0.04, rot=(6, 0, 0), loc=(0, 0, 0.03))
loop(head, 1.4, rot=(18, 10, 0), phase=0.25)
for i, a in enumerate(arms): loop(a, 1.4, phase=i * 0.5, rot=(0, 20, 0))
for i, l in enumerate(legs): loop(l, 1.4, phase=i * 0.5, rot=(0, 18, 0))
# Attack (a lunge when close): it swells and belly-slams.
key(body, 'attack', [(0, {'scale': 1}), (0.2, {'scale': 1.15, 'loc': (-0.05, 0, 0.05)}), (0.35, {'scale': 0.95, 'loc': (0.3, 0, 0)}), (0.6, {'scale': 1})])
for p in (head, *arms, *legs): key(p, 'attack', [(0, {}), (0.6, {})])
# Die: it bursts.
burst_apart([body, head, *arms, *legs], dur=0.8, fling=1.4, rise=0.8)
export(__file__)
