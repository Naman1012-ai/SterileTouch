import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, Eye, EyeOff, Info, RefreshCw, Shield, Sparkles, Sun, Zap } from 'lucide-react';
import { Point3D, TrackingMetrics } from '../../types/gestures';
import { GloveType, videoPreProcessor } from '../../services/videoPreProcessor';

// MediaPipe Hand landmark connections (pairs of landmark indices)
const HAND_CONNECTIONS = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [0, 9], [9, 10], [10, 11], [11, 12],
  // Ring
  [0, 13], [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm Base
  [5, 9], [9, 13], [13, 17],
];

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarks: Point3D[] | null;
  metrics: TrackingMetrics;
  isSimulated: boolean;
  onToggleSimulated: () => void;
  isCameraActive: boolean;
  onToggleCamera: () => void;
  cameraError: string | null;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({
  videoRef,
  landmarks,
  metrics,
  isSimulated,
  onToggleSimulated,
  isCameraActive,
  onToggleCamera,
  cameraError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [gloveMode, setGloveMode] = useState<GloveType>(() => videoPreProcessor.getGloveMode());
  const [antiGlare, setAntiGlare] = useState<boolean>(() => videoPreProcessor.isAntiGlareEnabled());

  const handleGloveChange = (mode: GloveType) => {
    setGloveMode(mode);
    videoPreProcessor.setGloveMode(mode);
  };

  const handleAntiGlareToggle = () => {
    const next = !antiGlare;
    setAntiGlare(next);
    videoPreProcessor.setAntiGlareEnabled(next);
  };

  // Draw hand landmarks on canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 21 || !showSkeleton || isSimulated) {
      return;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Draw skeletal bones
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.75)'; // Medical cyan

    HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      if (p1 && p2) {
        ctx.beginPath();
        // Video is mirrored horizontally
        ctx.moveTo((1 - p1.x) * w, p1.y * h);
        ctx.lineTo((1 - p2.x) * w, p2.y * h);
        ctx.stroke();
      }
    });

    // Draw landmark joint dots
    landmarks.forEach((p, idx) => {
      const x = (1 - p.x) * w;
      const y = p.y * h;

      ctx.beginPath();
      ctx.arc(x, y, idx === 8 || idx === 4 ? 4.5 : 2.5, 0, 2 * Math.PI);

      if (idx === 8 || idx === 4) {
        // Tips of index and thumb (pinch points)
        ctx.fillStyle = '#10b981'; // Emerald
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 8;
      } else if (idx === 0) {
        // Wrist
        ctx.fillStyle = '#f59e0b';
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 0;
      }
      ctx.fill();
    });
  }, [landmarks, showSkeleton, isSimulated]);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      {/* Simulation Banner Notification */}
      {isSimulated && (
        <div className="mb-2 bg-amber-950/80 border border-amber-500/60 rounded-lg p-2.5 max-w-xs text-xs text-amber-200 backdrop-blur-md shadow-xl">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300 mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>Virtual Simulation Active</span>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-100/90">
            Move mouse to direct pointer. <strong className="text-white">Hold Space</strong> to pinch/drag, <strong className="text-white">F</strong> to freeze, <strong className="text-white">T</strong> for thumbs-up, <strong className="text-white">Arrow keys</strong> to swipe slices!
          </p>
        </div>
      )}

      {/* Main HUD Window */}
      <div
        className={`bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-200 ${
          isCollapsed ? 'w-auto' : 'w-64'
        }`}
      >
        {/* Header Bar */}
        <div className="bg-slate-800/90 px-3.5 py-2 flex items-center justify-between border-b border-slate-700/60 text-xs text-slate-300 gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                metrics.handDetected ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-500'
              }`}
            />
            <span className="font-semibold tracking-wide text-slate-200">Surgeon HUD</span>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800/60 font-bold">
              {metrics.fps} FPS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {!isCollapsed && (
              <button
                onClick={() => setShowSkeleton(!showSkeleton)}
                title={showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
                data-touchless-clickable="true"
                className="p-1 text-slate-400 hover:text-cyan-400 transition"
              >
                {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-touchless-clickable="true"
              title={isCollapsed ? 'Expand HUD' : 'Collapse HUD'}
              className="p-1 text-slate-400 hover:text-slate-100 transition rounded hover:bg-slate-700/50"
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsible Video & Telemetry */}
        {!isCollapsed && (
          <div className="p-2 space-y-2">
            {/* Video Viewport with Canvas Overlay */}
            <div className="relative w-full h-36 bg-black rounded-lg overflow-hidden border border-slate-800 flex items-center justify-center">
              {/* HTML5 Video Element */}
              <video
                ref={videoRef as React.RefObject<HTMLVideoElement>}
                playsInline
                muted
                autoPlay
                className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 ${
                  !isCameraActive || isSimulated ? 'hidden' : 'block'
                }`}
              />

              {/* Landmark Canvas Overlay */}
              <canvas
                ref={canvasRef}
                width={256}
                height={144}
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
              />

              {/* Status / Fallback Screen */}
              {(!isCameraActive || isSimulated || cameraError) && (
                <div className="flex flex-col items-center justify-center text-center p-3 text-slate-400 z-20">
                  <CameraOff className="w-6 h-6 text-slate-500 mb-1" />
                  <span className="text-[11px] font-medium text-slate-300">
                    {cameraError ? 'Camera Blocked / Unavailable' : 'Camera Feed Idle'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5">
                    {isSimulated ? 'Simulation controls active' : 'Click "Start Camera" or "Simulate"'}
                  </span>
                </div>
              )}

              {/* Live Distance Overlay */}
              {metrics.handDetected && !isSimulated && (
                <div className="absolute top-1 left-1.5 z-20">
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      metrics.distanceQuality === 'OPTIMAL'
                        ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                        : 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                    }`}
                  >
                    {metrics.distanceQuality === 'OPTIMAL'
                      ? 'STERILE DEPTH OK'
                      : metrics.distanceQuality === 'TOO_CLOSE'
                      ? 'MOVE BACK'
                      : 'MOVE CLOSER'}
                  </span>
                </div>
              )}
            </div>

            {/* OT Lighting & Glove Preset Row */}
            <div className="flex items-center justify-between px-1 py-1 rounded-lg bg-slate-950/70 border border-slate-800 text-[10px]">
              <div className="flex items-center gap-1">
                <Sun className={`w-3 h-3 ${antiGlare ? 'text-amber-400' : 'text-slate-500'}`} />
                <button
                  onClick={handleAntiGlareToggle}
                  data-touchless-clickable="true"
                  title="Overhead Surgical Lamp Anti-Glare Specular Clamping"
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold transition ${
                    antiGlare
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-600/50'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {antiGlare ? 'Anti-Glare ON' : 'Glare OFF'}
                </button>
              </div>

              {/* Glove Color Mode Pill Switcher */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => handleGloveChange('BLUE_NITRILE')}
                  data-touchless-clickable="true"
                  title="Cobalt Blue Nitrile Gloves"
                  className={`w-4 h-4 rounded-full border transition ${
                    gloveMode === 'BLUE_NITRILE'
                      ? 'bg-cyan-500 border-white shadow-[0_0_8px_rgba(6,182,212,0.8)] scale-110'
                      : 'bg-cyan-800/60 border-cyan-700/60 hover:scale-105'
                  }`}
                />
                <button
                  onClick={() => handleGloveChange('GREEN_LATEX')}
                  data-touchless-clickable="true"
                  title="Surgical Green Latex Gloves"
                  className={`w-4 h-4 rounded-full border transition ${
                    gloveMode === 'GREEN_LATEX'
                      ? 'bg-emerald-500 border-white shadow-[0_0_8px_rgba(16,185,129,0.8)] scale-110'
                      : 'bg-emerald-800/60 border-emerald-700/60 hover:scale-105'
                  }`}
                />
                <button
                  onClick={() => handleGloveChange('WHITE_LATEX')}
                  data-touchless-clickable="true"
                  title="Stark White Powder-Free Gloves"
                  className={`w-4 h-4 rounded-full border transition ${
                    gloveMode === 'WHITE_LATEX'
                      ? 'bg-slate-200 border-white shadow-[0_0_8px_rgba(255,255,255,0.8)] scale-110'
                      : 'bg-slate-600/60 border-slate-500/60 hover:scale-105'
                  }`}
                />
                <button
                  onClick={() => handleGloveChange('BARE_SKIN')}
                  data-touchless-clickable="true"
                  title="Bare Hand (Trauma Bay / Office)"
                  className={`w-4 h-4 rounded-full border transition ${
                    gloveMode === 'BARE_SKIN'
                      ? 'bg-amber-300 border-white shadow-[0_0_8px_rgba(251,191,36,0.8)] scale-110'
                      : 'bg-amber-700/60 border-amber-600/60 hover:scale-105'
                  }`}
                />
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={onToggleCamera}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium transition ${
                  isCameraActive
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-md shadow-cyan-950'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isCameraActive ? 'Stop Cam' : 'Start Cam'}</span>
              </button>

              <button
                onClick={onToggleSimulated}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium transition ${
                  isSimulated
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSimulated ? 'Sim Active' : 'Simulate'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
