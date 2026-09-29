// Look numbers: how bright the night is, how thick the fog, how hard the moon catches an edge, how spells light the
// scene. They live as `--look-*` tokens in screens/shared.css :root beside the palette, so the render is tuned in the
// stylesheet; this is the typed view the shell reads (`--look-fog-near-u` is `LOOK.FOG_NEAR_U`). Catalog: ## Look.
import { TOKENS } from '../tokens';

const KEYS = [
  'CAMERA_TILT_RAD', 'CAMERA_FOLLOW', 'CAMERA_FOV_DEG', 'CAMERA_DIST_U', 'CHARACTER_PAD_U', 'WIZARD_SCALE', 'WIZARD_HALO',
  'BODY_LUM', 'FACETED', 'EXPOSURE', 'MOON_KEY', 'MOON_FILL', 'ENV', 'RIM', 'RIM_POWER', 'SCENERY_RIM', 'SURFACE_GRAIN',
  'SURFACE_BUMP', 'FLOOR_RELIEF', 'GROUND_TEXELS_PER_U', 'FOG_Y_U', 'FOG_VEIL', 'FOG_EDGE', 'FOG_BRIGHT', 'FOG_NEAR_U',
  'FOG_FAR_U', 'PLAYER_LIGHT', 'PLAYER_LIGHT_U', 'FLOOR_LIGHTS', 'STATIC_LIGHTS', 'LANTERN_LIGHT', 'MOTES_PER_S',
  'FLASH_LIGHTS', 'FLASH_S', 'FLASH_HIT', 'FLASH_KILL', 'FLASH_BOSS', 'BLOOM', 'BLOOM_RADIUS', 'BLOOM_THRESHOLD', 'SHADOW',
  'STAINS', 'STAIN_S', 'SHADOW_MAP_PX', 'BERM_U', 'BERM_W_U', 'CANOPY_Y_U', 'VIGNETTE', 'GRADE', 'GRAIN', 'SATURATION',
  'TRIM_LUM', 'CLOTH_LUM', 'GLOW_LUM', 'BODY_GLOW', 'WOUND_GLOW', 'HIT_GLOW', 'WIZARD_GLOW', 'SCENERY_GLOW', 'CLIP_BLEND_S',
  'LUNGE_U', 'WIZARD_HALO_U', 'FLASH_U', 'STAIN', 'MOTE', 'RIPPLES', 'HURL_ARC_U', 'SHAKE_DECAY_PER_S', 'TRAILED_SPELLS',
  'SPARK_DRAG_PER_S', 'SPARK_GLOW', 'ABERRATION', 'HURT_WASH', 'STICK_REACH_PX', 'STICK_KNOB_PX',
] as const;
export type LookKey = (typeof KEYS)[number];

/** The token a look key reads: `FOG_NEAR_U` is `--look-fog-near-u`. */
export const lookToken = (k: string) => `--look-${k.toLowerCase().replaceAll('_', '-')}`;

/** A look token's numbers (space-separated); throws naming the token when one is missing or isn't numbers. */
function read(k: string): number[] {
  const raw = TOKENS[lookToken(k)], v = raw === undefined ? [NaN] : raw.split(/\s+/).map(Number);
  if (v.some(Number.isNaN)) throw new Error(`look: \`${lookToken(k)}\` in shared.css :root is ${raw === undefined ? 'missing' : `"${raw}", not numbers`}`);
  return v;
}

export const LOOK = Object.fromEntries(KEYS.map((k) => [k, read(k)[0]!])) as Record<LookKey, number>;
/** Towards the moon, x y z (`--look-moon-dir`). */
export const MOON_DIR_XYZ = read('MOON_DIR') as [number, number, number];
/** Every look key the shell reads (the catalog test checks no token goes unread). */
export const LOOK_KEYS: string[] = [...KEYS, 'MOON_DIR'];
