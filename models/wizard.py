# Wizard (the player): a hooded wanderer in a long ragged cloak, a tall hood that flops back to a point, two embers
# where a face should be, and a gnarled staff held out in front with witchfire caught in its claw. The staff jabs
# forward on every spell; the cloak breathes and drags; he folds to the ground when he falls.
from kit import *

# Cloak: a flared cone, hem torn into tatters, a little longer behind than in front.
cloak = lathe('cloak', [(0.52, -0.42), (0.46, -0.2), (0.36, 0.2), (0.3, 0.5), (0.3, 0.7), (0.0, 0.8)], 'cloth', 18)
deform(cloak, lambda v: Vector((v.x * (0.9 if v.x > 0 else 1.12), v.y, v.z - 0.1 * max(0, -v.x) * (v.z < 0))))
smooth(cloak)
cut(cloak, lambda c: not (c.z < -0.3 and (math.atan2(c.y, c.x) * 5 % 1.0) < 0.28))  # tatters in the hem
rough(cloak, 0.035, 6, 2)
mantle = lathe('mantle', [(0.0, 0.48), (0.4, 0.5), (0.44, 0.58), (0.3, 0.74), (0.0, 0.8)], 'cloth', 14)
deform(mantle, lambda v: Vector((v.x * 0.95, v.y * 1.15, v.z)))
smooth(mantle)
rough(mantle, 0.02, 8, 3)
belt = at(torus('belt', 0.4, 0.035, 'trim', 18, 4), (0.02, 0, 0.16), scale=(0.95, 1, 1))
clasp = at(smooth(ball('clasp', 0.06, 'trim', 8, 5)), (0.33, 0, 0.66))
satchel = at(smooth(box('satchel', (0.16, 0.12, 0.2), 'trim', 0.04)), (-0.05, -0.42, 0.1), (0, 0, 10))
# A torn cape dragging out behind him, so from above he is a wedge, not a stack of balls.
cape = [tube('cape', [(-0.2, y, 0.62), (-0.45, y * 1.25, 0.3), (-0.7, y * 1.35, -0.1), (-0.95, y * 1.2, -0.38)], [0.13, 0.12, 0.09, 0.02], 'cloth', 6) for y in (-0.22, 0.0, 0.22)]
for c in cape: rough(c, 0.03, 7, 4)
pauldrons = [at(ball('shoulder', 0.17, 'cloth', 10, 6), (-0.02, sd * 0.33, 0.66), scale=(1.1, 1.2, 0.55)) for sd in (1, -1)]
body = part('body', cloak, mantle, belt, clasp, satchel, *cape, *pauldrons)

# Hood: deep cowl, open at the front, the point flopping back.
hood = smooth(ball('hood', 0.27, 'cloth', 14, 10))
deform(hood, lambda v: Vector((v.x * 1.05 - 0.2 * max(0, v.z) - 0.1 * max(0, -v.x), v.y * 0.92, v.z * 1.15)))
cut(hood, lambda c: not (c.x > 0.12 and abs(c.y) < 0.15 and abs(c.z) < 0.14))
shell(hood, 0.04)
rough(hood, 0.015, 9, 4)
H = (0.04, 0, 0.98)
tip = at(tube('tip', [(-0.08, 0, 0.2), (-0.2, 0, 0.42), (-0.42, 0.02, 0.5), (-0.62, 0.03, 0.4)], [0.14, 0.1, 0.05, 0.0], 'cloth', 8), H)
void = at(smooth(ball('void', 0.19, 'trim', 10, 7)), (H[0] + 0.05, 0, H[2]))
eyes = [at(ball('ember', 0.028, 'glow', 6, 4), (H[0] + 0.2, s * 0.06, H[2] + 0.01), scale=(0.6, 1, 0.7)) for s in (1, -1)]
head = part('head', at(hood, H), tip, void, *eyes, pivot=H, parent=body)

# Staff arm: sleeve and hand, a gnarled staff forward-right, witchfire held in a claw of roots at its head.
sleeve = tube('sleeve', [(0.0, -0.3, 0.62), (0.2, -0.36, 0.42), (0.38, -0.3, 0.34)], [0.11, 0.1, 0.09], 'cloth', 8)
rough(sleeve, 0.015, 8, 5)
hand = at(smooth(ball('hand', 0.06, 'body', 8, 5)), (0.42, -0.3, 0.34))
staff = tube('staff', [(0.46, -0.3, -0.38), (0.44, -0.31, 0.1), (0.47, -0.29, 0.6), (0.44, -0.31, 1.05), (0.47, -0.3, 1.25)], [0.035, 0.04, 0.035, 0.04, 0.05], 'trim', 6)
rough(staff, 0.012, 12, 6)
claws = [tube('claw', [(0.47, -0.3, 1.2), (0.47 + math.cos(a) * 0.1, -0.3 + math.sin(a) * 0.1, 1.33), (0.47 + math.cos(a) * 0.06, -0.3 + math.sin(a) * 0.06, 1.45)], [0.025, 0.02, 0.0], 'trim', 4) for a in (0.3, 2.4, 4.4)]
fire = at(smooth(ball('witchfire', 0.1, 'glow', 10, 7)), (0.47, -0.3, 1.36), scale=(1, 1, 1.3))
arm = part('arm', sleeve, hand, staff, *claws, fire, pivot=(0.0, -0.3, 0.62), parent=body)
flame = part('flame', at(cone('tongue', 0.07, 0.0, 0.22, 'glow', 6), (0.47, -0.3, 1.4)), pivot=(0.47, -0.3, 1.36), parent=arm)

# Off hand: open, raised a little, palm glowing faintly (the other half of the spell).
sleeve2 = tube('sleeve2', [(0.0, 0.3, 0.62), (0.16, 0.38, 0.4), (0.3, 0.3, 0.36)], [0.11, 0.1, 0.09], 'cloth', 8)
rough(sleeve2, 0.015, 8, 7)
palm = at(ball('palm', 0.05, 'glow', 6, 4), (0.36, 0.28, 0.36))
off = part('off', sleeve2, palm, pivot=(0.0, 0.3, 0.62), parent=body)

loop(body, 2.4, rot=(2, 3, 0), loc=(0, 0, 0.02))
loop(head, 2.4, rot=(0, 4, 6), phase=0.2)
loop(arm, 2.4, rot=(0, -4, 0), phase=0.4)
loop(off, 2.4, rot=(6, 0, 0), phase=0.6)
loop(flame, 0.3, n=8, steps=4, scale=0.3)
# Attack (every spell): a short jab of the staff and a flare of the fire.
key(arm, 'attack', [(0, {}), (0.04, {'rot': (0, 14, 0), 'loc': (0.08, 0, 0)}), (0.14, {})])
key(flame, 'attack', [(0, {'scale': 1}), (0.04, {'scale': 1.8}), (0.14, {'scale': 1})])
key(off, 'attack', [(0, {}), (0.05, {'rot': (0, 10, 0)}), (0.14, {})])
crumble([body, head, arm, off], dur=1.2, floor=-0.45, scatter=0.2)
export(__file__)
