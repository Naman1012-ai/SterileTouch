import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Hand,
  Keyboard,
  Lock,
  Mic,
  MousePointer,
  Move,
  Ruler,
  ShieldCheck,
  ThumbsUp,
  X,
} from 'lucide-react';
import { audioService } from '../../services/audioFeedback';
import { SterileTouchLogo } from '../brand/SterileTouchLogo';

interface GesturesHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GesturesHelpModal: React.FC<GesturesHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeHelpTab, setActiveHelpTab] = useState<'GESTURES' | 'VOICE' | 'KEYBOARD'>('GESTURES');

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
      name: '3D Spatial Pinch-to-Zoom & Pan',
      icon: <Move className="w-5 h-5 text-cyan-400" />,
      tag: 'Depth Zoom & Pan',
      description:
        'Pinch thumb and index together to grab the scan. Push your hand forward towards the screen to zoom in, pull back to zoom out, and move sideways to pan.',
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

  const voiceCommandGroups = [
    {
      title: 'Radiological Imaging Suite',
      commands: [
        { phrase: '"Next slice" / "Previous slice"', action: 'Scrub through CT / MRI volumetric slices' },
        { phrase: '"Slice [number]" (e.g. "Slice 14")', action: 'Directly jumps to specified anatomical slice' },
        { phrase: '"Zoom in" / "Zoom out" / "Reset view"', action: 'Smooth magnification and centering' },
        { phrase: '"Bone window" / "Soft tissue" / "Lung window"', action: 'Applies medical windowing presets' },
        { phrase: '"Invert contrast"', action: 'Toggles inverse grayscale radiographic mode' },
        { phrase: '"Measure" / "Clear measurements"', action: 'Activates caliper ruler for millimeter measurements' },
        { phrase: '"Toggle AI findings"', action: 'Shows / hides lesion neural detection bounding boxes' },
      ],
    },
    {
      title: 'OR Navigation & Patient Switcher',
      commands: [
        { phrase: '"Open radiology"', action: 'Navigates to DICOM / CT scanner workstation' },
        { phrase: '"Open checklist"', action: 'Switches to WHO Surgical Safety Checklist' },
        { phrase: '"Open vitals"', action: 'Displays real-time ICU / OR ECG telemetry' },
        { phrase: '"Open patient records"', action: 'Displays STAT lab panels and pre-op chart' },
        { phrase: '"Switch to Case 1 / 2 / 3"', action: 'Loads trauma case, thoracic case, or ortho case' },
      ],
    },
    {
      title: 'Checklist, Vitals & Sterile Field Control',
      commands: [
        { phrase: '"Sign off" / "Confirm checklist"', action: 'Verifies pending WHO safety checkpoint touchlessly' },
        { phrase: '"Open audit log"', action: 'Opens hospital compliance audit trail with JSON export' },
        { phrase: '"Silence alarm" / "Acknowledge alarm"', action: 'Mutes cardiac alert and logs clinical acknowledgement' },
        { phrase: '"Simulate emergency"', action: 'Triggers ventricular tachycardia scenario for live demo' },
        { phrase: '"Sterile freeze" / "Unlock screen"', action: 'Freezes / releases virtual surgical cursor' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <SterileTouchLogo variant="icon" size="sm" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                SterileTouch Multimodal Control Guide
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Hands-Free Mid-Air Gestures & Clinical Voice Commands
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-slate-950/50 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveHelpTab('GESTURES')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-semibold border-b-2 transition ${
              activeHelpTab === 'GESTURES'
                ? 'border-emerald-400 text-emerald-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hand Gestures</span>
          </button>

          <button
            onClick={() => setActiveHelpTab('VOICE')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-semibold border-b-2 transition ${
              activeHelpTab === 'VOICE'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Voice Commands</span>
          </button>

          <button
            onClick={() => setActiveHelpTab('KEYBOARD')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 font-semibold border-b-2 transition ${
              activeHelpTab === 'KEYBOARD'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Pitch & Simulation Hotkeys</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: GESTURES */}
          {activeHelpTab === 'GESTURES' && (
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
          )}

          {/* TAB 2: VOICE COMMANDS */}
          {activeHelpTab === 'VOICE' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-3 text-xs text-cyan-200">
                <span className="font-bold text-cyan-300">Natural Speech Recognition:</span>{' '}
                Surgeons can speak directly (e.g. <em className="text-white">"Bone window"</em>, <em className="text-white">"Zoom in"</em>) or prefix with <em className="text-white">"Sterile"</em> (e.g. <em className="text-white">"Sterile, next slice"</em>).
              </div>

              {voiceCommandGroups.map((group, gIdx) => (
                <div key={gIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider mb-2.5">
                    {group.title}
                  </h4>
                  <div className="space-y-2">
                    {group.commands.map((cmd, cIdx) => (
                      <div
                        key={cIdx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs py-1 border-b border-slate-900 last:border-b-0"
                      >
                        <span className="font-mono font-bold text-white">
                          {cmd.phrase}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {cmd.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: SIMULATION & HOTKEYS */}
          {activeHelpTab === 'KEYBOARD' && (
            <div className="bg-slate-950/90 border border-amber-500/40 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
                <Keyboard className="w-4 h-4 text-amber-400" />
                <span>Pitch Presentation & Simulation Mode Cheatsheet</span>
              </div>
              <p className="text-[11px] text-slate-400">
                If camera or microphone permissions are restricted during judging, activate Simulation Mode in the bottom HUD and use these keyboard shortcuts:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Mouse Move</span>: Direct Pointer
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Hold Space</span>: Pinch / Drag
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-cyan-400 font-bold">Mouse Wheel</span>: Continuous Zoom
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
              </div>
            </div>
          )}
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
