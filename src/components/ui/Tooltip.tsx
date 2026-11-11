import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  shortcut?: string;
  dwellMs?: number;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  dwellMs,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-950/95 text-slate-200 border border-slate-700/80 text-[11px] font-medium shadow-2xl backdrop-blur-md flex items-center gap-1.5 animate-in fade-in duration-100 ${positionStyles[position]}`}
        >
          <span>{content}</span>
          {shortcut && (
            <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-cyan-300 border border-slate-700 font-semibold">
              {shortcut}
            </kbd>
          )}
          {dwellMs && (
            <span className="text-[9px] font-mono text-slate-400">
              ({dwellMs}ms dwell)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
