// Look numbers: how bright the night is, how thick the fog, how hard the moon catches an edge, how spells light the
// scene. Hues are the palette's (screens/shared.css); these say how much of them you see. One home for tweaking the
// render, like tuning.ts is for the rules (catalog: ## Look, drift-tested).
export const LOOK = {
  /** Tone-mapping exposure: the whole frame. */
  EXPOSURE: 1.1,
  /** Moonlight (--moon): the key light's intensity, the dim hemisphere fill, and environment reflections on metal. */
  MOON_KEY: 1.5,
  MOON_FILL: 0.55,
  ENV: 0.12,
  /** The cold rim on every character's silhouette (fresnel strength and falloff), and scenery's weaker one. */
  RIM: 1.6,
  RIM_POWER: 2.6,
  SCENERY_RIM: 0.2,
  /** Moonlight on the floor: everywhere, in the clearing, and through gaps in the canopy (the dapple). */
  FLOOR_AMBIENT: 0.1,
  FLOOR_MOON: 0.25,
  FLOOR_DAPPLE: 1.6,
  /** How tall the floor's procedural relief is (stones, mounds, cracks), so light rakes across it. */
  FLOOR_RELIEF: 1.2,
  /** Ground fog: the veil's height (u), its thickness in the open and under the trees, and how moonlit it is. */
  FOG_Y_U: 0.35,
  FOG_VEIL: 0.34,
  FOG_EDGE: 0.35,
  FOG_BRIGHT: 0.09,
  /** Distance fog (--fog) from and to, u from the camera. */
  FOG_NEAR_U: 30,
  FOG_FAR_U: 62,
  /** The wizard's light (--player-glow): intensity and reach, u. */
  PLAYER_LIGHT: 24,
  PLAYER_LIGHT_U: 11,
  /** The pool of his light on the floor. */
  PLAYER_POOL: 2.4,
  /** How many spells in flight light the floor (a shader loop: phones pay per light). */
  FLOOR_LIGHTS: 20,
  /** Warm point-light flashes where spells land: how many at once, how long, how bright on a hit, a kill, a boss. */
  FLASH_LIGHTS: 3,
  FLASH_S: 0.22,
  FLASH_HIT: 14,
  FLASH_KILL: 30,
  FLASH_BOSS: 60,
  /** Bloom: only magic should cross the threshold. */
  BLOOM: 0.75,
  BLOOM_RADIUS: 0.4,
  BLOOM_THRESHOLD: 0.8,
  /** Blob shadows under characters. */
  SHADOW: 0.75,
  /** The final grade: vignette depth, how far the shadows lean towards moonlight, film grain. */
  VIGNETTE: 0.8,
  GRADE: 0.25,
  GRAIN: 0.03,
} as const;
