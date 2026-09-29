# Golem (the Colossus): a giant built of a whole graveyard's bones. A hunched mass of fused ribs and skulls round a
# caged soul that burns in its chest, a small horned skull sunk between mountainous shoulders, arms like trunks that
# end in fists of knuckle-bone, a spine of long vertebrae. It stomps you down and slams the ground; it falls apart
# into the corpses it was made of.
from kit import *


def cranium(s, loc, rot):
    """Just the braincase of a skull (the golem is packed with them)."""
    sk = skull(s)
    for o in sk[1:]: bpy.data.objects.remove(o, do_unlink=True)
    sk[0].location, sk[0].rotation_euler = loc, Euler([D(a) for a in rot])
    return sk[0]


core = smooth(ball('core', 0.55, 'body', 14, 10), 1)
deform(core, lambda v: Vector((v.x * 0.85 + 0.15 * v.z, v.y * 1.15, v.z * 0.95 + 0.1)))
rough(core, 0.08, 3, 1)
lumps = [cranium(0.3, (d.x * 0.55, d.y * 0.62, d.z * 0.55 + 0.12), (0, 0, math.degrees(math.atan2(d.y, d.x)))) for d in sphere_dirs(10, -0.3)]
cage = ribcage(0.5, 0.6, 4, (0.35, 0, 0.55), r=0.06)
soul = at(smooth(ball('soul', 0.2, 'glow', 10, 7)), (0.4, 0, 0.3))
spine = [at(smooth(box('vertebra', (0.16, 0.24, 0.12), 'body', 0.04)), (-0.45 - 0.05 * i, 0, 0.75 - 0.2 * i)) for i in range(5)]
spikes = [aim(cone('spine', 0.07, 0.0, 0.35, 'body', 5), (-1, 0, 0.6), (-0.52 - 0.05 * i, 0, 0.8 - 0.2 * i)) for i in range(5)]
hips = at(smooth(box('hips', (0.5, 0.8, 0.3), 'body', 0.1)), (-0.05, 0, -0.35))
rough(hips, 0.05, 4, 2)
body = part('torso', core, *lumps, *cage, soul, *spine, *spikes, hips)

skl = skull(0.42, (0.5, 0, 0.72), jaw=20, tilt=25)
horns = [tube('horn', [(0.45, s * 0.14, 0.9), (0.35, s * 0.36, 1.05), (0.12, s * 0.45, 1.05), (0.0, s * 0.35, 0.9)], [0.07, 0.06, 0.04, 0.0], 'trim', 6) for s in (1, -1)]
head = part('head', *skl, *horns, pivot=(0.4, 0, 0.6), parent=body)

arms = []
for s in (1, -1):
    sh, el, wr = (0.1, s * 0.72, 0.55), (0.3, s * 0.95, 0.0), (0.5, s * 0.9, -0.55)
    shoulder = at(smooth(ball('shoulder', 0.32, 'body', 10, 7)), sh, scale=(1, 1, 0.8))
    rough(shoulder, 0.05, 4, 3 + s)
    plate = [cranium(0.26, (sh[0] + 0.05, sh[1] + s * 0.1, sh[2] + 0.2), (0, 0, s * 70))]
    upper = tube('upper', [sh, el], [0.2, 0.16], 'body', 8)
    fore = tube('fore', [el, wr], [0.18, 0.2], 'body', 8)
    rough(upper, 0.04, 5, 5)
    rough(fore, 0.04, 5, 6)
    fist = at(smooth(ball('fist', 0.24, 'body', 10, 7)), (wr[0] + 0.05, wr[1], wr[2] - 0.12), scale=(1.1, 1, 0.9))
    rough(fist, 0.05, 6, 7)
    knuckles = [at(smooth(ball('knuckle', 0.08, 'body', 6, 4)), (wr[0] + 0.25, wr[1] + d * 0.1, wr[2] - 0.1)) for d in (-1.5, -0.5, 0.5, 1.5)]
    rune = at(torus('rune', 0.1, 0.02, 'glow', 10, 4), (el[0] + 0.12, el[1] + s * 0.05, el[2]), (0, 70, 0))
    arms.append(part('arm_l' if s > 0 else 'arm_r', shoulder, *plate, upper, fore, fist, *knuckles, rune, pivot=sh, parent=body))
legs = []
for s in (1, -1):
    obs = [tube('leg', [(-0.05, s * 0.32, -0.35), (0.1, s * 0.4, -0.65), (0.0, s * 0.4, -0.88)], [0.2, 0.17, 0.18], 'body', 8),
           at(smooth(box('foot', (0.42, 0.26, 0.12), 'body', 0.05)), (0.08, s * 0.4, -0.9))]
    for o in obs: rough(o, 0.03, 5, 8)
    legs.append(part('leg_l' if s > 0 else 'leg_r', *obs, pivot=(-0.05, s * 0.32, -0.35), parent=body))

step = 1.8
for i, l in enumerate(legs):
    sg = 1 if i == 0 else -1
    key(l, 'idle', [(0, {'rot': (0, 16 * sg, 0)}), (step / 2, {'rot': (0, -16 * sg, 0), 'loc': (0, 0, 0.06 * (i == 0))}), (step, {'rot': (0, 16 * sg, 0)})])
key(body, 'idle', [(0, {}), (step / 4, {'loc': (0, 0, -0.06), 'rot': (4, 0, 0)}), (step / 2, {}), (3 * step / 4, {'loc': (0, 0, -0.06), 'rot': (-4, 0, 0)}), (step, {})])
for i, a in enumerate(arms): loop(a, step, phase=0.5 * i, rot=(0, 14, 0))
loop(head, step * 2, rot=(6, 4, 10))
# Attack: both fists up and down onto the ground.
for a in arms: key(a, 'attack', [(0, {}), (0.25, {'rot': (0, -80, 0), 'loc': (0, 0, 0.2)}), (0.4, {'rot': (0, 30, 0)}), (0.8, {})])
key(body, 'attack', [(0, {}), (0.25, {'rot': (0, -10, 0), 'loc': (0, 0, 0.08)}), (0.4, {'rot': (0, 14, 0), 'loc': (0, 0, -0.1)}), (0.8, {})])
key(head, 'attack', [(0, {}), (0.4, {'rot': (0, 20, 0)}), (0.8, {})])
for l in legs: key(l, 'attack', [(0, {}), (0.8, {})])
crumble([body, head, *arms, *legs], dur=1.6, scatter=0.8)
export(__file__)
