# Rocks (scenery): a few weathered stones half sunk in the earth. Stands on z = 0; the arena turns and scales each.
from kit import *

stones = []
for i, (x, y, r, sq) in enumerate(((0, 0, 0.32, 0.6), (0.38, 0.18, 0.18, 0.7), (-0.2, 0.34, 0.14, 0.8), (0.22, -0.3, 0.12, 0.9))):
    st = ball('stone', r, 'body', 7, 5)
    rough(st, r * 0.45, 1.2 / r, i)
    deform(st, lambda v, sq=sq: Vector((v.x * 1.25, v.y, v.z * sq * 0.7)))
    stones.append(at(st, (x, y, r * sq * 0.35)))
body = part('rocks', *stones)
still(body)
export(__file__)
