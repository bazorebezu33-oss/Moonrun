import React from 'react';
import { GameOverReason, GameStats } from '../game/types.ts';
import { RotateCcw, Play, CheckCircle, AlertTriangle, Skull, Flame } from 'lucide-react';

interface StatusModalProps {
  isPaused: boolean;
  gameOverReason: GameOverReason | null;
  stats: GameStats;
  onResume: () => void;
  onRestart: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  isPaused,
  gameOverReason,
  stats,
  onResume,
  onRestart,
}) => {
  if (!isPaused && !gameOverReason) return null;

  // Determine outcome details
  let title = 'Game Paused';
  let subtitle = 'Simulation suspended. Press P or Resume to continue.';
  let badgeColor = 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
  let Icon = Play;
  let isVictory = false;

  if (gameOverReason === 'victory_escape') {
    title = 'You Escaped!';
    subtitle = 'All 5 repair parts secured. The spacecraft launched flawlessly and broke lunar orbit!';
    badgeColor = 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
    Icon = CheckCircle;
    isVictory = true;
  } else if (gameOverReason === 'victory_crash') {
    title = 'Launch Failed';
    subtitle = 'Not enough ship parts collected. Incomplete repairs caused engine blowout during liftoff.';
    badgeColor = 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    Icon = Flame;
  } else if (gameOverReason === 'victory_failed_launch') {
    title = 'Launch Failed';
    subtitle = 'Not enough ship parts collected. Critical engine components missing. Cannot ignite engines.';
    badgeColor = 'text-red-400 bg-red-950/60 border-red-500/40';
    Icon = AlertTriangle;
  } else if (gameOverReason === 'suffocated') {
    title = 'Out of Oxygen';
    subtitle = 'Life support depleted. Balance jet boosting with oxygen conservation.';
    badgeColor = 'text-sky-400 bg-sky-950/60 border-sky-500/40';
    Icon = AlertTriangle;
  } else if (gameOverReason === 'caught') {
    title = 'Caught';
    subtitle = 'The tentacles closed the distance. Avoid rocks and boost to maintain your gap.';
    badgeColor = 'text-purple-400 bg-purple-950/60 border-purple-500/40';
    Icon = Skull;
  } else if (gameOverReason === 'fallen') {
    title = 'Lost in a Crater';
    subtitle = 'Plunged into a deep lunar chasm. Time your jumps carefully over gaps.';
    badgeColor = 'text-slate-400 bg-slate-900/80 border-slate-700/60';
    Icon = AlertTriangle;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-none select-none font-display">
      <div className="w-full max-w-md p-6 md:p-8 rounded-2xl bg-[#0B111E] border border-slate-700/80 shadow-[0_0_50px_rgba(7,11,19,0.9)] text-center flex flex-col items-center gap-6">
        {/* Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${badgeColor}`}>
          <Icon className="w-4 h-4" />
          <span>{isPaused ? 'Paused' : isVictory ? 'Mission Complete' : 'Run Terminated'}</span>
        </div>

        {/* Title & Description */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow">
            {title}
          </h2>
          <p className="text-sm text-slate-300 max-w-sm leading-relaxed font-sans">
            {subtitle}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full text-left font-sans text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
              Distance Run
            </span>
            <span className="text-base font-bold text-white font-display">
              {stats.distanceTraveledMeters} / 1000 m
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
              Parts Collected
            </span>
            <span className="text-base font-bold text-[#FFBE55] font-display">
              {stats.partsCollected} / 5
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
              O₂ Canisters
            </span>
            <span className="text-base font-bold text-[#43D9F5] font-display">
              {stats.canistersCollected}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase tracking-wider font-semibold">
              Obstacles Hit
            </span>
            <span className="text-base font-bold text-slate-200 font-display">
              {stats.rocksHit}
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col gap-3 w-full">
          {isPaused ? (
            <button
              onClick={onResume}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold text-base tracking-wider uppercase hover:shadow-[0_0_25px_rgba(67,217,245,0.7)] transition-all cursor-pointer"
            >
              <Play className="w-5 h-5 fill-slate-950" />
              <span>Resume</span>
            </button>
          ) : null}

          <button
            data-start="true"
            onClick={onRestart}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-base tracking-wider uppercase transition-all cursor-pointer ${
              isVictory
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-[0_0_25px_rgba(52,211,153,0.6)]'
                : 'bg-gradient-to-r from-[#43D9F5] to-cyan-400 text-slate-950 shadow-[0_0_25px_rgba(67,217,245,0.6)]'
            }`}
          >
            <RotateCcw className="w-5 h-5" />
            <span>{isVictory ? 'Play Again' : 'Retry Run'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
