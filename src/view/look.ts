// Look numbers: how bright the night is, how thick the fog, how hard the moon catches an edge, how spells light the
// scene. Hues are the palette's (screens/shared.css); these say how much of them you see. One home for tweaking the
// render, like tuning.ts is for the rules (catalog: ## Look, drift-tested).
export const LOOK = {
  /** Camera: tilt off straight down (rad), how much it follows the wizard (0 = fixed on the centre, 1 = locked to him),
   *  field of view, and distance (it must still fit the arena's height, follow slack included). */
  CAMERA_TILT_RAD: 0.62,
  CAMERA_FOLLOW: 0.32,
  CAMERA_FOV_DEG: 38,
  CAMERA_DIST_U: 32.5,
  /** Characters are drawn larger than their collision radius r, at r + this (u): small ones read at phone size, a boss
   *  grows a little. View only; hits still use r. The wizard is drawn at WIZARD_SCALE. */
  CHARACTER_PAD_U: 0.4,
  WIZARD_SCALE: 1.5,
  /** The brightest a body's paint may be (linear luminance): kept low so the dead stay dark shapes with bright tells
   *  (soulfire eyes, the moon on their edges), under the wizard's light. */
  BODY_LUM: 0.1,
  /** Models shaded in flat facets (hard, chiselled planes) rather than smoothed. */
  FACETED: true,
  /** Tone-mapping exposure: the whole frame. */
  EXPOSURE: 1.1,
  /** Moonlight (--moon): the key light's intensity, the dim hemisphere fill, and environment reflections on metal. */
  MOON_KEY: 2.2,
  MOON_FILL: 0.14,
  ENV: 0.6,
  /** The cold rim on every character's silhouette (fresnel strength and falloff), and scenery's weaker one. */
  RIM: 1.6,
  RIM_POWER: 2.6,
  SCENERY_RIM: 0.2,
  /** Models' procedural surface: how much the grain and stains vary the paint, and how deep its bump is. */
  SURFACE_GRAIN: 0.6,
  SURFACE_BUMP: 0.06,
  /** How tall the floor's procedural relief is (stones, mounds, cracks), so light rakes across it. */
  FLOOR_RELIEF: 1.2,
  /** Ground fog: the veil's height (u), its thickness in the open and under the trees, and how moonlit it is. */
  FOG_Y_U: 0.35,
  FOG_VEIL: 0.18,
  FOG_EDGE: 0.4,
  FOG_BRIGHT: 0.04,
  /** Distance fog (--fog) from and to, u from the camera. */
  FOG_NEAR_U: 30,
  FOG_FAR_U: 62,
  /** The wizard's light (--player-glow): intensity and reach, u. */
  PLAYER_LIGHT: 24,
  PLAYER_LIGHT_U: 11,
  /** How many spells in flight light the floor (a shader loop: phones pay per light). */
  FLOOR_LIGHTS: 20,
  /** Scenery lights on the floor (grave-lanterns): how many at most, and how bright. */
  STATIC_LIGHTS: 8,
  LANTERN_LIGHT: 2.5,
  /** Warm point-light flashes where spells land: how many at once, how long, how bright on a hit, a kill, a boss. */
  FLASH_LIGHTS: 3,
  FLASH_S: 0.22,
  FLASH_HIT: 14,
  FLASH_KILL: 30,
  FLASH_BOSS: 60,
  /** Bloom: only magic should cross the threshold. */
  BLOOM: 0.6,
  BLOOM_RADIUS: 0.4,
  BLOOM_THRESHOLD: 0.8,
  /** Contact shadows under characters (the moon casts the real ones), and the moon's shadow map size (px). */
  SHADOW: 0.5,
  SHADOW_MAP: 2048,
  /** The bank the clearing sits in: its height past the edge (u), and how far it takes to rise (u). */
  BERM_U: 1.6,
  BERM_W_U: 3.5,
  /** Height of the dead canopy whose shadow dapples the clearing, u. */
  CANOPY_Y_U: 14,
  /** The final grade: vignette depth, how far the shadows lean towards moonlight, film grain. */
  VIGNETTE: 0.6,
  GRADE: 0.25,
  GRAIN: 0.03,
  /** Saturation kept in everything that isn't bright (magic stays saturated; the world is squashed towards grey). */
  SATURATION: 0.7,
} as const;
