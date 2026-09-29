# Barrow (the Hive): an old grave that will not close. A heaped mound of black earth split open round a stone
# sarcophagus, its lid shoved askew, grave-light welling up from inside; a leaning headstone burns with a rune, and
# skeletal arms claw out of the dirt. When it summons, the lid heaves and the arms reach.
from kit import *

mound = smooth(lathe('mound', [(0.0, -0.9), (1.05, -0.9), (1.0, -0.72), (0.82, -0.5), (0.5, -0.36), (0.0, -0.32)], 'body', 18))
deform(mound, lambda v: Vector((v.x * 1.1, v.y, v.z)))
rough(mound, 0.08, 2.5, 1)
clods = [at(smooth(ball('clod', 0.13, 'body', 6, 4)), (math.cos(a) * r, math.sin(a) * r, -0.62 + 0.1 * math.sin(a * 3)), scale=(1.2, 1, 0.7)) for a, r in ((0.4, 0.95), (1.4, 0.9), (2.5, 1.0), (3.6, 0.92), (4.6, 0.98), (5.6, 0.9))]
tomb = at(smooth(box('tomb', (0.9, 0.5, 0.32), 'trim', 0.05)), (0, 0, -0.4))
rough(tomb, 0.02, 6, 2)
light = at(box('grave-light', (0.74, 0.34, 0.04), 'glow', 0.02), (0, 0, -0.23))
stone = slab('headstone', [(-0.3, 0), (0.3, 0), (0.3, 0.6), (0.18, 0.78), (0, 0.84), (-0.18, 0.78), (-0.3, 0.6)], 0.14, 'trim', 0.04)
deform(stone, lambda v: Vector((v.z, v.x, v.y)))
rough(stone, 0.025, 5, 3)
at(stone, (-0.7, 0, -0.5), (0, -18, 0))
rune = at(torus('rune', 0.12, 0.022, 'glow', 12, 4), (-0.62, 0, -0.02), (0, 72, 0))
candles = [at(cone('candle', 0.035, 0.03, 0.14, 'body', 6), (x, y, -0.4)) for x, y in ((0.55, 0.45), (0.62, -0.4), (-0.35, 0.55))]
wicks = [at(ball('wick', 0.03, 'glow', 5, 3), (x, y, -0.23), scale=(1, 1, 1.6)) for x, y in ((0.55, 0.45), (0.62, -0.4), (-0.35, 0.55))]
body = part('mound', mound, *clods, tomb, light, stone, rune, *candles, *wicks)

lid = at(smooth(box('lid', (1.0, 0.56, 0.1), 'trim', 0.03)), (0.1, 0.12, -0.18), (8, -6, 14))
cross = at(box('cross', (0.5, 0.06, 0.03), 'body', 0.01), (0.1, 0.12, -0.12), (8, -6, 14))
lid = part('lid', lid, cross, pivot=(-0.4, 0.12, -0.24), parent=body)

arms = []
for i, (x, y, a) in enumerate(((0.5, 0.75, 60), (0.75, -0.65, -50), (-0.25, -0.8, -110), (0.9, 0.1, 5))):
    d = Vector((math.cos(math.radians(a)), math.sin(math.radians(a)), 0))
    base = Vector((x, y, -0.7))
    el = base + d * 0.12 + Vector((0, 0, 0.35))
    ha = el + d * 0.15 + Vector((0, 0, 0.25))
    fingers = [tube('finger', [tuple(ha), tuple(ha + d * 0.1 + Vector((0.04 * k, 0.04 * k, 0.1)))], [0.022, 0.0], 'body', 4) for k in (-1, 0, 1)]
    obs = [tube('fore', [tuple(base), tuple(el)], [0.06, 0.05], 'body', 5), tube('hand', [tuple(el), tuple(ha)], [0.05, 0.04], 'body', 5), *fingers]
    arms.append(part(f'arm_{i}', *obs, pivot=tuple(base), parent=body))

loop(body, 3, scale=0.01)
key(lid, 'idle', [(0, {}), (1.5, {'rot': (0, -3, 0), 'loc': (0, 0, 0.02)}), (3, {})])
for i, a in enumerate(arms): loop(a, 1.6, phase=i * 0.27, rot=(14, 18, 10))
# Attack (the summon): the lid heaves up, the arms reach high.
key(lid, 'attack', [(0, {}), (0.3, {'rot': (0, -24, 0), 'loc': (0, 0, 0.2)}), (0.9, {'rot': (0, -18, 0), 'loc': (0, 0, 0.12)}), (1.3, {})])
for i, a in enumerate(arms): key(a, 'attack', [(0, {}), (0.3 + i * 0.05, {'loc': (0, 0, 0.25), 'scale': 1.2}), (1.3, {})])
key(body, 'attack', [(0, {}), (0.3, {'scale': (1.04, 1.04, 0.96)}), (1.3, {})])
burst_apart([body, lid, *arms], dur=1.2, fling=1.2, rise=0.6)
export(__file__)
