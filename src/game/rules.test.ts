import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateOxygen,
  collectOxygenCanister,
  updateThreatDistance,
  applyObstacleCollision,
  canJump,
  applyJumpCut,
  determineEscapeOutcome,
  isOverChasm,
} from './rules.ts';
import { DEFAULT_CONFIG } from './types.ts';

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
  // Freshly on ground, fresh button press
  assert.equal(canJump(true, 0, 0, DEFAULT_CONFIG), true);
  
  // Left ledge 0.05s ago (within 0.10s coyote window)
  assert.equal(canJump(false, 0.05, 0.05, DEFAULT_CONFIG), true);
  
  // Left ledge 0.20s ago (beyond coyote window)
  assert.equal(canJump(false, 0.20, 0.05, DEFAULT_CONFIG), false);
  
  // Jump pressed too long ago (beyond 0.12s buffer)
  assert.equal(canJump(true, 0, 0.25, DEFAULT_CONFIG), false);
});

test('Jump cut cuts upward velocity when released early', () => {
  const vyAscending = -500;
  const cut = applyJumpCut(vyAscending, DEFAULT_CONFIG);
  assert.equal(cut, -500 * DEFAULT_CONFIG.jumpCutMultiplier);
  
  // Downward velocity should not be cut
  const vyDescending = 200;
  assert.equal(applyJumpCut(vyDescending, DEFAULT_CONFIG), 200);
});

test('Chasm boundary detection', () => {
  const chasmStart = 150;
  const chasmWidth = 30;
  
  assert.equal(isOverChasm(140, chasmStart, chasmWidth), false);
  assert.equal(isOverChasm(155, chasmStart, chasmWidth), true);
  assert.equal(isOverChasm(180, chasmStart, chasmWidth), true);
  assert.equal(isOverChasm(185, chasmStart, chasmWidth), false);
});

test('Spacecraft escape outcome criteria matches specification', () => {
  // 5 parts: full escape
  const outcome5 = determineEscapeOutcome(5, DEFAULT_CONFIG);
  assert.equal(outcome5.reason, 'victory_escape');
  assert.equal(outcome5.title, 'You Escaped!');

  // 4 parts: liftoff and crash
  const outcome4 = determineEscapeOutcome(4, DEFAULT_CONFIG);
  assert.equal(outcome4.reason, 'victory_crash');
  assert.equal(outcome4.title, 'Launch Failed');

  // 3 parts: liftoff and crash
  const outcome3 = determineEscapeOutcome(3, DEFAULT_CONFIG);
  assert.equal(outcome3.reason, 'victory_crash');

  // 2 parts: cannot launch
  const outcome2 = determineEscapeOutcome(2, DEFAULT_CONFIG);
  assert.equal(outcome2.reason, 'victory_failed_launch');
  assert.equal(outcome2.title, 'Launch Failed');

  // 0 parts: cannot launch
  const outcome0 = determineEscapeOutcome(0, DEFAULT_CONFIG);
  assert.equal(outcome0.reason, 'victory_failed_launch');
});
