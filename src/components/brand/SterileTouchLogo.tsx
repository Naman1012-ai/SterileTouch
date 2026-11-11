import React from 'react';

export interface SterileTouchLogoProps {
  variant?: 'icon' | 'badge' | 'full';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  className?: string;
  onClick?: () => void;
}

export const SterileTouchLogo: React.FC<SterileTouchLogoProps> = ({
  variant = 'badge',
  size = 'md',
  showSubtitle = true,
  className = '',
  onClick,
}) => {
  // Dimensions for circular icon
  const iconSizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  // Full image size map
  const fullSizeMap = {
    xs: 'w-24',
    sm: 'w-36',
    md: 'w-48',
    lg: 'w-64',
    xl: 'w-80',
  };

  if (variant === 'full') {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <img
          src="/steriletouch-logo.jpg"
          alt="SterileTouch - Touchless Mid-Air Gesture UI"
          className={`${fullSizeMap[size]} object-contain rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] border border-cyan-500/30 transition-transform duration-300 hover:scale-105`}
        />
      </div>
    );
  }

  if (variant === 'icon') {
    return (
      <div
        onClick={onClick}
        className={`relative ${iconSizeMap[size]} rounded-xl overflow-hidden border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.35)] shrink-0 transition-transform duration-200 hover:scale-105 select-none ${
          onClick ? 'cursor-pointer' : ''
        } ${className}`}
      >
        <img
          src="/steriletouch-logo.jpg"
          alt="SterileTouch Icon"
          className="w-full h-full object-cover object-[center_35%]"
        />
      </div>
    );
  }

  // Default: 'badge' (Icon + Official Typography)
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div
        className={`relative ${iconSizeMap[size]} rounded-xl overflow-hidden border border-cyan-400/50 shadow-[0_0_14px_rgba(6,182,212,0.35)] shrink-0 transition-transform duration-200 hover:scale-105 bg-slate-950`}
      >
        <img
          src="/steriletouch-logo.jpg"
          alt="SterileTouch Icon"
          className="w-full h-full object-cover object-[center_35%]"
        />
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-wider text-white text-base leading-none">
            STERILE<span className="text-cyan-400">TOUCH</span>
          </span>
          <span className="text-[9px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-semibold">
            OR Mode
          </span>
        </div>
        {showSubtitle && (
          <p className="text-[9px] text-cyan-300/80 font-mono tracking-widest uppercase mt-0.5">
            Touchless Mid-Air Gesture UI
          </p>
        )}
      </div>
    </div>
  );
};
