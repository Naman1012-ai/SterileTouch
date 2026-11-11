import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Hand,
  Lock,
  Maximize2,
  Mic,
  Move3d,
  Radio,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Target,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioService } from '../../services/audioFeedback';
import { voiceAssistantService } from '../../services/voiceAssistant';
import { SterileTouchLogo } from '../brand/SterileTouchLogo';
import {
  GestureDetectionResult,
  Point3D,
  TrackingMetrics,
  VirtualCursorState,
} from '../../types/gestures';
import { VoiceCommandResult } from '../../types/speech';

export interface DoctorOnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  gestureResult: GestureDetectionResult;
  cursor: VirtualCursorState;
  landmarks: Point3D[] | null;
  metrics: TrackingMetrics;
  isCameraActive: boolean;
  onStartCamera?: () => void;
  voiceCommand?: VoiceCommandResult | null;
}

type TutorialStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_TITLES = [
  'Sterile Optical Field',
  'Point & Dwell Precision',
  '3D Spatial Depth Zoom',
  'Air Swipe & Freeze Lock',
  'Clinical Voice Mic Check',
  'OR Readiness Verified',
];

export const DoctorOnboardingTutorial: React.FC<DoctorOnboardingTutorialProps> = ({
  isOpen,
  onClose,
  gestureResult,
  cursor,
  landmarks,
  metrics,
  isCameraActive,
  onStartCamera,
  voiceCommand,
}) => {
  const [currentStep, setCurrentStep] = useState<TutorialStep>(1);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>([false, false, false, false, false]);

  // Step 1: Optical field hold progress (0 to 100)
  const [opticalHoldProgress, setOpticalHoldProgress] = useState<number>(0);

  // Step 2: Dwell hover state
  const targetButtonRef = useRef<HTMLButtonElement | null>(null);
  const [dwellProgressLocal, setDwellProgressLocal] = useState<number>(0);
  const [isDwellTargetHovered, setIsDwellTargetHovered] = useState<boolean>(false);

  // Step 3: Zoom level (1.0 = 100%)
  const [zoomFactor, setZoomFactor] = useState<number>(1.0);
  const lastDepthRef = useRef<number | null>(null);

  // Step 4: Swipe & Freeze
  const [hasSwiped, setHasSwiped] = useState<boolean>(false);
  const [hasFrozen, setHasFrozen] = useState<boolean>(false);
  const [swipeCardPage, setSwipeCardPage] = useState<number>(1);

  // Step 5: Voice verification
  const [voiceVerifiedText, setVoiceVerifiedText] = useState<string | null>(null);

  // Mark step complete helper
  const markStepComplete = useCallback(
    (stepIndex: number, advanceToNext: boolean = true) => {
      setCompletedSteps((prev) => {
        const next = [...prev];
        next[stepIndex - 1] = true;
        return next;
      });
      audioService.playSuccess();

      if (advanceToNext) {
        setTimeout(() => {
          setCurrentStep((cur) => (cur < 6 ? ((cur + 1) as TutorialStep) : 6));
        }, 650);
      }
    },
    []
  );

  // Trigger celebration on reaching Step 6 (Graduation)
  useEffect(() => {
    if (currentStep === 6 && isOpen) {
      try {
        confetti({
          particleCount: 85,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10b981', '#06b6d4', '#38bdf8', '#a855f7'],
        });
      } catch {}
      audioService.playSuccess();
    }
  }, [currentStep, isOpen]);

  // Handle Complete & Persist to LocalStorage
  const handleFinalExit = () => {
    try {
      localStorage.setItem('steriletouch_onboarded', 'true');
    } catch {}
    onClose();
  };

  const handleSkip = () => {
    try {
      localStorage.setItem('steriletouch_onboarded', 'true');
    } catch {}
    audioService.playClick();
    onClose();
  };

  // STEP 1 LOGIC: Sterile Optical Field Proximity
  useEffect(() => {
    if (!isOpen || currentStep !== 1 || completedSteps[0]) return;

    const isHandInOptimalRange =
      (metrics.handDetected || gestureResult.handPresent) &&
      (metrics.distanceQuality === 'OPTIMAL' ||
        (gestureResult.depthEstimate >= 0.75 && gestureResult.depthEstimate <= 1.3));

    let timer: ReturnType<typeof setInterval>;
    if (isHandInOptimalRange) {
      timer = setInterval(() => {
        setOpticalHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            markStepComplete(1, true);
            return 100;
          }
          return prev + 6.5; // ~1.5s to complete
        });
      }, 100);
    } else {
      setOpticalHoldProgress((prev) => Math.max(0, prev - 15));
    }

    return () => clearInterval(timer);
  }, [
    isOpen,
    currentStep,
    completedSteps,
    metrics.handDetected,
    metrics.distanceQuality,
    gestureResult.handPresent,
    gestureResult.depthEstimate,
    markStepComplete,
  ]);

  // STEP 2 LOGIC: Point & Dwell Target Hover Detection
  useEffect(() => {
    if (!isOpen || currentStep !== 2 || completedSteps[1]) return;

    if (!targetButtonRef.current) return;
    const rect = targetButtonRef.current.getBoundingClientRect();

    // Check if virtual cursor is over target
    const isHovering =
      cursor.x >= rect.left &&
      cursor.x <= rect.right &&
      cursor.y >= rect.top &&
      cursor.y <= rect.bottom;

    setIsDwellTargetHovered(isHovering);

    let dwellTimer: ReturnType<typeof setInterval>;
    if (isHovering) {
      dwellTimer = setInterval(() => {
        setDwellProgressLocal((prev) => {
          if (prev >= 100) {
            clearInterval(dwellTimer);
            markStepComplete(2, true);
            return 100;
          }
          return prev + 14; // ~700ms
        });
      }, 100);
    } else {
      setDwellProgressLocal(0);
    }

    return () => clearInterval(dwellTimer);
  }, [isOpen, currentStep, completedSteps, cursor.x, cursor.y, markStepComplete]);

  // STEP 3 LOGIC: 3D Spatial Depth Pinch-to-Zoom
  useEffect(() => {
    if (!isOpen || currentStep !== 3 || completedSteps[2]) return;

    if (cursor.isPinching) {
      if (lastDepthRef.current !== null) {
        const depthDelta = lastDepthRef.current - cursor.depth;
        if (Math.abs(depthDelta) > 0.005) {
          setZoomFactor((prev) => {
            const next = Math.max(0.65, Math.min(2.2, prev + depthDelta * 2.8));
            if (next >= 1.25 || next <= 0.8) {
              markStepComplete(3, true);
            }
            return next;
          });
        }
      }
      lastDepthRef.current = cursor.depth;
    } else {
      lastDepthRef.current = null;
    }
  }, [isOpen, currentStep, completedSteps, cursor.isPinching, cursor.depth, markStepComplete]);

  // STEP 4 LOGIC: Air Swipe & Sterile Freeze Fist
  useEffect(() => {
    if (!isOpen || currentStep !== 4 || completedSteps[3]) return;

    // Detect Air Swipe
    if (
      !hasSwiped &&
      (gestureResult.gesture === 'SWIPE_LEFT' || gestureResult.gesture === 'SWIPE_RIGHT')
    ) {
      setHasSwiped(true);
      setSwipeCardPage((p) => (p === 1 ? 2 : 1));
      audioService.playTick();
    }

    // Detect Sterile Freeze Fist
    if (!hasFrozen && (gestureResult.isFist || gestureResult.gesture === 'FIST')) {
      setHasFrozen(true);
      audioService.playWarning();
    }

    if ((hasSwiped || gestureResult.gesture.includes('SWIPE')) && (hasFrozen || gestureResult.isFist)) {
      markStepComplete(4, true);
    }
  }, [
    isOpen,
    currentStep,
    completedSteps,
    gestureResult.gesture,
    gestureResult.isFist,
    hasSwiped,
    hasFrozen,
    markStepComplete,
  ]);

  // STEP 5 LOGIC: Voice Assistant Command Check
  useEffect(() => {
    if (!isOpen || currentStep !== 5 || completedSteps[4]) return;

    if (voiceCommand && voiceCommand.intent !== 'UNKNOWN') {
      setVoiceVerifiedText(`Voice Command: "${voiceCommand.matchedPhrase}" [${voiceCommand.intent}]`);
      voiceAssistantService.speak('Voice engine verified. All surgical modules operational.');
      markStepComplete(5, true);
    }
  }, [isOpen, currentStep, completedSteps, voiceCommand, markStepComplete]);

  // Keyboard shortcut listener for simulation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' && currentStep === 4) {
        setHasSwiped(true);
        setSwipeCardPage(2);
        audioService.playTick();
      } else if (e.key === 'ArrowLeft' && currentStep === 4) {
        setHasSwiped(true);
        setSwipeCardPage(1);
        audioService.playTick();
      } else if ((e.key === 'f' || e.key === 'F') && currentStep === 4) {
        setHasFrozen(true);
        audioService.playWarning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[92vh]">
        {/* TOP STATUS BAR & HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SterileTouchLogo variant="icon" size="md" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Doctor Onboarding & Clinical Calibration
                </h2>
                <span className="text-[10px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-semibold">
                  Pre-Entry Protocol
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Zero-Contact Surgical Terminal Verification • Step {currentStep} of 6
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSkip}
              data-touchless-clickable="true"
              title="Skip Calibration and enter OR"
              className="text-xs text-slate-400 hover:text-slate-100 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/60 transition flex items-center gap-1.5"
            >
              <span>Skip (Experienced Surgeon)</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* STEP PROGRESS BREADCRUMBS */}
        <div className="px-6 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between overflow-x-auto gap-2">
          {STEP_TITLES.map((title, idx) => {
            const stepNum = idx + 1;
            const isCompleted = completedSteps[idx];
            const isCurrent = currentStep === stepNum;

            return (
              <button
                key={title}
                onClick={() => setCurrentStep(stepNum as TutorialStep)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-mono transition shrink-0 border ${
                  isCurrent
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : isCompleted
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400'
                    : 'bg-slate-900/40 border-transparent text-slate-500'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCurrent
                      ? 'bg-cyan-500 text-slate-950'
                      : isCompleted
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? '✓' : stepNum}
                </div>
                <span>{title}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN INTERACTIVE STEP CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col justify-center">
          {/* ======================================================== */}
          {/* STEP 1: STERILE OPTICAL PROXIMITY & LIGHTING CALIBRATION */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="flex flex-col items-center text-center space-y-6 max-w-xl mx-auto py-2">
              <div className="relative flex items-center justify-center">
                {/* Proximity concentric rings */}
                <div
                  className={`w-48 h-48 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    opticalHoldProgress > 0
                      ? 'border-emerald-500/60 bg-emerald-500/5 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
                      : 'border-slate-700 bg-slate-800/20'
                  }`}
                >
                  <div
                    className={`w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                      opticalHoldProgress > 0 ? 'border-cyan-400/70 scale-105' : 'border-slate-800'
                    }`}
                  >
                    <Hand
                      className={`w-16 h-16 transition-all duration-300 ${
                        metrics.handDetected
                          ? 'text-emerald-400 scale-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                          : 'text-slate-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Progress Ring overlay */}
                {opticalHoldProgress > 0 && (
                  <svg className="absolute inset-0 w-48 h-48 -rotate-90 pointer-events-none">
                    <circle
                      cx="96"
                      cy="96"
                      r="90"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="5"
                      strokeDasharray={2 * Math.PI * 90}
                      strokeDashoffset={2 * Math.PI * 90 * (1 - opticalHoldProgress / 100)}
                      className="transition-all duration-150"
                    />
                  </svg>
                )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Position Hand in Sterile Optical Zone
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                  Hold your sterile gloved hand approximately 45–65 cm (arm’s length) directly in
                  front of the surgical camera.
                </p>
              </div>

              {/* Live Telemetry Pill */}
              <div className="grid grid-cols-3 gap-3 w-full bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-left">
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Status</span>
                  <span
                    className={`text-xs font-semibold ${
                      metrics.handDetected ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {metrics.handDetected ? 'Hand Detected' : 'No Hand in View'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Zone Quality</span>
                  <span
                    className={`text-xs font-semibold ${
                      metrics.distanceQuality === 'OPTIMAL' ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  >
                    {metrics.distanceQuality === 'OPTIMAL' ? 'Optimal (45-65 cm)' : metrics.distanceQuality}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-mono uppercase block">Hold Steady</span>
                  <span className="text-xs font-mono text-emerald-400">
                    {Math.round(opticalHoldProgress)}%
                  </span>
                </div>
              </div>

              {/* Simulation fallback controls */}
              <div className="flex items-center gap-3 pt-2">
                {!isCameraActive && onStartCamera && (
                  <button
                    onClick={onStartCamera}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition"
                  >
                    Activate Camera Feed
                  </button>
                )}
                <button
                  onClick={() => {
                    setOpticalHoldProgress(100);
                    markStepComplete(1, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
                >
                  Quick Verify Proximity (Simulate)
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: TOUCHLESS POINT & DWELL-CLICK                    */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center text-center space-y-6 max-w-xl mx-auto py-2">
              <div className="p-4 bg-cyan-950/20 border border-cyan-800/40 rounded-xl">
                <Target className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
                <h3 className="text-xl font-bold text-white mb-1">
                  Point & Dwell Precision Calibration
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Extend your index finger to direct the holographic pointer. Hover steadily over the
                  verification button below for 750ms to trigger a sterile dwell click.
                </p>
              </div>

              {/* Interactive Target Reticle */}
              <div className="relative py-8 flex flex-col items-center">
                <button
                  ref={targetButtonRef}
                  onClick={() => {
                    setDwellProgressLocal(100);
                    markStepComplete(2, true);
                  }}
                  data-touchless-clickable="true"
                  className={`relative px-8 py-5 rounded-2xl font-bold text-base transition-all duration-200 flex items-center gap-3 border shadow-lg ${
                    completedSteps[1]
                      ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
                      : isDwellTargetHovered
                      ? 'bg-cyan-900/80 border-cyan-400 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] scale-105'
                      : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {/* Circular Dwell Radial Progress */}
                  <div className="relative w-7 h-7 flex items-center justify-center">
                    <svg className="w-7 h-7 -rotate-90">
                      <circle
                        cx="14"
                        cy="14"
                        r="12"
                        fill="none"
                        stroke="#334155"
                        strokeWidth="3"
                      />
                      <circle
                        cx="14"
                        cy="14"
                        r="12"
                        fill="none"
                        stroke={completedSteps[1] ? '#10b981' : '#06b6d4'}
                        strokeWidth="3"
                        strokeDasharray={2 * Math.PI * 12}
                        strokeDashoffset={2 * Math.PI * 12 * (1 - dwellProgressLocal / 100)}
                        className="transition-all duration-100"
                      />
                    </svg>
                    <span className="absolute text-[9px] font-mono font-bold text-slate-200">
                      {completedSteps[1] ? '✓' : Math.round(dwellProgressLocal)}
                    </span>
                  </div>

                  <span>
                    {completedSteps[1]
                      ? 'Dr. Aris Thorne (Identity Verified)'
                      : 'Hold Cursor Here to Verify Surgeon'}
                  </span>
                </button>

                {isDwellTargetHovered && !completedSteps[1] && (
                  <p className="text-xs text-cyan-400 font-mono mt-3 animate-pulse">
                    [DWELLING 750ms] Keep steady...
                  </p>
                )}
              </div>

              {/* Cursor position indicator */}
              <div className="w-full bg-slate-950/70 border border-slate-800 p-3 rounded-xl text-xs font-mono text-slate-400 flex items-center justify-between">
                <span>
                  Cursor Position: X: {Math.round(cursor.x)}px | Y: {Math.round(cursor.y)}px
                </span>
                <span className={cursor.isPinching ? 'text-amber-400' : 'text-slate-500'}>
                  {cursor.isPinching ? 'Pinch Active' : 'Pointing Mode'}
                </span>
              </div>

              <button
                onClick={() => {
                  setDwellProgressLocal(100);
                  markStepComplete(2, true);
                }}
                data-touchless-clickable="true"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
              >
                Simulate Dwell Trigger (Manual Pass)
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: 3D SPATIAL DEPTH PINCH-TO-ZOOM                   */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center text-center space-y-6 max-w-xl mx-auto py-2">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Continuous 3D Spatial Depth Pinch-to-Zoom
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Pinch your thumb and index finger together. While pinched,{' '}
                  <strong className="text-cyan-400">push your hand forward closer to camera</strong> to
                  zoom in past 125%, or pull back to zoom out.
                </p>
              </div>

              {/* Interactive CT Scan Thumbnail Viewport */}
              <div className="relative w-80 h-52 bg-slate-950 rounded-2xl border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-inner">
                {/* Simulated scan image with transform zoom */}
                <div
                  className="w-48 h-48 rounded-full border-4 border-cyan-500/30 bg-radial from-slate-800 via-slate-900 to-black flex items-center justify-center transition-transform duration-100"
                  style={{ transform: `scale(${zoomFactor})` }}
                >
                  <div className="w-36 h-36 border border-dashed border-cyan-400/50 rounded-full flex items-center justify-center text-cyan-400 text-center p-2">
                    <span className="text-[10px] font-mono">
                      Cranial CT Axial Slice #14
                      <br />
                      Subdural Hematoma Zone
                    </span>
                  </div>
                </div>

                {/* Floating HUD Indicator */}
                <div className="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-mono text-cyan-300 flex items-center gap-1.5 shadow">
                  <Move3d className="w-3.5 h-3.5" />
                  <span>Zoom: {Math.round(zoomFactor * 100)}%</span>
                </div>

                {zoomFactor >= 1.25 && (
                  <div className="absolute bottom-3 bg-emerald-950/90 border border-emerald-500/80 px-3 py-1 rounded-full text-xs font-bold text-emerald-300 flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Depth Calibrated ({Math.round(zoomFactor * 100)}%)</span>
                  </div>
                )}
              </div>

              {/* Slider for simulation */}
              <div className="w-full flex items-center gap-4 bg-slate-950/70 border border-slate-800 p-3 rounded-xl">
                <span className="text-xs text-slate-400 font-mono">Zoom Control:</span>
                <input
                  type="range"
                  min="70"
                  max="180"
                  value={Math.round(zoomFactor * 100)}
                  onChange={(e) => {
                    const next = Number(e.target.value) / 100;
                    setZoomFactor(next);
                    if (next >= 1.25 || next <= 0.8) {
                      markStepComplete(3, true);
                    }
                  }}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="text-xs font-mono text-cyan-300 w-12 text-right">
                  {Math.round(zoomFactor * 100)}%
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setZoomFactor(1.4);
                    markStepComplete(3, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
                >
                  Push Forward (+140% Zoom)
                </button>
                <button
                  onClick={() => {
                    setZoomFactor(0.75);
                    markStepComplete(3, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition"
                >
                  Pull Back (75% Zoom)
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: AIR SWIPE & STERILE FREEZE FIST                  */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center text-center space-y-6 max-w-xl mx-auto py-2">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Air Swipe Paging & Sterile Freeze Lock
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  In sterile ORs, doctors need fast paging and an emergency freeze mode when adjusting
                  instruments without moving the screen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                {/* Air Swipe Test Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col items-center justify-between min-h-[170px] transition-all ${
                    hasSwiped
                      ? 'bg-emerald-950/30 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="text-left w-full flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Test 1: Air Wave</span>
                    {hasSwiped && <span className="text-xs text-emerald-400 font-bold">✓ Verified</span>}
                  </div>

                  <div className="text-center py-2">
                    <div className="text-sm font-semibold text-white mb-1">
                      Pre-Op Plan Card (Page {swipeCardPage}/2)
                    </div>
                    <p className="text-xs text-slate-400">
                      {swipeCardPage === 1
                        ? 'Craniotomy burr-hole trajectory: Left temporal 15°'
                        : 'Subdural hematoma evacuation protocol: 35cc target'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setHasSwiped(true);
                        setSwipeCardPage((p) => (p === 1 ? 2 : 1));
                        audioService.playTick();
                      }}
                      data-touchless-clickable="true"
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded border border-slate-700"
                    >
                      ← Swipe Left / Right →
                    </button>
                  </div>
                </div>

                {/* Sterile Freeze Fist Test Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col items-center justify-between min-h-[170px] transition-all ${
                    hasFrozen
                      ? 'bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                      : 'bg-slate-950/60 border-slate-800'
                  }`}
                >
                  <div className="text-left w-full flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-slate-500">Test 2: Freeze Fist</span>
                    {hasFrozen && <span className="text-xs text-rose-400 font-bold">✓ Verified</span>}
                  </div>

                  <div className="text-center py-2 flex flex-col items-center">
                    {hasFrozen ? (
                      <Lock className="w-8 h-8 text-rose-400 mb-1 animate-pulse" />
                    ) : (
                      <Hand className="w-8 h-8 text-slate-500 mb-1" />
                    )}
                    <div className="text-sm font-semibold text-white">
                      {hasFrozen ? 'Sterile Freeze Engaged' : 'Clench Fist to Lock'}
                    </div>
                    <p className="text-xs text-slate-400">
                      {hasFrozen ? 'Cursor locked in place' : 'Prevents accidental screen input'}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setHasFrozen(true);
                      audioService.playWarning();
                    }}
                    data-touchless-clickable="true"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-rose-300 rounded border border-slate-700"
                  >
                    Clench Fist (Key 'F')
                  </button>
                </div>
              </div>

              {hasSwiped && hasFrozen && (
                <div className="bg-emerald-950/80 border border-emerald-500 px-4 py-1.5 rounded-full text-xs font-bold text-emerald-300">
                  ✓ Air Gestures & Emergency Lock Verified!
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 5: VOICE ASSISTANT MIC CHECK                        */}
          {/* ======================================================== */}
          {currentStep === 5 && (
            <div className="flex flex-col items-center text-center space-y-6 max-w-xl mx-auto py-2">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">
                  Hands-Free Voice Assistant Mic Check
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto">
                  Speak into your surgical mic to issue instant hands-free instructions.
                </p>
              </div>

              {/* Animated Soundwave Visualizer */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-1.5 h-16 mb-4">
                  {[40, 75, 55, 90, 65, 80, 45, 100, 70, 85, 50, 95, 60, 40].map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-cyan-400 animate-pulse"
                      style={{
                        height: `${completedSteps[4] ? 20 : h}%`,
                        animationDelay: `${i * 65}ms`,
                      }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-cyan-300 font-mono text-sm">
                  <Mic className="w-4 h-4 animate-bounce" />
                  <span>Say: "Bone Window", "Next Slice", or "Show 3D"</span>
                </div>

                {voiceVerifiedText && (
                  <div className="mt-3 px-3 py-1 bg-emerald-950/90 border border-emerald-500 rounded-lg text-xs font-bold text-emerald-300">
                    {voiceVerifiedText}
                  </div>
                )}
              </div>

              {/* Quick simulation buttons for voice testing */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => {
                    const fakeResult: VoiceCommandResult = {
                      intent: 'SET_WINDOW_PRESET',
                      matchedPhrase: 'bone window',
                      rawTranscript: 'bone window',
                      params: { preset: 'BONE' },
                      confidence: 0.98,
                    };
                    setVoiceVerifiedText('Voice Command: "bone window" [SET_WINDOW_PRESET]');
                    voiceAssistantService.speak('Bone window active. Voice audio verified.');
                    markStepComplete(5, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded-lg border border-slate-700 transition"
                >
                  Simulate "Bone Window"
                </button>
                <button
                  onClick={() => {
                    const fakeResult: VoiceCommandResult = {
                      intent: 'NEXT_SLICE',
                      matchedPhrase: 'next slice',
                      rawTranscript: 'next slice',
                      confidence: 0.98,
                    };
                    setVoiceVerifiedText('Voice Command: "next slice" [NEXT_SLICE]');
                    voiceAssistantService.speak('Next slice calibrated.');
                    markStepComplete(5, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded-lg border border-slate-700 transition"
                >
                  Simulate "Next Slice"
                </button>
                <button
                  onClick={() => {
                    const fakeResult: VoiceCommandResult = {
                      intent: 'VIEW_MODE_3D',
                      matchedPhrase: 'show 3d',
                      rawTranscript: 'show 3d',
                      confidence: 0.98,
                    };
                    setVoiceVerifiedText('Voice Command: "show 3d" [VIEW_MODE_3D]');
                    voiceAssistantService.speak('Three-D volumetric reconstruction.');
                    markStepComplete(5, true);
                  }}
                  data-touchless-clickable="true"
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-cyan-300 rounded-lg border border-slate-700 transition"
                >
                  Simulate "Show 3D"
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 6: OR READINESS VERIFIED (GRADUATION)               */}
          {/* ======================================================== */}
          {currentStep === 6 && (
            <div className="flex flex-col items-center text-center space-y-5 max-w-xl mx-auto py-2">
              <SterileTouchLogo variant="full" size="sm" className="mb-1" />

              <div>
                <h3 className="text-2xl font-bold text-white mb-1.5 tracking-tight">
                  Sterile Touchless Protocol Fully Verified
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  All 5 clinical interaction modalities have passed optical, temporal, and acoustic
                  benchmarks. Certified for sterile operative deployment.
                </p>
              </div>

              {/* Certificate Summary Checklist */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Certification ID:</span>
                  <span className="font-mono text-cyan-400 font-semibold">ST-OR-VERIFIED-9028</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Optical Sterile Proximity</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Point & Dwell Precision</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Continuous 3D Depth Zoom</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Air Wave & Fist Lock</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400 font-medium sm:col-span-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Noise-Filtered Clinical Voice Engine</span>
                  </div>
                </div>
              </div>

              {/* Large CTA Enter Operating Room */}
              <button
                onClick={handleFinalExit}
                data-touchless-clickable="true"
                className="w-full py-4 rounded-xl font-bold text-base bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                <span>Enter Operating Suite Terminal</span>
              </button>

              <button
                onClick={() => {
                  setCompletedSteps([false, false, false, false, false]);
                  setOpticalHoldProgress(0);
                  setDwellProgressLocal(0);
                  setZoomFactor(1.0);
                  setHasSwiped(false);
                  setHasFrozen(false);
                  setVoiceVerifiedText(null);
                  setCurrentStep(1);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recalibrate from Step 1</span>
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER CONTROLS */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs">
          <button
            onClick={() => setCurrentStep((cur) => (cur > 1 ? ((cur - 1) as TutorialStep) : 1))}
            disabled={currentStep === 1}
            data-touchless-clickable="true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <span className="font-mono text-slate-500 hidden sm:inline">
            Sterile Calibration Mode • Press [Esc] to exit
          </span>

          <button
            onClick={() => setCurrentStep((cur) => (cur < 6 ? ((cur + 1) as TutorialStep) : 6))}
            disabled={currentStep === 6}
            data-touchless-clickable="true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:pointer-events-none transition"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
