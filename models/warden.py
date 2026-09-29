# Warden (the Bulwark): a dead knight that guards the graves. Rusted plate over bone, a horned great-helm with a
# slit of soulfire, and for a shield the lid of its own coffin, iron-bound and carved with a burning sigil. It walks
# you down behind the lid and bashes with it. Its front is armoured: get round the back.
from kit import *

pelvis = at(smooth(box('pelvis', (0.34, 0.5, 0.2), 'trim', 0.06)), (0, 0, -0.1))
cuirass = smooth(lathe('cuirass', [(0.0, 0.0), (0.34, 0.02), (0.42, 0.3), (0.46, 0.52), (0.3, 0.66), (0.0, 0.7)], 'trim', 12))
deform(cuirass, lambda v: Vector((v.x * 0.8, v.y * 1.1, v.z)))
rough(cuirass, 0.02, 6, 1)
ribs = ribcage(0.34, 0.3, 3, (0.1, 0, 0.3), r=0.04)
tabard = slab('tabard', [(-0.18, 0), (0.18, 0), (0.22, -0.55), (0.1, -0.6), (0, -0.52), (-0.1, -0.62), (-0.22, -0.55)], 0.03, 'cloth', 0.01)
at(tabard, (0.3, 0, 0.0), (90, 0, 90))
rough(tabard, 0.03, 7)
body = part('body', pelvis, cuirass, *ribs, tabard)

helm = smooth(lathe('helm', [(0.0, -0.18), (0.22, -0.16), (0.26, 0.05), (0.22, 0.22), (0.0, 0.3)], 'trim', 12))
slit = at(box('slit', (0.04, 0.24, 0.035), 'glow', 0.01), (0.25, 0, 0.02))
horns = [tube('horn', [(0.0, s * 0.2, 0.12), (-0.05, s * 0.42, 0.22), (-0.2, s * 0.52, 0.45), (-0.38, s * 0.48, 0.55)], [0.07, 0.06, 0.04, 0.0], 'body', 6) for s in (1, -1)]
head = part('head', at(helm, (0.05, 0, 0.9)), at(slit, (0.3, 0, 0.92)), *[at(h, (0.05, 0, 0.9)) for h in horns], pivot=(0.05, 0, 0.72), parent=body)

pauldrons = []
for s in (1, -1):
    pd = smooth(ball('pauldron', 0.24, 'trim', 10, 6))
    deform(pd, lambda v: Vector((v.x, v.y, v.z * 0.6)))
    spikes = [aim(cone('spike', 0.05, 0.0, 0.25, 'body', 5), (dx, s * 0.6, 1), (dx * 0.2, s * 0.4, 0.66)) for dx in (-0.4, 0.2)]
    pauldrons += [at(pd, (0, s * 0.42, 0.62)), *spikes]
arm_obs = pauldrons + [tube('arm', [(0.0, -0.44, 0.55), (0.1, -0.5, 0.2), (0.3, -0.4, 0.05)], [0.1, 0.09, 0.08], 'trim', 6)]
# The coffin lid: a long six-sided board on the left arm, iron straps, a sigil that burns.
lid = slab('lid', [(-0.8, 0.0), (-0.5, 0.32), (0.55, 0.26), (0.85, 0.0), (0.55, -0.26), (-0.5, -0.32)], 0.08, 'body', 0.025)
deform(lid, lambda v: Vector((v.z, v.y, v.x)))  # stand it up, facing +X
rough(lid, 0.02, 6, 3)
straps = [at(box('strap', (0.1, 0.62, 0.05), 'trim', 0.01), (0.05, 0, z)) for z in (-0.45, 0.5)]
sigil = at(torus('sigil', 0.15, 0.025, 'glow', 14, 4), (0.07, 0, 0.1), (0, 90, 0))
sigil_bar = at(box('sigil_bar', (0.02, 0.03, 0.4), 'glow', 0.005), (0.075, 0, 0.1))
shield = part('shield', *[at(o, (0.52, 0.12, 0.2)) for o in (lid, *straps, sigil, sigil_bar)], tube('grip', [(0.0, 0.44, 0.55), (0.25, 0.4, 0.3)], [0.1, 0.09], 'trim', 6), pivot=(0.0, 0.44, 0.55), parent=body)
arm = part('arm', *arm_obs, pivot=(0, 0, 0.6), parent=body)
legs = []
for s in (1, -1):
    obs = [tube('leg', [(0, s * 0.16, -0.12), (0.06, s * 0.18, -0.5), (0, s * 0.18, -0.84)], [0.11, 0.1, 0.09], 'trim', 6),
           at(smooth(box('boot', (0.3, 0.14, 0.1), 'trim', 0.03)), (0.08, s * 0.18, -0.86))]
    legs.append(part('leg_l' if s > 0 else 'leg_r', *obs, pivot=(0, s * 0.16, -0.12), parent=body))

step = 1.6
for i, l in enumerate(legs):
    sg = 1 if i == 0 else -1
    key(l, 'idle', [(0, {'rot': (0, 14 * sg, 0)}), (step / 2, {'rot': (0, -14 * sg, 0)}), (step, {'rot': (0, 14 * sg, 0)})])
key(body, 'idle', [(0, {}), (step / 4, {'loc': (0, 0, -0.04), 'rot': (3, 0, 0)}), (step / 2, {}), (3 * step / 4, {'loc': (0, 0, -0.04), 'rot': (-3, 0, 0)}), (step, {})])
loop(head, step * 2, rot=(0, 3, 8))
loop(shield, step, rot=(2, 0, 0))
loop(arm, step, rot=(0, 5, 0), phase=0.5)
# Attack: shield bash.
key(shield, 'attack', [(0, {}), (0.15, {'loc': (-0.1, 0, 0)}), (0.28, {'loc': (0.3, 0, 0), 'rot': (0, 8, 0)}), (0.6, {})])
key(body, 'attack', [(0, {}), (0.15, {'rot': (0, -5, 0)}), (0.28, {'loc': (0.12, 0, 0), 'rot': (0, 8, 0)}), (0.6, {})])
for p in (head, arm, *legs): key(p, 'attack', [(0, {}), (0.6, {})])
crumble([body, head, shield, arm, *legs], dur=1.2)
export(__file__)
