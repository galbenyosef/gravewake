# Banshee (the Wasp): a drowned woman's ghost, circling. No legs: a torn gown that thins to streamers, long hair
# blown straight back, bone-thin arms held wide, and a mouth that glows when she screams a bolt at you.
from kit import *

gown = lathe('gown', [(0.0, -0.85), (0.16, -0.7), (0.3, -0.35), (0.3, 0.0), (0.22, 0.3), (0.18, 0.45), (0.0, 0.5)], 'body', 14)
deform(gown, lambda v: Vector((v.x - 0.35 * max(0, -v.z) ** 1.3, v.y * (1 + 0.3 * max(0, -v.z)), v.z)))  # trails behind
smooth(gown)
cut(gown, lambda c: not (c.z < -0.45 and (math.atan2(c.y, c.x + 0.4) * 4 % 1.0) < 0.35))
rough(gown, 0.04, 5, 2)
streamers = [tube('streamer', [(-0.3, s * 0.15, -0.5), (-0.7, s * 0.25, -0.6), (-1.05, s * 0.2, -0.55), (-1.35, s * 0.3, -0.62)], [0.08, 0.06, 0.03, 0.0], 'body', 5) for s in (1, 0, -1)]
chest = tube('chest', [(0.0, 0, 0.1), (0.02, 0, 0.42)], [0.16, 0.12], 'body', 8)
collar = ribcage(0.2, 0.22, 3, (0.04, 0, 0.42), r=0.022)
body = part('body', gown, *streamers, chest, *collar)

skl = skull(0.36, (0.1, 0, 0.66), jaw=40, tilt=25)
skl[2].scale = skl[3].scale = (0.8, 1.3, 1.2)  # wide, staring eyes
mouth = at(ball('wail', 0.07, 'glow', 8, 5), (0.2, 0, 0.5), scale=(0.5, 1, 1.4))
hair = [tube('hair', [(-0.02, y, 0.8), (-0.3, y * 1.4, 0.82), (-0.65, y * 1.8, 0.72), (-1.0, y * 2.0, 0.62)], [0.07, 0.06, 0.04, 0.0], 'trim', 5) for y in (-0.12, -0.05, 0.02, 0.09, 0.15)]
head = part('head', *skl, mouth, *hair, pivot=(0.04, 0, 0.5), parent=body)

arms = []
for s in (1, -1):
    sh, el, ha = (0.02, s * 0.2, 0.4), (0.12, s * 0.55, 0.45), (0.35, s * 0.8, 0.4)
    fingers = [tube('finger', [ha, (ha[0] + 0.14, ha[1] + s * 0.04 * d, ha[2] - 0.04)], [0.018, 0.0], 'body', 4) for d in (-1, 0, 1, 2)]
    sleeve = slab('sleeve', [(0, 0), (0.35, 0.02), (0.3, -0.25), (0.05, -0.3)], 0.02, 'body', 0.008)
    at(sleeve, (0.05, s * 0.4, 0.42), (90 if s > 0 else -90, 0, 0))
    rough(sleeve, 0.03, 9)
    obs = [tube('upper', [sh, el], 0.04, 'body', 5), tube('fore', [el, ha], [0.035, 0.03], 'body', 5), sleeve, *fingers]
    arms.append(part('arm_l' if s > 0 else 'arm_r', *obs, pivot=sh, parent=body))

loop(body, 2.2, loc=(0, 0, 0.1), rot=(5, 4, 0))
loop(head, 2.2, rot=(8, 6, 10), phase=0.3)
for i, a in enumerate(arms): loop(a, 1.1, n=2, phase=i * 0.5, rot=((1 if i == 0 else -1) * 12, 8, 0))
# Attack (the scream): head thrown back, arms flung forward, mouth wide.
key(head, 'attack', [(0, {'scale': 1}), (0.1, {'rot': (0, -25, 0), 'scale': 1.15}), (0.35, {'rot': (0, -10, 0), 'scale': 1.1}), (0.6, {'scale': 1})])
for i, a in enumerate(arms): key(a, 'attack', [(0, {}), (0.12, {'rot': (0, 0, (1 if i == 0 else -1) * -50)}), (0.6, {})])
key(body, 'attack', [(0, {}), (0.12, {'loc': (-0.1, 0, 0.1)}), (0.6, {})])
crumble([body, head, *arms], dur=1.0, floor=-0.9)
export(__file__)
