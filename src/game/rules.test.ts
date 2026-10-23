import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyJumpCut,
  applyObstacleCollision,
  canJump,
  clampDeltaTime,
  collectOxygenCanister,
  createInitialSimulationState,
  determineEscapeOutcome,
  isOverChasm,
  stepSimulation,
  updateOxygen,
  updateThreatDistance,
} from './rules.ts';
import { DEFAULT_CONFIG } from './types.ts';
import { generateLevel } from './levelData.ts';

test('clampDeltaTime rejects negative, zero, and non-finite timestamps', () => {
  assert.equal(clampDeltaTime(-0.016), 0, 'Negative delta time must clamp to 0');
  assert.equal(clampDeltaTime(-5.0), 0, 'Stale animation timestamp must clamp to 0');
  assert.equal(clampDeltaTime(0), 0, 'Zero dt must clamp to 0');
  assert.equal(clampDeltaTime(NaN), 0, 'NaN dt must clamp to 0');
  assert.equal(clampDeltaTime(Infinity), 0, 'Infinite dt must clamp to 0');
  assert.equal(clampDeltaTime(0.016), 0.016, 'Normal 60fps dt passes through');
  assert.equal(clampDeltaTime(0.12), 0.05, 'Large lag spike clamps to maxDt (0.05s)');
});

test('Regression: older animation timestamp does not distort distance or add unearned oxygen', () => {
  const items = generateLevel();
  const state = createInitialSimulationState(DEFAULT_CONFIG);
  state.oxygen = 80;
  state.distanceMeters = 50;

  const noInput = { jumpPressed: false, jumpHeld: false, boostHeld: false };

  // Simulate an older frame timestamp producing negative dt (-0.05s)
  const result = stepSimulation(state, noInput, -0.05, items, DEFAULT_CONFIG);

  assert.equal(result.state.distanceMeters, 50, 'Distance must not regress with negative dt');
  assert.equal(result.state.oxygen, 80, 'Oxygen must not increase with negative dt');
});

test('Oxygen drains faster during boost', () => {
  const dt = 1.0;
  const initial = 100;
  const normalAfter = updateOxygen(initial, dt, false, DEFAULT_CONFIG);
  const boostAfter = updateOxygen(initial, dt, true, DEFAULT_CONFIG);

  assert.ok(normalAfter < initial);
  assert.ok(boostAfter < normalAfter);
  assert.equal(normalAfter, initial - DEFAULT_CONFIG.breathingDrainPerSec * dt);
  assert.equal(
    boostAfter,
    initial - (DEFAULT_CONFIG.breathingDrainPerSec + DEFAULT_CONFIG.boostDrainPerSec) * dt
  );
});

test('Oxygen canister restores 25 units capped at max 100', () => {
  assert.equal(collectOxygenCanister(50, DEFAULT_CONFIG), 75);
  assert.equal(collectOxygenCanister(90, DEFAULT_CONFIG), 100);
  assert.equal(collectOxygenCanister(100, DEFAULT_CONFIG), 100);
});

test('Pursuit threat increases during boost and closes during slowdown', () => {
  const dt = 1.0;
  const initialThreat = 30;

  const boostedThreat = updateThreatDistance(initialThreat, dt, true, false, DEFAULT_CONFIG);
  assert.ok(boostedThreat > initialThreat, 'Boosting widens the gap to pursuer');

  const slowedThreat = updateThreatDistance(initialThreat, dt, false, true, DEFAULT_CONFIG);
  assert.ok(slowedThreat < initialThreat, 'Slowed player lets pursuer close in faster');
});

test('Obstacle collision immediately reduces threat distance and applies slowdown', () => {
  const initialThreat = 30;
  const { newThreat, slowdownDuration } = applyObstacleCollision(initialThreat, DEFAULT_CONFIG);

  assert.equal(newThreat, initialThreat - DEFAULT_CONFIG.collisionThreatLoss);
  assert.equal(slowdownDuration, DEFAULT_CONFIG.collisionSlowdownDuration);
});

test('Coyote time and jump buffering logic', () => {
  assert.equal(canJump(true, 0, 0, DEFAULT_CONFIG), true);
  assert.equal(canJump(false, 0.05, 0.05, DEFAULT_CONFIG), true);
  assert.equal(canJump(false, 0.20, 0.05, DEFAULT_CONFIG), false);
  assert.equal(canJump(true, 0, 0.25, DEFAULT_CONFIG), false);
});

test('Jump cut cuts upward velocity when released early', () => {
  const vyAscending = 6.0;
  const cut = applyJumpCut(vyAscending, DEFAULT_CONFIG);
  assert.equal(cut, 6.0 * DEFAULT_CONFIG.jumpCutMultiplier);

  const vyDescending = -4.0;
  assert.equal(applyJumpCut(vyDescending, DEFAULT_CONFIG), -4.0);
});

test('Chasm boundary detection', () => {
  const chasmStart = 175;
  const chasmWidth = 9.5;

  assert.equal(isOverChasm(170, chasmStart, chasmWidth), false);
  assert.equal(isOverChasm(175, chasmStart, chasmWidth), true);
  assert.equal(isOverChasm(180, chasmStart, chasmWidth), true);
  assert.equal(isOverChasm(184.4, chasmStart, chasmWidth), true);
  assert.equal(isOverChasm(184.6, chasmStart, chasmWidth), false);
});

test('Regression: no-jump traversal across chasm results in falling defeat (normal speed and boost speed)', () => {
  const items = generateLevel();

  // 1. Normal run into chasm 1 (175m) without jumping
  let stateNormal = createInitialSimulationState(DEFAULT_CONFIG);
  stateNormal.distanceMeters = 170; // 5 meters before chasm

  const noJumpInput = { jumpPressed: false, jumpHeld: false, boostHeld: false };

  // Step simulation until player reaches chasm and falls
  for (let step = 0; step < 120; step++) {
    const res = stepSimulation(stateNormal, noJumpInput, 0.016, items, DEFAULT_CONFIG);
    stateNormal = res.state;
    if (stateNormal.gameOverReason !== null) break;
  }

  assert.equal(stateNormal.gameOverReason, 'fallen', 'Normal run into chasm without jumping must result in fallen defeat');
  assert.ok(stateNormal.altitudeMeters <= DEFAULT_CONFIG.defeatDepthMeters, 'Player fell below defeat depth');

  // 2. Boost speed into chasm 1 (175m) without jumping
  let stateBoost = createInitialSimulationState(DEFAULT_CONFIG);
  stateBoost.distanceMeters = 170;

  const boostNoJump = { jumpPressed: false, jumpHeld: false, boostHeld: true };

  for (let step = 0; step < 120; step++) {
    const res = stepSimulation(stateBoost, boostNoJump, 0.016, items, DEFAULT_CONFIG);
    stateBoost = res.state;
    if (stateBoost.gameOverReason !== null) break;
  }

  assert.equal(stateBoost.gameOverReason, 'fallen', 'Boosting into chasm without jumping must result in fallen defeat, not a ground snap');
});

test('Regression: reaching the far bank below the surface produces a fall and NEVER teleports upward', () => {
  const items = generateLevel();
  // Chasm 1 is at [175m, 184.5m]
  const chasm = items.find((it) => it.id === 'chasm_1')!;
  const chasmEnd = chasm.distanceMeters + (chasm.widthMeters ?? 9.5); // 184.5m

  // Simulate early jump at 171.8m
  let state = createInitialSimulationState(DEFAULT_CONFIG);
  state.distanceMeters = 171.8;

  // Jump triggered
  const jumpInput = { jumpPressed: true, jumpHeld: true, boostHeld: false };
  let res = stepSimulation(state, jumpInput, 0.016, items, DEFAULT_CONFIG);
  state = res.state;

  const normalHeld = { jumpPressed: false, jumpHeld: true, boostHeld: false };

  // Advance simulation through the arc
  let reachedFarBankBelowSurface = false;
  let didSnapUpward = false;

  for (let i = 0; i < 200; i++) {
    const prevDist = state.distanceMeters;
    const prevAlt = state.altitudeMeters;

    res = stepSimulation(state, normalHeld, 0.016, items, DEFAULT_CONFIG);
    state = res.state;

    // Check if player crossed chasmEnd while altitude was negative
    if (prevDist <= chasmEnd && state.distanceMeters >= chasmEnd && prevAlt < 0) {
      reachedFarBankBelowSurface = true;
      if (state.altitudeMeters >= 0 && state.isGrounded) {
        didSnapUpward = true;
      }
    }

    if (state.gameOverReason !== null) break;
  }

  assert.equal(didSnapUpward, false, 'Astronaut must never be snapped upward onto the surface from below the rim');
  assert.equal(state.gameOverReason, 'fallen', 'Undershooting the jump must result in falling defeat');
});

test('Regression: identical input sequences yield 100% identical simulation state regardless of viewport dimensions', () => {
  const itemsA = generateLevel();
  const itemsB = generateLevel();

  // Run two separate simulation instances simulating different viewports (1280x720 vs 640x360)
  let stateA = createInitialSimulationState(DEFAULT_CONFIG);
  let stateB = createInitialSimulationState(DEFAULT_CONFIG);

  const inputs: { jumpPressed: boolean; jumpHeld: boolean; boostHeld: boolean }[] = [];
  // 60 frames of varying inputs
  for (let f = 0; f < 60; f++) {
    inputs.push({
      jumpPressed: f === 10 || f === 45,
      jumpHeld: f >= 10 && f <= 30,
      boostHeld: f >= 20 && f <= 50,
    });
  }

  for (let f = 0; f < 60; f++) {
    stateA = stepSimulation(stateA, inputs[f], 0.016, itemsA, DEFAULT_CONFIG).state;
    stateB = stepSimulation(stateB, inputs[f], 0.016, itemsB, DEFAULT_CONFIG).state;

    assert.equal(stateA.distanceMeters, stateB.distanceMeters, `Frame ${f}: distance must be bit-for-bit identical`);
    assert.equal(stateA.altitudeMeters, stateB.altitudeMeters, `Frame ${f}: altitude must be bit-for-bit identical`);
    assert.equal(stateA.vy, stateB.vy, `Frame ${f}: vy must be bit-for-bit identical`);
    assert.equal(stateA.oxygen, stateB.oxygen, `Frame ${f}: oxygen must be bit-for-bit identical`);
    assert.equal(stateA.threatDistance, stateB.threatDistance, `Frame ${f}: threat must be bit-for-bit identical`);
    assert.equal(stateA.isGrounded, stateB.isGrounded, `Frame ${f}: grounded state must be bit-for-bit identical`);
  }
});

test('Obstacle collision applies one readable penalty with cooldown against repeating in same encounter', () => {
  const items = generateLevel();
  // rock_1 is at 55m, width 2.0m, height 1.3m
  let state = createInitialSimulationState(DEFAULT_CONFIG);
  state.distanceMeters = 53.5; // entering rock hitbox

  const noInput = { jumpPressed: false, jumpHeld: false, boostHeld: false };

  // First step hits the rock
  const res1 = stepSimulation(state, noInput, 0.016, items, DEFAULT_CONFIG);
  state = res1.state;

  assert.equal(state.rocksHit, 1, 'First encounter increments rocksHit to 1');
  assert.equal(res1.events.hitRock, true, 'Hit rock event fired on first contact');
  assert.ok(state.slowdownTimer > 0, 'Slowdown timer active');
  assert.ok(state.collisionCooldownTimer > 0, 'Collision cooldown active');

  // Next steps still inside the 2.0m rock bounds (at 12*0.55 = 6.6 m/s, traversing takes ~0.3s)
  for (let i = 0; i < 5; i++) {
    const resNext = stepSimulation(state, noInput, 0.016, items, DEFAULT_CONFIG);
    state = resNext.state;
    assert.equal(state.rocksHit, 1, 'Same rock encounter must not re-trigger penalties during cooldown');
    assert.equal(resNext.events.hitRock, false, 'No repeated hit event inside same rock');
  }
});

test('Spacecraft escape outcome criteria matches specification', () => {
  assert.equal(determineEscapeOutcome(5, DEFAULT_CONFIG).reason, 'victory_escape');
  assert.equal(determineEscapeOutcome(4, DEFAULT_CONFIG).reason, 'victory_crash');
  assert.equal(determineEscapeOutcome(3, DEFAULT_CONFIG).reason, 'victory_crash');
  assert.equal(determineEscapeOutcome(2, DEFAULT_CONFIG).reason, 'victory_failed_launch');
  assert.equal(determineEscapeOutcome(0, DEFAULT_CONFIG).reason, 'victory_failed_launch');
});
