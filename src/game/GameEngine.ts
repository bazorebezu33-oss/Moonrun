import { DEFAULT_CONFIG, GameConfig, GameOverReason, GameState, GameStats, LevelItem, PlayerPhysicsState } from './types.ts';
import { generateLevel } from './levelData.ts';
import {
  applyJumpCut,
  applyObstacleCollision,
  canJump,
  collectOxygenCanister,
  determineEscapeOutcome,
  isOverChasm,
  updateOxygen,
  updateThreatDistance,
} from './rules.ts';
import { sound } from './audio.ts';
import { GameRenderer } from './renderer.ts';

export class GameEngine {
  private config: GameConfig = { ...DEFAULT_CONFIG };
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;
  private state: GameState = 'title';
  private gameOverReason: GameOverReason | null = null;
  private animFrameId: number | null = null;
  private lastTime: number = 0;

  // Level & Items
  private items: LevelItem[] = [];
  private distanceTraveledMeters: number = 0;

  // Player physics
  private player: PlayerPhysicsState = {
    x: 0,
    y: 0,
    vy: 0,
    isGrounded: true,
    isBoosting: false,
    timeSinceGrounded: 0,
    jumpBufferedTime: 999,
    slowdownTimer: 0,
    collisionCooldownTimer: 0,
  };

  // Resources & Stats
  private oxygen: number = 100;
  private threatDistance: number = 32; // meters
  private partsCollected: number = 0;
  private canistersCollected: number = 0;
  private rocksHit: number = 0;
  private timeElapsedSec: number = 0;
  private boostTimeSec: number = 0;

  // Low oxygen alarm timer
  private alarmTimer: number = 0;

  // Input states
  private keysHeld: Set<string> = new Set();
  private touchJumpHeld: boolean = false;
  private touchBoostHeld: boolean = false;

  // Callbacks for UI updates
  private onStatsUpdate?: (stats: GameStats) => void;
  private onStateChange?: (state: GameState, reason: GameOverReason | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    onStatsUpdate?: (stats: GameStats) => void,
    onStateChange?: (state: GameState, reason: GameOverReason | null) => void
  ) {
    this.canvas = canvas;
    this.renderer = new GameRenderer(canvas);
    this.onStatsUpdate = onStatsUpdate;
    this.onStateChange = onStateChange;

    this.setupWindowListeners();
    this.handleResize();
    this.resetGame();
  }

  public setCallbacks(
    onStatsUpdate: (stats: GameStats) => void,
    onStateChange: (state: GameState, reason: GameOverReason | null) => void
  ) {
    this.onStatsUpdate = onStatsUpdate;
    this.onStateChange = onStateChange;
  }

  public handleResize() {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.renderer.resize(w, h);
    this.player.x = w * 0.25;
    if (this.player.isGrounded) {
      this.player.y = h * 0.72;
    }
  }

  public resetGame() {
    this.items = generateLevel();
    this.distanceTraveledMeters = 0;
    this.oxygen = this.config.maxOxygen;
    this.threatDistance = this.config.initialThreatDistance;
    this.partsCollected = 0;
    this.canistersCollected = 0;
    this.rocksHit = 0;
    this.timeElapsedSec = 0;
    this.boostTimeSec = 0;
    this.gameOverReason = null;

    const groundY = this.canvas.height * 0.72;
    this.player = {
      x: this.canvas.width * 0.25,
      y: groundY,
      vy: 0,
      isGrounded: true,
      isBoosting: false,
      timeSinceGrounded: 0,
      jumpBufferedTime: 999,
      slowdownTimer: 0,
      collisionCooldownTimer: 0,
    };

    sound.setBoosting(false);
    this.emitStats();
  }

  public startGame() {
    sound.init();
    sound.resume();
    this.resetGame();
    this.setState('playing', null);
    this.lastTime = performance.now();
    if (!this.animFrameId) {
      this.loop(this.lastTime);
    }
  }

  public pauseGame() {
    if (this.state === 'playing') {
      this.setState('paused', null);
      sound.setBoosting(false);
    }
  }

  public resumeGame() {
    if (this.state === 'paused') {
      sound.resume();
      this.lastTime = performance.now();
      this.setState('playing', null);
      if (!this.animFrameId) {
        this.loop(this.lastTime);
      }
    }
  }

  public restartGame() {
    this.resetGame();
    this.startGame();
  }

  public getState(): GameState {
    return this.state;
  }

  public getGameOverReason(): GameOverReason | null {
    return this.gameOverReason;
  }

  public getPartsCollected(): number {
    return this.partsCollected;
  }

  private setState(newState: GameState, reason: GameOverReason | null = null) {
    this.state = newState;
    this.gameOverReason = reason;
    document.body.dataset.state = newState;
    this.onStateChange?.(newState, reason);
  }

  // --- Input Management ---

  private setupWindowListeners() {
    window.addEventListener('keydown', (e) => {
      // Audio start on first interaction
      sound.resume();

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.triggerJumpPress();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keysHeld.add('Shift');
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (this.state === 'playing') {
          this.pauseGame();
        } else if (this.state === 'paused') {
          this.resumeGame();
        }
      } else if (e.code === 'KeyR') {
        if (this.state === 'gameover' || this.state === 'paused') {
          this.restartGame();
        }
      } else if (e.code === 'KeyM') {
        sound.toggleMute();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        this.triggerJumpRelease();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keysHeld.delete('Shift');
      }
    });

    // Clear keys on window blur so inputs don't stick
    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.touchJumpHeld = false;
      this.touchBoostHeld = false;
      sound.setBoosting(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') {
        this.pauseGame();
      }
    });
  }

  public setTouchJump(pressed: boolean) {
    sound.resume();
    this.touchJumpHeld = pressed;
    if (pressed) {
      this.triggerJumpPress();
    } else {
      this.triggerJumpRelease();
    }
  }

  public setTouchBoost(pressed: boolean) {
    sound.resume();
    this.touchBoostHeld = pressed;
  }

  private triggerJumpPress() {
    if (this.state !== 'playing') return;
    this.player.jumpBufferedTime = 0; // Fresh jump buffer
  }

  private triggerJumpRelease() {
    if (this.player.vy < 0) {
      this.player.vy = applyJumpCut(this.player.vy, this.config);
    }
  }

  // --- Simulation Loop ---

  public startLoop() {
    if (!this.animFrameId) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  public stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (time: number) => {
    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // Clamp dt to prevent tunneling or huge jumps after lag spikes
    const dt = Math.min(rawDt, 0.05);

    if (this.state === 'playing') {
      this.update(dt);
    }

    // Always render so animations or end camera continue
    this.render(dt);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.timeElapsedSec += dt;

    // Check boost intent
    const wantsBoost = (this.keysHeld.has('Shift') || this.touchBoostHeld) && this.oxygen > 0;
    this.player.isBoosting = wantsBoost;
    sound.setBoosting(wantsBoost);

    if (wantsBoost) {
      this.boostTimeSec += dt;
    }

    // 1. Oxygen update
    this.oxygen = updateOxygen(this.oxygen, dt, wantsBoost, this.config);
    if (this.oxygen <= 0) {
      sound.setBoosting(false);
      this.triggerGameOver('suffocated');
      return;
    }

    // Low oxygen audible alarm
    if (this.oxygen < this.config.lowOxygenThreshold) {
      this.alarmTimer += dt;
      if (this.alarmTimer > 1.2) {
        this.alarmTimer = 0;
        sound.playLowOxygenAlarm();
      }
    }
    sound.updateBreathing(this.timeElapsedSec, this.oxygen < this.config.lowOxygenThreshold);

    // 2. Movement & Speed
    let currentSpeed = this.config.baseRunSpeed;
    if (wantsBoost) {
      currentSpeed *= this.config.boostMultiplier;
    }
    if (this.player.slowdownTimer > 0) {
      this.player.slowdownTimer -= dt;
      currentSpeed *= this.config.collisionSlowdownFactor;
    }
    if (this.player.collisionCooldownTimer > 0) {
      this.player.collisionCooldownTimer -= dt;
    }

    // Advance world distance
    this.distanceTraveledMeters += currentSpeed * dt;

    // 3. Pursuit Threat Update
    const isSlowed = this.player.slowdownTimer > 0;
    this.threatDistance = updateThreatDistance(
      this.threatDistance,
      dt,
      wantsBoost,
      isSlowed,
      this.config
    );
    sound.updateThreatProximity(this.threatDistance);

    // Check pursuer capture
    if (this.threatDistance <= 0) {
      sound.setBoosting(false);
      sound.playGameOverCapture();
      this.renderer.addTrauma(0.8);
      this.triggerGameOver('caught');
      return;
    }

    // 4. Physics: Gravity & Jump
    const groundY = this.canvas.height * 0.72;
    this.player.jumpBufferedTime += dt;

    if (this.player.isGrounded) {
      this.player.timeSinceGrounded = 0;
    } else {
      this.player.timeSinceGrounded += dt;
    }

    // Can we jump?
    if (canJump(this.player.isGrounded, this.player.timeSinceGrounded, this.player.jumpBufferedTime, this.config)) {
      this.player.vy = this.config.jumpImpulse;
      this.player.isGrounded = false;
      this.player.timeSinceGrounded = 999;
      this.player.jumpBufferedTime = 999;
      sound.playJump();
    }

    // Apply gravity
    this.player.vy += this.config.gravity * dt;
    this.player.y += this.player.vy * dt;

    // Check if player is over a chasm
    const activeChasm = this.items.find(
      (it) =>
        it.type === 'chasm' &&
        isOverChasm(this.distanceTraveledMeters, it.distanceMeters, it.widthMeters || 10)
    );

    if (activeChasm) {
      // Over chasm: player falls through!
      this.player.isGrounded = false;
      if (this.player.y > this.canvas.height + 60) {
        sound.setBoosting(false);
        this.triggerGameOver('fallen');
        return;
      }
    } else {
      // Over solid ground
      if (this.player.y >= groundY) {
        if (!this.player.isGrounded) {
          // Just landed!
          sound.playLand();
        }
        this.player.y = groundY;
        this.player.vy = 0;
        this.player.isGrounded = true;
      }
    }

    // 5. Item Collisions & Obstacles
    this.checkItemCollisions(groundY);

    // 6. Check finish line (spacecraft reached at 1000m)
    if (this.distanceTraveledMeters >= this.config.levelLengthMeters) {
      this.distanceTraveledMeters = this.config.levelLengthMeters;
      const outcome = determineEscapeOutcome(this.partsCollected, this.config);
      if (outcome.reason === 'victory_escape') {
        sound.playVictoryFanfare();
      } else {
        sound.playCrashSound();
      }
      this.triggerGameOver(outcome.reason);
      return;
    }

    this.emitStats();
  }

  private checkItemCollisions(groundY: number) {
    const playerDist = this.distanceTraveledMeters;
    const playerY = this.player.y;

    for (const item of this.items) {
      if (item.collected || item.type === 'chasm') continue;

      const distDiff = Math.abs(item.distanceMeters - playerDist);

      if (item.type === 'oxygen') {
        // Collectible radius ~1.8m
        const itemY = groundY + (item.yOffset || 0);
        const yDiff = Math.abs(playerY - itemY);
        if (distDiff < 1.8 && yDiff < 45) {
          item.collected = true;
          this.canistersCollected++;
          this.oxygen = collectOxygenCanister(this.oxygen, this.config);
          sound.playOxygenPickup();
          this.renderer.spawnParticle(this.player.x, this.player.y - 20, 0, -50, 6, '#43D9F5', 0.5);
        }
      } else if (item.type === 'part') {
        // Repair part pickup radius ~1.8m
        const itemY = groundY + (item.yOffset || 0);
        const yDiff = Math.abs(playerY - itemY);
        if (distDiff < 1.8 && yDiff < 45) {
          item.collected = true;
          this.partsCollected++;
          sound.playPartPickup();
          this.renderer.spawnParticle(this.player.x, this.player.y - 20, 0, -60, 8, '#FFBE55', 0.6);
        }
      } else if (item.type === 'rock') {
        // Rock obstacle: if on ground and within rock width
        const rockWidth = item.widthMeters || 2.5;
        if (distDiff < rockWidth * 0.5) {
          // If player's feet touch rock
          if (playerY >= groundY - 25) {
            if (this.player.collisionCooldownTimer <= 0) {
              this.rocksHit++;
              const { newThreat, slowdownDuration } = applyObstacleCollision(
                this.threatDistance,
                this.config
              );
              this.threatDistance = newThreat;
              this.player.slowdownTimer = slowdownDuration;
              this.player.collisionCooldownTimer = this.config.collisionCooldownSec;
              this.renderer.addTrauma(0.4);
              sound.playRockHit();

              // Spawn impact rocks
              for (let i = 0; i < 8; i++) {
                this.renderer.spawnParticle(
                  this.player.x,
                  groundY - 10,
                  Math.random() * 80 - 40,
                  -30 - Math.random() * 50,
                  4,
                  '#9CA3AF',
                  0.4
                );
              }
            }
          }
        }
      }
    }
  }

  private triggerGameOver(reason: GameOverReason) {
    sound.setBoosting(false);
    this.setState('gameover', reason);
    this.emitStats();
  }

  private emitStats() {
    this.onStatsUpdate?.({
      distanceTraveledMeters: Math.round(this.distanceTraveledMeters),
      remainingDistanceMeters: Math.max(0, Math.round(this.config.levelLengthMeters - this.distanceTraveledMeters)),
      oxygen: Math.round(this.oxygen),
      threatDistanceMeters: Math.round(this.threatDistance),
      partsCollected: this.partsCollected,
      totalParts: this.config.partsRequiredForEscape,
      canistersCollected: this.canistersCollected,
      timeElapsedSec: Math.round(this.timeElapsedSec),
      boostTimeSec: Math.round(this.boostTimeSec),
      rocksHit: this.rocksHit,
    });
  }

  private render(dt: number) {
    const remainingMeters = Math.max(0, this.config.levelLengthMeters - this.distanceTraveledMeters);
    this.renderer.render(
      dt,
      this.distanceTraveledMeters,
      remainingMeters,
      this.player.x,
      this.player.y,
      this.player.vy,
      this.player.isGrounded,
      this.player.isBoosting,
      this.player.slowdownTimer > 0,
      this.threatDistance,
      this.items,
      this.timeElapsedSec,
      this.gameOverReason
    );
  }

  public destroy() {
    this.stopLoop();
  }
}
