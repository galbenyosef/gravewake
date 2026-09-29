# Grave (scenery): a sunken plot. A cracked, leaning headstone with a rounded top, a low mound of turned earth, and a
# broken iron cross behind it. Stands on z = 0; the arena turns and scales each one. It holds still in every clip.
from kit import *

stone = slab('stone', [(-0.36, 0), (0.36, 0), (0.36, 0.8), (0.3, 0.95), (0.16, 1.03), (0, 1.06), (-0.16, 1.03), (-0.3, 0.95), (-0.36, 0.8)], 0.16, 'body', 0.04)
deform(stone, lambda v: Vector((v.z, v.x, v.y - 0.05)))  # stand it up: width along Y, height along Z, facing +X
smooth(stone)
rough(stone, 0.03, 5, 2)
chip = lambda v: Vector((v.x, v.y, v.z - 0.3 * max(0, v.y - 0.05) * (v.z > 0.75)))  # a bite out of the top
deform(stone, chip)
at(stone, (0.35, 0, 0), (0, -12, 6))
plinth = at(smooth(box('plinth', (0.34, 0.9, 0.16), 'body', 0.05)), (0.36, 0, 0.02))
rough(plinth, 0.02, 6, 3)
mound = smooth(lathe('mound', [(0, -0.1), (0.9, -0.1), (0.8, 0.08), (0.5, 0.18), (0, 0.22)], 'trim', 12))
deform(mound, lambda v: Vector((v.x * 1.25 - 0.45, v.y * 0.62, v.z)))
rough(mound, 0.05, 4, 4)
post = tube('post', [(-1.25, 0.25, -0.05), (-1.2, 0.3, 0.9)], [0.05, 0.04], 'trim', 5)
bar = tube('bar', [(-1.2, 0.02, 0.62), (-1.2, 0.56, 0.7)], 0.035, 'trim', 5)
body = part('grave', stone, plinth, mound, post, bar)

still(body)
export(__file__)
