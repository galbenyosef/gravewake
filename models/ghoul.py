# Ghoul (the Lancer): a starved corpse that runs on its knuckles. A hunched, knobbed spine, a low jutting head with
# a split jaw, and arms far too long, ending in hooked claws. It crouches, rears back, and throws itself down a lane.
from kit import *

torso = tube('torso', [(-0.45, 0, -0.05), (-0.15, 0, 0.22), (0.2, 0, 0.3), (0.42, 0, 0.18)], [0.2, 0.26, 0.28, 0.2], 'body', 10)
deform(torso, lambda v: Vector((v.x, v.y * (1.15 if v.z < 0.2 else 1.0), v.z)))
smooth(torso)
rough(torso, 0.04, 5, 1)
spine = [at(cone('knob', 0.07, 0.0, 0.16, 'body', 5), (x, 0, z), (0, -25, 0)) for x, z in ((-0.35, 0.18), (-0.15, 0.44), (0.05, 0.53), (0.25, 0.5))]
ribs = [tube('rib', [(x, -0.24, 0.12), (x + 0.05, -0.28, 0.0), (x + 0.1, -0.2, -0.1)], 0.028, 'body', 4) for x in (-0.05, 0.08, 0.2)]
ribs += [tube('rib', [(x, 0.24, 0.12), (x + 0.05, 0.28, 0.0), (x + 0.1, 0.2, -0.1)], 0.028, 'body', 4) for x in (-0.05, 0.08, 0.2)]
rag = slab('rag', [(-0.3, -0.2), (0.1, -0.22), (0.05, 0.22), (-0.35, 0.18)], 0.03, 'trim', 0.01)
at(rag, (-0.42, 0, -0.12), (0, 70, 0))
rough(rag, 0.03, 8)
body = part('body', torso, *spine, *ribs, rag)

skl = skull(0.44, (0.62, 0, 0.14), jaw=30, tilt=30)
horns = [tube('tuft', [(0.5, s * 0.1, 0.3), (0.35, s * 0.18, 0.42), (0.18, s * 0.2, 0.44)], [0.03, 0.02, 0.0], 'trim', 4) for s in (1, -1)]
head = part('head', *skl, *horns, pivot=(0.45, 0, 0.18), parent=body)

arms = []
for s in (1, -1):
    sh, el, wr = (0.3, s * 0.28, 0.2), (0.55, s * 0.5, -0.2), (0.8, s * 0.42, -0.82)
    claws = [tube('claw', [wr, (wr[0] + 0.14, wr[1] + d * 0.06, -0.86), (wr[0] + 0.22, wr[1] + d * 0.08, -0.8)], [0.03, 0.02, 0.0], 'trim', 4) for d in (-1, 0, 1)]
    obs = [tube('upper', [sh, el], [0.09, 0.065], 'body', 6), tube('fore', [el, wr], [0.065, 0.05], 'body', 6),
           at(smooth(ball('elbow', 0.08, 'body', 6, 4)), el), *claws]
    arms.append(part('arm_l' if s > 0 else 'arm_r', *obs, pivot=sh, parent=body))
legs = []
for s in (1, -1):
    hip, kn, an = (-0.4, s * 0.18, -0.05), (-0.2, s * 0.3, -0.4), (-0.55, s * 0.28, -0.86)
    obs = [tube('thigh', [hip, kn], [0.1, 0.07], 'body', 6), tube('shin', [kn, an], [0.07, 0.05], 'body', 6),
           at(smooth(box('foot', (0.24, 0.09, 0.06), 'body', 0.02)), (an[0] + 0.08, an[1], -0.88))]
    legs.append(part('leg_l' if s > 0 else 'leg_r', *obs, pivot=hip, parent=body))

# Idle: a loping crouch, knuckles rolling forward in turn, head swinging low.
step = 0.7
for i, a in enumerate(arms): loop(a, step, phase=0.5 * i, rot=(0, 26, 0), loc=(0, 0, 0.05))
for i, l in enumerate(legs): loop(l, step, phase=0.5 * i + 0.25, rot=(0, -22, 0))
loop(body, step / 2, n=2, rot=(0, 3, 0), loc=(0, 0, 0.04))
loop(head, step * 2, rot=(12, 0, 16))
# Attack (the charge's telegraph): rear back, arms up and wide, then fling forward.
key(body, 'attack', [(0, {}), (0.3, {'rot': (0, -28, 0), 'loc': (-0.2, 0, 0.1)}), (0.55, {'rot': (0, 18, 0), 'loc': (0.25, 0, -0.05)}), (0.9, {})])
for i, a in enumerate(arms): key(a, 'attack', [(0, {}), (0.3, {'rot': ((1 if i == 0 else -1) * -40, -70, 0)}), (0.55, {'rot': (0, 40, 0)}), (0.9, {})])
key(head, 'attack', [(0, {}), (0.3, {'rot': (0, -30, 0)}), (0.9, {})])
for l in legs: key(l, 'attack', [(0, {}), (0.9, {})])
crumble([body, head, *arms, *legs], dur=1.0)
export(__file__)
