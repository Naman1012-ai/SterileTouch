import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'cyan' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate';
  size?: 'xs' | 'sm' | 'md';
  hasDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'sm',
  hasDot = false,
  className = '',
}) => {
  const sizeStyles = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    cyan: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-[0_0_8px_rgba(6,182,212,0.15)]',
    emerald: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    amber: 'bg-amber-950/80 text-amber-300 border-amber-700/60 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    rose: 'bg-rose-950/80 text-rose-300 border-rose-700/60 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
    indigo: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60 shadow-[0_0_8px_rgba(99,102,241,0.15)]',
    slate: 'bg-slate-900/90 text-slate-300 border-slate-700/60',
  };

  const dotColors = {
    cyan: 'bg-cyan-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    indigo: 'bg-indigo-400',
    slate: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded border select-none ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {hasDot && (
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColors[variant]}`} />
      )}
      <span>{children}</span>
    </span>
  );
};
