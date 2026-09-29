# Bones (scenery): what is left of someone who came here before: a skull on its side, a femur, loose ribs and a
# jaw in the leaves. Stands on z = 0; the arena turns and scales each. Its sockets are dark: the dead that still
# glow are the ones that get up.
from kit import *

skl = skull(0.34, (0.0, 0.0, 0.1), mat='body', eyes='trim', jaw=0)
for o in skl: o.location = Vector((o.location.x, o.location.y, o.location.z))
femur = tube('femur', [(-0.55, -0.3, 0.04), (-0.1, -0.42, 0.04), (0.25, -0.5, 0.05)], [0.055, 0.04, 0.055], 'body', 6)
knobs = [at(ball('knob', 0.07, 'body', 6, 4), p) for p in ((-0.57, -0.3, 0.05), (0.27, -0.5, 0.06))]
ribs = [tube('rib', [(0.35 + 0.12 * i, 0.3, 0.02), (0.45 + 0.12 * i, 0.5, 0.06), (0.4 + 0.12 * i, 0.7, 0.02)], 0.022, 'body', 4) for i in range(3)]
body = part('bones', *skl, femur, *knobs, *ribs)
still(body)
export(__file__)
