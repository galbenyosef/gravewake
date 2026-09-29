# Crawler (the Mite): a skull that walks on the bones of a hand. Six long finger-legs, knuckled and splayed like a
# spider's, carry it low and fast; its jaw chatters and it lunges when it gets close.
from kit import *

cranium = skull(1.0, (0.05, 0, -0.1), jaw=18)
body = part('skull', *cranium[:1], *cranium[1:2], *cranium[3:], pivot=(0, 0, -0.1))
jaw = part('jaw', cranium[2], pivot=(0.1, 0, -0.35), parent=body)

legs = []
for i, (a, reach) in enumerate(((35, 1.0), (90, 1.1), (145, 1.0), (-35, 1.0), (-90, 1.1), (-145, 1.0))):
    ang = math.radians(a)
    c, s = math.cos(ang), math.sin(ang)
    root = (c * 0.28, s * 0.32, -0.28)
    knuckle = (c * 0.62 * reach, s * 0.68 * reach, 0.05)
    tip = (c * 1.05 * reach, s * 1.05 * reach, -0.86)
    obs = [tube('finger', [root, knuckle], [0.075, 0.06], 'body', 6), tube('finger', [knuckle, tip], [0.06, 0.02], 'body', 6),
           at(smooth(ball('knuckle', 0.085, 'body', 6, 4)), knuckle)]
    legs.append(part(f'leg_{i}', *obs, pivot=root, parent=body))

# Skitter: legs step in two alternating tripods, the skull bobbing along.
step = 0.36
for i, l in enumerate(legs):
    ph = 0.0 if i in (0, 2, 4) else 0.5
    loop(l, step, n=3, steps=6, phase=ph, rot=(0, 0, 18), loc=(0, 0, 0.08))
key(body, 'idle', [(0, {}), (step / 2, {'loc': (0, 0, 0.05), 'rot': (0, 4, 0)}), (step, {}), (1.5 * step, {'loc': (0, 0, 0.05), 'rot': (0, -4, 0)}), (3 * step, {})])
loop(jaw, step, n=3, steps=4, rot=(0, -14, 0))

# Attack: rear up on the back legs and snap.
key(body, 'attack', [(0, {}), (0.12, {'rot': (0, -30, 0), 'loc': (-0.1, 0, 0.25)}), (0.24, {'rot': (0, 15, 0), 'loc': (0.4, 0, 0)}), (0.45, {})])
key(jaw, 'attack', [(0, {}), (0.12, {'rot': (0, -35, 0)}), (0.24, {'rot': (0, 10, 0)}), (0.45, {})])
for l in legs: key(l, 'attack', [(0, {}), (0.45, {})])
crumble([body, jaw, *legs], dur=0.8, floor=-0.9, scatter=0.5)
export(__file__)
