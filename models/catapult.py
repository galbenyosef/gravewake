# Catapult (the Mortar): a siege engine the dead built out of the dead. A rotten timber frame on wheels of ribs,
# a throwing arm made of a giant's femur with a basket of skulls, and a grave-fire skull ready in the cup; it rocks
# back and hurls on every lob.
from kit import *

rails = [at(smooth(box('rail', (1.4, 0.12, 0.14), 'trim', 0.03)), (0, s * 0.42, -0.55)) for s in (1, -1)]
for r in rails: rough(r, 0.02, 6, 1)
crossbars = [at(box('bar', (0.12, 0.9, 0.1), 'trim', 0.02), (x, 0, -0.52)) for x in (-0.55, 0.0, 0.55)]
uprights = [tube('upright', [(0.05, s * 0.42, -0.5), (-0.05, s * 0.36, 0.25)], 0.07, 'trim', 6) for s in (1, -1)]
axle = tube('axle', [(-0.05, 0.42, 0.2), (-0.05, -0.42, 0.2)], 0.06, 'trim', 6)
skulls = [skull(0.2, (x, s * 0.52, -0.42)) for x in (-0.6, 0.62) for s in (1, -1)]
wheels = []
for x in (-0.48, 0.48):
    for s in (1, -1):
        ring = at(torus('wheel', 0.26, 0.05, 'body', 14, 5), (x, s * 0.55, -0.62), (90, 0, 0))
        spokes = [tube('spoke', [(x, s * 0.55, -0.62), (x + 0.24 * math.cos(a), s * 0.55, -0.62 + 0.24 * math.sin(a))], 0.022, 'body', 4) for a in (0, 1.05, 2.1, 3.14, 4.2, 5.25)]
        wheels += [ring, *spokes]
body = part('frame', *rails, *crossbars, *uprights, axle, *[o for sk in skulls for o in sk], *wheels)

# The arm: a femur on the axle, the basket at its end, loaded with a skull on fire.
femur = tube('femur', [(-0.05, 0, 0.2), (-0.45, 0, 0.45), (-0.9, 0, 0.62)], [0.08, 0.06, 0.07], 'body', 7)
knob = at(smooth(ball('knob', 0.13, 'body', 8, 6)), (-0.05, 0, 0.2), scale=(1, 1.6, 1))
cup = lathe('cup', [(0.0, -0.1), (0.2, -0.08), (0.26, 0.08), (0.22, 0.1), (0.16, -0.04), (0.0, -0.06)], 'trim', 10)
at(cup, (-0.95, 0, 0.68))
ammo = at(smooth(ball('ammo', 0.14, 'glow', 8, 6)), (-0.95, 0, 0.8))
arm = part('arm', femur, knob, cup, ammo, pivot=(-0.05, 0, 0.2), parent=body)

loop(body, 2.4, rot=(1.5, 1, 0))
loop(arm, 2.4, rot=(0, 3, 0), phase=0.25)
# Attack: rock back, swing the arm over the top.
key(arm, 'attack', [(0, {}), (0.2, {'rot': (0, 12, 0)}), (0.38, {'rot': (0, -150, 0)}), (0.6, {'rot': (0, -140, 0)}), (1.2, {})])
key(body, 'attack', [(0, {}), (0.2, {'rot': (0, -4, 0)}), (0.4, {'rot': (0, 6, 0), 'loc': (0.05, 0, 0)}), (1.2, {})])
burst_apart([body, arm], dur=0.9, fling=1.2, rise=0.5)
export(__file__)
