import { DEFAULT_CONFIG } from './types.ts';
import type { GameConfig, GameOverReason } from './types.ts';

/**
 * Pure game rules and state calculation functions.
 * Designed to be testable with Node's native test runner without DOM or browser dependencies.
 */

/**
 * Updates oxygen level over a delta time step.
 * Breathing consumes base oxygen; boosting consumes additional oxygen.
 */
export function updateOxygen(
  currentOxygen: number,
  dt: number,
  isBoosting: boolean,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (currentOxygen <= 0) return 0;
  
  let drain = config.breathingDrainPerSec * dt;
  if (isBoosting) {
    drain += config.boostDrainPerSec * dt;
  }
  
  return Math.max(0, currentOxygen - drain);
}

/**
 * Adds oxygen from a collected canister, capped at maxOxygen.
 */
export function collectOxygenCanister(
  currentOxygen: number,
  config: GameConfig = DEFAULT_CONFIG
): number {
  return Math.min(config.maxOxygen, currentOxygen + config.canisterRestore);
}

/**
 * Updates pursuit threat distance (in meters).
 * Boosting pulls away from pursuer; running at base speed slowly closes in;
 * being slowed down accelerates pursuer catchup.
 */
export function updateThreatDistance(
  currentThreat: number,
  dt: number,
  isBoosting: boolean,
  isSlowed: boolean,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (currentThreat <= 0) return 0;

  let delta = 0;
  if (isBoosting) {
    // Player pulls away from tentacles
    delta = config.boostSeparationRate * dt;
  } else if (isSlowed) {
    // Slowed player suffers heavy pursuer catchup
    delta = -(config.threatBaseCatchupSpeed * 5.0) * dt;
  } else {
    // Standard run slowly loses ground over time if never boosting
    delta = -config.threatBaseCatchupSpeed * dt;
  }

  // Cap threat distance between 0 and 60 meters maximum
  return Math.max(0, Math.min(60, currentThreat + delta));
}

/**
 * Applies obstacle collision penalty: immediate threat distance loss,
 * slows down the player, and returns updated threat distance.
 */
export function applyObstacleCollision(
  currentThreat: number,
  config: GameConfig = DEFAULT_CONFIG
): { newThreat: number; slowdownDuration: number } {
  const newThreat = Math.max(0, currentThreat - config.collisionThreatLoss);
  return {
    newThreat,
    slowdownDuration: config.collisionSlowdownDuration,
  };
}

/**
 * Evaluates whether a jump can occur using coyote time and jump buffering.
 */
export function canJump(
  isGrounded: boolean,
  timeSinceGrounded: number,
  jumpBufferedTime: number,
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  const hasValidBuffer = jumpBufferedTime <= config.jumpBufferSec;
  const hasCoyote = isGrounded || timeSinceGrounded <= config.coyoteTimeSec;
  return hasValidBuffer && hasCoyote;
}

/**
 * Applies jump cut when the jump button is released during ascent.
 */
export function applyJumpCut(
  vy: number,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (vy < 0) {
    return vy * config.jumpCutMultiplier;
  }
  return vy;
}

/**
 * Determines the outcome upon reaching the spacecraft based on parts collected.
 */
export function determineEscapeOutcome(
  partsCollected: number,
  config: GameConfig = DEFAULT_CONFIG
): { reason: GameOverReason; title: string; description: string; canRetry: boolean } {
  if (partsCollected >= config.partsRequiredForEscape) {
    return {
      reason: 'victory_escape',
      title: 'You Escaped!',
      description: 'All 5 repair parts secured. Spacecraft engines engaged at maximum thrust, breaking lunar orbit!',
      canRetry: true,
    };
  } else if (partsCollected >= config.partsRequiredForCrashLaunch) {
    return {
      reason: 'victory_crash',
      title: 'Launch Failed',
      description: 'Not enough ship parts collected. Incomplete propulsion repairs caused mid-flight engine blowout.',
      canRetry: true,
    };
  } else {
    return {
      reason: 'victory_failed_launch',
      title: 'Launch Failed',
      description: 'Not enough ship parts collected. Critical guidance and thruster assemblies missing. Cannot ignite engines.',
      canRetry: true,
    };
  }
}

/**
 * Checks if player falls into a deep chasm.
 * Returns true if the player's ground contact is over an active chasm.
 */
export function isOverChasm(
  playerDistanceMeters: number,
  chasmStartMeters: number,
  chasmWidthMeters: number
): boolean {
  return (
    playerDistanceMeters >= chasmStartMeters &&
    playerDistanceMeters <= chasmStartMeters + chasmWidthMeters
  );
}

/**
 * AABB 1D or 2D overlap check helper
 */
export function checkOverlap(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number
): boolean {
  return maxA >= minB && minA <= maxB;
}
