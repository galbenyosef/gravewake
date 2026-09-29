# Urchin (the Bomber): a spiked mine on a lit fuse. Breathes in and out, swells when it gets close, then goes.
from kit import *

core = smooth(ball('core', 0.55, 'body', 12, 8))
deform(core, lambda v: v * (1 + 0.06 * noise.noise(v * 4)))
belt = at(torus('belt', 0.56, 0.06, 'glow', 20, 5), (0, 0, 0))
cracks = [at(slab('crack', [(0, 0), (0.18, 0.04), (0.3, -0.02), (0.18, 0.1), (0, 0.06)], 0.02, 'glow', 0.005), (0.53 * math.cos(a), 0.53 * math.sin(a), 0.22), (0, -40, math.degrees(a))) for a in (0.6, 2.4, 4.2)]
cap = at(cone('cap', 0.14, 0.1, 0.12, 'trim', 8), (0, 0, 0.5))
body = part('core', core, belt, *cracks, cap)

spikes = []
for d in sphere_dirs(18, -0.55):
    sp = cone('spike', 0.1, 0.0, 0.42, 'trim', 5)
    aim(sp, d, tuple(d * 0.46))
    spikes.append(sp)
spikes = part('spikes', *spikes, parent=body)
fuse = cone('fuse', 0.03, 0.03, 0.2, 'trim', 5)
at(fuse, (0, 0, 0.6), (0, 20, 0))
spark = at(smooth(ball('spark', 0.08, 'glow', 8, 5)), (0.06, 0, 0.8))
fuse = part('fuse', fuse, spark, pivot=(0, 0, 0.6), parent=body)

loop(body, 0.9, scale=0.05)
spin(spikes, 'idle', 3.6, 1)
loop(fuse, 0.3, n=12, steps=4, rot=(12, 12, 0))
key(body, 'attack', [(0, {'scale': 1}), (0.2, {'scale': 1.35}), (0.35, {'scale': 1.15}), (0.5, {'scale': 1.4}), (0.8, {'scale': 1})])
key(fuse, 'attack', [(0, {'scale': 1}), (0.2, {'scale': 2}), (0.5, {'scale': 2.4}), (0.8, {'scale': 1})])
key(spikes, 'attack', [(0, {'scale': 1}), (0.5, {'scale': 1.2, 'rot': (0, 0, 60)}), (0.8, {'scale': 1})])
key(body, 'die', [(0, {'scale': 1}), (0.12, {'scale': 1.6}), (0.3, {'scale': 0.01})])
key(spikes, 'die', [(0, {'scale': 1}), (0.12, {'scale': 1.5}), (0.4, {'scale': 3, 'rot': (0, 0, 90)}), (0.5, {'scale': 0.01})])
key(fuse, 'die', [(0, {}), (0.4, {'loc': (0, 0, 1.2), 'rot': (200, 0, 0)})])
key(RIG, 'die', [(0, {}), (0.5, {})])
export(__file__)
