// Every number a rule reads. Units are in the name: world units (u, one unit is about a ship's length), seconds (S),
// per-second rates (PER_S). Content (enemies, waves, upgrades) lives in content/*.kdl; this is the physics and pacing.

export const T = {
  // Arena: a landscape rectangle centred on the origin, sized so a phone in landscape shows most of it at once.
  ARENA_W_U: 34,
  ARENA_H_U: 20,

  // Player ship
  PLAYER_R_U: 0.45,
  PLAYER_SPEED_U_PER_S: 9,
  /** How fast the ship reaches its stick velocity: high so it feels tight on a touchscreen, not icy. */
  PLAYER_ACCEL_PER_S: 14,
  PLAYER_HP: 5,
  /** After a hit the ship blinks and can't be hurt, so one swarm can't drain the bar in a frame. */
  HURT_INVULN_S: 1.1,
  /** A stick push shorter than this is a thumb resting, not an order. */
  STICK_DEADZONE: 0.18,

  // Player gun (upgrades multiply these)
  FIRE_RATE_PER_S: 7,
  SHOT_SPEED_U_PER_S: 28,
  SHOT_DAMAGE: 1,
  SHOT_LIFE_S: 0.9,
  SHOT_R_U: 0.18,
  /** Extra barrels fan out this many degrees apart. */
  SPREAD_STEP_DEG: 9,

  // Enemy shots
  ENEMY_SHOT_R_U: 0.28,
  ENEMY_SHOT_LIFE_S: 4,
  ENEMY_SHOT_DAMAGE: 1,
  /** A lobbed mortar round's flight time: the landing ring is on screen this long, the dodge window. */
  LOB_FLIGHT_S: 1.25,
  /** How fast a shielded enemy can turn its shield to face the ship. */
  ENEMY_TURN_RAD_PER_S: 1.6,
  /** How quickly enemies reach the velocity their movement word wants: they have heft, unlike the ship. */
  ENEMY_ACCEL_PER_S: 4,
  /** A dasher creeps at this fraction of its charge speed between charges. */
  DASH_CREEP: 0.12,
  /** Minimum rest between charges, and how close the ship must be for one. */
  DASH_REST_S: 1.6,
  DASH_RANGE_U: 13,
  /** How long a charge lasts. */
  DASH_S: 0.55,
  BLINK_DRIFT_U_PER_S: 1.2,
  /** How long a blink destination is marked before the blinker lands on it. */
  BLINK_MARK_S: 0.55,
  BURST_SHOT_U_PER_S: 7,
  /** How far a spiral pattern turns between volleys: about 20 degrees reads as a spiral, not a ring. */
  SPIRAL_TURN_RAD: 0.35,
  SPIRAL_SHOT_U_PER_S: 6,
  /** Mortars aim where the ship will be this fraction of the flight from now (full lead is unfair on a touchscreen). */
  LOB_LEAD: 0.45,
  SPLIT_KICK_U_PER_S: 7,
  /** How often a healer's mend shows as a pulse (the healing itself is continuous). */
  HEAL_PULSE_S: 0.6,
  /** Enemies push apart so a swarm reads as a crowd, not one blob. */
  SEPARATION_PER_S: 6,

  // Spawning
  /** A warp gate glows this long before the enemy steps out: the player's chance to read what's coming. */
  WARP_S: 0.9,
  /** Enemies never warp in closer than this to the ship. */
  SPAWN_MIN_DIST_U: 7,
  /** Past the last wave in waves.kdl the list loops, each loop tougher by this much hp. */
  LOOP_HP_MULT: 1.6,

  // Pickups and score
  SHARD_R_U: 0.35,
  SHARD_LIFE_S: 9,
  SHARD_SPEED_U_PER_S: 16,
  MAGNET_U: 2.6,
  /** Score per shard, times the multiplier. */
  SHARD_SCORE: 2,
  ELITE_SHARDS: 4,
  BOSS_SHARDS: 30,
  /** How long an enemy glows after a hit. */
  HIT_FLASH_S: 0.08,
  /** Each shard adds this to the multiplier; being hit drops it back to 1. */
  MULT_PER_SHARD: 0.05,
  MULT_MAX: 9.95,
  /** Chance a kill also drops a repair kit (heals 1). */
  REPAIR_DROP_CHANCE: 0.035,

  // Between waves
  UPGRADE_CHOICES: 3,
  /** A beat after the last kill before the upgrade picker opens, so the final explosion reads. */
  CLEAR_PAUSE_S: 1.2,
} as const;
