# Prismfall vocabulary catalog

Every piece of shared vocabulary, where it lives, and one line on how to use it. `src/catalog.test.ts` fails when
this file and the code disagree, so a new word lands here in the same commit as its code. How the engine works
(prefabs, the CSS dialect, reconcile, motion recipes) is in [engine.md](engine.md), copied verbatim from the game bible.

Homes:

| Vocabulary | Home |
|---|---|
| Engine elements and properties | `src/decl/` (copied from deadwood `788c31d`, pure core `css.ts` + Pixi half `engine.ts`) |
| Game CSS properties, custom elements | `src/screens/shared.ts` (the only module calling `defineProp` / `defineElement`) |
| Shared prefabs | `src/screens/shared.kdl`, styled in `src/screens/shared.css` |
| Palette (UI and 3D) | `:root` of `src/screens/shared.css`, read by the shell through `src/tokens.ts` |
| Look numbers (light, fog, rim, bloom, flashes) | `--look-*` tokens in the `:root` of `src/screens/shared.css`, read by the shell through `src/view/look.ts` |
| Scenery layout | `scatter` nodes in `content/arena.kdl` (expanded to placements by `ScatterSchema` in `src/content.ts`) |
| Behaviour words | `BEHAVIOURS` in `src/enemies.ts` |
| Upgrade effect words | `EFFECTS` in `src/upgrades.ts` |
| Content kinds | zod schemas in `src/content.ts`, data in `content/*.kdl` |
| Sound effects | `sound` nodes in `content/sounds.kdl`, synthesised by `src/audio.ts` |
| Screens and their stacking | `src/runtime.ts` (import order = draw order) |
| 3D models | `models/<name>.py` (Blender, built from `models/kit.py`), exported by `npm run models` to `models/<name>.glb` (committed); `src/view/models.ts` loads them; `MODELS` in `src/content.ts` names them |
| Modelling words | `models/kit.py` (the only module model scripts import) |
| Model rig contract | `CLIPS` and `SLOTS` in `src/view/models.ts`, matched by `models/kit.py`, checked on every export by `src/models.test.ts` |

## CSS properties

Built-ins (engine) and game-defined (`defineProp` in shared.ts).

| Property | Use |
|---|---|
| `display` | `flex` or `none` |
| `position` | `static` or `absolute` (with `left`/`top`) |
| `left` | px or % of the parent, absolute only |
| `top` | px or % of the parent, absolute only |
| `width` | px or % |
| `height` | px or % |
| `padding` | 1-4 values |
| `gap` | px between children |
| `flex-direction` | `column` (default) or `row` |
| `justify-content` | `flex-start` `center` `flex-end` `space-between` |
| `align-items` | `stretch` `flex-start` `center` `flex-end` |
| `flex-grow` | take the remaining space |
| `flex-wrap` | `nowrap` or `wrap` |
| `flex-shrink` | default 0 |
| `flex-basis` | px or % |
| `pointer-events` | `auto` swallows taps (scrims) |
| `background-color` | panel fill |
| `border-color` | panel stroke, drawn inside |
| `border-width` | panel stroke width |
| `panel-art` | 9-slice from an atlas; unused here (no atlas) |
| `image-scale` | sprite scale; unused here |
| `font-family` | `var(--title-font)` or `var(--body-font)` |
| `font-size` | px |
| `font-color` | text colour |
| `text-align` | `left` `center` `right` |
| `text-wrap` | `wrap` wraps to the box |
| `letter-spacing` | px |
| `line-height` | px |
| `text-stroke-color` | outline colour |
| `text-stroke-width` | outline width |
| `opacity` | 0..1 |
| `scale` | `1.1` or `.9 1.1`, about the box centre |
| `translate` | `x y` px |
| `rotate` | degrees |
| `transition` | `<prop> <dur> [easing] [delay], ...` |
| `animation` | `<name> <dur> [easing] [delay] [count] [alternate] [fill], ...` |
| `tint` | game: multiplies a node's colours; colours `meter`, `pips`, `corners` |

## Elements

| Element | Use |
|---|---|
| `panel` | box with children |
| `button` | tappable box with children; base style in shared.css |
| `text` | `bind="x"` or a literal |
| `sprite` | atlas texture; unused here (the engine's texture hook throws) |
| `meter` | `meter value=(bind)"fill"`: a fill of `w * value`, coloured by `tint` |
| `pips` | `pips count=(bind)"max" value=(bind)"hp"`: hull diamonds, lit up to value |
| `corners` | sci-fi corner brackets over the whole parent box, coloured by `tint` |
| `enemy-glyph` | `enemy-glyph kind=(bind)"kind"`: an enemy's 2D glyph in its palette colour |

## Shared prefabs

Build them with the binding builders exported from `screens/shared.ts`.

| Prefab | Use |
|---|---|
| `btn` | `btn(label, tap, state?)`; state `primary` / `danger` / `off` |
| `bar` | `bar(label, fill)`: a labelled 0..1 bar (the boss bar) |
| `upgrade-card` | `upgradeCard(id, i, pick)`: an upgrade choice; `i` staggers its entry |
| `enemy-card` | `enemyCard(kind)`: glyph, tier, name and blurb for the codex |

## Palette

UI colours, the arena's colours, and one `--enemy-<id>` per enemy (a guard test pairs them with the roster).

| Token | Use |
|---|---|
| `--ink` | the darkest background |
| `--panel` | card fill |
| `--panel-hi` | raised card fill |
| `--edge` | card and button border (bronze) |
| `--text` | body text (parchment) |
| `--dim` | secondary text |
| `--accent` | primary UI accent (tarnished gold): primary buttons, kickers, corners |
| `--blood` | secondary UI accent: danger buttons, elite tier, boss bar, hull pips |
| `--gold` | score, multiplier, bosses |
| `--danger` | hurt, game over |
| `--good` | positive |
| `--pop` | overshoot easing |
| `--title-font` | Cinzel (`@fontsource/cinzel`, weight 600) |
| `--body-font` | Georgia, serif |
| `--floor` | the clearing's earth (its albedo: the night decides how dark it looks), grave dirt |
| `--moss` | rot and moss patches on the floor, dead grass (`grass`) |
| `--moon` | moonlight: key light, the cold rim on every model's edge, the move stick |
| `--fog` | ground fog and the distance |
| `--wood` | dead trees and roots (`tree`, `roots`) |
| `--stone` | gravestones and stones (`grave`, `rocks`), stones in the floor |
| `--bone` | old bones lying in the clearing (`bones`) |
| `--player` | the wizard's robe |
| `--player-glow` | the wizard's light: staff flame, the light pool round him, his trail |
| `--player-shot` | spells, their light on the ground, the aim stick |
| `--hostile-shot` | enemy spells (necrotic) |
| `--lob` | hurled rounds and landing zones |
| `--shard` | souls (score pickups) |
| `--repair` | blood vials (hull pickups) |
| `--warp` | graves opening (enemy arrival) |
| `--telegraph` | charge lanes |
| `--blink` | blink marks |
| `--shield` | shield wards and blocks |
| `--heal` | mend pulses |
| `--ice` | a wave tint: every enemy in the wave, hoarfrost |
| `--laser` | sniper sight lines and their lock flash |
| `--trim` | iron on every model (the `trim` material), painted in the model; hue from here |
| `--soulfire` | the `glow` material of every undead: eyes, runes, grave-light |
| `--enemy-mite` | mite |
| `--enemy-drone` | drone |
| `--enemy-lancer` | lancer |
| `--enemy-wasp` | wasp |
| `--enemy-splitter` | splitter |
| `--enemy-bulwark` | bulwark |
| `--enemy-bomber` | bomber |
| `--enemy-mender` | mender |
| `--enemy-hive` | hive |
| `--enemy-phantom` | phantom |
| `--enemy-mortar` | mortar |
| `--enemy-sniper` | sniper |
| `--enemy-seraph` | seraph |
| `--enemy-colossus` | colossus |


## Look

`--look-*` tokens in the `:root` of `src/screens/shared.css`, beside the palette; `src/view/look.ts` reads them as `LOOK`
(`--look-fog-near-u` is `LOOK.FOG_NEAR_U`). Hues come from the palette; these numbers say how much of them you see.
Plain numbers, the unit the name's last word (`u`, `s`, `deg`, `rad`, `px`, `per-s`); no unit is a strength or 0..1 amount.

| Name | Use |
|---|---|
| `--look-camera-tilt-rad` | camera tilt off straight down, rad (more shows more of every figure's height) |
| `--look-camera-follow` | how much the camera follows the wizard (0 fixed, 1 locked) |
| `--look-camera-fov-deg` | field of view |
| `--look-camera-dist-u` | camera distance; the arena's height must still fit |
| `--look-character-pad-u` | characters are drawn at their radius plus this (u), so small ones read; hits still use the radius |
| `--look-wizard-scale` | the wizard's drawn size |
| `--look-faceted` | 1: models shaded in flat facets (hard, chiselled planes) rather than smoothed (0) |
| `--look-wizard-halo` | opacity of the faint warm halo on the ground round the wizard |
| `--look-body-lum` | the brightest a body's paint may be: the dead stay dark shapes with bright tells |
| `--look-exposure` | tone-mapping exposure, the whole frame |
| `--look-moon-key` | moon key light intensity (--moon) |
| `--look-moon-fill` | moonlit hemisphere fill |
| `--look-env` | environment reflections on metal |
| `--look-rim` | cold fresnel rim on every character's silhouette |
| `--look-rim-power` | the rim's falloff (higher is a thinner edge) |
| `--look-scenery-rim` | scenery's weaker rim |
| `--look-surface-grain` | how much models' procedural grain and stains vary their paint |
| `--look-surface-bump` | depth of that grain's bump |
| `--look-ground-texels-per-u` | the procedural ground is baked once into textures at this resolution (texels per u) |
| `--look-floor-relief` | height of the floor's procedural relief, so light rakes across stones and cracks |
| `--look-fog-y-u` | ground fog height, u |
| `--look-fog-veil` | ground fog thickness in the open |
| `--look-fog-edge` | ground fog thickness under the trees |
| `--look-fog-bright` | how moonlit the fog is |
| `--look-fog-near-u` | distance fog start, u from the camera |
| `--look-fog-far-u` | distance fog end |
| `--look-player-light` | the wizard's light intensity (--player-glow) |
| `--look-player-light-u` | its reach, u |
| `--look-static-lights` | scenery lights on the floor (grave-lanterns), at most this many |
| `--look-lantern-light` | how bright a scenery light is on the floor |
| `--look-floor-lights` | spells in flight that light the floor (phones pay per light) |
| `--look-motes-per-s` | motes of dust adrift in the moonlight, spawned per second |
| `--look-flash-lights` | pooled point lights for spell impacts |
| `--look-flash-s` | how long an impact flash lasts, s |
| `--look-flash-hit` | a hit's flash |
| `--look-flash-kill` | a kill's flash |
| `--look-flash-boss` | a boss kill's flash |
| `--look-bloom` | bloom strength (only magic should cross the threshold) |
| `--look-bloom-radius` | bloom radius |
| `--look-bloom-threshold` | bloom threshold |
| `--look-shadow` | contact-shadow darkness under characters and scenery (the moon casts the real shadows) |
| `--look-stains` | stains kills leave on the ground, at most this many |
| `--look-stain-s` | how long a stain takes to fade, s |
| `--look-shadow-map-px` | the moon's shadow map size, px |
| `--look-berm-u` | height of the bank the clearing sits in, past the arena's edge (u); scenery stands on it |
| `--look-berm-w-u` | how far the bank takes to rise |
| `--look-canopy-y-u` | height of the dead canopy whose moon shadow dapples the clearing, u |
| `--look-vignette` | vignette depth |
| `--look-grade` | how far the shadows lean towards moonlight |
| `--look-grain` | film grain |
| `--look-saturation` | saturation kept in everything that isn't bright (the world squashed towards grey, magic untouched) |
| `--look-trim-lum` | the brightest `trim` paint may be (dark metal) |
| `--look-cloth-lum` | the brightest `cloth` paint may be |
| `--look-glow-lum` | `glow` paint's luminance (over the bloom threshold) |
| `--look-body-glow` | a body's resting self-glow: reads on the dark floor, stays under the bloom threshold |
| `--look-wound-glow` | how much a wounded enemy's self-glow grows by the time it's nearly dead |
| `--look-hit-glow` | a hit enemy's flash |
| `--look-wizard-glow` | the wizard's self-glow |
| `--look-scenery-glow` | scenery's faint self-glow |
| `--look-moon-dir` | `x y z` towards the moon: high and from the far side, so the moon only catches tops and edges |
| `--look-clip-blend-s` | how long an attack or idle clip takes to hand over to the other, s |
| `--look-lunge-u` | a melee enemy this close past its own edge plays its attack clip |
| `--look-wizard-halo-u` | radius of the warm halo round the wizard |
| `--look-flash-u` | an impact flash's reach |
| `--look-stain` | how dark a kill's stain starts |
| `--look-mote` | how bright the moonlit motes are, times `--moon` |
| `--look-ripples` | ripples through the floor at once |
| `--look-hurl-arc-u` | how high a hurled skull arcs |
| `--look-shake-decay-per-s` | how fast screen shake dies away |
| `--look-trailed-spells` | spells that leave an ember trail each frame (the rest don't: the particle pool) |
| `--look-spark-drag-per-s` | how fast sparks slow |
| `--look-spark-glow` | how far over the bloom threshold a glowing spark burns |
| `--look-aberration` | the colour fringe at the frame's edge (more when hurt) |
| `--look-hurt-wash` | the red wash a hurt adds at the frame's edge |
| `--look-stick-reach-px` | how far a thumb travels for a full stick push, design px |
| `--look-stick-knob-px` | the stick knob's radius, design px |

## Behaviour words

Under an `enemy` node in `content/enemies.kdl`, one per line. At most one movement word (marked M).

| Word | Use |
|---|---|
| `chase` | M `chase speed`: home on the ship |
| `keep-away` | M `keep-away range speed`: hold a distance, strafing |
| `orbit` | M `orbit radius speed`: circle the ship |
| `dash` | M `dash windup speed`: creep, telegraph a lane, charge |
| `blink` | M `blink interval range`: mark a spot near the ship, teleport there |
| `anchor` | M `anchor`: stationary, slowly turning |
| `shoot` | `shoot interval speed`: aimed shot |
| `burst` | `burst interval count arc`: aimed fan (360 = ring) |
| `spiral` | `spiral interval arms`: rotating bullet pattern |
| `mortar` | `mortar interval blast`: lobbed round with a landing zone |
| `snipe` | `snipe interval paint speed`: holds still, paints a laser on the ship, locks, fires one fast shot |
| `shield` | `shield arc`: frontal shield that eats shots, turns slowly |
| `explode` | `explode blast`: detonates on death or contact |
| `split` | `split count`: bursts into `spawns` on death |
| `heal` | `heal radius rate`: mends nearby enemies |
| `summon` | `summon interval max`: opens gates for `spawns` |

## Effect words

Under an `upgrade` node in `content/upgrades.kdl`.

| Word | Use |
|---|---|
| `damage` | `damage x`: shot damage times x |
| `fire-rate` | `fire-rate x`: shots per second times x |
| `shot-speed` | `shot-speed x`: shot speed times x |
| `barrels` | `barrels n`: n more fanned barrels |
| `pierce` | `pierce n`: shots pass through n more enemies |
| `thrust` | `thrust x`: move speed times x |
| `magnet` | `magnet x`: shard pull range times x |
| `hull` | `hull n`: n more hull points, repaired to full |

## Models

One Blender script per character, `models/<name>.py`. `enemy model=` in `content/enemies.kdl` names one; `wizard` is the
player; `tree`, `grave` and `roots` are scenery (`SCENERY` in `src/content.ts`, placed by `content/arena.kdl`).
See each in Storybook under Models (idle, attack and die side by side; `still` freezes them for screenshots).

| Model | Use |
|---|---|
| `wizard` | the player: hooded wanderer in a torn cloak, pointed hood, ember eyes, gnarled staff with witchfire that jabs on each spell |
| `skeleton` | Skeleton (drone): big-skulled, chunky-boned soldier, rusted pauldron, notched sword; shambles, hacks overhead |
| `crawler` | Crawler (mite): a skull on six finger-bone legs; skitters, rears and snaps |
| `ghoul` | Ghoul (lancer): starved corpse on its knuckles, knobbed spine, hooked claws; rears back and flings itself on the charge |
| `banshee` | Banshee (wasp): legless ghost, gown fraying to streamers, hair blown back, arms wide; screams with a glowing mouth |
| `bloat` | Bloat (splitter): swollen, stitched corpse with skulls pressing through its belly and light leaking from the seams; bursts |
| `warden` | Grave Warden (bulwark): dead knight in rusted plate, horned great-helm, coffin-lid shield with a burning sigil; shield-bashes |
| `blightskull` | Blightskull (bomber): a great horned skull adrift in streaming soulfire; swells and splits its jaw, bursts |
| `necromancer` | Necromancer (mender): tall robed priest, spiked collar, bone mask, staff with a caged skull-lantern it raises to mend |
| `barrow` | Barrow (hive): a split grave mound round a sarcophagus, lid askew, rune headstone, arms clawing out; the lid heaves to summon |
| `wraith` | Wraith (phantom): empty cowl with two cold eyes, cloak fraying to smoke, a scythe; the cloak flares and the scythe sweeps |
| `catapult` | Bone Catapult (mortar): rotten frame on rib wheels, a femur arm with a burning skull in the cup; rocks back and hurls |
| `archer` | Deadeye (sniper): hooded skeleton with a bow taller than itself and a quiver; draws, holds, looses |
| `lich` | The Lich (seraph): floating crowned skull in robes of state, a blazing phylactery, six blades turning in a ring; arms up to cast |
| `golem` | Bone Colossus (colossus): a giant of fused bones and skulls round a caged soul, trunk arms and knuckle fists; slams the ground |
| `tree` | scenery: a dead oak on clawing roots, bare crown (stands on z = 0, 1 unit about a metre) |
| `grave` | scenery: a leaning, bitten headstone on a plinth, a mound and a broken iron cross |
| `roots` | scenery: a snapped, rotten stump and the roots it throws across the ground |
| `rocks` | scenery: a few half-sunk, weathered stones |
| `bones` | scenery: an old skull, a femur and loose ribs lying in the leaves |
| `grass` | scenery: a tuft of dead, bent grass |
| `ruin` | scenery: a broken, leaning standing stone with a rune, whose moon shadow falls long across the clearing |
| `lantern` | scenery: a grave-lantern on a bent iron post, cold soulfire in its cage; with `light=` it lights the ground |
| `statue` | scenery: the landmark, a weeping hooded angel on a cracked plinth, one wing snapped, soulfire tears |
| `snag` | scenery: a tall dead pine, bark gone, top snapped, a few broken spurs |
| `altar` | scenery: the sunken ritual circle at the clearing's heart: broken flagstones, smouldering runes, guttered candles |

## Model rig

The contract between a model script and the game. `models/kit.py` enforces it on export, `src/models.test.ts` checks the committed .glb files.

| Name | Use |
|---|---|
| `idle` | clip, loops; the arena offsets it per enemy so a swarm doesn't breathe in step |
| `attack` | clip, one shot: on the enemy's `enemy-fire`, `telegraph` or `heal` event, or when it's within 1.4 u of the ship (a lunge); the ship's on each shot |
| `die` | clip, one shot, ends collapsed: the arena keeps a killed enemy where it fell until it finishes; the ship's on death |
| `body` | material: the enemy's palette colour (or its wave tint) times the vertex paint; the hit flash lights it |
| `trim` | material: armour metal in `--trim`, shared by every model |
| `glow` | material: unlit, over the bloom threshold, in the palette colour |
| `cloth` | material: robes, rags, hoods: the body colour darkened, rough, with a woven grain; separates cloth from bone |

## Modelling kit

Words in `models/kit.py` for model scripts (`from kit import *`). Blender +X is forward, +Z up, 1 unit = the collision radius.

| Word | Use |
|---|---|
| `lathe` | `lathe(name, [(r, z), ...], mat, seg)`: a body of revolution around Z |
| `slab` | `slab(name, [(x, y), ...], depth, mat, bevel)`: an outline extruded and bevelled: wings, fins, blades, plates |
| `box` | `box(name, (x, y, z), mat, bevel)`: a bevelled box |
| `ball` | `ball(name, r, mat, seg, rings)`: a UV sphere |
| `cone` | `cone(name, r1, r2, depth, mat, seg)`: along +Z; r2 = r1 is a cylinder, 0 a spike |
| `torus` | `torus(name, R, r, mat)`: a ring in the XY plane |
| `tube` | `tube(name, [(x, y, z), ...], radii, mat, seg)`: a tube swept along points, a radius per point: bones, limbs, branches, roots, ribs, rags |
| `at` | `at(ob, loc, rot_degrees, scale)`: place a shape |
| `aim` | `aim(ob, direction, loc)`: point a shape's +Z along a direction |
| `deform` | `deform(ob, fn)`: move every vertex: taper, bulge, bend |
| `rough` | `rough(ob, amp, freq, seed)`: push vertices along their normals by noise: bark, rot, stone, torn cloth |
| `smooth` | `smooth(ob, levels)`: subdivide (soft chunky forms, and vertices to hold the paint) |
| `shell` | `shell(ob, thickness)`: give an open surface thickness |
| `cut` | `cut(ob, keep)`: delete faces whose centre fails `keep`: open a hood, split plates |
| `fuse` | `fuse(name, *shapes, voxel, keep)`: melt shapes into one organic mesh (voxel remesh, decimated to `keep`): fused bone, flesh, earth |
| `carve` | `carve(ob, *cutters)`: boolean-cut the cutters' volumes out (sockets, hollows); the cutters are deleted |
| `sphere_dirs` | `sphere_dirs(n, zmin)`: evenly spread directions (spikes, crystals) |
| `skull` | `skull(s, loc, mat, eyes, jaw, tilt)`: a sculpted skull facing +X, sockets and nose carved hollow with a light (`eyes`) deep in each, jaw open `jaw` degrees, face raised `tilt` degrees for the high camera; returns [skull, jaw, eye, eye] |
| `ribcage` | `ribcage(w, h, n, loc, mat, r)`: a spine and `n` rib pairs curving forward, top at `loc`; returns objects for `part` |
| `part` | `part(name, *shapes, pivot, parent)`: merge shapes into one moving rig part |
| `key` | `key(part, clip, [(s, {loc, rot, scale}), ...])`: key a clip relative to rest; one per part per clip |
| `loop` | `loop(part, period, n, steps, phase, loc=, rot=, scale=)`: a sine idle loop |
| `spin` | `spin(part, clip, period, turns, axis)`: a constant spin |
| `still` | `still(part, clips)`: scenery's clips, an imperceptible settle in each (the exporter drops a clip that doesn't move) |
| `crumble` | `crumble(parts, dur, floor, scatter)`: the undead `die`: bones drop to the floor, skid, lie, then sink into the earth |
| `burst_apart` | `burst_apart(parts, dur, fling, rise)`: the generic `die`: parts fly out, tumble, shrink |
| `export` | `export(__file__)`: paint the vertices (value only; hue comes from CSS: top light, cavities, baked ambient occlusion against the whole model) and write the .glb |

## Content kinds

| Kind | Use |
|---|---|
| `enemy` | `enemy "id" name= blurb= hp= r= score= model= [tier=] [touch=] [spawns=] { words }` |
| `wave` | `wave "id" title= [tint="--token"] { spawn "enemy" count= gap= at= [scale=] }`, in play order; `tint` recolours every enemy in the wave, `scale` sizes that spawn (collision and mesh) |
| `upgrade` | `upgrade "id" name= icon= blurb= { effect words }` |
| `sound` | `sound "id" [gap=] { tone "wave" from= to= s= vol= [jitter=] / hiss s= vol= cutoff= }`: a synthesised sound effect, its voices played together, in `content/sounds.kdl` (header there has the units); `SFX` in `src/audio.ts` names the ones the game plays |
| `mix` | `mix "master" volume=`: the level every sound plays at (0..1), in `content/sounds.kdl` |
| `scatter` | `scatter "id" model= paint="--token" along=top/bottom/sides/all/field/ring step= scale= seed= [glow="--token" light= shadow= out= spread= jitter= extend= vary= chance= face=in/any]`: scenery dropped in slots along the arena's edges, in a grid over it (`field`), or round its centre (`ring`), in `content/arena.kdl` |

## Content helpers

| Helper | Use |
|---|---|
| `loadKdl` | `loadKdl(src, { kind: schema })`: KDL to validated records, errors name node and field |
| `combinators` | `combinators(registry, what)`: a node's children as behaviour/effect words |
| `tunedText` | `tunedText(T)`: `{A.b}` in a string quotes a tuning value (unused so far) |

## Screens

In draw order (later on top). Each is `screens/<name>.kdl` + `.css` + `.ts` (bindings only).

| Screen | Use |
|---|---|
| `hud` | hull, score, wave, boss bar, multiplier, pause, wave banners |
| `upgrade` | three upgrade cards between waves |
| `gameover` | score, best, retry |
| `pause` | resume, sound, quit |
| `title` | logo and menu over the attract-mode arena |
| `codex` | the enemy roster |
| `rotate` | portrait prompt |
