import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, ChevronDown, ChevronUp, Eye, EyeOff, Info, RefreshCw, Zap } from 'lucide-react';
import { Point3D, TrackingMetrics } from '../../types/gestures';

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
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md w-64 transition-all">
        {/* Header Bar */}
        <div className="bg-slate-800/80 px-3 py-2 flex items-center justify-between border-b border-slate-700/60 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${metrics.handDetected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className="font-semibold tracking-wide text-slate-200">Surgeon HUD</span>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
              {metrics.fps} FPS
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSkeleton(!showSkeleton)}
              title={showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
              className="p-1 text-slate-400 hover:text-cyan-400 transition"
            >
              {showSkeleton ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-slate-400 hover:text-slate-200 transition"
            >
              {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
