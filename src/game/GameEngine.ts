import { DEFAULT_CONFIG, GameConfig, GameOverReason, GameState, GameStats, LevelItem, SimulationInput, SimulationState } from './types.ts';
import { generateLevel } from './levelData.ts';
import {
  clampDeltaTime,
  createInitialSimulationState,
  stepSimulation,
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

  // Pure logical simulation state
  private simState: SimulationState;

  // Audio / alarm timers
  private alarmTimer: number = 0;

  // Input states
  private keysHeld: Set<string> = new Set();
  private touchJumpHeld: boolean = false;
  private touchBoostHeld: boolean = false;
  private jumpPressedEdge: boolean = false;

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

    this.simState = createInitialSimulationState(this.config);

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
  }

  public resetGame() {
    this.items = generateLevel();
    this.simState = createInitialSimulationState(this.config);
    this.gameOverReason = null;
    this.alarmTimer = 0;
    this.jumpPressedEdge = false;

    sound.setBoosting(false);
    this.emitStats();
  }

  public startGame() {
    sound.init();
    sound.resume();
    this.resetGame();
    this.setState('playing', null);
    // Reset timestamp so the first frame establishes the baseline safely
    this.lastTime = 0;
    if (!this.animFrameId) {
      this.animFrameId = requestAnimationFrame(this.loop);
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
      this.lastTime = 0; // Safe baseline timestamp on resume
      this.setState('playing', null);
      if (!this.animFrameId) {
        this.animFrameId = requestAnimationFrame(this.loop);
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
    return this.simState.partsCollected;
  }

  public getSimulationState(): SimulationState {
    return { ...this.simState };
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
      sound.resume();

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.keysHeld.add(e.code);
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
        this.keysHeld.delete(e.code);
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.keysHeld.delete('Shift');
      }
    });

    window.addEventListener('blur', () => {
      this.keysHeld.clear();
      this.touchJumpHeld = false;
      this.touchBoostHeld = false;
      this.jumpPressedEdge = false;
      sound.setBoosting(false);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.state === 'playing') {
          this.pauseGame();
        }
      } else {
        // Tab visible again: reset baseline timestamp
        this.lastTime = 0;
      }
    });
  }

  public setTouchJump(pressed: boolean) {
    sound.resume();
    this.touchJumpHeld = pressed;
    if (pressed) {
      this.triggerJumpPress();
    }
  }

  public setTouchBoost(pressed: boolean) {
    sound.resume();
    this.touchBoostHeld = pressed;
  }

  private triggerJumpPress() {
    if (this.state !== 'playing') return;
    this.jumpPressedEdge = true;
  }

  // --- Simulation Loop ---

  public startLoop() {
    if (!this.animFrameId) {
      this.lastTime = 0;
      this.animFrameId = requestAnimationFrame(this.loop);
    }
  }

  public stopLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private loop = (time: number) => {
    // First frame initialization
    if (this.lastTime <= 0) {
      this.lastTime = time;
      this.render(0);
      this.animFrameId = requestAnimationFrame(this.loop);
      return;
    }

    const rawDt = (time - this.lastTime) / 1000;
    this.lastTime = time;

    // Reject negative or invalid timestamps, clamp maximum step
    const dt = clampDeltaTime(rawDt, 0.05);

    if (this.state === 'playing' && dt > 0) {
      const input: SimulationInput = {
        jumpPressed: this.jumpPressedEdge,
        jumpHeld: this.keysHeld.has('Space') || this.keysHeld.has('ArrowUp') || this.touchJumpHeld,
        boostHeld: this.keysHeld.has('Shift') || this.touchBoostHeld,
      };
      this.jumpPressedEdge = false;

      const result = stepSimulation(this.simState, input, dt, this.items, this.config);
      this.simState = result.state;

      // Web Audio events
      if (result.events.didJump) sound.playJump();
      if (result.events.didLand) sound.playLand();
      if (result.events.hitRock) {
        sound.playRockHit();
        this.renderer.addTrauma(0.4);
      }
      if (result.events.collectedOxygen) sound.playOxygenPickup();
      if (result.events.collectedPart) sound.playPartPickup();

      sound.setBoosting(this.simState.isBoosting);
      sound.updateThreatProximity(this.simState.threatDistance);
      sound.updateBreathing(this.simState.timeElapsedSec, this.simState.oxygen < this.config.lowOxygenThreshold);

      if (this.simState.oxygen < this.config.lowOxygenThreshold) {
        this.alarmTimer += dt;
        if (this.alarmTimer > 1.2) {
          this.alarmTimer = 0;
          sound.playLowOxygenAlarm();
        }
      }

      if (this.simState.gameOverReason !== null) {
        sound.setBoosting(false);
        if (this.simState.gameOverReason === 'caught') {
          sound.playGameOverCapture();
          this.renderer.addTrauma(0.8);
        } else if (this.simState.gameOverReason === 'victory_escape') {
          sound.playVictoryFanfare();
        } else if (
          this.simState.gameOverReason === 'victory_crash' ||
          this.simState.gameOverReason === 'victory_failed_launch'
        ) {
          sound.playCrashSound();
        }
        this.setState('gameover', this.simState.gameOverReason);
      }

      this.emitStats();
    }

    this.render(dt);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private emitStats() {
    this.onStatsUpdate?.({
      distanceTraveledMeters: Math.round(this.simState.distanceMeters),
      remainingDistanceMeters: Math.max(0, Math.round(this.config.levelLengthMeters - this.simState.distanceMeters)),
      oxygen: Math.round(this.simState.oxygen),
      threatDistanceMeters: Math.round(this.simState.threatDistance),
      partsCollected: this.simState.partsCollected,
      totalParts: this.config.partsRequiredForEscape,
      canistersCollected: this.simState.canistersCollected,
      timeElapsedSec: Math.round(this.simState.timeElapsedSec),
      boostTimeSec: Math.round(this.simState.boostTimeSec),
      rocksHit: this.simState.rocksHit,
    });
  }

  private render(dt: number) {
    this.renderer.render(dt, this.simState, this.items);
  }

  public destroy() {
    this.stopLoop();
  }
}
