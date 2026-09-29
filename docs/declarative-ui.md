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
| Behaviour words | `BEHAVIOURS` in `src/enemies.ts` |
| Upgrade effect words | `EFFECTS` in `src/upgrades.ts` |
| Content kinds | zod schemas in `src/content.ts`, data in `content/*.kdl` |
| Screens and their stacking | `src/runtime.ts` (import order = draw order) |
| 3D models | `src/view/models.ts` (`MODELS` in `src/content.ts` names them) |

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
| `--edge` | card border |
| `--text` | body text |
| `--dim` | secondary text |
| `--cyan` | primary accent, move stick |
| `--magenta` | secondary accent, aim stick |
| `--gold` | score, multiplier, bosses |
| `--danger` | hurt, game over |
| `--good` | positive |
| `--pop` | overshoot easing |
| `--title-font` | Orbitron |
| `--body-font` | sans-serif |
| `--floor` | arena floor and sky |
| `--grid` | floor grid lines and ripples |
| `--wall` | top/bottom walls |
| `--wall-alt` | side walls and pylons |
| `--player` | ship hull |
| `--player-glow` | ship glow, engine trail, aim line |
| `--player-shot` | player bolts |
| `--hostile-shot` | enemy shots |
| `--lob` | mortar rounds and landing zones |
| `--shard` | score shards |
| `--repair` | repair kits |
| `--warp` | warp gates |
| `--telegraph` | dash lanes |
| `--blink` | blink marks |
| `--shield` | shield arcs and blocks |
| `--heal` | mend pulses |
| `--ice` | a wave tint: every enemy in the wave, icy blue |
| `--laser` | sniper sight lines and their lock flash |
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

## Content kinds

| Kind | Use |
|---|---|
| `enemy` | `enemy "id" name= blurb= hp= r= score= model= [tier=] [touch=] [spawns=] { words }` |
| `wave` | `wave "id" title= [tint="--token"] { spawn "enemy" count= gap= at= [scale=] }`, in play order; `tint` recolours every enemy in the wave, `scale` sizes that spawn (collision and mesh) |
| `upgrade` | `upgrade "id" name= icon= blurb= { effect words }` |

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
