import React from 'react';
import { Volume2, VolumeX, Tv, Pause, Play, HelpCircle, Trophy, Sparkles, Gamepad2 } from 'lucide-react';
import { BiomeTheme, Difficulty, Player } from '../types/game';

interface ScoreBoardProps {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  maxLives: number;
  coinsRemaining: number;
  portalActive: boolean;
  biome: BiomeTheme;
  difficulty: Difficulty;
  activeEffects: Player['activeEffects'];
  isPaused: boolean;
  soundEnabled: boolean;
  crtEffect: boolean;
  showVirtualControls: boolean;
  onToggleVirtualControls: () => void;
  onTogglePause: () => void;
  onToggleSound: () => void;
  onToggleCRT: () => void;
  onOpenHelp: () => void;
  onOpenLeaderboard: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  score,
  highScore,
  level,
  lives,
  maxLives,
  coinsRemaining,
  portalActive,
  biome,
  difficulty,
  activeEffects,
  isPaused,
  soundEnabled,
  crtEffect,
  showVirtualControls,
  onToggleVirtualControls,
  onTogglePause,
  onToggleSound,
  onToggleCRT,
  onOpenHelp,
  onOpenLeaderboard,
}) => {
  const { speedBoostRemaining, freezeRemaining, hasShield, magnetRemaining } = activeEffects;

  const getBiomeLabel = (b: BiomeTheme) => {
    switch (b) {
      case 'SYNTHWAVE':
        return 'Synthwave';
      case 'EMERALD_DUNGEON':
        return 'Emerald';
      case 'VOLCANO_FORGE':
        return 'Volcano';
      case 'NEO_ICE':
        return 'Neo Ice';
      case 'CYBERPUNK':
      default:
        return 'Cyber';
    }
  };

  return (
    <div className="w-full max-w-[476px] flex flex-col gap-2 mb-2 select-none">
      {/* Top Header Row with Score, High Score, and Controls */}
      <div className="flex items-center justify-between bg-[#14151e] border-2 border-[#2b2d3d] px-3 py-2 rounded-lg text-xs">
        {/* Left: Score & High Score */}
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-pixel">SCORE</div>
            <div className="text-sm sm:text-base font-pixel text-[#00ffcc] glow-cyan tabular-nums tracking-wider">
              {score.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="hidden xs:block border-l border-slate-700 pl-2 sm:pl-3">
            <div className="text-[9px] uppercase tracking-wider text-slate-400 font-pixel">HIGH</div>
            <div className="text-xs sm:text-sm font-pixel text-[#ffcc00] tabular-nums tracking-wider">
              {highScore.toString().padStart(6, '0')}
            </div>
          </div>
        </div>

        {/* Center: Level & Biome */}
        <div className="text-center">
          <div className="text-[9px] uppercase tracking-wider text-slate-400 font-pixel">LEVEL {level}</div>
          <div className="text-[10px] text-slate-300 font-pixel flex items-center justify-center gap-1">
            <span>{getBiomeLabel(biome)}</span>
            <span className="text-[8px] text-slate-500">({difficulty.slice(0, 3)})</span>
          </div>
        </div>

        {/* Right: Quick Settings Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleVirtualControls}
            title={showVirtualControls ? 'Hide Virtual D-Pad' : 'Show Virtual D-Pad'}
            aria-label="Toggle Virtual Controls"
            className={`p-1.5 rounded transition-colors border ${
              showVirtualControls
                ? 'bg-[#00ffcc]/20 border-[#00ffcc]/60 text-[#00ffcc]'
                : 'bg-[#1e202c] border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 size={15} />
          </button>

          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            aria-label="Toggle Sound"
            className="p-1.5 rounded bg-[#1e202c] hover:bg-[#2c3042] text-slate-300 hover:text-white transition-colors border border-slate-700/60"
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} className="text-red-400" />}
          </button>

          <button
            onClick={onToggleCRT}
            title={crtEffect ? 'Disable CRT Scanlines' : 'Enable CRT Scanlines'}
            aria-label="Toggle CRT Screen"
            className={`p-1.5 rounded transition-colors border ${
              crtEffect
                ? 'bg-[#00ffcc]/20 border-[#00ffcc]/60 text-[#00ffcc]'
                : 'bg-[#1e202c] border-slate-700/60 text-slate-400 hover:text-white'
            }`}
          >
            <Tv size={15} />
          </button>

          <button
            onClick={onOpenLeaderboard}
            title="Leaderboard & High Scores"
            aria-label="Leaderboard"
            className="p-1.5 rounded bg-[#1e202c] hover:bg-[#2c3042] text-slate-300 hover:text-yellow-400 transition-colors border border-slate-700/60"
          >
            <Trophy size={15} />
          </button>

          <button
            onClick={onOpenHelp}
            title="Help & Controls"
            aria-label="Game Help"
            className="p-1.5 rounded bg-[#1e202c] hover:bg-[#2c3042] text-slate-300 hover:text-[#00ffcc] transition-colors border border-slate-700/60"
          >
            <HelpCircle size={15} />
          </button>

          <button
            onClick={onTogglePause}
            title={isPaused ? 'Resume Game' : 'Pause Game'}
            aria-label="Pause or Resume Game"
            className="p-1.5 rounded bg-[#2a2d40] hover:bg-[#393d56] text-[#00ffcc] transition-colors border border-slate-600"
          >
            {isPaused ? <Play size={15} /> : <Pause size={15} />}
          </button>
        </div>
      </div>

      {/* Secondary Bar: Lives & Active Power-Ups / Objectives */}
      <div className="flex items-center justify-between px-2 text-xs">
        {/* Lives (Pixel Hearts) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-pixel text-slate-400 mr-1">LIVES:</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: maxLives }).map((_, i) => (
              <span
                key={i}
                className={`inline-block text-base transition-transform duration-200 ${
                  i < lives ? 'text-red-500 scale-100' : 'text-slate-700 scale-90 opacity-40'
                }`}
              >
                ❤️
              </span>
            ))}
          </div>
        </div>

        {/* Active Power-Up Badges or Objective indicator */}
        <div className="flex items-center gap-2">
          {hasShield && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/50 text-[9px] font-pixel text-blue-300 animate-pulse">
              <span>🛡️</span> SHIELD
            </div>
          )}
          {speedBoostRemaining > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/80 border border-amber-500/50 text-[9px] font-pixel text-amber-300">
              <span>⚡</span> SPEED {(speedBoostRemaining / 1000).toFixed(1)}s
            </div>
          )}
          {freezeRemaining > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/50 text-[9px] font-pixel text-cyan-300">
              <span>❄️</span> FREEZE {(freezeRemaining / 1000).toFixed(1)}s
            </div>
          )}
          {magnetRemaining > 0 && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-500/50 text-[9px] font-pixel text-purple-300">
              <span>🧲</span> MAGNET {(magnetRemaining / 1000).toFixed(1)}s
            </div>
          )}

          {/* Objective: Coins remaining or Portal Open */}
          {portalActive ? (
            <div className="px-2 py-0.5 rounded bg-emerald-950/90 border border-emerald-400 text-[9px] font-pixel text-emerald-300 animate-pulse flex items-center gap-1">
              <span>🌀</span> PORTAL OPEN!
            </div>
          ) : (
            <div className="text-[9px] text-[#ffcc00] font-pixel flex items-center gap-1">
              <span>🟡</span> {coinsRemaining} LEFT
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
