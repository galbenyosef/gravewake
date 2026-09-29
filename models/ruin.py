# Ruin (scenery): a broken standing stone from whatever stood here before the graves. Tall, leaning, snapped at an
# angle, a rune cut in its face, lichen at its foot. Stands on z = 0; about 2.5 units tall. The moon throws its
# shadow long across the clearing.
from kit import *

stone = box('menhir', (0.55, 0.8, 2.6), 'body', 0.08)
smooth(stone, 2)
deform(stone, lambda v: Vector((v.x * (1 - 0.18 * (v.z + 1.3) / 2.6), v.y * (1 - 0.25 * (v.z + 1.3) / 2.6), v.z + 1.3)))
smooth(stone)
deform(stone, lambda v: Vector((v.x, v.y, min(v.z, 2.1 + 0.5 * v.y))))  # snapped off at a slant
rough(stone, 0.05, 2.5, 1)
rough(stone, 0.02, 9, 2)
chunk = at(smooth(box('chunk', (0.4, 0.5, 0.35), 'body', 0.06)), (0.5, 0.3, 0.12), (12, 20, 35))
rough(chunk, 0.04, 4, 3)
rune = [tube('rune', pts, 0.025, 'glow', 3) for pts in (
    [(0.29, -0.12, 0.9), (0.3, 0.0, 1.25), (0.29, 0.12, 0.9)], [(0.3, -0.08, 1.05), (0.3, 0.08, 1.05)])]
body = part('ruin', stone, chunk, *rune)
at(body, (0, 0, 0), (4, -6, 0))
still(body)
export(__file__)
