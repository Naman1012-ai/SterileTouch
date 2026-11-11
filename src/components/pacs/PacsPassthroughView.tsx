import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Cast,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Layers,
  Maximize2,
  Monitor,
  Power,
  RefreshCw,
  Ruler,
  Shield,
  Sparkles,
  Tv,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { VirtualCursorState } from '../../types/gestures';
import { audioService } from '../../services/audioFeedback';
import { osBridgeService, OsBridgeStatus } from '../../services/osBridgeService';
import { SterileTouchLogo } from '../brand/SterileTouchLogo';

interface PacsPassthroughViewProps {
  cursor: VirtualCursorState;
}

export const PacsPassthroughView: React.FC<PacsPassthroughViewProps> = ({ cursor }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [osBridgeStatus, setOsBridgeStatus] = useState<OsBridgeStatus>(() => osBridgeService.getStatus());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  useEffect(() => {
    const unsub = osBridgeService.onStatusChange((status) => {
      setOsBridgeStatus(status);
    });
    return () => unsub();
  }, []);

  // Forward cursor movement and click to OS bridge if connected and engaged
  useEffect(() => {
    if (!osBridgeStatus.isConnected || cursor.clutchState !== 'ENGAGED') return;

    osBridgeService.sendMouseMove(cursor.normalizedX, cursor.normalizedY);
  }, [cursor.normalizedX, cursor.normalizedY, cursor.clutchState, osBridgeStatus.isConnected]);

  const handleStartCapture = async () => {
    setIsConnecting(true);
    setErrorMessage(null);
    audioService.playTick(900);

    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen capture is not supported in this browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'window',
        },
        audio: false,
      });

      setStream(mediaStream);
      setIsDemoMode(false);
      audioService.playChime();

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      mediaStream.getVideoTracks()[0].onended = () => {
        handleStopCapture();
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('Permission denied') && !msg.includes('User cancelled')) {
        setErrorMessage(msg);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStopCapture = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsDemoMode(false);
    audioService.playLock();
  };

  const handleStartDemo = () => {
    setIsDemoMode(true);
    setStream(null);
    audioService.playChime();
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden relative select-none">
      {/* Top Telemetry & Control Ribbon */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-wide">
                  Zero-Integration PACS Mirror
                </span>
                <span
                  className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold uppercase border ${
                    stream || isDemoMode
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/60'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {stream ? 'Live PACS Stream' : isDemoMode ? 'PACS Simulation' : 'Standby'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Controls Sectra, Horos, GE Centricity, Siemens, and Philips PACS Touchlessly
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden md:block" />

          {/* OS Virtual HID Bridge Status Pill */}
          <div
            className={`hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-mono ${
              osBridgeStatus.isConnected
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                osBridgeStatus.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            <span>
              {osBridgeStatus.isConnected
                ? `OS HID Daemon: CONNECTED (${osBridgeStatus.os})`
                : 'OS HID Daemon: Standalone Mode (Run bridge.py for OS clicks)'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {stream || isDemoMode ? (
            <button
              onClick={handleStopCapture}
              data-touchless-clickable="true"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-600/70 text-rose-300 hover:bg-rose-900 text-xs font-semibold transition"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Disconnect PACS</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleStartCapture}
                disabled={isConnecting}
                data-touchless-clickable="true"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition"
              >
                <Cast className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Hospital PACS'}</span>
              </button>
              <button
                onClick={handleStartDemo}
                data-touchless-clickable="true"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition"
              >
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Try Demo PACS</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
        {/* Active Live Video Stream */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          className={`w-full h-full object-contain ${stream ? 'block' : 'hidden'}`}
        />

        {/* Demo PACS Simulated Frame */}
        {isDemoMode && !stream && (
          <div className="w-full h-full flex flex-col bg-slate-950 relative overflow-hidden p-4">
            <div className="flex-1 rounded-xl border border-slate-800 bg-[#070b12] flex flex-col overflow-hidden shadow-2xl relative">
              {/* Simulated PACS Titlebar */}
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span className="font-bold text-white">Sectra UniView PACS • Station OR-4</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-cyan-300">STUDY #8849-B • CRANIAL CT 0.5mm</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>W: 350 L: 40 (Soft Tissue)</span>
                  <span>Slice: 34 / 88</span>
                </div>
              </div>

              {/* Simulated Multi-Viewport Grid */}
              <div className="flex-1 grid grid-cols-2 gap-2 p-3 bg-black">
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 relative flex items-center justify-center p-2">
                  <img
                    src="https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80"
                    alt="Simulated PACS Axial"
                    className="w-full h-full object-contain rounded"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-mono text-cyan-400 bg-black/60 px-1.5 py-0.5 rounded">
                    Axial 0.5mm
                  </span>
                </div>
                <div className="rounded-lg border border-slate-800/80 bg-slate-950/80 relative flex items-center justify-center p-2">
                  <img
                    src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80"
                    alt="Simulated PACS Coronal"
                    className="w-full h-full object-contain rounded"
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
                    Coronal 3D MPR
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State / Connection Onboarding Card */}
        {!stream && !isDemoMode && (
          <div className="max-w-xl w-full mx-4 p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col items-center text-center backdrop-blur-xl">
            <div className="p-3.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <Laptop className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white tracking-tight">
              Control Any Hospital PACS Touchlessly
            </h2>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              SterileTouch eliminates the need to install plugins into locked-down clinical hospital
              networks. Mirror your existing PACS window (Sectra, GE Centricity, Siemens, Horos) to
              control it with mid-air gestures and voice commands.
            </p>

            {/* Compatible Systems List */}
            <div className="grid grid-cols-3 gap-2.5 w-full my-6 text-[11px] font-mono text-slate-300">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Sectra PACS</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>GE Centricity</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Siemens Syngo</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Horos / OsiriX</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Philips Intelli</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Epic / Cerner</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                onClick={handleStartCapture}
                data-touchless-clickable="true"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-950"
              >
                <Cast className="w-4 h-4" />
                <span>Mirror PACS Window</span>
              </button>
              <button
                onClick={handleStartDemo}
                data-touchless-clickable="true"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition"
              >
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span>Open PACS Simulator</span>
              </button>
            </div>

            {errorMessage && (
              <p className="mt-4 text-xs font-mono text-rose-400 bg-rose-950/50 border border-rose-800/60 px-3 py-1.5 rounded-lg">
                {errorMessage}
              </p>
            )}
          </div>
        )}

        {/* Floating Quick Action Overlay Bar when Stream or Demo is Active */}
        {(stream || isDemoMode) && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-xl shadow-2xl">
            <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              TOUCHLESS HOTKEYS
            </span>

            <button
              onClick={() => {
                audioService.playSwipe();
                osBridgeService.sendKeyPress('pageup');
              }}
              data-touchless-clickable="true"
              title="Next Slice (Air Swipe / Page Up)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-mono transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Next Slice</span>
            </button>

            <button
              onClick={() => {
                audioService.playSwipe();
                osBridgeService.sendKeyPress('pagedown');
              }}
              data-touchless-clickable="true"
              title="Previous Slice (Air Swipe / Page Down)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-mono transition"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Prev Slice</span>
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <button
              onClick={() => {
                audioService.playClick();
                osBridgeService.sendKeyPress('b');
              }}
              data-touchless-clickable="true"
              title="Bone Window Preset (Key: B)"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-mono transition"
            >
              Bone Preset
            </button>

            <button
              onClick={() => {
                audioService.playClick();
                osBridgeService.sendKeyPress('t');
              }}
              data-touchless-clickable="true"
              title="Soft Tissue Preset (Key: T)"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-cyan-950/70 border border-slate-700 hover:border-cyan-500/60 text-slate-200 hover:text-cyan-300 text-xs font-mono transition"
            >
              Soft Tissue
            </button>

            <div className="h-4 w-px bg-slate-700" />

            <button
              onClick={() => {
                audioService.playPinch();
                osBridgeService.sendMouseScroll(2);
              }}
              data-touchless-clickable="true"
              title="Zoom In (Scroll Up)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => {
                audioService.playPinch();
                osBridgeService.sendMouseScroll(-2);
              }}
              data-touchless-clickable="true"
              title="Zoom Out (Scroll Down)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
