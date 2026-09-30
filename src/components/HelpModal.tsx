import React from 'react';
import { X, Zap, Snowflake, Shield, Magnet, Ghost as GhostIcon, Compass } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto bg-[#13141d] border-3 border-[#2e3247] rounded-xl p-5 shadow-2xl text-slate-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-[#00ffcc]" />
            <h2 className="font-pixel text-sm text-[#00ffcc] tracking-wide glow-cyan">HOW TO PLAY</h2>
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

        {/* Content sections */}
        <div className="space-y-4 font-sans">
          {/* Objective */}
          <div>
            <h3 className="font-pixel text-[10px] text-[#ffcc00] mb-1">MISSION OBJECTIVE</h3>
            <p className="text-slate-300 leading-relaxed text-xs">
              Collect every golden coin in the procedural labyrinth. Once the maze is cleared, the glowing escape portal will unlock at the bottom right. Step through to advance to the next level!
            </p>
          </div>

          {/* Controls */}
          <div>
            <h3 className="font-pixel text-[10px] text-[#00ffcc] mb-1.5">CONTROLS</h3>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-[#0b0c12] p-2 rounded border border-slate-800">
                <span className="font-pixel text-[9px] text-slate-400 block mb-0.5">MOVEMENT</span>
                <span className="text-white font-medium">Arrow Keys</span> or <span className="text-white font-medium">W, A, S, D</span>
              </div>
              <div className="bg-[#0b0c12] p-2 rounded border border-slate-800">
                <span className="font-pixel text-[9px] text-slate-400 block mb-0.5">PAUSE / RESUME</span>
                <span className="text-white font-medium">P</span> or <span className="text-white font-medium">Escape</span>
              </div>
            </div>
          </div>

          {/* Power-ups */}
          <div>
            <h3 className="font-pixel text-[10px] text-[#ffcc00] mb-2">POWER-UPS</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#0b0c12] p-2 rounded border border-amber-900/40 flex items-start gap-2">
                <Zap size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-pixel text-[9px] text-amber-300">SPEED SURGE</div>
                  <div className="text-[10px] text-slate-400">Run 45% faster and slide through corridors.</div>
                </div>
              </div>

              <div className="bg-[#0b0c12] p-2 rounded border border-cyan-900/40 flex items-start gap-2">
                <Snowflake size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-pixel text-[9px] text-cyan-300">EMP FREEZE</div>
                  <div className="text-[10px] text-slate-400">Freezes all ghosts in place for 5 seconds.</div>
                </div>
              </div>

              <div className="bg-[#0b0c12] p-2 rounded border border-blue-900/40 flex items-start gap-2">
                <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-pixel text-[9px] text-blue-300">CYBER SHIELD</div>
                  <div className="text-[10px] text-slate-400">Absorbs 1 ghost hit without losing a life.</div>
                </div>
              </div>

              <div className="bg-[#0b0c12] p-2 rounded border border-purple-900/40 flex items-start gap-2">
                <Magnet size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-pixel text-[9px] text-purple-300">COIN MAGNET</div>
                  <div className="text-[10px] text-slate-400">Drags nearby coins automatically to you.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ghost Types */}
          <div>
            <h3 className="font-pixel text-[10px] text-rose-400 mb-2">GHOST INTEL</h3>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between bg-[#0b0c12] px-2.5 py-1.5 rounded border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff3366]" />
                  <span className="font-pixel text-[9px] text-white">Blinky (Red)</span>
                </div>
                <span className="text-slate-400 text-[10px]">Direct Relentless Hunter</span>
              </div>

              <div className="flex items-center justify-between bg-[#0b0c12] px-2.5 py-1.5 rounded border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff]" />
                  <span className="font-pixel text-[9px] text-white">Speedy (Cyan)</span>
                </div>
                <span className="text-slate-400 text-[10px]">Fast Corner Patroller</span>
              </div>

              <div className="flex items-center justify-between bg-[#0b0c12] px-2.5 py-1.5 rounded border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#b026ff]" />
                  <span className="font-pixel text-[9px] text-white">Shadow (Purple)</span>
                </div>
                <span className="text-slate-400 text-[10px]">Predicts Movement to Ambush</span>
              </div>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playButtonBeep();
            onClose();
          }}
          className="w-full mt-5 py-2.5 rounded-lg bg-[#202436] hover:bg-[#2b3047] text-white font-pixel text-[10px] tracking-wider border border-slate-700 transition-colors"
        >
          GOT IT, LET'S PLAY
        </button>
      </div>
    </div>
  );
};
