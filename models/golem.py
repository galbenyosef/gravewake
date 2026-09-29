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


import random
rnd = random.Random(4)


def femur(a, b, r):
    """A long bone with knuckled ends, a to b."""
    a, b = Vector(a), Vector(b)
    return [tube('bone', [tuple(a), tuple(a.lerp(b, 0.5)), tuple(b)], [r, r * 0.75, r], 'body', 6),
            at(ball('end', r * 1.4, 'body', 8, 6), tuple(a)), at(ball('end', r * 1.4, 'body', 8, 6), tuple(b))]


def bundle(centre, size, n, r):
    """`n` long bones jammed together through a lump of `size` at `centre`, every which way."""
    c, out = Vector(centre), []
    for _ in range(n):
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 0.6))).normalized()
        off = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * size * 0.4
        out += femur(tuple(c + off - d * size * 0.7), tuple(c + off + d * size * 0.7), r)
    return out


# The body: a mass of bones and braincases melted into one lump round a hollow chest where the soul burns.
mass = [ball('core', 0.5, 'body', 12, 8)]
deform(mass[0], lambda v: Vector((v.x * 0.85 + 0.15 * v.z, v.y * 1.2, v.z * 0.95 + 0.12)))
mass += [at(ball('pate', 0.14, 'body', 8, 6), (d.x * 0.52, d.y * 0.6, d.z * 0.5 + 0.12), scale=(1.2, 1, 0.9)) for d in sphere_dirs(12, -0.3)]
mass.append(at(box('hips', (0.5, 0.8, 0.3), 'body', 0.1), (-0.05, 0, -0.35)))
torso = fuse('torso', *mass, voxel=0.04, keep=0.08)
carve(torso, at(ball('cut', 0.3, 'body', 10, 7), (0.5, 0, 0.3), scale=(1, 1.2, 1.2)))
rough(torso, 0.03, 6, 1)
cage = ribcage(0.5, 0.55, 4, (0.38, 0, 0.58), r=0.055)
soul = at(smooth(ball('soul', 0.17, 'glow', 10, 7)), (0.36, 0, 0.3))
spikes = [tube('spike', [(-0.42 - 0.04 * i, 0, 0.8 - 0.22 * i), (-0.62 - 0.05 * i, 0.03 * (i % 2), 0.98 - 0.22 * i), (-0.85 - 0.04 * i, 0, 1.0 - 0.22 * i)], [0.07, 0.045, 0.0], 'body', 5) for i in range(5)]
jut = bundle((0, 0, 0.2), 0.8, 6, 0.06)  # long bones rammed through it, ends sticking out
body = part('torso', torso, *jut, *cage, soul, *spikes)

skl = skull(0.42, (0.5, 0, 0.72), jaw=20, tilt=25)
horns = [tube('horn', [(0.45, s * 0.14, 0.9), (0.35, s * 0.36, 1.05), (0.12, s * 0.45, 1.05), (0.0, s * 0.35, 0.9)], [0.07, 0.06, 0.04, 0.0], 'trim', 6) for s in (1, -1)]
head = part('head', *skl, *horns, pivot=(0.4, 0, 0.6), parent=body)

arms = []
for s in (1, -1):
    sh, el, wr = (0.1, s * 0.72, 0.55), (0.3, s * 0.95, 0.0), (0.5, s * 0.9, -0.55)
    pieces = [at(ball('shoulder', 0.3, 'body', 10, 7), sh, scale=(1, 1, 0.8)),
              tube('upper', [sh, el], [0.18, 0.14], 'body', 8), tube('fore', [el, wr], [0.16, 0.2], 'body', 8),
              at(ball('fist', 0.24, 'body', 10, 7), (wr[0] + 0.05, wr[1], wr[2] - 0.12), scale=(1.15, 1, 0.9))]
    pieces += [at(ball('knuckle', 0.085, 'body', 6, 4), (wr[0] + 0.27, wr[1] + d * 0.1, wr[2] - 0.12)) for d in (-1.5, -0.5, 0.5, 1.5)]
    limb = fuse('arm', *pieces, voxel=0.035, keep=0.08)
    rough(limb, 0.025, 7, 3 + s)
    rune = at(torus('rune', 0.1, 0.02, 'glow', 10, 4), (el[0] + 0.14, el[1] + s * 0.06, el[2]), (0, 70, 0))
    arms.append(part('arm_l' if s > 0 else 'arm_r', limb, rune, *bundle(el, 0.45, 2, 0.045), *bundle(sh, 0.4, 2, 0.05), pivot=sh, parent=body))
legs = []
for s in (1, -1):
    limb = fuse('leg', tube('leg', [(-0.05, s * 0.32, -0.35), (0.1, s * 0.4, -0.65), (0.0, s * 0.4, -0.88)], [0.2, 0.17, 0.18], 'body', 8),
                at(box('foot', (0.42, 0.26, 0.12), 'body', 0.05), (0.08, s * 0.4, -0.9)), voxel=0.035, keep=0.08)
    rough(limb, 0.02, 7, 8)
    legs.append(part('leg_l' if s > 0 else 'leg_r', limb, pivot=(-0.05, s * 0.32, -0.35), parent=body))

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
