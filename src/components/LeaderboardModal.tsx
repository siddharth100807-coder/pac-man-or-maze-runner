import React from 'react';
import { Trophy, X, Trash2, Calendar, Award } from 'lucide-react';
import { RunStats } from '../types/game';
import { sound } from '../audio/soundEngine';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: RunStats[];
  onClearRecords: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  records,
  onClearRecords,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-[440px] bg-[#13141d] border-3 border-[#2e3247] rounded-xl p-5 shadow-2xl text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#ffcc00]" />
            <h2 className="font-pixel text-sm text-[#ffcc00] tracking-wide glow-yellow">HIGH SCORES</h2>
          </div>
          <button
            onClick={() => {
              sound.playButtonBeep();
              onClose();
            }}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Records List */}
        <div className="space-y-2 mb-4 max-h-[60vh] overflow-y-auto">
          {records.length === 0 ? (
            <div className="text-center py-8 text-slate-500 font-pixel text-[10px]">
              NO RUNS RECORDED YET.<br />PLAY A GAME TO SET A SCORE!
            </div>
          ) : (
            records.slice(0, 10).map((rec, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  idx === 0
                    ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                    : idx === 1
                    ? 'bg-slate-800/40 border-slate-600 text-slate-200'
                    : idx === 2
                    ? 'bg-amber-900/10 border-amber-700/30 text-amber-300'
                    : 'bg-[#0c0d14] border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="font-pixel text-[11px] w-6 text-center text-slate-400">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </div>
                  <div>
                    <div className="font-pixel text-[11px] text-[#00ffcc] tabular-nums tracking-wider">
                      {rec.score.toString().padStart(6, '0')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans flex items-center gap-2 mt-0.5">
                      <span>Level {rec.level}</span>
                      <span>·</span>
                      <span className="capitalize">{rec.difficulty.toLowerCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500 font-sans">
                  {rec.date}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          {records.length > 0 && (
            <button
              onClick={() => {
                sound.playButtonBeep();
                onClearRecords();
              }}
              className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )}

          <button
            onClick={() => {
              sound.playButtonBeep();
              onClose();
            }}
            className="ml-auto py-2 px-4 rounded-lg bg-[#202436] hover:bg-[#2b3047] text-white font-pixel text-[10px] border border-slate-700 transition-colors"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
