import { DEFAULT_CONFIG } from './types.ts';
import type {
  GameConfig,
  GameOverReason,
  LevelItem,
  SimulationEvents,
  SimulationInput,
  SimulationState,
} from './types.ts';

/**
 * Pure, deterministic game rules and simulation step for MOONRUN.
 * Computes all motion, collisions, and resources strictly in logical units (meters and seconds).
 */

/**
 * Safely clamps frame delta time.
 * Rejects negative, NaN, non-finite, or zero values to prevent negative distance,
 * spurious oxygen addition, or tunneling.
 */
export function clampDeltaTime(rawDt: number, maxDt: number = 0.05): number {
  if (!Number.isFinite(rawDt) || rawDt <= 0) {
    return 0;
  }
  return Math.min(rawDt, maxDt);
}

/**
 * Updates oxygen level over delta time.
 * Breathing consumes base oxygen; boosting consumes additional oxygen.
 */
export function updateOxygen(
  currentOxygen: number,
  dt: number,
  isBoosting: boolean,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (dt <= 0) return currentOxygen;
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
 * Boosting widens the gap; running at base speed slowly allows pursuer to creep closer;
 * being slowed down accelerates pursuer catchup.
 */
export function updateThreatDistance(
  currentThreat: number,
  dt: number,
  isBoosting: boolean,
  isSlowed: boolean,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (dt <= 0) return currentThreat;
  if (currentThreat <= 0) return 0;

  let delta = 0;
  if (isBoosting) {
    delta = config.boostSeparationRate * dt;
  } else if (isSlowed) {
    delta = -(config.threatBaseCatchupSpeed * 5.0) * dt;
  } else {
    delta = -config.threatBaseCatchupSpeed * dt;
  }

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
 * Applies jump cut when the jump button is released during ascent (vy > 0).
 */
export function applyJumpCut(
  vy: number,
  config: GameConfig = DEFAULT_CONFIG
): number {
  if (vy > 0) {
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
 * Checks if a horizontal track distance is over a chasm.
 */
export function isOverChasm(
  playerDistanceMeters: number,
  chasmStartMeters: number,
  chasmWidthMeters: number
): boolean {
  return (
    playerDistanceMeters >= chasmStartMeters &&
    playerDistanceMeters < chasmStartMeters + chasmWidthMeters
  );
}

/**
 * Checks AABB overlap between two 1D intervals [minA, maxA] and [minB, maxB].
 */
export function checkOverlap(
  minA: number,
  maxA: number,
  minB: number,
  maxB: number
): boolean {
  return maxA >= minB && minA <= maxB;
}

/**
 * Initializes a clean simulation state.
 */
export function createInitialSimulationState(config: GameConfig = DEFAULT_CONFIG): SimulationState {
  return {
    distanceMeters: 0,
    altitudeMeters: 0,
    vy: 0,
    isGrounded: true,
    isBoosting: false,
    timeSinceGrounded: 0,
    jumpBufferedTime: 999,
    slowdownTimer: 0,
    collisionCooldownTimer: 0,
    lastHitObstacleId: null,
    oxygen: config.maxOxygen,
    threatDistance: config.initialThreatDistance,
    partsCollected: 0,
    canistersCollected: 0,
    rocksHit: 0,
    timeElapsedSec: 0,
    boostTimeSec: 0,
    gameOverReason: null,
  };
}

/**
 * Core simulation step.
 * Takes the current state, player input, delta time, level items, and config.
 * Advances physics and gameplay rules strictly in logical meters and seconds.
 */
export function stepSimulation(
  state: SimulationState,
  input: SimulationInput,
  rawDt: number,
  items: LevelItem[],
  config: GameConfig = DEFAULT_CONFIG
): { state: SimulationState; events: SimulationEvents } {
  const events: SimulationEvents = {
    didJump: false,
    didLand: false,
    collectedOxygen: false,
    collectedPart: false,
    hitRock: false,
    lowOxygenAlarm: false,
    gameOverReason: null,
  };

  const dt = clampDeltaTime(rawDt);
  if (dt <= 0 || state.gameOverReason !== null) {
    return { state, events };
  }

  // 1. Process jump intent and early cut
  if (input.jumpPressed) {
    state.jumpBufferedTime = 0;
  }
  if (!input.jumpHeld && state.vy > 0) {
    state.vy = applyJumpCut(state.vy, config);
  }

  // 2. Resource & Boost management
  const wantsBoost = input.boostHeld && state.oxygen > 0;
  state.isBoosting = wantsBoost;
  if (wantsBoost) {
    state.boostTimeSec += dt;
  }

  state.oxygen = updateOxygen(state.oxygen, dt, wantsBoost, config);
  if (state.oxygen <= 0) {
    state.oxygen = 0;
    state.gameOverReason = 'suffocated';
    events.gameOverReason = 'suffocated';
    return { state, events };
  }

  state.timeElapsedSec += dt;

  // 3. Horizontal movement
  let speed = config.baseRunSpeed * (wantsBoost ? config.boostMultiplier : 1.0);
  if (state.slowdownTimer > 0) {
    state.slowdownTimer = Math.max(0, state.slowdownTimer - dt);
    speed *= config.collisionSlowdownFactor;
  }
  if (state.collisionCooldownTimer > 0) {
    state.collisionCooldownTimer = Math.max(0, state.collisionCooldownTimer - dt);
  }

  // Track previous altitude for landing validation
  const prevAltitude = state.altitudeMeters;

  // Check if player is against a solid wall below the rim
  const currentChasm = items.find(
    (it) => it.type === 'chasm' && isOverChasm(state.distanceMeters, it.distanceMeters, it.widthMeters ?? 10)
  );

  let newDistance = state.distanceMeters + speed * dt;

  // If player was below ground in a chasm and moves past chasm far edge,
  // they hit the vertical cliff wall below the rim!
  if (currentChasm && prevAltitude < 0) {
    const chasmEnd = currentChasm.distanceMeters + (currentChasm.widthMeters ?? 10);
    if (newDistance >= chasmEnd) {
      // Reached far bank below its top: stopped by wall
      newDistance = chasmEnd;
    }
  }

  state.distanceMeters = newDistance;

  // 4. Pursuit Threat Update
  const isSlowed = state.slowdownTimer > 0;
  state.threatDistance = updateThreatDistance(state.threatDistance, dt, wantsBoost, isSlowed, config);
  if (state.threatDistance <= 0) {
    state.threatDistance = 0;
    state.gameOverReason = 'caught';
    events.gameOverReason = 'caught';
    return { state, events };
  }

  // 5. Jump logic & Coyote timing
  state.jumpBufferedTime += dt;
  if (state.isGrounded) {
    state.timeSinceGrounded = 0;
  } else {
    state.timeSinceGrounded += dt;
  }

  if (canJump(state.isGrounded, state.timeSinceGrounded, state.jumpBufferedTime, config)) {
    state.vy = config.jumpImpulse;
    state.isGrounded = false;
    state.timeSinceGrounded = 999;
    state.jumpBufferedTime = 999;
    events.didJump = true;
  }

  // 6. Vertical trajectory & Gravity
  if (!state.isGrounded) {
    state.vy -= config.gravity * dt;
    state.altitudeMeters = prevAltitude + state.vy * dt;
  } else {
    state.altitudeMeters = 0;
    state.vy = 0;
  }

  // 7. Platform & Chasm boundary collision
  const inChasmAfterStep = items.find(
    (it) => it.type === 'chasm' && isOverChasm(state.distanceMeters, it.distanceMeters, it.widthMeters ?? 10)
  );

  if (inChasmAfterStep) {
    // Over a chasm: no solid platform below
    state.isGrounded = false;
    // Check defeat depth
    if (state.altitudeMeters <= config.defeatDepthMeters) {
      state.gameOverReason = 'fallen';
      events.gameOverReason = 'fallen';
      return { state, events };
    }
  } else {
    // Over a solid platform segment
    if (prevAltitude >= 0 && state.altitudeMeters <= 0 && state.vy <= 0) {
      // Valid landing: crossed the platform top from above
      state.altitudeMeters = 0;
      state.vy = 0;
      if (!state.isGrounded) {
        events.didLand = true;
      }
      state.isGrounded = true;
    } else if (prevAltitude < 0) {
      // Arrived at or below the far bank from inside the chasm
      // Reaching a far wall below its top must produce a fall, NEVER teleport upward!
      state.isGrounded = false;
      if (state.altitudeMeters <= config.defeatDepthMeters) {
        state.gameOverReason = 'fallen';
        events.gameOverReason = 'fallen';
        return { state, events };
      }
    } else if (state.altitudeMeters > 0) {
      // In air above solid ground
      state.isGrounded = false;
    }
  }

  // 8. Shared geometry obstacle collision (Rocks)
  const astronautHalfWidth = config.astronautWidthMeters * 0.5;
  const astronautMinX = state.distanceMeters - astronautHalfWidth;
  const astronautMaxX = state.distanceMeters + astronautHalfWidth;
  const astronautMinY = state.altitudeMeters;
  const astronautMaxY = state.altitudeMeters + config.astronautHeightMeters;

  let isCurrentlyOverlappingAnyRock = false;

  for (const item of items) {
    if (item.collected || item.type !== 'rock') continue;

    const rockWidth = item.widthMeters ?? 2.0;
    const rockHeight = item.heightMeters ?? 1.3;
    const rockMinX = item.distanceMeters - rockWidth * 0.5;
    const rockMaxX = item.distanceMeters + rockWidth * 0.5;
    const rockMinY = 0;
    const rockMaxY = rockHeight;

    const overlapsX = checkOverlap(astronautMinX, astronautMaxX, rockMinX, rockMaxX);
    const overlapsY = checkOverlap(astronautMinY, astronautMaxY, rockMinY, rockMaxY);

    if (overlapsX && overlapsY) {
      isCurrentlyOverlappingAnyRock = true;

      // Apply penalty if cooldown has expired and this isn't a repeated penalty from the same encounter
      if (state.collisionCooldownTimer <= 0 && state.lastHitObstacleId !== item.id) {
        state.rocksHit++;
        const { newThreat, slowdownDuration } = applyObstacleCollision(state.threatDistance, config);
        state.threatDistance = newThreat;
        state.slowdownTimer = slowdownDuration;
        state.collisionCooldownTimer = config.collisionCooldownSec;
        state.lastHitObstacleId = item.id;
        events.hitRock = true;
      }
    }
  }

  if (!isCurrentlyOverlappingAnyRock) {
    state.lastHitObstacleId = null;
  }

  // 9. Collectibles collision (Oxygen & Ship Parts)
  for (const item of items) {
    if (item.collected) continue;

    if (item.type === 'oxygen') {
      const itemAlt = item.altitudeMeters ?? 1.1;
      const distDiff = Math.abs(item.distanceMeters - state.distanceMeters);
      const altDiff = Math.abs(itemAlt - state.altitudeMeters);
      if (distDiff < 1.4 && altDiff < 1.6) {
        item.collected = true;
        state.canistersCollected++;
        state.oxygen = collectOxygenCanister(state.oxygen, config);
        events.collectedOxygen = true;
      }
    } else if (item.type === 'part') {
      const itemAlt = item.altitudeMeters ?? 1.2;
      const distDiff = Math.abs(item.distanceMeters - state.distanceMeters);
      const altDiff = Math.abs(itemAlt - state.altitudeMeters);
      if (distDiff < 1.4 && altDiff < 1.6) {
        item.collected = true;
        state.partsCollected++;
        events.collectedPart = true;
      }
    }
  }

  // 10. Finish line escape sequence
  if (state.distanceMeters >= config.levelLengthMeters) {
    state.distanceMeters = config.levelLengthMeters;
    const outcome = determineEscapeOutcome(state.partsCollected, config);
    state.gameOverReason = outcome.reason;
    events.gameOverReason = outcome.reason;
  }

  return { state, events };
}
