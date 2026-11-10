import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Hand,
  Lock,
  MousePointer2,
  Move,
  Ruler,
  ThumbsUp,
} from 'lucide-react';
import { GestureDetectionResult } from '../../types/gestures';

interface GestureBadgeProps {
  detection: GestureDetectionResult;
}

export const GestureBadge: React.FC<GestureBadgeProps> = ({ detection }) => {
  const { gesture, confidence, isFist, isThumbsUp, handPresent } = detection;

  if (!handPresent) {
    return (
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs text-slate-400 backdrop-blur-md shadow-lg">
        <Hand className="w-3.5 h-3.5 text-slate-500 animate-pulse" />
        <span className="font-mono text-[11px] tracking-wide">NO HAND IN STERILE ZONE</span>
      </div>
    );
  }

  const getGestureConfig = () => {
    if (isFist) {
      return {
        label: 'STERILE FREEZE (INPUT LOCKED)',
        icon: <Lock className="w-3.5 h-3.5 text-rose-400" />,
        bgColor: 'bg-rose-950/80 border-rose-500/70 text-rose-200',
        ringColor: 'ring-rose-500/30',
      };
    }
    if (isThumbsUp) {
      return {
        label: 'THUMBS UP: SAFETY VERIFICATION',
        icon: <ThumbsUp className="w-3.5 h-3.5 text-emerald-300" />,
        bgColor: 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200',
        ringColor: 'ring-emerald-500/40',
      };
    }

    switch (gesture) {
      case 'PINCH':
        return {
          label: 'PINCH: DRAG / ZOOM ACTIVE',
          icon: <Move className="w-3.5 h-3.5 text-cyan-300" />,
          bgColor: 'bg-cyan-950/80 border-cyan-500/70 text-cyan-200',
          ringColor: 'ring-cyan-500/30',
        };
      case 'SWIPE_LEFT':
        return {
          label: 'AIR SWIPE: NEXT SLICE / TAB',
          icon: <ArrowLeft className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />,
          bgColor: 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200',
          ringColor: 'ring-emerald-500/40',
        };
      case 'SWIPE_RIGHT':
        return {
          label: 'AIR SWIPE: PREV SLICE / TAB',
          icon: <ArrowRight className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />,
          bgColor: 'bg-emerald-950/80 border-emerald-500/70 text-emerald-200',
          ringColor: 'ring-emerald-500/40',
        };
      case 'PEACE':
        return {
          label: 'PEACE SIGN: CALIPER RULER',
          icon: <Ruler className="w-3.5 h-3.5 text-indigo-300" />,
          bgColor: 'bg-indigo-950/80 border-indigo-500/70 text-indigo-200',
          ringColor: 'ring-indigo-500/30',
        };
      case 'POINT':
        return {
          label: 'POINTER TRACKING',
          icon: <MousePointer2 className="w-3.5 h-3.5 text-emerald-400" />,
          bgColor: 'bg-slate-900/90 border-emerald-500/50 text-emerald-300',
          ringColor: 'ring-emerald-500/20',
        };
      default:
        return {
          label: 'PALM TRACKING (STANDBY)',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />,
          bgColor: 'bg-slate-900/80 border-slate-700 text-slate-300',
          ringColor: '',
        };
    }
  };

  const config = getGestureConfig();

  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-medium backdrop-blur-md shadow-xl transition-all ${config.bgColor} ring-2 ${config.ringColor}`}
    >
      {config.icon}
      <span className="font-mono text-[11px] font-semibold tracking-wider">{config.label}</span>
      <div className="h-2 w-px bg-slate-700/60 mx-0.5" />
      <span className="text-[10px] font-mono opacity-80">{Math.round(confidence * 100)}%</span>
    </div>
  );
};
