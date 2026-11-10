import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  HelpCircle,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PatientProfile } from '../../types/medical';
import { audioService } from '../../services/audioFeedback';

interface HeaderProps {
  patient: PatientProfile;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  patient,
  isMuted,
  onToggleMute,
  onOpenHelp,
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
    <header className="h-14 bg-slate-950/90 border-b border-slate-800/80 px-4 flex items-center justify-between text-slate-200 z-30 select-none">
      {/* Brand & System Mode */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
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

        {/* Separator */}
        <div className="h-7 w-px bg-slate-800 hidden md:block" />

        {/* Active Patient Capsule */}
        <div className="hidden lg:flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3 py-1 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-semibold text-slate-200">{patient.name}</span>
            <span className="text-slate-400 font-mono ml-2">({patient.mrn})</span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/40">
            {patient.orRoom}
          </span>
          <span className="text-[11px] text-amber-300/90 font-medium">
            {patient.scheduledProcedure}
          </span>
        </div>
      </div>

      {/* Right Controls & Clock */}
      <div className="flex items-center gap-2.5">
        {/* Live Clock */}
        <div className="font-mono text-xs text-slate-300 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md hidden sm:flex items-center gap-1.5">
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
