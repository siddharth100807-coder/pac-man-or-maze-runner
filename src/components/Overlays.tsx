import React from 'react';
import { Play, RotateCcw, ChevronRight, Award, Zap, Shield, Snowflake, Magnet } from 'lucide-react';
import { Difficulty, GameState, LevelClearStats } from '../types/game';
import { sound } from '../audio/soundEngine';

interface OverlaysProps {
  gameState: GameState;
  score: number;
  highScore: number;
  level: number;
  difficulty: Difficulty;
  levelStats: LevelClearStats | null;
  onStartGame: () => void;
  onResumeGame: () => void;
  onNextLevel: () => void;
  onRestartGame: () => void;
  onRetryLevel: () => void;
  onChangeDifficulty: (diff: Difficulty) => void;
}

export const Overlays: React.FC<OverlaysProps> = ({
  gameState,
  score,
  highScore,
  level,
  difficulty,
  levelStats,
  onStartGame,
  onResumeGame,
  onNextLevel,
  onRestartGame,
  onRetryLevel,
  onChangeDifficulty,
}) => {
  if (gameState === 'PLAYING') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 bg-[#0a0a0ed9] backdrop-blur-[2px] select-none rounded-lg">
      {/* 1. START / TITLE SCREEN */}
      {gameState === 'START' && (
        <div className="w-full max-w-[420px] bg-[#14151e] border-4 border-[#2d3148] p-5 rounded-xl shadow-2xl text-center flex flex-col items-center gap-4">
          <div>
            <div className="text-[10px] tracking-widest text-[#00ffcc] font-pixel mb-1 glow-cyan">RETRO ARCADE</div>
            <h1 className="text-xl sm:text-2xl font-pixel text-[#ffcc00] glow-yellow tracking-wider">
              MAZE RUNNER
            </h1>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-sans max-w-xs">
            Navigate procedural labyrinths, gather golden coins, evade cunning ghosts, and reach the glowing vortex!
          </p>

          {/* Difficulty selector tabs */}
          <div className="w-full flex flex-col items-center gap-1.5">
            <span className="text-[9px] font-pixel text-slate-400">DIFFICULTY</span>
            <div className="flex items-center gap-1 p-1 bg-[#0b0c12] border border-slate-700/70 rounded-lg">
              {(['CASUAL', 'ARCADE', 'HARDCORE'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    sound.playButtonBeep();
                    onChangeDifficulty(d);
                  }}
                  className={`px-3 py-1.5 text-[9px] font-pixel rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    difficulty === d
                      ? 'bg-[#00ffcc] text-[#0a0a0e] shadow-md font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Quick power-up preview */}
          <div className="grid grid-cols-4 gap-2 w-full py-2 border-y border-slate-800 text-[9px] text-slate-400 font-pixel">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm">⚡</span>
              <span>Speed</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm">❄️</span>
              <span>Freeze</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm">🛡️</span>
              <span>Shield</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm">🧲</span>
              <span>Magnet</span>
            </div>
          </div>

          {/* High Score Preview */}
          {highScore > 0 && (
            <div className="text-[10px] font-pixel text-[#ffcc00] flex items-center gap-1.5">
              <Award size={14} />
              <span>RECORD: {highScore.toString().padStart(6, '0')}</span>
            </div>
          )}

          {/* Primary Action Button */}
          <button
            onClick={() => {
              sound.playButtonBeep();
              onStartGame();
            }}
            className="w-full py-3.5 px-6 rounded-lg bg-[#00ffcc] hover:bg-[#33ffdd] active:translate-y-1 text-[#0a0a0e] font-pixel text-xs tracking-wider font-bold shadow-[0_4px_0_#009977] active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play size={16} fill="currentColor" />
            <span>PLAY GAME</span>
          </button>
        </div>
      )}

      {/* 2. PAUSED OVERLAY */}
      {gameState === 'PAUSED' && (
        <div className="w-full max-w-[340px] bg-[#14151e] border-4 border-[#3a3f5c] p-5 rounded-xl shadow-2xl text-center flex flex-col items-center gap-3">
          <h2 className="text-lg font-pixel text-[#00ffcc] glow-cyan">GAME PAUSED</h2>

          <div className="w-full space-y-1.5 text-xs font-pixel">
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
              <span>LEVEL</span>
              <span className="text-white">{level}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800 text-slate-400">
              <span>SCORE</span>
              <span className="text-[#00ffcc] tabular-nums">{score}</span>
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 mt-2">
            <button
              onClick={() => {
                sound.playButtonBeep();
                onResumeGame();
              }}
              className="w-full py-3 px-4 rounded-lg bg-[#00ffcc] hover:bg-[#33ffdd] text-[#0a0a0e] font-pixel text-[11px] font-bold shadow-[0_4px_0_#009977] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              <span>RESUME</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonBeep();
                onRetryLevel();
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-[#242838] hover:bg-[#32374e] text-slate-200 font-pixel text-[10px] border border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw size={14} />
              <span>RETRY LEVEL</span>
            </button>

            <button
              onClick={() => {
                sound.playButtonBeep();
                onRestartGame();
              }}
              className="w-full py-2 px-4 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white font-pixel text-[9px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>NEW GAME (LEVEL 1)</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. LEVEL CLEAR OVERLAY */}
      {gameState === 'LEVELCLEAR' && (
        <div className="w-full max-w-[380px] bg-[#14151e] border-4 border-[#00ffcc] p-6 rounded-xl shadow-2xl text-center flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
          <div>
            <div className="text-[10px] tracking-wider text-[#00ffcc] font-pixel mb-1">STAGE COMPLETE</div>
            <h2 className="text-lg sm:text-xl font-pixel text-[#ffcc00] glow-yellow">
              LEVEL {level} CLEARED!
            </h2>
          </div>

          {/* Level Stats Breakdown */}
          {levelStats && (
            <div className="w-full bg-[#0a0b10] border border-slate-800 rounded-lg p-3 space-y-2 text-[10px] font-pixel text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Coins Collected:</span>
                <span className="text-[#ffcc00]">{levelStats.coinsCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time Taken:</span>
                <span className="text-slate-200 tabular-nums">{levelStats.timeTakenSec.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Speed Bonus:</span>
                <span className="text-[#00ffcc]">+{levelStats.speedBonus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lives Bonus:</span>
                <span className="text-rose-400">+{levelStats.livesBonus}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-xs font-bold">
                <span className="text-white">TOTAL SCORE:</span>
                <span className="text-[#00ffcc] glow-cyan tabular-nums">{levelStats.totalScore}</span>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              sound.playButtonBeep();
              onNextLevel();
            }}
            className="w-full py-3.5 px-6 rounded-lg bg-[#00ffcc] hover:bg-[#33ffdd] text-[#0a0a0e] font-pixel text-xs tracking-wider font-bold shadow-[0_4px_0_#009977] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <span>NEXT LEVEL</span>
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 4. GAME OVER OVERLAY */}
      {gameState === 'GAMEOVER' && (
        <div className="w-full max-w-[380px] bg-[#14151e] border-4 border-[#ff3366] p-6 rounded-xl shadow-2xl text-center flex flex-col items-center gap-4 animate-in fade-in duration-200">
          <div>
            <div className="text-[10px] tracking-wider text-rose-400 font-pixel mb-1">NO LIVES LEFT</div>
            <h2 className="text-xl sm:text-2xl font-pixel text-[#ff3366] glow-red">
              GAME OVER
            </h2>
          </div>

          <div className="w-full bg-[#0a0b10] border border-slate-800 rounded-lg p-3 space-y-2 text-[10px] font-pixel">
            <div className="flex justify-between text-slate-400">
              <span>LEVEL REACHED:</span>
              <span className="text-white">{level}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>FINAL SCORE:</span>
              <span className="text-[#ffcc00] tabular-nums font-bold text-xs">{score}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>HIGH SCORE:</span>
              <span className="text-[#00ffcc] tabular-nums">{Math.max(score, highScore)}</span>
            </div>
          </div>

          {score >= highScore && score > 0 && (
            <div className="px-3 py-1 rounded bg-yellow-500/10 border border-yellow-500/40 text-[10px] font-pixel text-yellow-300 animate-pulse">
              🏆 NEW HIGH SCORE! 🏆
            </div>
          )}

          <button
            onClick={() => {
              sound.playButtonBeep();
              onRestartGame();
            }}
            className="w-full py-3.5 px-6 rounded-lg bg-[#ff3366] hover:bg-[#ff4d7d] text-white font-pixel text-xs tracking-wider font-bold shadow-[0_4px_0_#b31d42] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}
    </div>
  );
};
