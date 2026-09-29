# Grass (scenery): a tuft of dead grass, blades bent every way by the wind. Stands on z = 0.
from kit import *
import random

rnd = random.Random(5)
blades = []
for i in range(14):
    a, lean = rnd.uniform(0, math.tau), rnd.uniform(0.2, 0.9)
    ln = rnd.uniform(0.3, 0.6)
    x, y = math.cos(a) * rnd.uniform(0, 0.12), math.sin(a) * rnd.uniform(0, 0.12)
    tip = (x + math.cos(a) * lean * ln, y + math.sin(a) * lean * ln, ln * (1 - lean * 0.5))
    mid = (x + math.cos(a) * lean * ln * 0.35, y + math.sin(a) * lean * ln * 0.35, ln * 0.6)
    blades.append(tube('blade', [(x, y, 0), mid, tip], [0.025, 0.018, 0.0], 'body', 3))
body = part('grass', *blades)
still(body)
export(__file__)
