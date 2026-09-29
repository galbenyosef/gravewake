# Bastion (the Bulwark): a shield-wall golem. Hunched armoured torso, a tower shield with a glowing sigil, spiked
# pauldrons, a visor slit, tread feet. It never rams: it braces.
from kit import *

torso = smooth(box('torso', (0.8, 1.0, 0.8), 'body', 0.12))
deform(torso, lambda v: Vector((v.x - 0.15 * v.z, v.y * (1 - 0.25 * v.z), v.z)))
belly = at(box('belly', (0.5, 0.7, 0.25), 'trim', 0.05), (0.05, 0, -0.35))
head = at(smooth(box('head', (0.36, 0.34, 0.26), 'trim', 0.06)), (0.18, 0, 0.45))
visor = at(box('visor', (0.05, 0.26, 0.05), 'glow', 0.01), (0.37, 0, 0.47))
feet = [at(smooth(box('foot', (0.75, 0.3, 0.25), 'trim', 0.06)), (0, s * 0.4, -0.5)) for s in (1, -1)]
core = at(smooth(ball('core', 0.13, 'glow', 8, 6)), (-0.42, 0, 0.1))
body = part('torso', torso, belly, head, visor, *feet, core)

sh = slab('shield', [(-0.9, -0.55), (0.9, -0.55), (1.0, 0), (0.9, 0.55), (-0.9, 0.55), (-1.05, 0)], 0.16, 'trim', 0.05)
at(sh, (0.62, 0, 0.0), (0, 90, 0), (0.7, 1.0, 1))
face = slab('face', [(-0.75, -0.42), (0.75, -0.42), (0.85, 0), (0.75, 0.42), (-0.75, 0.42), (-0.88, 0)], 0.1, 'body', 0.04)
at(face, (0.7, 0, 0.0), (0, 90, 0), (0.7, 1.0, 1))
sigil = slab('sigil', [(0, -0.2), (0.12, 0), (0, 0.2), (-0.12, 0)], 0.06, 'glow', 0.01)
at(sigil, (0.76, 0, 0.05), (0, 90, 0), (1.2, 1.2, 1))
studs = [at(ball('stud', 0.05, 'trim', 6, 4), (0.75, y, z)) for y in (-0.5, 0.5) for z in (-0.45, 0.45)]
shield = part('shield', sh, face, sigil, *studs, pivot=(0.4, 0, -0.2), parent=body)
# Curve the shield round the golem.
deform(shield, lambda v: Vector((v.x - 0.35 * v.y * v.y, v.y * 1.05, v.z)))

paus = []
for s in (1, -1):
    dome = smooth(lathe('pau', [(0, -0.05), (0.32, -0.05), (0.34, 0.1), (0.22, 0.25), (0, 0.3)], 'trim', 10))
    at(dome, (-0.05, s * 0.52, 0.28), scale=(1.1, 1, 1))
    spikes = [aim(cone('spk', 0.06, 0.0, 0.28, 'body', 5), (dx, s * 0.6, 1), (-0.05 + dx * 0.15, s * 0.6, 0.45)) for dx in (-0.5, 0.4)]
    paus.append(part('pauldron_l' if s > 0 else 'pauldron_r', dome, *spikes, pivot=(-0.05, s * 0.4, 0.28), parent=body))

loop(body, 1.8, rot=(0, 3, 0), loc=(0, 0, 0.03))
loop(shield, 1.8, rot=(0, 2, 0), loc=(0.02, 0, 0), phase=0.2)
for i, p in enumerate(paus): loop(p, 1.8, loc=(0, 0, 0.04), rot=(5 * (1 if i else -1), 0, 0), phase=0.1)
key(shield, 'attack', [(0, {}), (0.18, {'loc': (-0.15, 0, 0.05), 'rot': (0, -8, 0)}), (0.3, {'loc': (0.35, 0, 0), 'rot': (0, 6, 0)}), (0.7, {})])
key(body, 'attack', [(0, {}), (0.18, {'rot': (0, -6, 0)}), (0.3, {'rot': (0, 8, 0), 'loc': (0.1, 0, 0)}), (0.7, {})])
burst_apart([body, shield, *paus], dur=0.8)
export(__file__)
