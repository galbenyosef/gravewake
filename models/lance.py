# Lance (the Lancer): a jousting charger. Armoured hull, a spinning drill-lance, pauldron plates that fold back to charge.
from kit import *

hull = smooth(lathe('hull', [(0, -0.9), (0.2, -0.85), (0.38, -0.5), (0.42, -0.05), (0.32, 0.3), (0.18, 0.45), (0, 0.5)], seg=10))
at(hull, rot=(0, 90, 0), scale=(0.8, 1, 1))
crest = at(slab('crest', [(-0.8, 0), (0.3, 0), (-0.1, 0.18), (-0.9, 0.3)], 0.08, 'trim', 0.03), (0, 0, 0.28), (90, 0, 0))
fins = [at(slab('fin', [(-0.5, 0), (0, 0), (-0.55, 0.45), (-0.75, 0.45)], 0.06, 'trim', 0.02), (-0.4, s * 0.25, -0.05), (0 if s > 0 else 180, 0, 0)) for s in (1, -1)]
jet = at(cone('jet', 0.22, 0.08, 0.3, 'glow', 10), (-0.85, 0, 0), (0, -90, 0))
body = part('hull', hull, crest, *fins, jet)

spear = cone('spear', 0.17, 0.0, 1.15, 'trim', 6, 0.0)
at(spear, (0.35, 0, 0), (0, 90, 0))
collar = at(torus('collar', 0.17, 0.06, 'glow', 12), (0.42, 0, 0), (0, 90, 0))
lance = part('lance', spear, collar, pivot=(0.35, 0, 0), parent=body)

plates = []
for s in (1, -1):
    pl = slab('plate', [(-0.45, 0), (0.4, 0), (0.25, 0.42), (-0.55, 0.36)], 0.12, 'body', 0.04)
    deform(pl, lambda v: Vector((v.x, v.y, v.z - 0.35 * v.y * v.y)))
    rim = slab('rim', [(0.4, 0), (0.25, 0.42), (0.18, 0.42), (0.32, 0)], 0.15, 'trim', 0.02)
    deform(rim, lambda v: Vector((v.x, v.y, v.z - 0.35 * v.y * v.y)))
    for o in (pl, rim): at(o, (0, s * 0.3, 0.12), (0 if s > 0 else 180, 0, 0) if s > 0 else (180, 0, 0), (1, 1, 1) if s > 0 else (1, 1, -1))
    plates.append(part('plate_l' if s > 0 else 'plate_r', pl, rim, pivot=(0, s * 0.3, 0.12), parent=body))

spin(lance, 'idle', 1.2, turns=2, axis=0)
loop(body, 1.2, rot=(4, 0, 0), loc=(0, 0, 0.04))
for i, p in enumerate(plates): loop(p, 1.2, rot=(8 * (1 if i == 0 else -1), 0, 0))
key(lance, 'attack', [(0, {}), (0.15, {'loc': (-0.15, 0, 0), 'rot': (360, 0, 0)}), (0.4, {'loc': (0.35, 0, 0), 'rot': (1080, 0, 0)}), (0.9, {'rot': (1800, 0, 0)})])
for i, p in enumerate(plates):
    sg = 1 if i == 0 else -1
    key(p, 'attack', [(0, {}), (0.2, {'rot': (-20 * sg, 0, 25 * sg)}), (0.7, {'rot': (-20 * sg, 0, 25 * sg)}), (0.9, {})])
key(body, 'attack', [(0, {}), (0.2, {'loc': (-0.1, 0, -0.05), 'rot': (0, 8, 0)}), (0.9, {})])
burst_apart([body, lance, *plates])
export(__file__)
