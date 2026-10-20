import React from 'react';
import { GameStats } from '../game/types.ts';
import { Volume2, VolumeX, Pause, Play, RotateCcw } from 'lucide-react';

interface HUDProps {
  stats: GameStats;
  isMuted: boolean;
  isPaused: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onTouchJumpStart: () => void;
  onTouchJumpEnd: () => void;
  onTouchBoostStart: () => void;
  onTouchBoostEnd: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  isMuted,
  isPaused,
  onToggleMute,
  onTogglePause,
  onRestart,
  onTouchJumpStart,
  onTouchJumpEnd,
  onTouchBoostStart,
  onTouchBoostEnd,
}) => {
  const isLowOxygen = stats.oxygen < 25;
  const isCriticalThreat = stats.threatDistanceMeters < 18;

  // Percentage calculations
  const oxygenWidth = `${Math.max(0, Math.min(100, stats.oxygen))}%`;
  const shipProgress = Math.max(0, Math.min(100, (stats.distanceTraveledMeters / 1000) * 100));
  const threatWidth = `${Math.max(0, Math.min(100, (stats.threatDistanceMeters / 45) * 100))}%`;

  return (
    <div className="fixed inset-0 pointer-events-none z-10 flex flex-col justify-between p-4 md:p-6 select-none font-display">
      {/* Top HUD Bar */}
      <div className="flex items-start justify-between w-full max-w-7xl mx-auto gap-4">
        {/* Left: Oxygen Bar */}
        <div className="flex flex-col items-start gap-1 w-44 md:w-64">
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm tracking-wider font-bold text-white uppercase drop-shadow">
              OXYGEN
            </span>
            <span
              className={`text-xs md:text-sm font-bold tracking-wider tabular-nums ${
                isLowOxygen ? 'text-red-400 animate-pulse' : 'text-[#43D9F5]'
              }`}
            >
              {stats.oxygen}%
            </span>
            {isLowOxygen && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-500/50 animate-pulse">
                LOW O₂
              </span>
            )}
          </div>

          {/* Cyan Glow Bar */}
          <div className="w-full h-3 md:h-3.5 bg-black/60 rounded-full border border-sky-950/80 p-0.5 overflow-hidden shadow-[0_0_12px_rgba(7,11,19,0.8)]">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                isLowOxygen
                  ? 'bg-gradient-to-r from-red-500 to-amber-400 shadow-[0_0_10px_#ef4444]'
                  : 'bg-gradient-to-r from-[#0284c7] via-[#38bdf8] to-[#43D9F5] shadow-[0_0_12px_#43D9F5]'
              }`}
              style={{ width: oxygenWidth }}
            />
          </div>
        </div>

        {/* Center: Parts Collected (Amber Hexagon) */}
        <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0B111E]/70 border border-amber-500/30 rounded-lg shadow-[0_0_15px_rgba(255,190,85,0.15)]">
          {/* Amber Hexagon SVG icon */}
          <svg className="w-5 h-5 text-[#FFBE55] filter drop-shadow-[0_0_6px_#FFBE55]" viewBox="0 0 24 24" fill="none">
            <polygon
              points="12 2, 21 7, 21 17, 12 22, 3 17, 3 7"
              fill="#FFBE55"
              fillOpacity="0.2"
              stroke="#FFBE55"
              strokeWidth="2"
            />
            <circle cx="12" cy="12" r="3" fill="#FFBE55" />
          </svg>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs tracking-wider text-slate-300 font-bold uppercase">PARTS</span>
            <span className="text-base md:text-lg font-bold text-[#FFBE55] tracking-widest tabular-nums drop-shadow-[0_0_8px_rgba(255,190,85,0.6)]">
              {stats.partsCollected}/{stats.totalParts}
            </span>
          </div>
        </div>

        {/* Right: Distance to Ship & Threat Distance */}
        <div className="flex flex-col items-end gap-1 w-32 md:w-64 shrink-0">
          {/* Ship distance */}
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] md:text-xs tracking-wider font-bold text-slate-300 uppercase">SHIP</span>
            <span className="text-[11px] md:text-sm font-bold text-white tracking-widest tabular-nums">
              {stats.remainingDistanceMeters} m
            </span>
          </div>
          {/* Progress line to ship */}
          <div className="relative w-full h-1.5 bg-slate-800/80 rounded-full overflow-visible border border-slate-700/60">
            <div
              className="h-full bg-gradient-to-r from-cyan-600 to-white rounded-full transition-all duration-75"
              style={{ width: `${shipProgress}%` }}
            />
            {/* Small ship glyph marker at end */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1">
              <svg className="w-3 md:w-3.5 h-3 md:h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L19 21L12 17L5 21L12 2Z" />
              </svg>
            </div>
          </div>

          {/* Threat Distance in Violet */}
          <div className="flex items-center justify-between w-full mt-0.5 md:mt-1">
            <div className="flex items-center gap-1">
              <span className="text-[9px] md:text-[11px] tracking-wider font-bold text-[#C084FC] uppercase">THREAT</span>
              {isCriticalThreat && (
                <span className="text-[8px] font-bold px-1 rounded bg-purple-950/80 text-purple-300 border border-purple-500/60 animate-pulse">
                  !
                </span>
              )}
            </div>
            <span
              className={`text-[11px] md:text-sm font-bold tracking-widest tabular-nums ${
                isCriticalThreat ? 'text-red-400 animate-pulse' : 'text-[#C084FC]'
              }`}
            >
              {stats.threatDistanceMeters} m
            </span>
          </div>
          {/* Threat progress bar */}
          <div className="w-full h-1 bg-black/60 rounded-full border border-purple-950/80 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#581C87] to-[#9C73FF] shadow-[0_0_8px_#9C73FF]"
              style={{ width: threatWidth }}
            />
          </div>
        </div>

        {/* Top-Right Control Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute sound' : 'Mute sound'}
            className="p-2 rounded-lg bg-[#0B111E]/80 border border-slate-700/70 text-slate-300 hover:text-white hover:border-[#43D9F5]/60 hover:bg-slate-800 transition-colors focus:outline-none"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-[#43D9F5]" />}
          </button>
          <button
            onClick={onTogglePause}
            aria-label={isPaused ? 'Resume game' : 'Pause game'}
            className="p-2 rounded-lg bg-[#0B111E]/80 border border-slate-700/70 text-slate-300 hover:text-white hover:border-[#43D9F5]/60 hover:bg-slate-800 transition-colors focus:outline-none"
          >
            {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={onRestart}
            aria-label="Restart run"
            className="p-2 rounded-lg bg-[#0B111E]/80 border border-slate-700/70 text-slate-300 hover:text-white hover:border-[#FFBE55]/60 hover:bg-slate-800 transition-colors focus:outline-none"
          >
            <RotateCcw className="w-4 h-4 text-[#FFBE55]" />
          </button>
        </div>
      </div>

      {/* Bottom Center: Tutorial Controls Hint (Desktop only) */}
      <div className="hidden md:flex items-center justify-center gap-6 pb-2 text-xs md:text-sm tracking-wider text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-[#0B111E]/90 border border-slate-700 text-slate-200 font-bold shadow-sm">
            SPACE
          </span>
          <span className="text-slate-400">— JUMP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded bg-[#0B111E]/90 border border-cyan-800/80 text-cyan-300 font-bold shadow-sm">
            SHIFT
          </span>
          <span className="text-slate-400">— BOOST</span>
        </div>
      </div>

      {/* Mobile Touch Controls Overlay */}
      <div className="flex md:hidden items-end justify-between w-full pointer-events-auto pb-4 px-2">
        {/* Boost Button (Cyan) */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onTouchBoostStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onTouchBoostEnd();
          }}
          onMouseDown={onTouchBoostStart}
          onMouseUp={onTouchBoostEnd}
          className="w-20 h-20 rounded-2xl bg-cyan-950/70 border-2 border-[#43D9F5] shadow-[0_0_18px_rgba(67,217,245,0.4)] flex flex-col items-center justify-center text-[#43D9F5] active:scale-95 active:bg-cyan-900/80 transition-transform select-none touch-none"
          aria-label="Boost speed"
        >
          <span className="text-sm font-bold tracking-wider">BOOST</span>
          <span className="text-[10px] text-cyan-300/80">HOLD (O₂)</span>
        </button>

        {/* Jump Button (White) */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            onTouchJumpStart();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            onTouchJumpEnd();
          }}
          onMouseDown={onTouchJumpStart}
          onMouseUp={onTouchJumpEnd}
          className="w-20 h-20 rounded-2xl bg-slate-900/70 border-2 border-white/90 shadow-[0_0_18px_rgba(255,255,255,0.3)] flex flex-col items-center justify-center text-white active:scale-95 active:bg-slate-800/80 transition-transform select-none touch-none"
          aria-label="Jump"
        >
          <span className="text-sm font-bold tracking-wider">JUMP</span>
          <span className="text-[10px] text-slate-300">LEAP</span>
        </button>
      </div>
    </div>
  );
};
