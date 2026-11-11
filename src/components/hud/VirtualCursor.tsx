import React from 'react';
import { Hand, Lock, Move, Power, Ruler, Sparkles } from 'lucide-react';
import { VirtualCursorState } from '../../types/gestures';

interface VirtualCursorProps {
  cursor: VirtualCursorState;
}

export const VirtualCursor: React.FC<VirtualCursorProps> = ({ cursor }) => {
  if (!cursor.isVisible) return null;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const isStandby = cursor.clutchState === 'STANDBY';
  const isEngaging = cursor.clutchState === 'ENGAGING';
  const isFrozen = cursor.isFrozen || cursor.clutchState === 'CLUTCHED';

  // In ENGAGING: ring fills up with clutchProgress; in ENGAGED: ring fills with dwell hoverProgress
  const activeProgress = isEngaging ? cursor.clutchProgress : cursor.hoverProgress;
  const strokeDashoffset = circumference - activeProgress * circumference;

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
        {/* Dwell or Engagement Progress Ring */}
        <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 60 60">
          {/* Background circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            className={`fill-none ${
              isStandby
                ? 'stroke-slate-600/30 stroke-dasharray-[4_4]'
                : 'stroke-slate-700/40'
            }`}
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="30"
            cy="30"
            r={radius}
            className={`fill-none transition-all duration-75 ${
              isFrozen
                ? 'stroke-rose-500'
                : isEngaging
                ? 'stroke-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                : isStandby
                ? 'stroke-slate-500/40'
                : cursor.isPinching
                ? 'stroke-cyan-400'
                : 'stroke-emerald-400'
            }`}
            strokeWidth={isEngaging ? '4.5' : '3.5'}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Center reticle */}
        <div
          className={`absolute flex items-center justify-center rounded-full transition-all duration-150 ${
            isFrozen
              ? 'w-8 h-8 bg-rose-500/20 border-2 border-rose-500 text-rose-400 glow-frozen'
              : isEngaging
              ? 'w-8 h-8 bg-cyan-500/30 border-2 border-cyan-400 text-cyan-200 scale-105 shadow-[0_0_20px_rgba(6,182,212,0.7)]'
              : isStandby
              ? 'w-7 h-7 bg-slate-900/60 border border-slate-500/60 text-slate-400 backdrop-blur-sm'
              : cursor.isPinching
              ? 'w-6 h-6 bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 scale-90 shadow-[0_0_15px_rgba(6,182,212,0.6)]'
              : cursor.isHovering
              ? 'w-7 h-7 bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 scale-110 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
              : 'w-4 h-4 bg-emerald-400/30 border border-emerald-400'
          }`}
        >
          {isFrozen ? (
            <Lock className="w-4 h-4" />
          ) : isEngaging ? (
            <Sparkles className="w-4 h-4 animate-spin text-cyan-300" />
          ) : isStandby ? (
            <Hand className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
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

        {/* Surgical Crosshair lines (faded in standby) */}
        <div
          className={`absolute w-10 h-[1px] pointer-events-none transition-colors ${
            isStandby ? 'bg-slate-600/30' : 'bg-emerald-400/40'
          }`}
        />
        <div
          className={`absolute h-10 w-[1px] pointer-events-none transition-colors ${
            isStandby ? 'bg-slate-600/30' : 'bg-emerald-400/40'
          }`}
        />

        {/* Mode & State Badge */}
        {isFrozen && (
          <div className="absolute top-10 whitespace-nowrap px-2.5 py-0.5 rounded bg-rose-950/95 border border-rose-500 text-[10px] font-mono tracking-wider font-semibold text-rose-300 uppercase shadow-lg shadow-rose-950/50 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-rose-400" />
            <span>CLUTCH FROZEN</span>
          </div>
        )}

        {isStandby && !isFrozen && (
          <div className="absolute top-10 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[10px] font-mono tracking-wider text-slate-300 uppercase shadow-lg shadow-black/60 flex items-center gap-1.5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>STANDBY • PINCH TO ENGAGE</span>
          </div>
        )}

        {isEngaging && !isFrozen && (
          <div className="absolute top-10 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-cyan-950/95 border border-cyan-400 text-[10px] font-mono tracking-wider text-cyan-200 font-bold uppercase shadow-lg shadow-cyan-950/60 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-300 animate-pulse" />
            <span>ENGAGING {Math.round(cursor.clutchProgress * 100)}%</span>
          </div>
        )}

        {cursor.isPinching && !isFrozen && !isStandby && !isEngaging && (
          <div className="absolute top-10 whitespace-nowrap px-2.5 py-0.5 rounded bg-cyan-950/90 border border-cyan-500 text-[10px] font-mono tracking-wider font-semibold text-cyan-300 uppercase shadow-lg shadow-cyan-950/50 flex items-center gap-1.5">
            <span>PINCH ACTIVE</span>
            <span className="text-cyan-400 font-bold">•</span>
            <span className="text-white">Z: {(cursor.depth || 1.0).toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
