import React from 'react';

export interface PanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  showReticles?: boolean;
  headerBorder?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  icon,
  showReticles = false,
  headerBorder = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
}) => {
  return (
    <div
      className={`relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md overflow-hidden flex flex-col ${className}`}
    >
      {/* Optional Optical Reticle Corner Brackets */}
      {showReticles && (
        <>
          <div className="absolute top-2 left-2 text-cyan-500/40 text-[10px] font-mono pointer-events-none select-none">
            ⌜
          </div>
          <div className="absolute top-2 right-2 text-cyan-500/40 text-[10px] font-mono pointer-events-none select-none">
            ⌝
          </div>
          <div className="absolute bottom-2 left-2 text-cyan-500/40 text-[10px] font-mono pointer-events-none select-none">
            ⌞
          </div>
          <div className="absolute bottom-2 right-2 text-cyan-500/40 text-[10px] font-mono pointer-events-none select-none">
            ⌟
          </div>
        </>
      )}

      {/* Header Bar */}
      {(title || actions) && (
        <div
          className={`flex items-center justify-between px-4 py-3 bg-slate-950/60 ${
            headerBorder ? 'border-b border-slate-800/80' : ''
          } ${headerClassName}`}
        >
          <div className="flex items-center gap-2.5">
            {icon && <div className="text-cyan-400 shrink-0">{icon}</div>}
            <div>
              {typeof title === 'string' ? (
                <h3 className="font-bold text-white text-sm tracking-tight leading-tight">
                  {title}
                </h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-[11px] text-slate-400 font-mono leading-none mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      {/* Panel Body */}
      <div className={`flex-1 p-4 overflow-auto ${bodyClassName}`}>{children}</div>
    </div>
  );
};
