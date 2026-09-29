# Lich (the Seraph): a dead king who would not stop. Floating in heavy robes of state that fray to smoke, a gaunt
# crowned skull with burning sockets, a phylactery blazing in its open ribcage, and six spectral blades turning in a
# ring behind it, like wings. Its hands are raised; when it casts the blades flare and the phylactery flares.
from kit import *

robe = lathe('robe', [(0.0, -0.95), (0.35, -0.8), (0.5, -0.45), (0.46, -0.05), (0.4, 0.3), (0.0, 0.36)], 'body', 18)
deform(robe, lambda v: Vector((v.x - 0.2 * max(0, -v.z) ** 1.3, v.y, v.z)))
smooth(robe)
cut(robe, lambda c: not (c.z < -0.6 and (math.atan2(c.y, c.x + 0.2) * 7 % 1.0) < 0.35))
rough(robe, 0.04, 5, 1)
tabard = slab('tabard', [(-0.14, 0.0), (0.14, 0.0), (0.18, -0.7), (0.0, -0.85), (-0.18, -0.7)], 0.03, 'trim', 0.01)
at(tabard, (0.43, 0, 0.22), (90, 0, 90))
mantle = smooth(lathe('mantle', [(0.0, 0.22), (0.56, 0.26), (0.6, 0.36), (0.36, 0.52), (0.0, 0.56)], 'trim', 16))
rough(mantle, 0.02, 7, 2)
ribs = ribcage(0.26, 0.32, 3, (0.2, 0, 0.62), r=0.035)
phyl = at(smooth(ball('phylactery', 0.13, 'glow', 10, 7)), (0.22, 0, 0.44), scale=(0.8, 0.8, 1.2))
body = part('body', robe, tabard, mantle, *ribs, phyl)

skl = skull(0.44, (0.14, 0, 0.92), jaw=14)
crown_base = at(torus('crown', 0.19, 0.035, 'trim', 16, 4), (0.08, 0, 1.08), (0, -12, 0))
spikes = [aim(cone('spike', 0.04, 0.0, 0.3 if i % 2 == 0 else 0.2, 'trim', 4), (math.cos(a) * 0.35, math.sin(a) * 0.35, 1), (0.08 + math.cos(a) * 0.19, math.sin(a) * 0.19, 1.1)) for i, a in enumerate(i / 8 * math.tau for i in range(8))]
jewel = at(ball('jewel', 0.035, 'glow', 6, 4), (0.27, 0, 1.12))
head = part('head', *skl, crown_base, *spikes, jewel, pivot=(0.12, 0, 0.72), parent=body)

hands = []
for s in (1, -1):
    sleeve = tube('sleeve', [(0.1, s * 0.42, 0.42), (0.25, s * 0.62, 0.55), (0.35, s * 0.68, 0.75)], [0.13, 0.12, 0.1], 'body', 8)
    rough(sleeve, 0.02, 8, 3 + s)
    fingers = [tube('finger', [(0.36, s * 0.68, 0.8), (0.4 + 0.03 * d, s * (0.68 + 0.04 * d), 0.98)], [0.02, 0.0], 'body', 4) for d in (-1, 0, 1, 2)]
    orb = at(smooth(ball('orb', 0.08, 'glow', 8, 6)), (0.42, s * 0.7, 1.02))
    hands.append(part('hand_l' if s > 0 else 'hand_r', sleeve, *fingers, orb, pivot=(0.1, s * 0.42, 0.42), parent=body))

ring = part('ring', at(torus('halo', 0.6, 0.03, 'glow', 32, 4), (0, 0, 0.5)), pivot=(0, 0, 0.5), parent=body)
blades = []
for i in range(6):
    a = i / 6 * math.tau + math.pi / 6
    blade = slab('blade', [(0.0, -0.1), (0.45, -0.13), (1.0, -0.02), (0.55, 0.1), (0.0, 0.1)], 0.05, 'body', 0.018)
    edge = slab('edge', [(0.2, 0.08), (0.55, 0.1), (1.0, -0.02), (0.55, 0.13), (0.2, 0.12)], 0.06, 'glow', 0.01)
    spot = (math.cos(a) * 0.6, math.sin(a) * 0.6, 0.5)
    for o in (blade, edge): at(o, spot, (0, -14, math.degrees(a)))  # tipped up a little
    blades.append(part(f'blade_{i}', blade, edge, pivot=spot, parent=ring))
RIG.location = (0, 0, 0.15)

loop(body, 3.0, n=2, loc=(0, 0, 0.08), rot=(3, 2, 0))
loop(head, 3.0, rot=(0, 4, 8), phase=0.25)
for i, h in enumerate(hands): loop(h, 1.5, n=2, phase=i * 0.5, rot=((1 if i == 0 else -1) * 8, 6, 0))
spin(ring, 'idle', 6.0, 1)
for i, b in enumerate(blades): loop(b, 3.0, n=2, phase=i / 6, scale=0.08)
# Attack: arms thrown up, the ring whirls, the blades flare wide.
for i, h in enumerate(hands): key(h, 'attack', [(0, {}), (0.15, {'rot': ((1 if i == 0 else -1) * -25, -30, 0), 'loc': (0, 0, 0.15)}), (0.6, {'rot': ((1 if i == 0 else -1) * -15, -20, 0)}), (1.0, {})])
key(head, 'attack', [(0, {}), (0.15, {'rot': (0, -18, 0)}), (1.0, {})])
key(body, 'attack', [(0, {'scale': 1}), (0.15, {'scale': 1.06, 'loc': (0, 0, 0.12)}), (1.0, {'scale': 1})])
spin(ring, 'attack', 1.0, 1)
for b in blades: key(b, 'attack', [(0, {'scale': 1}), (0.15, {'scale': 1.35}), (0.6, {'scale': 1.2}), (1.0, {'scale': 1})])
crumble([body, head, *hands, ring, *blades], dur=1.6, floor=-1.0, scatter=0.6)
export(__file__)
