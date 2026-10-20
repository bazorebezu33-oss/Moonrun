/**
 * Game configuration and tunable parameters for MOONRUN
 */

export interface GameConfig {
  // World & level
  levelLengthMeters: number; // e.g. 1000 m
  baseRunSpeed: number; // base world meters per second (approx 12 m/s -> ~83s run)
  boostMultiplier: number; // 1.6x speed
  
  // Physics (low lunar gravity)
  gravity: number; // px/s^2 in canvas coordinate space
  jumpImpulse: number; // initial jump velocity (negative for upward)
  jumpCutMultiplier: number; // factor applied to vertical speed if jump key released early
  coyoteTimeSec: number; // 0.10s (100ms)
  jumpBufferSec: number; // 0.12s (120ms)
  
  // Oxygen system
  maxOxygen: number; // 100
  breathingDrainPerSec: number; // ~0.9 units/s
  boostDrainPerSec: number; // ~3.6 units/s additional
  canisterRestore: number; // +25 units
  lowOxygenThreshold: number; // 25 units
  
  // Pursuit system
  initialThreatDistance: number; // meters behind player at start (e.g. 35m)
  threatBaseCatchupSpeed: number; // meters/s the pursuer gains when player runs at base speed
  boostSeparationRate: number; // meters/s player widens the gap while boosting
  collisionThreatLoss: number; // meters lost immediately on obstacle collision (e.g. 7m)
  collisionSlowdownDuration: number; // seconds player is slowed down
  collisionSlowdownFactor: number; // speed multiplier while slowed (0.55x)
  collisionCooldownSec: number; // immune window against repeated obstacle hits (1.2s)
  criticalThreatDistance: number; // meters where danger alarm triggers (< 20m)
  
  // Escape outcomes
  partsRequiredForEscape: number; // 5 parts
  partsRequiredForCrashLaunch: number; // 3 or 4 parts
  // 0-2 parts = cannot launch
}

export const DEFAULT_CONFIG: GameConfig = {
  levelLengthMeters: 1000,
  baseRunSpeed: 12.0, // m/s (1000m / 12m/s ~ 83s)
  boostMultiplier: 1.65,
  
  // Physics scaled for standard 1920x1080 / responsive canvas
  gravity: 1250, // low lunar gravity floatiness
  jumpImpulse: -560, // lunar high leap
  jumpCutMultiplier: 0.45,
  coyoteTimeSec: 0.10, // 100 ms
  jumpBufferSec: 0.12, // 120 ms
  
  // Oxygen
  maxOxygen: 100,
  breathingDrainPerSec: 0.85,
  boostDrainPerSec: 3.8,
  canisterRestore: 25,
  lowOxygenThreshold: 25,
  
  // Threat / Pursuer
  initialThreatDistance: 32, // meters
  threatBaseCatchupSpeed: 0.15, // steady slow creep if player never boosts or hits obstacles
  boostSeparationRate: 3.5, // player pulls away during boost
  collisionThreatLoss: 6.5, // pursuer surges forward
  collisionSlowdownDuration: 1.1,
  collisionSlowdownFactor: 0.55,
  collisionCooldownSec: 1.2,
  criticalThreatDistance: 18,
  
  // Repair parts
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
  distanceMeters: number; // distance along level
  yOffset?: number; // relative to ground level (e.g. -60 for floating air canister, 0 for ground)
  widthMeters?: number; // width for chasms or rocks
  heightMeters?: number; // height for rocks
  collected?: boolean;
}

export interface PlayerPhysicsState {
  x: number; // screen X anchor (usually 25% of screen width)
  y: number; // canvas Y position
  vy: number; // vertical velocity
  isGrounded: boolean;
  isBoosting: boolean;
  timeSinceGrounded: number; // for coyote time
  jumpBufferedTime: number; // for jump buffering
  slowdownTimer: number; // duration remaining for hit slowdown
  collisionCooldownTimer: number; // cooldown against repeating hit
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
