import React from 'react';

export type SensorStatusType =
  | 'ONLINE'
  | 'OFFLINE'
  | 'STANDBY'
  | 'ENGAGED'
  | 'CLUTCHED'
  | 'SIMULATED'
  | 'ERROR';

export interface StatusIndicatorProps {
  label: string;
  status: SensorStatusType;
  customText?: string;
  showDot?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  status,
  customText,
  showDot = true,
  className = '',
}) => {
  const config = {
    ONLINE: {
      text: customText || 'ONLINE',
      dotColor: 'bg-emerald-400',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.2)]',
    },
    ENGAGED: {
      text: customText || 'ENGAGED',
      dotColor: 'bg-cyan-400',
      badgeClass: 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
    },
    STANDBY: {
      text: customText || 'STANDBY',
      dotColor: 'bg-amber-400',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-[0_0_8px_rgba(245,158,11,0.2)]',
    },
    CLUTCHED: {
      text: customText || 'FROZEN',
      dotColor: 'bg-rose-400',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-600/70 shadow-[0_0_10px_rgba(244,63,94,0.3)]',
    },
    SIMULATED: {
      text: customText || 'SIMULATED',
      dotColor: 'bg-amber-400',
      badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-600/60',
    },
    OFFLINE: {
      text: customText || 'OFFLINE',
      dotColor: 'bg-slate-500',
      badgeClass: 'bg-slate-900/90 text-slate-400 border-slate-700/60',
    },
    ERROR: {
      text: customText || 'ERROR',
      dotColor: 'bg-rose-500',
      badgeClass: 'bg-rose-950 text-rose-300 border-rose-600',
    },
  }[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-mono font-semibold uppercase tracking-wider select-none ${config.badgeClass} ${className}`}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dotColor} ${
            status === 'ONLINE' || status === 'ENGAGED' ? 'animate-pulse' : ''
          }`}
        />
      )}
      <span className="text-slate-400">{label}:</span>
      <span className="font-bold">{config.text}</span>
    </div>
  );
};
