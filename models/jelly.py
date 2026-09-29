# Jelly (the Mender): a medic jellyfish. Scalloped bell, a glowing cross on its crown, a spinning halo, trailing
# ribbon tendrils. It pumps when it mends.
from kit import *

bell = smooth(lathe('bell', [(0.0, 0.05), (0.55, 0.0), (0.72, 0.05), (0.66, 0.3), (0.45, 0.52), (0, 0.6)], 'body', 16))
deform(bell, lambda v: Vector((v.x, v.y, v.z - (0.08 * (1 + math.cos(8 * math.atan2(v.y, v.x))) if v.z < 0.12 and v.length > 0.4 else 0))))
inner = at(smooth(lathe('inner', [(0, -0.05), (0.42, -0.02), (0.35, 0.2), (0, 0.3)], 'glow', 12)), (0, 0, -0.05))
arm1 = at(box('crossa', (0.36, 0.1, 0.06), 'glow', 0.02), (0, 0, 0.6))
arm2 = at(box('crossb', (0.1, 0.36, 0.06), 'glow', 0.02), (0, 0, 0.6))
body = part('bell', bell, inner, arm1, arm2)

halo = part('halo', at(torus('halo', 0.42, 0.045, 'glow', 24, 5), (0, 0, 0.85), (12, 0, 0)), pivot=(0, 0, 0.85), parent=body)

ribbons = []
for i in range(6):
    a = i / 6 * math.tau + math.pi / 6
    r = slab('ribbon', [(0, -0.07), (-0.7, -0.05), (-0.95, 0), (-0.7, 0.05), (0, 0.07)], 0.035, 'trim' if i % 2 else 'body', 0.012)
    deform(r, lambda v: Vector((v.x, v.y + 0.1 * math.sin(v.x * 6), v.z)))
    at(r, (math.cos(a) * 0.45, math.sin(a) * 0.45, -0.05), (0, 18, math.degrees(a) + 180))
    ribbons.append(part(f'ribbon_{i}', r, pivot=(math.cos(a) * 0.45, math.sin(a) * 0.45, -0.05), parent=body))

key(body, 'idle', [(0, {'scale': 1, 'loc': (0, 0, 0)}), (0.4, {'scale': (1.08, 1.08, 0.88), 'loc': (0, 0, -0.03)}), (0.8, {'scale': (0.95, 0.95, 1.1), 'loc': (0, 0, 0.06)}), (1.6, {'scale': 1, 'loc': (0, 0, 0)})])
spin(halo, 'idle', 1.6, 1)
for i, r in enumerate(ribbons): loop(r, 0.8, n=2, phase=i / 6, rot=(8, 14, 10))
key(body, 'attack', [(0, {'scale': 1}), (0.15, {'scale': (1.2, 1.2, 0.8)}), (0.35, {'scale': (0.9, 0.9, 1.2)}), (0.7, {'scale': 1})])
key(halo, 'attack', [(0, {'scale': 1}), (0.25, {'scale': 1.7, 'loc': (0, 0, 0.1)}), (0.7, {'scale': 1})])
burst_apart([body, halo, *ribbons])
export(__file__)
