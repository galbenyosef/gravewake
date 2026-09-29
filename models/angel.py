# Angel (the Seraph): a war-construct of six wings of light. An armoured heart-reactor, a ring of blade wings that
# turns and breathes, a halo, a crown of spines below. The wings flare when it opens fire.
from kit import *

torso = smooth(lathe('torso', [(0, -0.55), (0.25, -0.5), (0.42, -0.2), (0.45, 0.1), (0.3, 0.38), (0, 0.48)], 'body', 12))
plates = []
for a in range(6):
    ang = a / 6 * math.tau + math.pi / 6
    p = slab('plate', [(0, -0.16), (0.3, -0.12), (0.36, 0), (0.3, 0.12), (0, 0.16)], 0.08, 'trim', 0.025)
    at(p, (math.cos(ang) * 0.28, math.sin(ang) * 0.28, 0.12), (0, -35, math.degrees(ang)))
    plates.append(p)
spines = []
for a in range(8):
    ang = a / 8 * math.tau
    spines.append(aim(cone('spine', 0.07, 0.0, 0.55, 'trim', 5), (math.cos(ang) * 0.5, math.sin(ang) * 0.5, -1), (math.cos(ang) * 0.3, math.sin(ang) * 0.3, -0.35)))
body = part('torso', torso, *plates, *spines)

heart = part('heart', at(smooth(ball('heart', 0.17, 'glow', 12, 8)), (0, 0, 0.42)), pivot=(0, 0, 0.42), parent=body)
cage = [at(torus('cage', 0.28, 0.035, 'trim', 14, 4), (0, 0, 0.42), (90, 0, a * 60)) for a in range(3)]
cage = part('cage', *cage, pivot=(0, 0, 0.42), parent=body)
halo = part('halo', at(torus('halo', 0.36, 0.04, 'glow', 24, 5), (0, 0, 0.82), (0, 0, 0)), pivot=(0, 0, 0.82), parent=body)

ring = part('ring', at(torus('hub', 0.5, 0.08, 'trim', 18, 5), (0, 0, 0.05)), pivot=(0, 0, 0.05), parent=body)
wings = []
for a in range(6):
    ang = a / 6 * math.tau
    upper = a % 2 == 0
    ln = 1.25 if upper else 1.05
    blade = slab('blade', [(0, -0.12), (ln * 0.45, -0.22), (ln, -0.05), (ln * 0.85, 0.1), (ln * 0.3, 0.16), (0, 0.1)], 0.07, 'body', 0.025)
    edge = slab('edge', [(0.05, 0.1), (ln * 0.3, 0.16), (ln * 0.85, 0.1), (ln * 0.8, 0.14), (ln * 0.3, 0.2), (0.05, 0.14)], 0.05, 'glow', 0.01)
    vein = slab('vein', [(0.1, -0.02), (ln * 0.8, -0.02), (ln * 0.8, 0.02), (0.1, 0.02)], 0.09, 'trim', 0.01)
    for o in (blade, edge, vein):
        deform(o, lambda v: Vector((v.x, v.y, v.z + 0.18 * v.x * v.x)))
        at(o, (math.cos(ang) * 0.5, math.sin(ang) * 0.5, 0.05 + (0.1 if upper else -0.05)), (0, -8 if upper else 6, math.degrees(ang)))
    wings.append(part(f'wing_{a}', blade, edge, vein, pivot=(math.cos(ang) * 0.5, math.sin(ang) * 0.5, 0.05), parent=ring))
    wings[-1]['ang'] = ang

spin(ring, 'idle', 6.0, 1)
loop(body, 3.0, loc=(0, 0, 0.06), n=2, rot=(2, 2, 0))
loop(heart, 0.75, n=8, scale=0.14)
spin(cage, 'idle', 3.0, 1, axis=2, ccw=False)
key(halo, 'idle', [(0, {}), (1.5, {'rot': (8, 0, 0), 'loc': (0, 0, 0.04)}), (3.0, {'rot': (0, 8, 0)}), (4.5, {'rot': (-8, 0, 0), 'loc': (0, 0, 0.04)}), (6.0, {})])
for i, w in enumerate(wings):
    loop(w, 3.0, n=2, phase=i / 6, rot=(9, 0, 0))
    key(w, 'attack', [(0, {}), (0.15, {'rot': (0, -18, 0), 'scale': 1.12}), (0.6, {'rot': (0, -14, 0), 'scale': 1.08}), (1.0, {})])
key(heart, 'attack', [(0, {'scale': 1}), (0.15, {'scale': 1.6}), (1.0, {'scale': 1})])
key(halo, 'attack', [(0, {'scale': 1}), (0.2, {'scale': 1.5, 'loc': (0, 0, 0.15)}), (1.0, {'scale': 1})])
spin(ring, 'attack', 1.0, 1)
burst_apart([body, heart, halo, ring, *wings], dur=1.2, fling=1.6, rise=0.9)
export(__file__)
