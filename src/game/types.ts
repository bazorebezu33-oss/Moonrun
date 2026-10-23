/**
 * Game configuration and tunable parameters for MOONRUN.
 *
 * Logical Coordinate System:
 * - Horizontal: distance along level track in meters (m). Distance starts at 0m and ends at levelLengthMeters (1000m).
 * - Vertical: altitude above ground level in meters (m).
 *   - altitude = 0m: on the solid ground surface.
 *   - altitude > 0m: airborne above ground.
 *   - altitude < 0m: below ground level (inside a chasm pit).
 * - Vertical velocity (vy): meters per second (m/s).
 *   - vy > 0: ascending upward.
 *   - vy < 0: descending/falling downward.
 * - Defeat depth: altitude <= defeatDepthMeters (-4.5m) triggers off-world fall defeat.
 * - Rendering maps logical (distance, altitude) into canvas pixels using viewport-scaled pixelsPerMeter.
 * - Resizing the viewport scales visual presentation only; physics outcomes remain 100% invariant.
 */

export interface GameConfig {
  // World & level
  levelLengthMeters: number; // 1000 m
  baseRunSpeed: number; // 12.0 m/s (~83s run without boost)
  boostMultiplier: number; // 1.65x (~19.8 m/s)
  
  // Logical physics in meters and seconds
  gravity: number; // 14.0 m/s^2 (downward acceleration)
  jumpImpulse: number; // 7.0 m/s (initial upward leap)
  jumpCutMultiplier: number; // 0.45 (damping on early jump release)
  coyoteTimeSec: number; // 0.10 s (100 ms)
  jumpBufferSec: number; // 0.12 s (120 ms)
  defeatDepthMeters: number; // -4.5 m (off-world defeat boundary, independent of display height)

  // Astronaut physical dimensions (meters)
  astronautWidthMeters: number; // 0.8 m
  astronautHeightMeters: number; // 1.8 m
  
  // Oxygen system
  maxOxygen: number; // 100
  breathingDrainPerSec: number; // 0.85 units/s
  boostDrainPerSec: number; // 3.8 units/s additional
  canisterRestore: number; // +25 units
  lowOxygenThreshold: number; // 25 units
  
  // Pursuit system
  initialThreatDistance: number; // 32 m behind player
  threatBaseCatchupSpeed: number; // 0.15 m/s
  boostSeparationRate: number; // 3.5 m/s
  collisionThreatLoss: number; // 6.5 m
  collisionSlowdownDuration: number; // 1.1 s
  collisionSlowdownFactor: number; // 0.55x
  collisionCooldownSec: number; // 1.2 s
  criticalThreatDistance: number; // 18 m
  
  // Escape outcomes
  partsRequiredForEscape: number; // 5 parts
  partsRequiredForCrashLaunch: number; // 3 or 4 parts
}

export const DEFAULT_CONFIG: GameConfig = {
  levelLengthMeters: 1000,
  baseRunSpeed: 12.0,
  boostMultiplier: 1.65,
  
  gravity: 14.0,
  jumpImpulse: 7.0,
  jumpCutMultiplier: 0.45,
  coyoteTimeSec: 0.10,
  jumpBufferSec: 0.12,
  defeatDepthMeters: -4.5,

  astronautWidthMeters: 0.8,
  astronautHeightMeters: 1.8,
  
  maxOxygen: 100,
  breathingDrainPerSec: 0.85,
  boostDrainPerSec: 3.8,
  canisterRestore: 25,
  lowOxygenThreshold: 25,
  
  initialThreatDistance: 32,
  threatBaseCatchupSpeed: 0.15,
  boostSeparationRate: 3.5,
  collisionThreatLoss: 6.5,
  collisionSlowdownDuration: 1.1,
  collisionSlowdownFactor: 0.55,
  collisionCooldownSec: 1.2,
  criticalThreatDistance: 18,
  
  partsRequiredForEscape: 5,
  partsRequiredForCrashLaunch: 3,
};

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameOverReason = 
  | 'suffocated' // Oxygen 0%
  | 'caught'     // Tentacles threat <= 0
  | 'fallen'     // Fell into chasm/crevasse
  | 'victory_escape'        // 5/5 parts launched into space
  | 'victory_crash'         // 3-4 parts liftoff and crash
  | 'victory_failed_launch'; // 0-2 parts cannot launch

export interface LevelItem {
  id: string;
  type: 'oxygen' | 'part' | 'rock' | 'chasm';
  distanceMeters: number; // distance along level in meters
  altitudeMeters?: number; // meters above ground level (e.g. 1.2m for floating item)
  widthMeters?: number; // width in meters
  heightMeters?: number; // height in meters
  collected?: boolean;
}

export interface SimulationState {
  distanceMeters: number;
  altitudeMeters: number;
  vy: number;
  isGrounded: boolean;
  isBoosting: boolean;
  timeSinceGrounded: number;
  jumpBufferedTime: number;
  slowdownTimer: number;
  collisionCooldownTimer: number;
  lastHitObstacleId: string | null;
  oxygen: number;
  threatDistance: number;
  partsCollected: number;
  canistersCollected: number;
  rocksHit: number;
  timeElapsedSec: number;
  boostTimeSec: number;
  gameOverReason: GameOverReason | null;
}

export interface SimulationInput {
  jumpPressed: boolean;
  jumpHeld: boolean;
  boostHeld: boolean;
}

export interface SimulationEvents {
  didJump: boolean;
  didLand: boolean;
  collectedOxygen: boolean;
  collectedPart: boolean;
  hitRock: boolean;
  lowOxygenAlarm: boolean;
  gameOverReason: GameOverReason | null;
}

export interface GameStats {
  distanceTraveledMeters: number;
  remainingDistanceMeters: number;
  oxygen: number;
  threatDistanceMeters: number;
  partsCollected: number;
  totalParts: number;
  canistersCollected: number;
  timeElapsedSec: number;
  boostTimeSec: number;
  rocksHit: number;
}
