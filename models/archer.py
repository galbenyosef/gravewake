# Archer (the Sniper): a skeleton marksman in a rotted hood and a tattered half-cloak, with a war bow taller than
# itself and a quiver of black-fletched arrows. It plants its feet at the treeline, draws, holds on you, and looses.
from kit import *

B = 0.07
pelvis = at(smooth(box('pelvis', (0.2, 0.34, 0.15), 'body', 0.05)), (0, 0, -0.1))
ribs = ribcage(0.28, 0.44, 4, (0.02, 0, 0.54), r=0.045)
cape = slab('cape', [(-0.3, 0.2), (0.3, 0.2), (0.34, -0.5), (0.18, -0.6), (0.05, -0.48), (-0.1, -0.64), (-0.3, -0.5)], 0.03, 'trim', 0.01)
deform(cape, lambda v: Vector((v.z - 0.2, v.x, v.y + 0.45)))  # hangs down the back
rough(cape, 0.03, 8, 2)
quiver = tube('quiver', [(-0.22, 0.12, 0.05), (-0.3, 0.2, 0.62)], [0.08, 0.09], 'trim', 7)
fletch = [tube('arrow', [(-0.3, 0.2 + dy, 0.6), (-0.33, 0.21 + dy, 0.8)], 0.02, 'body', 4) for dy in (-0.04, 0.0, 0.04)]
body = part('body', pelvis, *ribs, cape, quiver, *fletch)

skl = skull(0.44, (0.08, 0, 0.84), jaw=6, tilt=20)
hood = smooth(ball('hood', 0.27, 'trim', 12, 8))
cut(hood, lambda c: not (c.x > 0.08 and c.z < 0.12))
shell(hood, 0.03)
rough(hood, 0.02, 8, 3)
at(hood, (0.04, 0, 0.88))
head = part('head', *skl, hood, pivot=(0.02, 0, 0.66), parent=body)

# Bow arm (left): holds the bow out front, upright; the bow's limbs curve back to the tips.
bow_pts = [(0.62 - 0.22 * (1 - (t / 4) ** 2), 0.12, 0.35 + t * 0.3) for t in range(-4, 5)]
bow = tube('bow', bow_pts, [0.02, 0.03, 0.035, 0.04, 0.045, 0.04, 0.035, 0.03, 0.02], 'trim', 5)
string = tube('string', [bow_pts[0], (0.42, 0.12, 0.35), bow_pts[-1]], 0.008, 'body', 3)
grip = tube('bowarm', [(0.0, 0.26, 0.5), (0.25, 0.22, 0.42), (0.6, 0.13, 0.36)], [B, B * 0.8, B * 0.7], 'body', 6)
bow_arm = part('bow_arm', bow, string, grip, pivot=(0.0, 0.26, 0.5), parent=body)
# Draw arm (right): pulls the string back to the jaw, an arrow nocked.
draw = tube('drawarm', [(0.0, -0.26, 0.5), (0.1, -0.2, 0.42), (0.4, 0.05, 0.37)], [B, B * 0.8, B * 0.7], 'body', 6)
arrow = tube('nocked', [(0.4, 0.1, 0.36), (1.0, 0.12, 0.36)], 0.018, 'trim', 4)
head_tip = at(cone('arrowhead', 0.045, 0.0, 0.12, 'glow', 4), (1.0, 0.12, 0.36), (0, 90, 0))
draw_arm = part('draw_arm', draw, arrow, head_tip, pivot=(0.0, -0.26, 0.5), parent=body)
legs = []
for s in (1, -1):
    hip, kn, an = (0, s * 0.13, -0.1), (0.06 * s, s * 0.2, -0.5), (0.1 * s, s * 0.24, -0.84)
    obs = [tube('thigh', [hip, kn], [B, B * 0.85], 'body', 6), tube('shin', [kn, an], [B * 0.85, B * 0.7], 'body', 6),
           at(smooth(ball('knee', B * 1.2, 'body', 6, 4)), kn), at(smooth(box('foot', (0.22, 0.09, 0.06), 'body', 0.02)), (an[0] + 0.06, an[1], -0.88))]
    legs.append(part('leg_l' if s > 0 else 'leg_r', *obs, pivot=hip, parent=body))

loop(body, 2.6, rot=(2, 2, 0), loc=(0, 0, 0.02))
loop(head, 2.6, rot=(0, 4, 8), phase=0.2)
loop(bow_arm, 2.6, rot=(3, 0, 0), phase=0.4)
loop(draw_arm, 2.6, rot=(0, 0, 4), phase=0.4)
for i, l in enumerate(legs): loop(l, 2.6, phase=i * 0.5, rot=(0, 3, 0))
# Attack (the shot): draw hard, hold, loose; the bow kicks.
key(draw_arm, 'attack', [(0, {}), (0.1, {'loc': (-0.18, 0, 0)}), (0.2, {'loc': (0.1, 0, 0)}), (0.5, {})])
key(bow_arm, 'attack', [(0, {}), (0.2, {'rot': (0, -10, 0), 'loc': (-0.05, 0, 0)}), (0.5, {})])
key(body, 'attack', [(0, {}), (0.2, {'loc': (-0.06, 0, 0)}), (0.5, {})])
for p in (head, *legs): key(p, 'attack', [(0, {}), (0.5, {})])
crumble([body, head, bow_arm, draw_arm, *legs], dur=1.1)
export(__file__)
