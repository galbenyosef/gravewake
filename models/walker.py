# Walker (the Colossus): a siege titan that walks you down. Massive torso round a reactor, twin shoulder cannons,
# a back mortar, stomping legs. It dies in pieces and the splitters spill out.
from kit import *

torso = smooth(box('torso', (0.85, 1.1, 0.75), 'body', 0.14))
deform(torso, lambda v: Vector((v.x + 0.12 * v.z, v.y * (1 + 0.2 * v.z), v.z)))
chest = at(torus('frame', 0.2, 0.06, 'trim', 14, 5), (0.44, 0, 0.1), (0, 90, 0))
reactor = at(smooth(ball('reactor', 0.17, 'glow', 10, 7)), (0.43, 0, 0.1))
head = at(smooth(box('head', (0.3, 0.32, 0.22), 'trim', 0.06)), (0.3, 0, 0.5))
visor = at(box('visor', (0.05, 0.24, 0.05), 'glow', 0.01), (0.46, 0, 0.52))
hips = at(smooth(box('hips', (0.5, 0.7, 0.25), 'trim', 0.06)), (0, 0, -0.45))
stacks = [at(cone('stack', 0.08, 0.07, 0.4, 'trim', 8), (-0.42, s * 0.3, 0.2)) for s in (1, -1)]
embers = [at(ball('ember', 0.07, 'glow', 6, 4), (-0.42, s * 0.3, 0.62)) for s in (1, -1)]
mort = aim(cone('mortar', 0.15, 0.13, 0.4, 'trim', 10, 0.02), (-0.3, 0, 1), (-0.3, 0, 0.3))
body = part('torso', torso, chest, reactor, head, visor, hips, *stacks, *embers, mort)

guns = []
for s in (1, -1):
    pau = smooth(box('pau', (0.55, 0.36, 0.34), 'trim', 0.08))
    at(pau, (0.05, s * 0.72, 0.28))
    barrels = [at(cone('bar', 0.07, 0.06, 0.6, 'trim', 8), (0.25, s * 0.72 + dy, 0.28 + dz), (0, 90, 0)) for dy, dz in ((0.08, 0.06), (-0.08, 0.06))]
    tips = [at(torus('muz', 0.07, 0.025, 'glow', 8, 4), (0.85, s * 0.72 + dy, 0.34), (0, 90, 0)) for dy in (0.08, -0.08)]
    armour = at(slab('armour', [(-0.3, 0), (0.3, 0), (0.2, 0.22), (-0.35, 0.18)], 0.07, 'body', 0.025), (0.0, s * 0.72, 0.47), (0, 0, 0))
    guns.append(part('gun_l' if s > 0 else 'gun_r', pau, *barrels, *tips, armour, pivot=(0, s * 0.6, 0.28), parent=body))

legs = []
for s in (1, -1):
    thigh = at(smooth(box('thigh', (0.3, 0.26, 0.45), 'body', 0.06)), (0, s * 0.38, -0.65))
    shin = at(smooth(box('shin', (0.26, 0.24, 0.45), 'trim', 0.05)), (0.04, s * 0.4, -1.0))
    foot = at(smooth(box('foot', (0.5, 0.34, 0.14), 'trim', 0.04)), (0.1, s * 0.4, -1.22))
    knee = at(ball('knee', 0.1, 'glow', 6, 4), (0.15, s * 0.4, -0.82))
    legs.append(part('leg_l' if s > 0 else 'leg_r', thigh, shin, foot, knee, pivot=(0, s * 0.38, -0.45)))
# Lift the titan so its feet stand on the floor (the arena hangs a model's centre at 0.9 of its radius).
RIG.location = (0, 0, 0.4)

step = 1.6
for i, l in enumerate(legs):
    sg = 1 if i == 0 else -1
    key(l, 'idle', [(0, {'rot': (0, 18 * sg, 0)}), (step / 2, {'rot': (0, -18 * sg, 0), 'loc': (0, 0, 0.08 * (i == 0))}), (step, {'rot': (0, 18 * sg, 0)})])
key(body, 'idle', [(0, {'loc': (0, 0, 0)}), (step / 4, {'loc': (0, 0, -0.06), 'rot': (3, 0, 0)}), (step / 2, {'loc': (0, 0, 0)}), (3 * step / 4, {'loc': (0, 0, -0.06), 'rot': (-3, 0, 0)}), (step, {'loc': (0, 0, 0)})])
for i, g in enumerate(guns): loop(g, step, rot=(0, 5, 6 * (1 if i else -1)), phase=0.25)
for i, g in enumerate(guns):
    key(g, 'attack', [(0, {}), (0.06, {'loc': (-0.15, 0, 0), 'rot': (0, -6, 0)}), (0.2, {'loc': (0, 0, 0)}), (0.26, {'loc': (-0.1, 0, 0)}), (0.6, {})])
key(body, 'attack', [(0, {}), (0.06, {'rot': (0, -4, 0), 'loc': (-0.05, 0, -0.03)}), (0.6, {})])
for l in legs: key(l, 'attack', [(0, {}), (0.6, {})])
burst_apart([body, *guns, *legs], dur=1.3, fling=1.8, rise=1.0)
export(__file__)
