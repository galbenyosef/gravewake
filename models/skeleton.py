# Skeleton (the Drone): the dead's rank and file. A big-skulled, chunky-boned soldier in a rusted pauldron, dragging
# a notched sword. It shambles in step with no one, hacks overhead when it reaches you, and falls into a pile of bones.
from kit import *

# Chunky bones: at phone size a realistic bone is a pixel wide. These read.
B = 0.075

pelvis = at(smooth(box('pelvis', (0.22, 0.36, 0.16), 'body', 0.06)), (0, 0, -0.08))
spine_ribs = ribcage(0.3, 0.46, 4, (0.02, 0, 0.56), r=0.05)
collar = tube('collar', [(0.04, -0.3, 0.52), (0.1, 0, 0.58), (0.04, 0.3, 0.52)], B * 0.8, 'body', 6)
pauldron = at(smooth(ball('pauldron', 0.19, 'trim', 10, 6)), (-0.02, 0.3, 0.55), scale=(1.1, 1, 0.7))
rough(pauldron, 0.025, 7)
strap = tube('strap', [(-0.1, 0.3, 0.52), (-0.14, 0.05, 0.3), (-0.1, -0.22, 0.1)], 0.03, 'trim', 5)
rag = slab('rag', [(-0.14, -0.2), (0.16, -0.18), (0.18, 0.2), (0.02, 0.26), (-0.16, 0.2)], 0.03, 'trim', 0.01)
at(rag, (0.08, 0, -0.26), (0, 80, 0))
deform(rag, lambda v: Vector((v.x, v.y, v.z)))
rough(rag, 0.03, 9)
body = part('body', pelvis, *spine_ribs, collar, pauldron, strap, rag)

head = part('head', *skull(0.5, (0.08, 0, 0.84), jaw=12, tilt=25), tube('neck', [(0.0, 0, 0.62), (0.04, 0, 0.72)], B * 0.9, 'body', 6), pivot=(0.02, 0, 0.66), parent=body)

arms = []
for s in (1, -1):
    sh, el, ha = (-0.02, s * 0.3, 0.5), (0.02, s * 0.36, 0.18), (0.2, s * 0.3, 0.0)
    obs = [tube('upper', [sh, el], [B, B * 0.85], 'body', 6), tube('fore', [el, ha], [B * 0.85, B * 0.7], 'body', 6),
           at(smooth(ball('knob', B * 1.2, 'body', 6, 4)), el), at(smooth(box('hand', (0.12, 0.08, 0.12), 'body', 0.03)), ha)]
    if s < 0:  # the sword hand
        blade = slab('blade', [(0, -0.05), (0.62, -0.05), (0.78, 0.0), (0.62, 0.06), (0.34, 0.035), (0.3, 0.06), (0, 0.05)], 0.03, 'trim', 0.012)
        at(blade, (0.26, s * 0.3, 0.02), (90, -20, 0))
        guard = at(box('guard', (0.04, 0.24, 0.05), 'trim', 0.01), (0.22, s * 0.3, 0.0), (0, -20, 0))
        obs += [blade, guard]
    arms.append(part('arm_l' if s > 0 else 'arm_r', *obs, pivot=sh, parent=body))

legs = []
for s in (1, -1):
    hip, kn, an = (0, s * 0.14, -0.1), (0.05, s * 0.16, -0.5), (-0.02, s * 0.16, -0.84)
    obs = [tube('thigh', [hip, kn], [B * 1.05, B * 0.85], 'body', 6), tube('shin', [kn, an], [B * 0.85, B * 0.7], 'body', 6),
           at(smooth(ball('knee', B * 1.25, 'body', 6, 4)), kn), at(smooth(box('foot', (0.24, 0.1, 0.07), 'body', 0.03)), (an[0] + 0.07, an[1], -0.88))]
    legs.append(part('leg_l' if s > 0 else 'leg_r', *obs, pivot=hip, parent=body))

# A shamble: a lurching two-step walk, head lolling, the sword arm dragging.
step = 1.1
for i, l in enumerate(legs):
    sg = 1 if i == 0 else -1
    key(l, 'idle', [(0, {'rot': (0, 22 * sg, 0)}), (step / 2, {'rot': (0, -22 * sg, 0)}), (step, {'rot': (0, 22 * sg, 0)})])
key(body, 'idle', [(0, {'rot': (6, 8, 0)}), (step / 4, {'loc': (0, 0, 0.04)}), (step / 2, {'rot': (-6, 8, 0)}), (3 * step / 4, {'loc': (0, 0, 0.04)}), (step, {'rot': (6, 8, 0)})])
loop(head, step * 2, rot=(10, 6, 14))
loop(arms[0], step, rot=(0, -25, 0), phase=0.5)
loop(arms[1], step, rot=(4, 10, 0))

# Attack: the sword goes up over the shoulder and comes down.
key(arms[1], 'attack', [(0, {}), (0.18, {'rot': (-30, -130, 0)}), (0.3, {'rot': (10, 20, 0)}), (0.6, {})])
key(arms[0], 'attack', [(0, {}), (0.18, {'rot': (0, -40, 0)}), (0.6, {})])
key(body, 'attack', [(0, {}), (0.18, {'rot': (0, -12, 0)}), (0.3, {'rot': (0, 18, 0), 'loc': (0.12, 0, 0)}), (0.6, {})])
key(head, 'attack', [(0, {}), (0.3, {'rot': (0, 20, 0)}), (0.6, {})])
for l in legs: key(l, 'attack', [(0, {}), (0.6, {})])

crumble([body, head, *arms, *legs], dur=1.1)
export(__file__)
