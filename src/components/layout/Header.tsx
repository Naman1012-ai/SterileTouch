import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PatientProfile } from '../../types/medical';
import { GestureDetectionResult } from '../../types/gestures';
import { audioService } from '../../services/audioFeedback';
import { VoiceIndicatorHUD } from '../hud/VoiceIndicatorHUD';
import { GestureBadge } from '../hud/GestureBadge';

interface HeaderProps {
  patient: PatientProfile;
  gestureResult: GestureDetectionResult;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHelp: () => void;
  onOpenTutorial?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patient,
  gestureResult,
  isMuted,
  onToggleMute,
  onOpenHelp,
  onOpenTutorial,
}) => {
  const [time, setTime] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <header className="h-14 bg-slate-950/95 border-b border-slate-800/80 px-4 flex items-center justify-between text-slate-200 z-30 select-none relative shadow-sm">
      {/* Left Section: Brand & Terminal Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">SterileTouch</span>
              <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded font-semibold">
                OR Mode
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono">Zero-Contact Surgical Terminal</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">{patient.orRoom}</span>
        </div>
      </div>

      {/* Center Section: Integrated Touchless Gesture Telemetry Capsule */}
      <div className="flex items-center justify-center pointer-events-none">
        <GestureBadge detection={gestureResult} />
      </div>

      {/* Right Section: Clinical Utilities & System Controls */}
      <div className="flex items-center gap-2">
        {/* Voice Assistant HUD */}
        <VoiceIndicatorHUD />

        <div className="h-5 w-px bg-slate-800/80 hidden sm:block" />

        {/* Live Clock */}
        <div className="font-mono text-xs text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg hidden lg:flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>{time}</span>
        </div>

        {/* Audio Toggle */}
        <button
          onClick={onToggleMute}
          data-touchless-clickable="true"
          title={isMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
          className={`p-1.5 rounded-lg border text-xs transition ${
            isMuted
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-400 hover:bg-rose-900/50'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50'
          }`}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Doctor Onboarding & Calibration Tutorial */}
        {onOpenTutorial && (
          <button
            onClick={onOpenTutorial}
            data-touchless-clickable="true"
            title="Doctor Onboarding Tutorial & Touchless Calibration"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-900/60 bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 hover:border-emerald-500/50 text-xs font-medium transition shadow-[0_0_8px_rgba(16,185,129,0.15)]"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline">Tutorial</span>
          </button>
        )}

        {/* Gesture Guide Help */}
        <button
          onClick={onOpenHelp}
          data-touchless-clickable="true"
          title="Gesture Guide & Clinical Shortcuts"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 text-xs font-medium transition"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Gestures</span>
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          data-touchless-clickable="true"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-slate-100 hover:border-slate-700 text-xs transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
