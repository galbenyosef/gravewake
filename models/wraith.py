# Wraith: a hooded shadow with a reaper's scythe. A deep cowl with nothing inside but two cold eyes,
# a cloak that frays into smoke, long clawed hands on a crooked snath. It blinks in beside you, throws the cloak open
# and scythes a fan of bolts.
from kit import *

cloak = lathe('cloak', [(0.0, -0.8), (0.3, -0.65), (0.46, -0.3), (0.4, 0.1), (0.3, 0.45), (0.0, 0.55)], 'cloth', 16)
deform(cloak, lambda v: Vector((v.x - 0.3 * max(0, -v.z) ** 1.2, v.y * (1 + 0.35 * max(0, -v.z)), v.z)))
smooth(cloak)
cut(cloak, lambda c: not (c.z < -0.35 and (math.atan2(c.y, c.x + 0.3) * 5 % 1.0) < 0.4))
rough(cloak, 0.045, 5, 1)
wisps = [tube('wisp', [(-0.25, y, -0.55), (-0.6, y * 1.3, -0.72), (-0.95, y * 1.1, -0.66), (-1.2, y * 1.4, -0.75)], [0.1, 0.07, 0.03, 0.0], 'cloth', 5) for y in (-0.25, 0.0, 0.25)]
body = part('body', cloak, *wisps)

hood = smooth(ball('hood', 0.3, 'cloth', 14, 10))
deform(hood, lambda v: Vector((v.x - 0.25 * max(0, v.z), v.y * 0.95, v.z * 1.2)))
cut(hood, lambda c: not (c.x > 0.14 and abs(c.y) < 0.17 and abs(c.z) < 0.18))
shell(hood, 0.05)
rough(hood, 0.02, 7, 2)
peak = tube('peak', [(-0.12, 0, 0.3), (-0.3, 0, 0.36), (-0.45, 0, 0.26)], [0.1, 0.06, 0.0], 'cloth', 7)
void = at(smooth(ball('void', 0.22, 'trim', 10, 7)), (0.02, 0, 0))
eyes = [at(ball('eye', 0.045, 'glow', 6, 4), (0.2, s * 0.08, 0.02), scale=(0.5, 1, 0.6)) for s in (1, -1)]
for o in (hood, peak, void, *eyes): o.location += Vector((0.05, 0, 0.72))
head = part('head', hood, peak, void, *eyes, pivot=(0.05, 0, 0.6), parent=body)

# Scythe arm: a long crooked snath across the body, the blade curving out wide on the left.
sleeve = tube('sleeve', [(0.05, 0.3, 0.4), (0.25, 0.42, 0.2), (0.42, 0.35, 0.15)], [0.12, 0.1, 0.07], 'cloth', 7)
claw = [tube('claw', [(0.44, 0.35, 0.15), (0.56, 0.35 + d * 0.05, 0.12), (0.62, 0.35 + d * 0.06, 0.04)], [0.02, 0.015, 0.0], 'body', 4) for d in (-1, 0, 1)]
snath = tube('snath', [(0.2, 0.36, -0.7), (0.42, 0.35, 0.15), (0.6, 0.32, 0.95), (0.62, 0.3, 1.1)], [0.03, 0.035, 0.03, 0.03], 'trim', 6)
blade = slab('blade', [(0.0, -0.04), (0.35, -0.08), (0.75, -0.02), (1.05, 0.12), (0.7, 0.04), (0.3, 0.05), (0.0, 0.06)], 0.025, 'trim', 0.01)
deform(blade, lambda v: Vector((v.x, v.y - 0.25 * v.x * v.x, v.z)))
at(blade, (0.62, 0.3, 1.08), (0, 0, 100))
edge = slab('edge', [(0.3, 0.05), (0.7, 0.04), (1.05, 0.12), (0.72, 0.08), (0.3, 0.08)], 0.02, 'glow', 0.005)
deform(edge, lambda v: Vector((v.x, v.y - 0.25 * v.x * v.x, v.z)))
at(edge, (0.62, 0.3, 1.08), (0, 0, 100))
arm = part('arm', sleeve, *claw, snath, blade, edge, pivot=(0.05, 0.3, 0.4), parent=body)
off = part('off', tube('sleeve2', [(0.05, -0.3, 0.4), (0.25, -0.5, 0.25), (0.45, -0.55, 0.2)], [0.12, 0.1, 0.07], 'cloth', 7),
           *[tube('claw', [(0.47, -0.55, 0.2), (0.62, -0.55 - d * 0.06, 0.16), (0.7, -0.55 - d * 0.07, 0.06)], [0.022, 0.016, 0.0], 'body', 4) for d in (-1, 0, 1)],
           pivot=(0.05, -0.3, 0.4), parent=body)
RIG.location = (0, 0, 0.1)

loop(body, 2.0, loc=(0, 0, 0.1), rot=(4, 3, 0))
loop(head, 2.0, rot=(0, 6, 12), phase=0.3)
loop(arm, 2.0, rot=(4, 0, 4), phase=0.5)
loop(off, 1.0, n=2, rot=(12, 0, 10))
# Attack: the cloak flares, the scythe sweeps across.
key(body, 'attack', [(0, {'scale': 1}), (0.12, {'scale': 1.2}), (0.5, {'scale': 1.05}), (0.8, {'scale': 1})])
key(arm, 'attack', [(0, {}), (0.12, {'rot': (0, 0, 40)}), (0.3, {'rot': (0, 0, -60)}), (0.8, {})])
key(off, 'attack', [(0, {}), (0.12, {'rot': (0, 0, 40)}), (0.8, {})])
key(head, 'attack', [(0, {'scale': 1}), (0.12, {'scale': 1.2}), (0.8, {'scale': 1})])
crumble([body, head, arm, off], dur=0.9)
export(__file__)
