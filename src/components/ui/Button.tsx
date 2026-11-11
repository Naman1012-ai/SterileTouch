import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  touchless?: boolean; // Defaults to true
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  touchless = true,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded-lg gap-1.5 min-h-[36px]',
    md: 'text-sm px-3.5 py-2 rounded-xl gap-2 min-h-[44px]',
    lg: 'text-base px-5 py-2.5 rounded-xl gap-2.5 min-h-[52px]',
  };

  const variantStyles = {
    primary:
      'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_16px_rgba(6,182,212,0.35)] hover:shadow-[0_0_24px_rgba(6,182,212,0.5)] border border-cyan-400/60 active:scale-[0.98]',
    secondary:
      'bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-slate-600 hover:text-white active:scale-[0.98]',
    danger:
      'bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-600/70 shadow-[0_0_16px_rgba(244,63,94,0.3)] hover:shadow-[0_0_24px_rgba(244,63,94,0.45)] active:scale-[0.98]',
    success:
      'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-600/70 shadow-[0_0_16px_rgba(16,185,129,0.3)] active:scale-[0.98]',
    outline:
      'bg-transparent hover:bg-cyan-950/30 text-cyan-300 border border-cyan-500/50 hover:border-cyan-400 active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent',
  };

  return (
    <button
      data-touchless-clickable={touchless ? 'true' : undefined}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
      {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
    </button>
  );
};
