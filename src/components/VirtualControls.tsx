import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface VirtualControlsProps {
  onDirectionChange: (dir: { x: number; y: number }) => void;
  disabled?: boolean;
}

export const VirtualControls: React.FC<VirtualControlsProps> = ({
  onDirectionChange,
  disabled = false,
}) => {
  const handleDown = (x: number, y: number, e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    onDirectionChange({ x, y });
  };

  const handleUp = (e: React.PointerEvent) => {
    e.preventDefault();
    onDirectionChange({ x: 0, y: 0 });
  };

  return (
    <div
      className="w-full max-w-[280px] mx-auto mt-2 select-none flex flex-col items-center touch-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Up Button */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onPointerDown={(e) => handleDown(0, -1, e)}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
          aria-label="Move Up"
          className="w-14 h-12 rounded-t-lg bg-[#1f2233] active:bg-[#00ffcc] text-slate-300 active:text-[#0b0c10] border-2 border-[#363a54] flex items-center justify-center shadow-md active:translate-y-0.5 transition-colors touch-none"
        >
          <ArrowUp size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Middle Row: Left, Center Pivot, Right */}
      <div className="flex items-center justify-center gap-1">
        <button
          type="button"
          onPointerDown={(e) => handleDown(-1, 0, e)}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
          aria-label="Move Left"
          className="w-14 h-12 rounded-l-lg bg-[#1f2233] active:bg-[#00ffcc] text-slate-300 active:text-[#0b0c10] border-2 border-[#363a54] flex items-center justify-center shadow-md active:translate-y-0.5 transition-colors touch-none"
        >
          <ArrowLeft size={20} strokeWidth={3} />
        </button>

        <div className="w-12 h-12 bg-[#12131c] rounded-full border-2 border-[#2b2d42] flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-[#00ffcc]/40" />
        </div>

        <button
          type="button"
          onPointerDown={(e) => handleDown(1, 0, e)}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
          aria-label="Move Right"
          className="w-14 h-12 rounded-r-lg bg-[#1f2233] active:bg-[#00ffcc] text-slate-300 active:text-[#0b0c10] border-2 border-[#363a54] flex items-center justify-center shadow-md active:translate-y-0.5 transition-colors touch-none"
        >
          <ArrowRight size={20} strokeWidth={3} />
        </button>
      </div>

      {/* Down Button */}
      <div className="flex justify-center mt-1">
        <button
          type="button"
          onPointerDown={(e) => handleDown(0, 1, e)}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
          aria-label="Move Down"
          className="w-14 h-12 rounded-b-lg bg-[#1f2233] active:bg-[#00ffcc] text-slate-300 active:text-[#0b0c10] border-2 border-[#363a54] flex items-center justify-center shadow-md active:translate-y-0.5 transition-colors touch-none"
        >
          <ArrowDown size={20} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
};
