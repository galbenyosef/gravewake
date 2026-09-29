# The ship: a stubby arrowhead fighter. Needle nose, glass canopy, swept wings with a cannon on each tip, twin engines.
from kit import *

hull = smooth(lathe('hull', [(0, -0.62), (0.2, -0.6), (0.3, -0.35), (0.28, 0.1), (0.2, 0.55), (0.08, 0.95), (0, 1.12)], seg=12))
at(hull, (0, 0, 0), (0, 90, 0), (1, 1, 0.7))
spine = at(slab('spine', [(-0.6, 0), (0.35, 0), (0.1, 0.1), (-0.5, 0.16)], 0.08, 'trim', 0.03), (0, 0, 0.16), (90, 0, 0))
canopy = at(smooth(ball('canopy', 0.2, 'glow', 10, 7)), (0.28, 0, 0.14), scale=(1.5, 0.75, 0.6))
hull = part('hull', hull, spine, canopy)

wings = []
for side in (1, -1):
    w = slab('wing', [(0.25, 0.12), (-0.55, 0.95), (-0.72, 0.92), (-0.5, 0.12)], 0.09, 'body', 0.035)
    deform(w, lambda v: Vector((v.x, v.y, v.z - 0.12 * abs(v.y))))
    edge = slab('edge', [(0.27, 0.1), (-0.52, 0.92), (-0.58, 0.95), (0.18, 0.1)], 0.11, 'trim', 0.02)
    deform(edge, lambda v: Vector((v.x, v.y, v.z - 0.12 * abs(v.y))))
    for o in (w, edge):
        if side < 0: o.scale = (1, -1, 1)
    gun = at(cone('gun', 0.07, 0.05, 0.55, 'trim', 8), (-0.75, side * 0.93, -0.1), (0, 90, 0))
    tip = at(ball('tip', 0.05, 'glow', 8, 5), (-0.2, side * 0.93, -0.1))
    wing = part('wing_l' if side > 0 else 'wing_r', w, edge, pivot=(0, side * 0.2, 0), parent=hull)
    wings.append(wing)
    wings.append(part('gun_l' if side > 0 else 'gun_r', gun, tip, pivot=(-0.5, side * 0.93, -0.1), parent=wing))

eng = []
for side in (1, -1):
    nac = at(smooth(lathe('nac', [(0, -0.2), (0.11, -0.18), (0.13, 0.2), (0.09, 0.4), (0, 0.42)], 'trim', 8)), (-0.5, side * 0.2, -0.02), (0, 90, 0))
    fin = at(slab('fin', [(-0.2, 0), (0.15, 0), (-0.1, 0.3), (-0.3, 0.32)], 0.05, 'trim', 0.02), (-0.4, side * 0.2, 0.08), (90 - side * 20, 0, 0))
    eng += [nac, fin]
engines = part('engines', *eng, parent=hull)
jets = part('jets', *[at(cone('jet', 0.1, 0.03, 0.3, 'glow', 8), (-0.72, s * 0.2, -0.02), (0, -90, 0)) for s in (1, -1)], pivot=(-0.72, 0, -0.02), parent=engines)

loop(jets, 0.4, n=5, steps=4, scale=0.18)
loop(wings[0], 2.0, rot=(4, 0, 0))
loop(wings[2], 2.0, rot=(-4, 0, 0))
key(RIG, 'idle', [(0, {}), (2.0, {})])
key(wings[1], 'attack', [(0, {}), (0.04, {'loc': (-0.12, 0, 0)}), (0.14, {})])
key(wings[3], 'attack', [(0, {}), (0.06, {}), (0.1, {'loc': (-0.12, 0, 0)}), (0.2, {})])
key(jets, 'attack', [(0, {'scale': 1}), (0.1, {'scale': 1.3}), (0.2, {'scale': 1})])
burst_apart([hull, wings[0], wings[2], engines], dur=0.9, fling=1.6)
export(__file__)
