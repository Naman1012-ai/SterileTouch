import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-md select-none ${className}`}
    >
      {icon && (
        <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-3 shadow-[0_0_16px_rgba(6,182,212,0.2)]">
          {icon}
        </div>
      )}
      <h3 className="font-bold text-white text-base tracking-tight">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 font-mono max-w-sm mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
