import React from 'react';
import { Lock, Move, Ruler } from 'lucide-react';
import { VirtualCursorState } from '../../types/gestures';

interface VirtualCursorProps {
  cursor: VirtualCursorState;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({ cursor }) => {
  if (!cursor.isVisible) return null;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - cursor.hoverProgress * circumference;

  return (
    <div
      className="fixed pointer-events-none z-[9999] transition-transform duration-75 ease-out select-none"
      style={{
        left: `${cursor.x}px`,
        top: `${cursor.y}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Dynamic Cursor Target Ring */}
      <div className="relative flex items-center justify-center">
        {/* Dwell Progress Ring */}
        <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 60 60">
          {/* Background circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            className="stroke-slate-700/40 fill-none"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            className={`fill-none transition-all duration-75 ${
              cursor.isFrozen
                ? 'stroke-rose-500'
                : cursor.isPinching
                ? 'stroke-cyan-400'
                : 'stroke-emerald-400'
            }`}
            strokeWidth="3.5"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center reticle */}
        <div
          className={`absolute flex items-center justify-center rounded-full transition-all duration-150 ${
            cursor.isFrozen
              ? 'w-8 h-8 bg-rose-500/20 border-2 border-rose-500 text-rose-400 glow-frozen'
              : cursor.isPinching
              ? 'w-6 h-6 bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 scale-90 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
              : cursor.isHovering
              ? 'w-7 h-7 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : 'w-4 h-4 bg-emerald-400/30 border border-emerald-400'
          }`}
        >
          {cursor.isFrozen ? (
            <Lock className="w-4 h-4" />
          ) : cursor.mode === 'CALIPER' ? (
            <Ruler className="w-3.5 h-3.5" />
          ) : cursor.mode === 'PAN_ZOOM' ? (
            <Move className="w-3.5 h-3.5" />
          ) : (
            <div
              className={`rounded-full transition-all ${
                cursor.isPinching
                  ? 'w-2.5 h-2.5 bg-cyan-300'
                  : cursor.isHovering
                  ? 'w-2 h-2 bg-emerald-400'
                  : 'w-1.5 h-1.5 bg-emerald-300'
              }`}
            />
          )}
        </div>

        {/* Surgical Crosshair lines */}
        <div className="absolute w-10 h-[1px] bg-emerald-400/40 pointer-events-none" />
        <div className="absolute h-10 w-[1px] bg-emerald-400/40 pointer-events-none" />

        {/* Mode & State Badge */}
        {cursor.isFrozen && (
          <div className="absolute top-10 whitespace-nowrap px-2 py-0.5 rounded bg-rose-950/90 border border-rose-500 text-[10px] font-mono tracking-wider font-semibold text-rose-300 uppercase shadow-lg shadow-rose-950/50">
            STERILE FROZEN
          </div>
        )}

        {cursor.isPinching && !cursor.isFrozen && (
          <div className="absolute top-10 whitespace-nowrap px-2 py-0.5 rounded bg-cyan-950/90 border border-cyan-500 text-[10px] font-mono tracking-wider font-semibold text-cyan-300 uppercase shadow-lg shadow-cyan-950/50">
            PINCH ENGAGED
          </div>
        )}
      </div>
    </div>
  );
};
