# Crab (the Mortar): a squat artillery crab. Wide carapace, four stomping legs, a turret with one fat mortar tube
# that kicks back into the shell on every lob.
from kit import *

cara = smooth(ball('cara', 0.8, 'body', 14, 9))
deform(cara, lambda v: Vector((v.x * 1.0, v.y * 1.15, v.z * (0.5 if v.z > 0 else 0.3))))
rim = at(torus('rim', 0.82, 0.07, 'trim', 20, 5), scale=(1.0, 1.15, 1))
eyes = [at(ball('eye', 0.08, 'glow', 6, 4), (0.72, s * 0.2, 0.12)) for s in (1, -1)]
drums = [at(cone('drum', 0.13, 0.13, 0.4, 'trim', 8, 0.02), (-0.55, s * 0.25, 0.05), (90, 0, 0)) for s in (1, -1)]
stripes = [at(torus('band', 0.14, 0.03, 'glow', 8, 4), (-0.55, s * 0.25, 0.05), (90, 0, 0)) for s in (-0.3, 0.55)]
body = part('carapace', cara, rim, *eyes, *drums, *stripes)

legs = []
for s in (1, -1):
    ls = []
    for x in (0.45, -0.35):
        l = cone('leg', 0.1, 0.03, 0.75, 'trim', 6)
        aim(l, (x * 0.4, s * 1, -0.9), (x, s * 0.6, 0.05))
        claw = aim(ball('knee', 0.09, 'body', 6, 4), (0, 0, 1), (x, s * 0.72, 0.18))
        ls += [l, claw]
    legs.append(part('legs_l' if s > 0 else 'legs_r', *ls, pivot=(0, s * 0.6, 0.05), parent=body))

base = at(lathe('base', [(0, 0), (0.38, 0), (0.34, 0.14), (0, 0.16)], 'trim', 12), (0, 0, 0.3))
turret = part('turret', base, pivot=(0, 0, 0.3), parent=body)
tube = lathe('tube', [(0, -0.15), (0.2, -0.15), (0.22, 0.2), (0.18, 0.55), (0.22, 0.62), (0.15, 0.62), (0.15, 0.3), (0, 0.3)], 'body', 12)
aim(tube, (0.6, 0, 0.8), (0.0, 0, 0.45))
muzzle = aim(torus('muzzle', 0.19, 0.04, 'glow', 12, 4), (0.6, 0, 0.8), (0.37, 0, 0.94))
barrel = part('barrel', tube, muzzle, pivot=(0, 0, 0.45), parent=turret)

loop(body, 1.2, rot=(3, 0, 0), loc=(0, 0, 0.03))
for i, l in enumerate(legs): loop(l, 0.6, n=2, phase=0.5 * i, rot=(8, 0, 6))
loop(turret, 2.4, rot=(0, 0, 14))
key(barrel, 'attack', [(0, {}), (0.08, {'loc': (-0.15, 0, -0.18), 'scale': (1.1, 1.1, 0.85)}), (0.5, {})])
key(body, 'attack', [(0, {'scale': 1}), (0.08, {'scale': (1.05, 1.05, 0.85)}), (0.5, {'scale': 1})])
burst_apart([body, turret, barrel, *legs])
export(__file__)
