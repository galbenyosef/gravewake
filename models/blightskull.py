# Blightskull (the Bomber): a great skull adrift in its own grave-fire. Horns curling back, a cracked brow leaking
# light, tongues of soulfire streaming behind it as it rushes you; it swells and splits when it gets close, and
# bursts in a shower of bone.
from kit import *

skl = skull(1.15, (0.05, 0, 0.0), jaw=22)
cracks = [tube('crack', [(0.1, y, 0.45), (0.0, y * 1.2, 0.33), (-0.08, y, 0.2)], 0.02, 'glow', 4) for y in (-0.12, 0.1)]
horns = [tube('horn', [(-0.05, s * 0.36, 0.18), (-0.2, s * 0.62, 0.32), (-0.48, s * 0.66, 0.22), (-0.58, s * 0.5, 0.0)], [0.12, 0.09, 0.05, 0.0], 'trim', 7) for s in (1, -1)]
body = part('skull', *skl[:2], *skl[3:], *cracks, *horns)
jaw = part('jaw', skl[2], pivot=(0.15, 0, -0.35), parent=body)
flames = []
for i, (y, z, ln) in enumerate(((0, 0.3, 1.2), (0.3, 0.1, 0.9), (-0.3, 0.1, 0.9), (0.18, -0.2, 0.8), (-0.18, -0.2, 0.8))):
    t = tube('flame', [(-0.3, y, z), (-0.3 - ln * 0.4, y * 1.2, z + 0.12), (-0.3 - ln * 0.8, y * 1.1, z + 0.05), (-0.3 - ln, y, z + 0.15)], [0.22, 0.15, 0.07, 0.0], 'glow', 6)
    flames.append(part(f'flame_{i}', t, pivot=(-0.3, y, z), parent=body))
# It floats: lift the whole thing off the ground.
RIG.location = (0, 0, 0.1)

loop(body, 1.2, loc=(0, 0, 0.08), rot=(0, 5, 6))
loop(jaw, 0.6, n=2, rot=(0, -10, 0))
for i, f in enumerate(flames): loop(f, 0.4, n=3, steps=4, phase=i * 0.21, rot=(10, 12, 14), scale=0.15)
# Attack (close): swell, split the jaw, flames roar.
key(body, 'attack', [(0, {'scale': 1}), (0.25, {'scale': 1.3, 'rot': (0, -10, 0)}), (0.5, {'scale': 1.2}), (0.7, {'scale': 1})])
key(jaw, 'attack', [(0, {}), (0.25, {'rot': (0, -40, 0)}), (0.7, {})])
for f in flames: key(f, 'attack', [(0, {'scale': 1}), (0.25, {'scale': 1.6}), (0.7, {'scale': 1})])
burst_apart([body, jaw, *flames], dur=0.6, fling=1.8, rise=0.4)
export(__file__)
