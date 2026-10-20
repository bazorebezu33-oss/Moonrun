/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine.ts';
import { GameOverReason, GameState, GameStats } from './game/types.ts';
import { HUD } from './components/HUD.tsx';
import { TitleScreen } from './components/TitleScreen.tsx';
import { StatusModal } from './components/StatusModal.tsx';
import { sound } from './game/audio.ts';

const INITIAL_STATS: GameStats = {
  distanceTraveledMeters: 0,
  remainingDistanceMeters: 1000,
  oxygen: 100,
  threatDistanceMeters: 32,
  partsCollected: 0,
  totalParts: 5,
  canistersCollected: 0,
  timeElapsedSec: 0,
  boostTimeSec: 0,
  rocksHit: 0,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [gameOverReason, setGameOverReason] = useState<GameOverReason | null>(null);
  const [stats, setStats] = useState<GameStats>(INITIAL_STATS);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  // Initialize engine once
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(
      canvasRef.current,
      (newStats) => {
        setStats(newStats);
      },
      (newState, reason) => {
        setGameState(newState);
        setGameOverReason(reason);
      }
    );

    engineRef.current = engine;
    engine.startLoop();

    // Check ?autostart=1
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1' || params.has('autostart')) {
      engine.startGame();
    }

    const onResize = () => {
      engine.handleResize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      engine.destroy();
    };
  }, []);

  const handleStart = useCallback(() => {
    engineRef.current?.startGame();
  }, []);

  const handleResume = useCallback(() => {
    engineRef.current?.resumeGame();
  }, []);

  const handleRestart = useCallback(() => {
    engineRef.current?.restartGame();
  }, []);

  const handleTogglePause = useCallback(() => {
    if (gameState === 'playing') {
      engineRef.current?.pauseGame();
    } else if (gameState === 'paused') {
      engineRef.current?.resumeGame();
    }
  }, [gameState]);

  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleTouchJumpStart = useCallback(() => {
    engineRef.current?.setTouchJump(true);
  }, []);

  const handleTouchJumpEnd = useCallback(() => {
    engineRef.current?.setTouchJump(false);
  }, []);

  const handleTouchBoostStart = useCallback(() => {
    engineRef.current?.setTouchBoost(true);
  }, []);

  const handleTouchBoostEnd = useCallback(() => {
    engineRef.current?.setTouchBoost(false);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070B13]">
      {/* 2D Canvas viewport for lunar world, astronaut, tentacles, and effects */}
      <canvas
        ref={canvasRef}
        data-testid="game-canvas"
        className="absolute inset-0 w-full h-full block touch-none"
      />

      {/* Title Screen Overlay */}
      {gameState === 'title' && (
        <TitleScreen
          onStart={handleStart}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* In-Game HUD */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          stats={stats}
          isMuted={isMuted}
          isPaused={gameState === 'paused'}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
          onRestart={handleRestart}
          onTouchJumpStart={handleTouchJumpStart}
          onTouchJumpEnd={handleTouchJumpEnd}
          onTouchBoostStart={handleTouchBoostStart}
          onTouchBoostEnd={handleTouchBoostEnd}
        />
      )}

      {/* Modals for Paused or Game Over / Escaped outcomes */}
      <StatusModal
        isPaused={gameState === 'paused'}
        gameOverReason={gameOverReason}
        stats={stats}
        onResume={handleResume}
        onRestart={handleRestart}
      />
    </div>
  );
}
