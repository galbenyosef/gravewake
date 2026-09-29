# Necromancer (the Mender): a tall, starved priest of the grave in layered robes, a high spiked collar framing a
# bone mask, and a staff topped with a caged skull-lantern whose soulfire knits the dead back together. It raises the
# lantern when it mends.
from kit import *

robe = lathe('robe', [(0.42, -0.9), (0.38, -0.5), (0.3, -0.05), (0.26, 0.35), (0.3, 0.62), (0.0, 0.72)], 'body', 16)
smooth(robe)
cut(robe, lambda c: not (c.z < -0.8 and (math.atan2(c.y, c.x) * 6 % 1.0) < 0.3))
rough(robe, 0.035, 6, 1)
over = lathe('over', [(0.36, -0.3), (0.34, 0.1), (0.32, 0.45), (0.0, 0.55)], 'trim', 14)
cut(over, lambda c: not (c.x > 0.18 and c.z < 0.45))  # open at the front
shell(over, 0.03)
rough(over, 0.02, 8, 2)
sash = at(torus('sash', 0.29, 0.035, 'trim', 16, 4), (0, 0, 0.05))
charms = [at(ball('charm', 0.035, 'glow', 6, 4), (0.26 * math.cos(a), 0.26 * math.sin(a), -0.02)) for a in (0.5, -0.5, 0.0)]
collar = [aim(cone('collar', 0.06, 0.0, 0.5, 'body', 4), (-0.4 * math.cos(a) - 0.2, 0.9 * math.sin(a), 1.4), (-0.12 + 0.1 * math.cos(a), 0.22 * math.sin(a), 0.62)) for a in (-1.2, -0.6, 0.0, 0.6, 1.2)]
body = part('body', robe, over, sash, *charms, *collar)

hood = smooth(ball('hood', 0.22, 'body', 12, 8))
cut(hood, lambda c: not (c.x > 0.1 and abs(c.y) < 0.14 and c.z < 0.1))
shell(hood, 0.03)
mask = skull(0.3, (0.05, 0, -0.02), jaw=0, tilt=20)
for o in [hood] + mask: o.location += Vector((0.04, 0, 0.88))
head = part('head', hood, *mask, pivot=(0.04, 0, 0.72), parent=body)

# Staff: a long crooked pole, the lantern hanging from its hook.
staff = tube('staff', [(0.36, 0.34, -0.9), (0.38, 0.35, 0.0), (0.35, 0.34, 0.8), (0.38, 0.35, 1.3), (0.28, 0.35, 1.45), (0.18, 0.35, 1.38)], [0.035, 0.035, 0.035, 0.035, 0.03, 0.025], 'trim', 6)
cage = [tube('cage', [(0.18, 0.35, 1.3), (0.18 + 0.12 * math.cos(a), 0.35 + 0.12 * math.sin(a), 1.18), (0.18, 0.35, 1.02)], 0.015, 'trim', 4) for a in (0, 2.1, 4.2)]
lamp = skull(0.16, (0.18, 0.35, 1.15))
glow = at(smooth(ball('lantern', 0.1, 'glow', 8, 6)), (0.18, 0.35, 1.16))
sleeve = tube('sleeve', [(0.05, 0.28, 0.58), (0.22, 0.36, 0.35), (0.36, 0.35, 0.4)], [0.1, 0.09, 0.07], 'body', 7)
hand = at(smooth(ball('hand', 0.05, 'body', 6, 4)), (0.38, 0.35, 0.42))
arm = part('arm', staff, *cage, *lamp, glow, sleeve, hand, pivot=(0.05, 0.28, 0.58), parent=body)
off = part('off', tube('sleeve2', [(0.05, -0.28, 0.58), (0.15, -0.36, 0.3), (0.28, -0.3, 0.2)], [0.1, 0.09, 0.08], 'body', 7),
           at(ball('palm', 0.045, 'glow', 6, 4), (0.32, -0.3, 0.2)), pivot=(0.05, -0.28, 0.58), parent=body)

loop(body, 3.0, loc=(0, 0, 0.03), rot=(2, 2, 0))
loop(head, 3.0, rot=(0, 5, 8), phase=0.2)
loop(arm, 3.0, rot=(3, -3, 0), phase=0.4)
loop(off, 1.5, n=2, rot=(10, 0, 8))
# Attack (the mend): lantern raised high, off hand thrown open.
key(arm, 'attack', [(0, {}), (0.2, {'rot': (-12, -25, 0), 'loc': (0, 0, 0.15)}), (0.7, {'rot': (-8, -18, 0), 'loc': (0, 0, 0.1)}), (1.0, {})])
key(off, 'attack', [(0, {}), (0.2, {'rot': (40, -30, 0)}), (1.0, {})])
key(head, 'attack', [(0, {}), (0.2, {'rot': (0, -15, 0)}), (1.0, {})])
crumble([body, head, arm, off], dur=1.2)
export(__file__)
