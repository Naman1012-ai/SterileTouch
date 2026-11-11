import React, { useEffect, useState } from 'react';
import {
  Camera,
  CameraOff,
  Hand,
  Keyboard,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { TrackingMetrics, VirtualCursorState } from '../../types/gestures';
import { useWorkstation } from '../../context/WorkstationContext';
import { StatusIndicator, SensorStatusType } from '../ui/StatusIndicator';
import { Badge } from '../ui/Badge';
import { osBridgeService, OsBridgeStatus } from '../../services/osBridgeService';

interface SystemStatusBarProps {
  isCameraActive: boolean;
  isSimulated: boolean;
  cameraError: string | null;
  metrics: TrackingMetrics;
  cursor: VirtualCursorState;
  isMuted: boolean;
  onToggleCamera?: () => void;
  className?: string;
}

export const SystemStatusBar: React.FC<SystemStatusBarProps> = ({
  isCameraActive,
  isSimulated,
  cameraError,
  metrics,
  cursor,
  isMuted,
  onToggleCamera,
  className = '',
}) => {
  const { mode } = useWorkstation();
  const isSimple = mode === 'SIMPLE';

  // Live truthful OS bridge connection status
  const [bridgeStatus, setBridgeStatus] = useState<OsBridgeStatus>(() =>
    osBridgeService.getStatus()
  );

  useEffect(() => {
    const unsub = osBridgeService.onStatusChange((status) => {
      setBridgeStatus(status);
    });
    return () => unsub();
  }, []);

  // Determine optical tracking sensor status truthfully (No fabricated metrics)
  let trackingStatus: SensorStatusType = 'OFFLINE';
  let trackingLabel = 'Optical Feed Offline';

  if (cameraError) {
    trackingStatus = 'ERROR';
    trackingLabel = 'Hardware Error';
  } else if (isCameraActive) {
    trackingStatus = 'ONLINE';
    trackingLabel = `${metrics.fps} FPS • ${metrics.latencyMs}ms`;
  } else if (isSimulated) {
    trackingStatus = 'SIMULATED';
    trackingLabel = 'Simulation Mode';
  }

  // Determine surgical clutch status
  let clutchStatus: SensorStatusType = 'STANDBY';
  let clutchLabel = 'STANDBY';

  if (cursor.isFrozen) {
    clutchStatus = 'CLUTCHED';
    clutchLabel = 'FROZEN';
  } else if (cursor.clutchState === 'ENGAGED') {
    clutchStatus = 'ENGAGED';
    clutchLabel = 'ENGAGED';
  } else if (cursor.clutchState === 'ENGAGING') {
    clutchStatus = 'STANDBY';
    clutchLabel = 'ENGAGING';
  }

  return (
    <footer
      aria-label="Workstation Telemetry & System Status"
      className={`bg-slate-950/95 border-t border-slate-800/90 px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none z-20 ${
        isSimple ? 'py-2' : 'py-1.5'
      } ${className}`}
    >
      {/* Left Tray: Sensor Telemetry & Clutch Engine */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Optical Sensor Status (Truthful runtime states only) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleCamera}
            data-touchless-clickable="true"
            title={isCameraActive ? 'Stop Optical Sensor' : 'Start Optical Sensor'}
            className="flex items-center gap-1.5 hover:opacity-80 transition cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 rounded"
          >
            {isCameraActive ? (
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <CameraOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            <StatusIndicator
              label="Optical Tracking"
              status={trackingStatus}
              customText={trackingLabel}
              showDot={true}
            />
          </button>
        </div>

        {/* MediaPipe Hand Presence (Only when optical sensor is actively measuring) */}
        {isCameraActive && (
          <div className="hidden sm:flex items-center gap-1.5">
            <Badge
              variant={metrics.handDetected ? 'emerald' : 'slate'}
              size="xs"
              hasDot={metrics.handDetected}
            >
              <span className="flex items-center gap-1">
                <Hand className="w-3 h-3" />
                <span>{metrics.handDetected ? 'Hand Locked' : 'Searching Hand'}</span>
              </span>
            </Badge>
          </div>
        )}

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Midas Touch Surgical Clutch State */}
        <div className="flex items-center gap-1.5">
          <StatusIndicator
            label="Surgical Clutch"
            status={clutchStatus}
            customText={`Clutch: ${clutchLabel}`}
            showDot={true}
          />
        </div>

        {/* Truthful Universal PACS OS Bridge Connectivity */}
        <div className="hidden md:flex items-center gap-1.5">
          {bridgeStatus.isConnected ? (
            <div
              title={`SterileTouch OS Bridge Active (${bridgeStatus.os} • ${bridgeStatus.screenWidth}x${bridgeStatus.screenHeight})`}
              className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/80 border border-cyan-700/60 px-2 py-0.5 rounded shadow-[0_0_8px_rgba(6,182,212,0.2)]"
            >
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Bridge: Connected</span>
            </div>
          ) : (
            <div
              title="SterileTouch OS Bridge Offline (Run python bridge/steriletouch_bridge.py for external PACS mouse/scroll control)"
              className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              <span>Bridge: Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Tray: Emergency Manual Shortcuts Bar */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
        <div className="hidden lg:flex items-center gap-2 text-slate-400">
          <Keyboard className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Manual Override:
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [1-5] Modules
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [Space] Pinch
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [F] Freeze
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [C] Clutch
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [M] Mute
          </span>
          <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
            [Esc] Close
          </span>
        </div>

        {/* Audio Status */}
        <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-rose-400" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
          )}
          <span className="text-[10px] uppercase font-mono">
            {isMuted ? 'Muted' : 'Audio On'}
          </span>
        </div>
      </div>
    </footer>
  );
};
