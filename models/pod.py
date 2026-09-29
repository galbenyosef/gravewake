# Pod (the Drone): the swarm's rank and file. A squat helmet-bot with one big eye, a crest fin and two thruster ears.
from kit import *

shell = smooth(lathe('shell', [(0, -0.4), (0.42, -0.42), (0.72, -0.22), (0.8, 0.05), (0.68, 0.34), (0.38, 0.52), (0, 0.56)], seg=14))
deform(shell, lambda v: Vector((v.x * (1.08 if v.x > 0 else 0.95), v.y, v.z)))
band = torus('band', 0.8, 0.07, 'trim', seg=20)
at(band, (0, 0, 0.02))
crest = slab('crest', [(-0.55, 0), (0.25, 0), (0.05, 0.22), (-0.7, 0.3)], 0.1, 'trim', 0.03)
at(crest, (0, 0, 0.45), (90, 0, 0))
socket = torus('socket', 0.3, 0.07, 'trim', seg=16)
at(socket, (0.74, 0, 0.08), (0, 90, 0))
jet = cone('jet', 0.28, 0.16, 0.12, 'glow', 12)
at(jet, (0, 0, -0.52))
body = part('shell', shell, band, crest, socket, jet)

eye = part('eye', at(ball('eye', 0.27, 'glow', 12, 8), (0.76, 0, 0.08), scale=(0.7, 1, 1)), pivot=(0.76, 0, 0.08), parent=body)

pods = []
for side in (1, -1):
    pod = smooth(lathe('pod', [(0, -0.3), (0.16, -0.24), (0.18, 0.1), (0.1, 0.25), (0, 0.27)], 'trim', 10))
    at(pod, (0, side * 0.86, 0), (0, 0, 0))
    nozzle = at(cone('nozzle', 0.13, 0.09, 0.08, 'glow', 10), (0, side * 0.86, -0.36))
    arm = at(box('arm', (0.18, 0.2, 0.1), 'body'), (0, side * 0.72, 0))
    pods.append(part('pod_l' if side > 0 else 'pod_r', pod, nozzle, arm, pivot=(0, side * 0.7, 0), parent=body))

loop(body, 2, rot=(6, 4, 0), loc=(0, 0, 0.05))
loop(eye, 1, n=2, scale=0.12)
for i, p in enumerate(pods): loop(p, 2, rot=(18 * (1 if i else -1), 0, 0))

key(body, 'attack', [(0, {}), (0.12, {'loc': (-0.15, 0, 0.05), 'rot': (0, -12, 0)}), (0.26, {'loc': (0.4, 0, -0.05), 'rot': (0, 18, 0)}), (0.5, {})])
key(eye, 'attack', [(0, {'scale': 1}), (0.2, {'scale': 1.5}), (0.5, {'scale': 1})])
burst_apart([body, eye, *pods])
export(__file__)
