# Rail (the Sniper): a tripod railgun. A long barrel with glowing coils and a muzzle brake, a scope, capacitor fins,
# three splayed legs. The barrel slams back on the shot.
from kit import *

hub = smooth(box('hub', (0.8, 0.6, 0.42), 'body', 0.1))
deform(hub, lambda v: Vector((v.x, v.y * (1 - 0.3 * v.x), v.z)))
legs = []
for a in (60, 180, 300):
    r = math.radians(a)
    legs.append(aim(cone('leg', 0.09, 0.04, 0.9, 'trim', 6), (math.cos(r), math.sin(r), -0.9), (math.cos(r) * 0.1, math.sin(r) * 0.1, -0.1)))
fins = [at(slab('fin', [(0, 0), (0.45, 0), (0.3, 0.45), (-0.1, 0.5)], 0.07, 'body', 0.025), (-0.3, s * 0.15, 0.12), (90 - s * 30, 0, 180)) for s in (1, -1)]
cells = [at(box('cell', (0.1, 0.34, 0.12), 'glow', 0.02), (-0.28, 0, 0.0))]
scope = at(cone('scope', 0.07, 0.07, 0.4, 'trim', 8, 0.01), (-0.05, 0, 0.26), (0, 90, 0))
lens = at(ball('lens', 0.06, 'glow', 8, 5), (0.36, 0, 0.26), scale=(0.4, 1, 1))
body = part('hub', hub, *legs, *fins, *cells, scope, lens)

tube = at(cone('tube', 0.1, 0.08, 1.55, 'trim', 8), (0.2, 0, 0.05), (0, 90, 0))
brake = at(smooth(box('brake', (0.2, 0.18, 0.14), 'trim', 0.03)), (1.8, 0, 0.05))
tip = at(ball('tip', 0.06, 'glow', 8, 5), (1.92, 0, 0.05))
barrel = part('barrel', tube, brake, tip, pivot=(0.2, 0, 0.05), parent=body)
coils = part('coils', *[at(torus('coil', 0.15, 0.045, 'glow', 12, 4), (x, 0, 0.05), (0, 90, 0)) for x in (0.55, 0.85, 1.15)], pivot=(0.85, 0, 0.05), parent=barrel)

loop(body, 2.0, rot=(2, 0, 3))
loop(coils, 0.5, n=4, scale=0.18)
key(barrel, 'attack', [(0, {}), (0.04, {'loc': (-0.4, 0, 0)}), (0.5, {})])
key(coils, 'attack', [(0, {'scale': 1}), (0.04, {'scale': 1.8}), (0.5, {'scale': 1})])
key(body, 'attack', [(0, {}), (0.04, {'loc': (-0.08, 0, 0), 'rot': (0, -6, 0)}), (0.5, {})])
burst_apart([body, barrel, coils])
export(__file__)
