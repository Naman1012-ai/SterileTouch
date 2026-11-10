import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Eye,
  FileText,
  Layers,
  Maximize,
  Minus,
  Move,
  Plus,
  RefreshCw,
  Ruler,
  Sliders,
  Sparkles,
  Square,
  SunMedium,
  Trash2,
  Upload,
} from 'lucide-react';
import { CaliperMeasurement, MedicalScanSeries, WindowPreset } from '../../types/medical';
import { Point2D, Point3D, VirtualCursorState } from '../../types/gestures';
import { DecodedMedicalSlice } from '../../types/dicom';
import { DicomParser } from '../../services/dicomParser';
import { VoiceCommandResult } from '../../types/speech';
import { audioService } from '../../services/audioFeedback';
import { ThreeDViewer } from './ThreeDViewer';

interface MedicalViewerProps {
  scan: MedicalScanSeries;
  cursor: VirtualCursorState;
  landmarks?: Point3D[] | null;
  voiceCommand?: VoiceCommandResult | null;
  onSliceChange?: (slice: number) => void;
  onOpenUploadModal?: () => void;
  onToggleMetadataDrawer?: () => void;
  isMetadataDrawerOpen?: boolean;
}

const WINDOW_PRESETS: WindowPreset[] = [
  { id: 'DEFAULT', label: 'Default', windowWidth: 400, windowLevel: 40 },
  { id: 'BONE', label: 'Bone', windowWidth: 1500, windowLevel: 300 },
  { id: 'SOFT_TISSUE', label: 'Soft Tissue', windowWidth: 160, windowLevel: 35 },
  { id: 'LUNG', label: 'Lung', windowWidth: 1500, windowLevel: -600 },
  { id: 'INVERT', label: 'Invert', windowWidth: 400, windowLevel: 40, invert: true },
];

export const MedicalViewer: React.FC<MedicalViewerProps> = ({
  scan,
  cursor,
  landmarks = null,
  voiceCommand,
  onSliceChange,
  onOpenUploadModal,
  onToggleMetadataDrawer,
  isMetadataDrawerOpen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layout View Mode State
  const [viewMode, setViewMode] = useState<'2D_ONLY' | 'SPLIT_SCREEN' | '3D_ONLY'>('2D_ONLY');

  // Viewer state
  const [sliceIndex, setSliceIndex] = useState<number>(scan.currentSlice || 1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<Point2D>({ x: 0, y: 0 });
  const [activePreset, setActivePreset] = useState<WindowPreset['id']>('DEFAULT');
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);
  const [isCaliperActive, setIsCaliperActive] = useState<boolean>(false);
  const [caliperPendingPoint, setCaliperPendingPoint] = useState<Point2D | null>(null);
  const [measurements, setMeasurements] = useState<CaliperMeasurement[]>([]);
  const [isViewportDragOver, setIsViewportDragOver] = useState<boolean>(false);

  // Pinch 3D Spatial Pan & Zoom Tracking
  const lastCursorPos = useRef<Point2D | null>(null);
  const initialPinchDepth = useRef<number | null>(null);
  const initialPinchZoom = useRef<number>(1.0);
  const lastTickZoom = useRef<number>(1.0);

  // Sync slice when scan changes
  useEffect(() => {
    setSliceIndex(scan.currentSlice || 1);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setCaliperPendingPoint(null);
    initialPinchDepth.current = null;
  }, [scan.id]);

  // Touchless continuous 3D spatial pinch drag (pan) and depth (zoom) handling
  useEffect(() => {
    if (cursor.isPinching && !cursor.isFrozen) {
      // 1. Initial pinch capture
      if (initialPinchDepth.current === null) {
        initialPinchDepth.current = cursor.depth || 1.0;
        initialPinchZoom.current = zoom;
        lastTickZoom.current = zoom;
      }

      // 2. Continuous 2D Pan (X / Y)
      if (lastCursorPos.current) {
        const dx = cursor.x - lastCursorPos.current.x;
        const dy = cursor.y - lastCursorPos.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      }
      lastCursorPos.current = { x: cursor.x, y: cursor.y };

      // 3. Continuous 3D Spatial Depth Zoom (Z forward/back)
      if (initialPinchDepth.current !== null && cursor.depth !== undefined) {
        // depthEstimate = 0.28 / palmScale
        // Moving closer to screen -> depth decreases -> depthDelta > 0 (Zoom In)
        // Moving away from screen -> depth increases -> depthDelta < 0 (Zoom Out)
        const depthDelta = initialPinchDepth.current - cursor.depth;
        const DEAD_BAND = 0.03; // Deadband to prevent jitter during pure pan

        if (Math.abs(depthDelta) > DEAD_BAND) {
          const effectiveDelta = depthDelta > 0 ? depthDelta - DEAD_BAND : depthDelta + DEAD_BAND;
          const zoomMultiplier = 1 + effectiveDelta * 2.2;
          const nextZoom = Math.min(
            4.5,
            Math.max(0.6, Number((initialPinchZoom.current * zoomMultiplier).toFixed(2)))
          );
          setZoom(nextZoom);

          // Subtle audio tactile tick on every 0.25x zoom milestone
          if (Math.abs(nextZoom - lastTickZoom.current) >= 0.25) {
            audioService.playTick(nextZoom > lastTickZoom.current ? 920 : 760);
            lastTickZoom.current = nextZoom;
          }
        }
      }
    } else {
      lastCursorPos.current = null;
      initialPinchDepth.current = null;
    }
  }, [cursor.isPinching, cursor.x, cursor.y, cursor.depth, cursor.isFrozen]);

  const handleNextSlice = () => {
    if (sliceIndex < scan.totalSlices) {
      const next = sliceIndex + 1;
      setSliceIndex(next);
      audioService.playTick(950);
      onSliceChange?.(next);
    }
  };

  const handlePrevSlice = () => {
    if (sliceIndex > 1) {
      const prev = sliceIndex - 1;
      setSliceIndex(prev);
      audioService.playTick(850);
      onSliceChange?.(prev);
    }
  };

  const handleZoomIn = () => {
    setZoom((z) => Math.min(4.0, Number((z + 0.25).toFixed(2))));
    audioService.playClick();
  };

  const handleZoomOut = () => {
    setZoom((z) => Math.max(0.6, Number((z - 0.25).toFixed(2))));
    audioService.playClick();
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    audioService.playClick();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => {
      const next = Math.min(4.5, Math.max(0.6, Number((prev + delta).toFixed(2))));
      if (next !== prev) {
        audioService.playTick(delta > 0 ? 920 : 760);
      }
      return next;
    });
  };

  // Multimodal Voice Commands Handler
  useEffect(() => {
    if (!voiceCommand) return;
    switch (voiceCommand.intent) {
      case 'NEXT_SLICE':
        handleNextSlice();
        break;
      case 'PREV_SLICE':
        handlePrevSlice();
        break;
      case 'GO_TO_SLICE': {
        const num = Number(voiceCommand.params?.sliceNumber);
        if (!isNaN(num) && num >= 1 && num <= scan.totalSlices) {
          setSliceIndex(num);
          audioService.playTick(900);
          onSliceChange?.(num);
        }
        break;
      }
      case 'ZOOM_IN':
        handleZoomIn();
        break;
      case 'ZOOM_OUT':
        handleZoomOut();
        break;
      case 'RESET_VIEW':
        handleResetView();
        break;
      case 'SET_WINDOW_PRESET': {
        const preset = voiceCommand.params?.preset as WindowPreset['id'];
        if (preset) {
          setActivePreset(preset);
          audioService.playClick();
        }
        break;
      }
      case 'TOGGLE_CALIPER':
        setIsCaliperActive((prev) => !prev);
        setCaliperPendingPoint(null);
        audioService.playClick();
        break;
      case 'CLEAR_CALIPER':
        setMeasurements([]);
        setCaliperPendingPoint(null);
        audioService.playClick();
        break;
      case 'TOGGLE_AI_FINDINGS':
        setShowAiOverlay((prev) => !prev);
        audioService.playClick();
        break;
      case 'OPEN_UPLOAD_MODAL':
        onOpenUploadModal?.();
        break;
      case 'TOGGLE_METADATA_DRAWER':
        onToggleMetadataDrawer?.();
        break;
      case 'VIEW_MODE_2D':
        setViewMode('2D_ONLY');
        audioService.playClick();
        break;
      case 'VIEW_MODE_3D':
        setViewMode('3D_ONLY');
        audioService.playClick();
        break;
      case 'VIEW_MODE_SPLIT':
        setViewMode('SPLIT_SCREEN');
        audioService.playClick();
        break;
    }
  }, [voiceCommand]);

  // Canvas click handler for Caliper measurement placement
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCaliperActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Transform screen click back into normalized image coordinate space
    const centerX = canvas.width / 2 + pan.x;
    const centerY = canvas.height / 2 + pan.y;
    const imgX = (clickX - centerX) / zoom + canvas.width / 2;
    const imgY = (clickY - centerY) / zoom + canvas.height / 2;

    const normPoint: Point2D = {
      x: imgX / canvas.width,
      y: imgY / canvas.height,
    };

    if (!caliperPendingPoint) {
      setCaliperPendingPoint(normPoint);
      audioService.playClick();
    } else {
      // Complete caliper line
      const dxPx = (normPoint.x - caliperPendingPoint.x) * canvas.width;
      const dyPx = (normPoint.y - caliperPendingPoint.y) * canvas.height;
      const distancePx = Math.hypot(dxPx, dyPx);
      const distanceMm = Math.round(distancePx * scan.pixelSpacingMm * 10) / 10;

      const newMeasurement: CaliperMeasurement = {
        id: `cal-${Date.now()}`,
        pointA: caliperPendingPoint,
        pointB: normPoint,
        distanceMm,
        label: `${distanceMm} mm`,
      };

      setMeasurements((prev) => [...prev, newMeasurement]);
      setCaliperPendingPoint(null);
      audioService.playChime();
    }
  };

  // Main Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);

    // Render medical grid lines
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Save context for Pan & Zoom transforms
    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    // Apply Window Level / Invert presets
    const isInvert = activePreset === 'INVERT';
    const isBone = activePreset === 'BONE';
    const isSoftTissue = activePreset === 'SOFT_TISSUE';
    const isLung = activePreset === 'LUNG';

    // RENDER ANATOMY ACCORDING TO CLINICAL CASE
    if (scan.customSlices && scan.customSlices.length > 0) {
      // REAL UPLOADED DICOM OR MEDICAL IMAGE
      const customSlice = scan.customSlices[sliceIndex - 1] || scan.customSlices[0];

      let ww = customSlice.windowWidth || 400;
      let wc = customSlice.windowCenter || 40;
      if (activePreset === 'BONE') {
        ww = 1500;
        wc = 300;
      } else if (activePreset === 'SOFT_TISSUE') {
        ww = 160;
        wc = 35;
      } else if (activePreset === 'LUNG') {
        ww = 1500;
        wc = -600;
      }

      renderDecodedDicomSlice(ctx, w, h, customSlice, ww, wc, isInvert);
    } else if (scan.id === 'scan-001') {
      // BRAIN CT SLICE
      renderBrainCtSlice(ctx, w, h, sliceIndex, scan.totalSlices, {
        isInvert,
        isBone,
        isSoftTissue,
      });
    } else if (scan.id === 'scan-002') {
      // CHEST X-RAY
      renderChestXray(ctx, w, h, { isInvert, isBone, isLung });
    } else {
      // FEMUR FRACTURE CT / X-RAY
      renderFemurFracture(ctx, w, h, sliceIndex, { isInvert, isBone });
    }

    // DRAW AI FINDINGS & REGIONS OF INTEREST
    if (showAiOverlay && scan.findings) {
      scan.findings.forEach((finding) => {
        const fx = finding.normalizedCoords.x * w;
        const fy = finding.normalizedCoords.y * h;
        const fr = finding.radius * Math.min(w, h);

        ctx.save();
        ctx.strokeStyle =
          finding.severity === 'CRITICAL'
            ? 'rgba(244, 63, 94, 0.85)'
            : 'rgba(245, 158, 11, 0.85)';
        ctx.fillStyle =
          finding.severity === 'CRITICAL'
            ? 'rgba(244, 63, 94, 0.12)'
            : 'rgba(245, 158, 11, 0.12)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 3 / zoom]);

        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Finding Label
        ctx.fillStyle =
          finding.severity === 'CRITICAL' ? '#f43f5e' : '#f59e0b';
        ctx.font = `bold ${Math.max(10, 12 / zoom)}px monospace`;
        ctx.fillText(
          `${finding.label} (${Math.round(finding.confidence * 100)}%)`,
          fx + fr + 8,
          fy
        );

        ctx.restore();
      });
    }

    // DRAW CALIPER MEASUREMENTS
    measurements.forEach((m) => {
      const ax = m.pointA.x * w;
      const ay = m.pointA.y * h;
      const bx = m.pointB.x * w;
      const by = m.pointB.y * h;

      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 / zoom;
      ctx.fillStyle = '#38bdf8';

      // Line
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // End tick marks
      ctx.beginPath();
      ctx.arc(ax, ay, 4 / zoom, 0, Math.PI * 2);
      ctx.arc(bx, by, 4 / zoom, 0, Math.PI * 2);
      ctx.fill();

      // Measurement tag
      const midX = (ax + bx) / 2;
      const midY = (ay + by) / 2;
      ctx.font = `bold ${Math.max(11, 13 / zoom)}px monospace`;
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(midX - 25 / zoom, midY - 18 / zoom, 50 / zoom, 16 / zoom);
      ctx.fillStyle = '#bae6fd';
      ctx.textAlign = 'center';
      ctx.fillText(m.label, midX, midY - 6 / zoom);
      ctx.restore();
    });

    // PENDING CALIPER POINT
    if (caliperPendingPoint) {
      const px = caliperPendingPoint.x * w;
      const py = caliperPendingPoint.y * h;
      ctx.save();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 5 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // RENDER ON-SCREEN HUD OVERLAYS (Scale bar, metadata, slice tag)
    renderMetadataHUD(ctx, w, h, scan, sliceIndex, zoom, activePreset);
  }, [
    scan,
    sliceIndex,
    zoom,
    pan,
    activePreset,
    showAiOverlay,
    measurements,
    caliperPendingPoint,
  ]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden select-none">
      {/* Top Clinical Toolbar */}
      <div className="h-11 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between gap-2 text-xs">
        {/* Modality & Scan Title */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/80 px-2 py-0.5 rounded text-[11px]">
            {scan.modality}
          </span>
          <span className="font-semibold text-slate-200 hidden sm:inline">
            {scan.title}
          </span>
        </div>

        {/* View Mode Switcher: 2D Slices | Split 2D+3D | 3D Volumetric */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <button
            onClick={() => {
              setViewMode('2D_ONLY');
              audioService.playClick();
            }}
            data-touchless-clickable="true"
            title="2D Cross-Sectional Slice Workstation"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              viewMode === '2D_ONLY'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Square className="w-3 h-3" />
            <span className="hidden lg:inline">2D Slice</span>
          </button>

          <button
            onClick={() => {
              setViewMode('SPLIT_SCREEN');
              audioService.playClick();
            }}
            data-touchless-clickable="true"
            title="Dual Split View (2D Slices + 3D Model)"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              viewMode === 'SPLIT_SCREEN'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3 h-3 text-cyan-400" />
            <span className="hidden lg:inline">Split 2D/3D</span>
          </button>

          <button
            onClick={() => {
              setViewMode('3D_ONLY');
              audioService.playClick();
            }}
            data-touchless-clickable="true"
            title="Full 3D Volumetric Mesh View"
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition ${
              viewMode === '3D_ONLY'
                ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3 h-3 text-indigo-400" />
            <span className="hidden lg:inline">3D Mesh</span>
          </button>
        </div>

        {/* Window Presets Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
          <div className="flex items-center gap-1 px-1.5 text-slate-400 text-[10px] font-mono">
            <Sliders className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">W/L:</span>
          </div>
          {WINDOW_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setActivePreset(preset.id);
                audioService.playClick();
              }}
              data-touchless-clickable="true"
              className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                activePreset === preset.id
                  ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Tools: Caliper, AI Overlays, Zoom Controls */}
        <div className="flex items-center gap-1.5">
          {/* Upload DICOM & Metadata Inspector Buttons */}
          <button
            onClick={() => {
              audioService.playClick();
              onOpenUploadModal?.();
            }}
            data-touchless-clickable="true"
            title="Upload DICOM (.dcm) or Medical Image"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-500/50 bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 text-[11px] font-semibold transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Upload Scan</span>
          </button>

          <button
            onClick={() => {
              audioService.playClick();
              onToggleMetadataDrawer?.();
            }}
            data-touchless-clickable="true"
            title="PACS DICOM Header Inspector"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition ${
              isMetadataDrawerOpen
                ? 'border-indigo-400 bg-indigo-950 text-indigo-200 shadow-sm'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">DICOM Tags</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          <button
            onClick={() => {
              setIsCaliperActive(!isCaliperActive);
              setCaliperPendingPoint(null);
              audioService.playClick();
            }}
            data-touchless-clickable="true"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
              isCaliperActive
                ? 'bg-indigo-950 text-indigo-300 border-indigo-500/60 shadow-md shadow-indigo-950'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Caliper</span>
            {measurements.length > 0 && (
              <span className="ml-1 bg-indigo-900/80 text-indigo-200 px-1 rounded-full text-[10px]">
                {measurements.length}
              </span>
            )}
          </button>

          {measurements.length > 0 && (
            <button
              onClick={() => {
                setMeasurements([]);
                setCaliperPendingPoint(null);
                audioService.playClick();
              }}
              data-touchless-clickable="true"
              title="Clear Caliper Measurements"
              className="p-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-rose-400 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              setShowAiOverlay(!showAiOverlay);
              audioService.playClick();
            }}
            data-touchless-clickable="true"
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition ${
              showAiOverlay
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">AI Findings</span>
          </button>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Zoom In/Out & Reset */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={handleZoomOut}
              data-touchless-clickable="true"
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-cyan-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              data-touchless-clickable="true"
              className="p-1 rounded hover:bg-slate-800 text-slate-300 transition"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              data-touchless-clickable="true"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition ml-0.5"
              title="Reset Pan & Zoom"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Radiology Viewport (2D Slices | Split 2D+3D | 3D Volumetric) */}
      <div className="flex-1 relative flex flex-col md:flex-row overflow-hidden bg-black">
        {/* Left / 2D Canvas Panel (Active in 2D_ONLY and SPLIT_SCREEN) */}
        {viewMode !== '3D_ONLY' && (
          <div
            ref={containerRef}
            onWheel={handleWheel}
            onDragOver={(e) => {
              e.preventDefault();
              setIsViewportDragOver(true);
            }}
            onDragLeave={() => setIsViewportDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsViewportDragOver(false);
              onOpenUploadModal?.();
            }}
            className={`flex-1 relative flex items-center justify-center overflow-hidden bg-black cursor-crosshair transition-all ${
              viewMode === 'SPLIT_SCREEN' ? 'border-r border-slate-800' : ''
            } ${isViewportDragOver ? 'ring-4 ring-cyan-400 ring-inset bg-cyan-950/20' : ''}`}
          >
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              onClick={handleCanvasClick}
              className="max-w-full max-h-full aspect-4/3 block shadow-2xl"
            />

            {/* Viewport Drag-and-Drop Active Overlay */}
            {isViewportDragOver && (
              <div className="absolute inset-0 bg-cyan-950/80 border-4 border-dashed border-cyan-400 flex flex-col items-center justify-center z-40 backdrop-blur-sm pointer-events-none animate-in fade-in duration-100">
                <Upload className="w-16 h-16 text-cyan-300 animate-bounce mb-3" />
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Drop DICOM Files or Scans Here
                </h2>
                <p className="text-xs text-cyan-200 font-mono mt-1">
                  Release to parse and import directly into touchless viewer
                </p>
              </div>
            )}

            {/* 3D Spatial Depth Pinch-to-Zoom & Pan Active Floating HUD Indicator */}
            {cursor.isPinching && !cursor.isFrozen && (
              <div className="absolute top-5 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-cyan-500/80 px-4 py-2.5 rounded-2xl flex items-center gap-3.5 backdrop-blur-md shadow-[0_0_25px_rgba(6,182,212,0.35)] z-30 transition-all pointer-events-none">
                <div className="relative flex items-center justify-center">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping absolute" />
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 relative" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
                    <span>3D SPATIAL PINCH</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-white">ZOOM: {Math.round(zoom * 100)}%</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-cyan-400 text-[10px]">DEPTH: {(cursor.depth || 1.0).toFixed(2)}x</span>
                  </div>
                  <span className="text-[10px] text-slate-300/80 font-mono tracking-tight">
                    Push hand closer to Zoom In • Pull back to Zoom Out • Shift to Pan
                  </span>
                </div>
                {/* Interactive Proximity Depth Gauge */}
                <div className="flex flex-col items-center gap-0.5 pl-2 border-l border-slate-700/80">
                  <span className="text-[9px] font-mono text-cyan-400/90">PROXIMITY</span>
                  <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-cyan-500/40 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-75"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(10, ((2.5 - (cursor.depth || 1.0)) / 2.1) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Floating Slice Scrub Bar (For multi-slice CT/MRI) */}
            {scan.totalSlices > 1 && (
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700/80 px-4 py-2 rounded-2xl flex items-center gap-3 backdrop-blur-md shadow-2xl z-20">
                <button
                  onClick={handlePrevSlice}
                  disabled={sliceIndex <= 1}
                  data-touchless-clickable="true"
                  className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center min-w-[140px]">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400">
                    <Layers className="w-3.5 h-3.5" />
                    <span>
                      SLICE {sliceIndex} / {scan.totalSlices}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={scan.totalSlices}
                    value={sliceIndex}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSliceIndex(val);
                      audioService.playTick(900);
                      onSliceChange?.(val);
                    }}
                    className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
                  />
                </div>

                <button
                  onClick={handleNextSlice}
                  disabled={sliceIndex >= scan.totalSlices}
                  data-touchless-clickable="true"
                  className="p-2 rounded-xl bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Caliper Instruction Banner */}
            {isCaliperActive && (
              <div className="absolute top-4 left-4 bg-indigo-950/90 border border-indigo-500/60 px-3 py-1.5 rounded-lg text-xs text-indigo-200 backdrop-blur-md shadow-lg pointer-events-none z-20">
                <span className="font-semibold text-white">Digital Caliper Mode:</span>{' '}
                {caliperPendingPoint
                  ? 'Click second target to measure distance in mm.'
                  : 'Click first anatomical point to start measurement.'}
              </div>
            )}
          </div>
        )}

        {/* Right / 3D Volumetric Mesh Panel (Active in 3D_ONLY and SPLIT_SCREEN) */}
        {viewMode !== '2D_ONLY' && (
          <div className="flex-1 relative h-full overflow-hidden min-h-[300px]">
            <ThreeDViewer
              scan={scan}
              cursor={cursor}
              landmarks={landmarks}
              currentSlice={sliceIndex}
              totalSlices={scan.totalSlices}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ANATOMICAL RENDERING FUNCTIONS

function renderBrainCtSlice(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  slice: number,
  totalSlices: number,
  filters: { isInvert: boolean; isBone: boolean; isSoftTissue: boolean }
) {
  const cx = w / 2;
  const cy = h / 2;
  const rx = 190;
  const ry = 220;

  // Background base
  const boneColor = filters.isInvert
    ? '#111827'
    : filters.isBone
    ? '#ffffff'
    : '#e2e8f0';
  const brainColor = filters.isInvert
    ? '#d1d5db'
    : filters.isSoftTissue
    ? '#475569'
    : '#334155';
  const ventricleColor = filters.isInvert
    ? '#ffffff'
    : filters.isSoftTissue
    ? '#090d16'
    : '#0f172a';

  // 1. Skull Vault (High density cortical bone)
  ctx.fillStyle = boneColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Diploe & Brain cavity inner contour
  ctx.fillStyle = brainColor;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - 14, ry - 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Cerebral hemispheres (interhemispheric fissure & falx)
  ctx.strokeStyle = filters.isInvert ? '#9ca3af' : '#1e293b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry + 20);
  ctx.lineTo(cx, cy + ry - 20);
  ctx.stroke();

  // 4. Lateral Ventricles (Compression / Midline Shift Effect)
  ctx.fillStyle = ventricleColor;
  // Left ventricle (dilated due to outflow obstruction)
  ctx.beginPath();
  ctx.ellipse(cx - 32, cy - 10, 16, 36, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Right ventricle (compressed by hematoma mass effect)
  ctx.beginPath();
  ctx.ellipse(cx + 20, cy - 6, 6, 26, 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 5. ACUTE SUBDURAL HEMATOMA (Crescentic hyperdense extra-axial lesion)
  // Intensity varies dynamically with CT slice level
  const sliceFactor = 1 - Math.abs(slice - 12) / 12;
  if (sliceFactor > 0.1) {
    ctx.save();
    ctx.fillStyle = filters.isInvert ? '#1e293b' : '#f8fafc';
    ctx.shadowColor = filters.isInvert ? '#000000' : '#ffffff';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    // Outer crescent along right skull bone
    ctx.arc(cx, cy, rx - 14, -Math.PI * 0.42, Math.PI * 0.35);
    // Inner crescent pushing into brain parenchyma
    ctx.quadraticCurveTo(
      cx + (rx - 55 * sliceFactor),
      cy,
      cx + (rx - 14) * Math.cos(-Math.PI * 0.42),
      cy + (rx - 14) * Math.sin(-Math.PI * 0.42)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 6. Sulcal gyral folds (Procedural noise)
  ctx.strokeStyle = filters.isInvert ? '#cbd5e1' : '#1e293b';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const rad = rx - 35;
    ctx.beginPath();
    ctx.arc(
      cx + Math.cos(angle) * rad,
      cy + Math.sin(angle) * rad,
      14,
      angle - 0.5,
      angle + 0.5
    );
    ctx.stroke();
  }
}

function renderChestXray(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  filters: { isInvert: boolean; isBone: boolean; isLung: boolean }
) {
  const cx = w / 2;
  const cy = h / 2;

  const boneColor = filters.isInvert ? '#0f172a' : '#f1f5f9';
  const lungColor = filters.isInvert
    ? '#f8fafc'
    : filters.isLung
    ? '#020408'
    : '#090d16';

  // 1. Thoracic Cage & Mediastinum
  ctx.fillStyle = lungColor;
  // Left hemithorax
  ctx.beginPath();
  ctx.ellipse(cx - 110, cy - 20, 95, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Right hemithorax (Pneumothorax area - darker air density)
  ctx.fillStyle = filters.isInvert ? '#ffffff' : '#000000';
  ctx.beginPath();
  ctx.ellipse(cx + 110, cy - 20, 95, 180, 0, 0, Math.PI * 2);
  ctx.fill();

  // Visceral pleural collapse line (Pneumothorax edge)
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(cx + 80, cy - 20, 55, 130, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Cardiac Silhouette
  ctx.fillStyle = filters.isInvert ? '#334155' : '#cbd5e1';
  ctx.beginPath();
  ctx.ellipse(cx - 35, cy + 50, 75, 55, 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 3. Ribs & Clavicles
  ctx.strokeStyle = boneColor;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';

  // Clavicles
  ctx.beginPath();
  ctx.moveTo(cx - 140, cy - 170);
  ctx.quadraticCurveTo(cx - 70, cy - 150, cx - 15, cy - 140);
  ctx.moveTo(cx + 140, cy - 170);
  ctx.quadraticCurveTo(cx + 70, cy - 150, cx + 15, cy - 140);
  ctx.stroke();

  // Ribs (Left & Right pairs)
  for (let i = 0; i < 7; i++) {
    const yOffset = cy - 110 + i * 36;
    ctx.lineWidth = 6;

    // Left rib
    ctx.beginPath();
    ctx.moveTo(cx - 15, yOffset - 15);
    ctx.quadraticCurveTo(cx - 180, yOffset, cx - 120, yOffset + 30);
    ctx.stroke();

    // Right rib (6th & 7th ribs fractured with sharp step-off)
    ctx.beginPath();
    if (i === 4 || i === 5) {
      // Displaced fracture line
      ctx.moveTo(cx + 15, yOffset - 15);
      ctx.quadraticCurveTo(cx + 130, yOffset - 5, cx + 145, yOffset + 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx + 152, yOffset + 14); // Cortical step-off gap
      ctx.quadraticCurveTo(cx + 175, yOffset + 20, cx + 120, yOffset + 35);
      ctx.stroke();
    } else {
      ctx.moveTo(cx + 15, yOffset - 15);
      ctx.quadraticCurveTo(cx + 180, yOffset, cx + 120, yOffset + 30);
      ctx.stroke();
    }
  }

  // 4. Thoracic Spine Column
  ctx.fillStyle = boneColor;
  for (let s = 0; s < 12; s++) {
    ctx.fillRect(cx - 14, cy - 170 + s * 24, 28, 16);
  }
}

function renderFemurFracture(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  slice: number,
  filters: { isInvert: boolean; isBone: boolean }
) {
  const cx = w / 2;
  const cy = h / 2;

  const boneColor = filters.isInvert ? '#0f172a' : '#f8fafc';
  const marrowColor = filters.isInvert ? '#64748b' : '#334155';

  // Proximal Femoral Shaft
  ctx.fillStyle = boneColor;
  ctx.beginPath();
  ctx.rect(cx - 32, cy - 220, 64, 180);
  ctx.fill();

  // Medullary canal proximal
  ctx.fillStyle = marrowColor;
  ctx.beginPath();
  ctx.rect(cx - 16, cy - 220, 32, 170);
  ctx.fill();

  // Distal Femoral Shaft (Displaced by 16mm rightward and angulated)
  ctx.fillStyle = boneColor;
  ctx.save();
  ctx.translate(cx + 24, cy + 40);
  ctx.rotate(0.08);
  ctx.beginPath();
  ctx.rect(-32, 0, 64, 180);
  ctx.fill();

  // Distal canal
  ctx.fillStyle = marrowColor;
  ctx.beginPath();
  ctx.rect(-16, 0, 32, 180);
  ctx.fill();
  ctx.restore();

  // Comminuted Butterfly Bone Fragments in fracture gap
  ctx.fillStyle = boneColor;
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy - 30);
  ctx.lineTo(cx + 10, cy - 10);
  ctx.lineTo(cx - 25, cy + 20);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + 25, cy - 25);
  ctx.lineTo(cx + 45, cy);
  ctx.lineTo(cx + 15, cy + 15);
  ctx.closePath();
  ctx.fill();
}

function renderDecodedDicomSlice(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  slice: DecodedMedicalSlice,
  windowWidth: number,
  windowCenter: number,
  invert: boolean
) {
  const imgData = DicomParser.renderSliceToImageData(
    slice,
    windowWidth,
    windowCenter,
    invert
  );

  const offCanvas = document.createElement('canvas');
  offCanvas.width = slice.width;
  offCanvas.height = slice.height;
  const offCtx = offCanvas.getContext('2d');
  if (offCtx) {
    offCtx.putImageData(imgData, 0, 0);

    const maxW = w * 0.88;
    const maxH = h * 0.88;
    const scale = Math.min(maxW / slice.width, maxH / slice.height);
    const drawW = slice.width * scale;
    const drawH = slice.height * scale;
    const drawX = (w - drawW) / 2;
    const drawY = (h - drawH) / 2;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, drawX, drawY, drawW, drawH);
  }
}

function renderMetadataHUD(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  scan: MedicalScanSeries,
  slice: number,
  zoom: number,
  preset: string
) {
  ctx.fillStyle = '#06b6d4';
  ctx.font = '11px monospace';

  // Top Left Metadata
  const anatTitle = scan.dicomMetadata?.seriesDescription || scan.anatomicalRegion;
  const dateStr = scan.dicomMetadata?.studyDate || scan.acquisitionDate;
  const matrixStr = scan.dicomMetadata
    ? `${scan.dicomMetadata.columns}x${scan.dicomMetadata.rows}`
    : '512x512';
  const patientTag = scan.dicomMetadata
    ? `PT: ${scan.dicomMetadata.patientName.slice(0, 18)}`
    : `PT: ${scan.patientId}`;

  ctx.fillText(`ANAT: ${anatTitle}`, 16, 24);
  ctx.fillText(`DATE: ${dateStr} | ${patientTag}`, 16, 40);
  ctx.fillText(`MATRIX: ${matrixStr} | SPACING: ${scan.pixelSpacingMm.toFixed(2)}mm`, 16, 56);

  // Top Right Metadata
  ctx.textAlign = 'right';
  ctx.fillText(`MOD: ${scan.modality}`, w - 16, 24);
  ctx.fillText(`PRESET: ${preset}`, w - 16, 40);
  ctx.fillText(`ZOOM: ${Math.round(zoom * 100)}%`, w - 16, 56);

  // Bottom Left Scale Bar
  ctx.textAlign = 'left';
  const scaleBarMm = 50; // 50mm
  const scaleBarPx = (scaleBarMm / scan.pixelSpacingMm) * zoom;
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(16, h - 25);
  ctx.lineTo(16 + scaleBarPx, h - 25);
  ctx.stroke();

  // Tick marks
  ctx.beginPath();
  ctx.moveTo(16, h - 30);
  ctx.lineTo(16, h - 20);
  ctx.moveTo(16 + scaleBarPx, h - 30);
  ctx.lineTo(16 + scaleBarPx, h - 20);
  ctx.stroke();

  ctx.fillText(`50 mm`, 16 + scaleBarPx / 2 - 15, h - 10);
}
