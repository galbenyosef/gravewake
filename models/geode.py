# Geode (the Splitter): a cracked rock egg with a crystal heart. Four shell plates breathe apart over a glowing core;
# when it dies they burst open and the brood pours out.
from kit import *

core = smooth(ball('core', 0.62, 'glow', 12, 8))
crystals = []
for i, d in enumerate(sphere_dirs(9, 0.1)):
    c = cone('crystal', 0.13, 0.0, 0.55 + 0.1 * (i % 3), 'glow' if i % 2 else 'trim', 5)
    aim(c, d, tuple(d * 0.5))
    crystals.append(c)
heart = part('heart', core, *crystals)

plates = []
for q in range(4):
    a0 = q / 4 * math.tau + 0.12
    pl = smooth(ball('plate', 0.78, 'body', 16, 10))
    cut(pl, lambda c, a0=a0: ((math.atan2(c.y, c.x) - a0) % math.tau) < math.tau / 4 - 0.22 and c.z < 0.62)
    deform(pl, lambda v: v * (1 + 0.1 * noise.noise(v * 3.2 + Vector((q, 0, 0)))))
    shell(pl, 0.1)
    mid = a0 + math.tau / 8
    plates.append(part(f'plate_{q}', pl, pivot=(math.cos(mid) * 0.3, math.sin(mid) * 0.3, -0.6)))
    plates[-1]['dir'] = (math.cos(mid), math.sin(mid))

loop(heart, 1.4, scale=0.08)
for i, p in enumerate(plates):
    dx, dy = p['dir']
    loop(p, 1.4, loc=(dx * 0.05, dy * 0.05, 0), rot=(-dy * 4, dx * 4, 0), phase=i * 0.25)
    key(p, 'attack', [(0, {}), (0.1, {'loc': (dx * 0.15, dy * 0.15, 0)}), (0.2, {}), (0.3, {'loc': (dx * 0.1, dy * 0.1, 0)}), (0.5, {})])
    key(p, 'die', [(0, {}), (0.15, {'loc': (dx * 0.2, dy * 0.2, 0.1), 'rot': (-dy * 30, dx * 30, 0)}), (0.6, {'loc': (dx * 1.3, dy * 1.3, -0.3), 'rot': (-dy * 110, dx * 110, 40), 'scale': 0.01})])
key(heart, 'attack', [(0, {'scale': 1}), (0.15, {'scale': 1.2}), (0.5, {'scale': 1})])
key(heart, 'die', [(0, {'scale': 1}), (0.15, {'scale': 1.5}), (0.4, {'scale': 0.01})])
key(RIG, 'die', [(0, {}), (0.6, {})])
export(__file__)
