# Lantern (scenery): a grave-lantern on a bent iron post, its cage holding a cold soulfire that lights the ground round
# it. Stands on z = 0; about 1.8 units tall.
from kit import *

post = tube('post', [(0, 0, 0), (0.02, 0, 0.9), (0.05, 0.0, 1.6), (0.2, 0.0, 1.75), (0.32, 0, 1.68)], [0.05, 0.045, 0.04, 0.035, 0.03], 'trim', 6)
foot = at(cone('foot', 0.16, 0.06, 0.16, 'body', 6), (0, 0, 0))
cage = [tube('cage', [(0.32, 0, 1.62), (0.32 + 0.1 * math.cos(a), 0.1 * math.sin(a), 1.45), (0.32, 0, 1.28)], 0.014, 'trim', 3) for a in (0, 1.57, 3.14, 4.71)]
lid = at(cone('lid', 0.13, 0.02, 0.1, 'trim', 6), (0.32, 0, 1.58))
fire = at(smooth(ball('soulfire', 0.07, 'glow', 8, 6)), (0.32, 0, 1.44), scale=(1, 1, 1.4))
body = part('lantern', post, foot, *cage, lid, fire)
still(body)
export(__file__)
