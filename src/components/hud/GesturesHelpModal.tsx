import React from 'react';
import {
  ArrowLeftRight,
  Hand,
  Keyboard,
  Lock,
  MousePointer,
  Move,
  Ruler,
  ShieldCheck,
  ThumbsUp,
  X,
} from 'lucide-react';
import { audioService } from '../../services/audioFeedback';

interface GesturesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GesturesHelpModal: React.FC<GesturesHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const gestures = [
    {
      name: 'Point & Hover Dwell',
      icon: <MousePointer className="w-5 h-5 text-emerald-400" />,
      tag: 'Navigation',
      description:
        'Extend index finger to direct the surgical cursor. Hover over buttons for 700ms to trigger a touchless dwell click.',
    },
    {
      name: 'Index-Thumb Pinch',
      icon: <Move className="w-5 h-5 text-cyan-400" />,
      tag: 'Zoom & Pan',
      description:
        'Pinch thumb and index finger together to grab radiological scans, drag-pan across the viewport, or pinch-click buttons.',
    },
    {
      name: 'Air Swipe (Left / Right)',
      icon: <ArrowLeftRight className="w-5 h-5 text-emerald-300" />,
      tag: 'Slice Traversal',
      description:
        'Quickly wave your hand left or right across the camera to flip CT scan slices or switch patient record sheets.',
    },
    {
      name: 'Closed Fist (Sterile Freeze)',
      icon: <Lock className="w-5 h-5 text-rose-400" />,
      tag: 'Sterile Lock',
      description:
        'Clench your hand into a fist to freeze cursor interaction. Allows the surgeon to speak or adjust attire without stray clicks.',
    },
    {
      name: 'Thumbs Up',
      icon: <ThumbsUp className="w-5 h-5 text-emerald-400" />,
      tag: 'Safety Sign-Off',
      description:
        'Hover over any pending WHO Surgical Safety Checklist item and show a Thumbs-Up gesture to confirm touchless sign-off.',
    },
    {
      name: 'Peace Sign (V-Sign)',
      icon: <Ruler className="w-5 h-5 text-indigo-400" />,
      tag: 'Digital Caliper',
      description:
        'Extend index and middle fingers in a V-sign to toggle the digital caliper ruler for lesion / fracture measurements.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                SterileTouch Mid-Air Gesture Command Guide
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Touchless computer vision interaction reference for OR personnel
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              audioService.playClick();
              onClose();
            }}
            data-touchless-clickable="true"
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* Gestures Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {gestures.map((g, idx) => (
              <div
                key={idx}
                className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                        {g.icon}
                      </div>
                      <span className="font-semibold text-white text-xs">
                        {g.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                      {g.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {g.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Hackathon Presentation & Simulation Shortcuts */}
          <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs mb-2">
              <Keyboard className="w-4 h-4 text-amber-400" />
              <span>Pitch Presentation & Simulation Mode Cheatsheet</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              If camera permissions are unavailable during evaluation or judging, activate Simulation Mode in the bottom HUD and use these keyboard/mouse shortcuts:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">Mouse Move</span>: Direct Pointer
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">Hold Space</span>: Pinch / Drag
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-rose-400 font-bold">Press F</span>: Sterile Freeze
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">Press T</span>: Thumbs-Up Sign
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-cyan-400 font-bold">← / → Keys</span>: Air Swipe Slices
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-indigo-400 font-bold">Press C</span>: Caliper Toggle
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-amber-400 font-bold">Keys 1 - 4</span>: Switch Modules
              </div>
              <div className="bg-slate-900 p-2 rounded border border-slate-800">
                <span className="text-emerald-400 font-bold">Press M</span>: Toggle Audio
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end">
          <button
            onClick={() => {
              audioService.playClick();
              onClose();
            }}
            data-touchless-clickable="true"
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
