import React, { useEffect } from 'react';
import { Play, Volume2, Sparkles } from 'lucide-react';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  onStart,
  isMuted,
  onToggleMute,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col items-center justify-between p-6 md:p-12 bg-gradient-to-b from-[#04070D]/90 via-[#070B13]/95 to-[#0C111C]/95 select-none font-display">
      {/* Top Header / Audio Toggle */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#43D9F5] shadow-[0_0_8px_#43D9F5]" />
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Lunar Escape Protocol
          </span>
        </div>
        <button
          onClick={onToggleMute}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700/80 text-xs text-slate-300 hover:text-white hover:border-[#43D9F5]/60 transition-colors"
          aria-label={isMuted ? 'Sound Off' : 'Sound On'}
        >
          <Volume2 className={`w-3.5 h-3.5 ${isMuted ? 'text-red-400' : 'text-[#43D9F5]'}`} />
          <span>{isMuted ? 'Sound Off' : 'Sound On'}</span>
        </button>
      </div>

      {/* Center Hero Lockup */}
      <div className="flex flex-col items-center text-center max-w-2xl gap-6 my-auto">
        {/* Title Emblem */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-semibold tracking-widest uppercase mb-3 shadow-[0_0_15px_rgba(67,217,245,0.2)]">
            <Sparkles className="w-3.5 h-3.5" />
            Sci-Fi Lunar Runner
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white drop-shadow-[0_0_35px_rgba(67,217,245,0.4)]">
            MOON<span className="text-[#43D9F5]">RUN</span>
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 max-w-lg leading-relaxed font-sans">
            Collect oxygen and ship parts. Boost to escape the tentacles, but save enough air to survive.
          </p>
        </div>

        {/* Start Button */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <button
            data-start="true"
            onClick={onStart}
            className="w-full group relative flex items-center justify-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-[#38BDF8] text-slate-950 font-bold text-lg tracking-wider uppercase shadow-[0_0_30px_rgba(67,217,245,0.6)] hover:shadow-[0_0_45px_rgba(67,217,245,0.9)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            aria-label="Play game"
          >
            <Play className="w-5 h-5 fill-slate-950 group-hover:translate-x-0.5 transition-transform" />
            <span>Play</span>
          </button>
          <span className="text-xs text-slate-400 tracking-wider">
            Press <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">SPACE</kbd> or <kbd className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">ENTER</kbd> to launch
          </span>
        </div>

        {/* Rules & Rewards Quick Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full text-left font-sans text-xs mt-2">
          <div className="p-3 rounded-lg bg-[#0B111E]/80 border border-cyan-900/40">
            <div className="flex items-center gap-1.5 text-[#43D9F5] font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-[#43D9F5]" />
              OXYGEN DUAL-USE
            </div>
            <p className="text-slate-400">
              Air is used for both breathing and jet boosting. Canisters restore +25%.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#0B111E]/80 border border-amber-900/40">
            <div className="flex items-center gap-1.5 text-[#FFBE55] font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-[#FFBE55]" />
              5 SHIP PARTS
            </div>
            <p className="text-slate-400">
              Gather all 5 parts to successfully launch the escape craft at the finish.
            </p>
          </div>

          <div className="col-span-2 md:col-span-1 p-3 rounded-lg bg-[#0B111E]/80 border border-purple-900/40">
            <div className="flex items-center gap-1.5 text-[#C084FC] font-bold mb-1">
              <span className="w-2 h-2 rounded-full bg-[#C084FC]" />
              TENTACLE PURSUIT
            </div>
            <p className="text-slate-400">
              Hitting rocks slows you down and lets the creature catch up. Boost to gain ground.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Controls Legend */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-center gap-4 md:gap-8 text-xs text-slate-400 border-t border-slate-800/80 pt-4">
        <div>
          <span className="text-slate-200 font-semibold">Jump:</span> Space / Arrow Up / Tap
        </div>
        <div>
          <span className="text-slate-200 font-semibold">Boost:</span> Hold Shift / Hold Boost
        </div>
        <div>
          <span className="text-slate-200 font-semibold">Pause:</span> Esc / P
        </div>
        <div>
          <span className="text-slate-200 font-semibold">Restart:</span> R
        </div>
        <div>
          <span className="text-slate-200 font-semibold">Sound:</span> M
        </div>
      </div>
    </div>
  );
};
