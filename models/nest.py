# Nest (the Hive): a rooted brood-mound. Ridged chitin dome, glowing comb cells, a crown of petals that open to
# birth drones, claw roots gripping the floor.
from kit import *

prof = [(0, -0.35), (0.95, -0.35)] + [(0.95 - 0.55 * t * t + 0.07 * math.sin(t * 18), -0.3 + t * 0.95) for t in (i / 10 for i in range(1, 11))] + [(0, 0.66)]
dome = smooth(lathe('dome', prof, 'body', 14))
deform(dome, lambda v: v + Vector((0, 0, 0.05 * noise.noise(v * 3))))
cells = []
for a in range(6):
    ang = a / 6 * math.tau + 0.3
    c = lathe('cell', [(0, 0), (0.14, 0.0), (0.14, 0.05), (0, 0.06)], 'glow', 6)
    aim(c, (math.cos(ang), math.sin(ang), 0.35), (math.cos(ang) * 0.8, math.sin(ang) * 0.8, 0.02))
    rim = torus('rim', 0.15, 0.04, 'trim', 6, 4)
    aim(rim, (math.cos(ang), math.sin(ang), 0.35), (math.cos(ang) * 0.82, math.sin(ang) * 0.82, 0.03))
    cells += [c, rim]
roots = []
for a in range(5):
    ang = a / 5 * math.tau
    r = cone('root', 0.14, 0.0, 0.7, 'trim', 6)
    deform(r, lambda v: Vector((v.x, v.y + 0.25 * (v.z / 0.7) ** 2, v.z)))
    aim(r, (math.cos(ang), math.sin(ang), -0.25), (math.cos(ang) * 0.75, math.sin(ang) * 0.75, -0.25))
    roots.append(r)
body = part('dome', dome, *cells, *roots)

core = part('core', at(smooth(ball('core', 0.26, 'glow', 10, 7)), (0, 0, 0.62)), pivot=(0, 0, 0.62), parent=body)
petals = []
for a in range(6):
    ang = a / 6 * math.tau
    p = slab('petal', [(0, -0.16), (0.45, -0.1), (0.62, 0), (0.45, 0.1), (0, 0.16)], 0.06, 'trim', 0.02)
    deform(p, lambda v: Vector((v.x, v.y, v.z + 0.4 * v.x * v.x)))
    at(p, (math.cos(ang) * 0.2, math.sin(ang) * 0.2, 0.55), (0, -35, math.degrees(ang)))
    petals.append(part(f'petal_{a}', p, pivot=(math.cos(ang) * 0.2, math.sin(ang) * 0.2, 0.55), parent=body))

loop(body, 2.4, scale=0.025)
loop(core, 1.2, n=2, scale=0.15)
for i, p in enumerate(petals):
    loop(p, 2.4, rot=(0, 6, 0), phase=i / 6)
    key(p, 'attack', [(0, {}), (0.25, {'rot': (0, 45, 0)}), (0.9, {'rot': (0, 45, 0)}), (1.3, {})])
key(core, 'attack', [(0, {'scale': 1}), (0.25, {'scale': 1.6, 'loc': (0, 0, 0.25)}), (0.9, {'scale': 1.4, 'loc': (0, 0, 0.2)}), (1.3, {'scale': 1})])
key(body, 'attack', [(0, {'scale': 1}), (0.2, {'scale': (1.06, 1.06, 0.92)}), (0.4, {'scale': (0.96, 0.96, 1.08)}), (1.3, {'scale': 1})])
burst_apart([body, core, *petals], dur=0.9, fling=1.4)
export(__file__)
