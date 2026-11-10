import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Box,
  Compass,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  Orbit,
  RefreshCw,
  RotateCw,
  Scissors,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { MedicalScanSeries } from '../../types/medical';
import { Point3D, VirtualCursorState } from '../../types/gestures';
import { AnatomicalMeshBuilder, ShadingMode } from '../../services/anatomicalMeshBuilder';
import { handOrientationService } from '../../services/handOrientation';
import { audioService } from '../../services/audioFeedback';

interface ThreeDViewerProps {
  scan: MedicalScanSeries;
  cursor: VirtualCursorState;
  landmarks: Point3D[] | null;
  currentSlice?: number;
  totalSlices?: number;
}

export const ThreeDViewer: React.FC<ThreeDViewerProps> = ({
  scan,
  cursor,
  landmarks,
  currentSlice = 1,
  totalSlices = 24,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Three.js Core Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);

  // Interaction State
  const [shadingMode, setShadingMode] = useState<ShadingMode>('CLINICAL');
  const [isHoloTiltEnabled, setIsHoloTiltEnabled] = useState<boolean>(false);
  const [isClippingActive, setIsClippingActive] = useState<boolean>(false);
  const [clipOffset, setClipOffset] = useState<number>(2.5); // Top to bottom

  // Smooth rotation & zoom targets
  const rotTarget = useRef<{ x: number; y: number }>({ x: 0.2, y: -0.35 });
  const lastPinchPos = useRef<{ x: number; y: number } | null>(null);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070a);
    sceneRef.current = scene;

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 6.5);
    cameraRef.current = camera;

    // 3. WebGL Renderer with local clipping enabled
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.localClippingEnabled = true;
    rendererRef.current = renderer;

    // 4. Surgical Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6); // Medical cyan fill
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(0, -5, -4);
    scene.add(rimLight);

    // 5. Axial Clipping Plane setup
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), clipOffset);
    clipPlaneRef.current = clippingPlane;

    // 6. Build Initial Anatomical Model
    const model = AnatomicalMeshBuilder.buildAnatomicalScene(scan, shadingMode, isClippingActive ? clippingPlane : undefined);
    model.rotation.set(rotTarget.current.x, rotTarget.current.y, 0);
    scene.add(model);
    modelGroupRef.current = model;

    // 7. Animation Render Loop
    let animId: number;
    const render = () => {
      animId = requestAnimationFrame(render);

      if (modelGroupRef.current) {
        // Smoothly interpolate rotation to target
        modelGroupRef.current.rotation.x += (rotTarget.current.x - modelGroupRef.current.rotation.x) * 0.12;
        modelGroupRef.current.rotation.y += (rotTarget.current.y - modelGroupRef.current.rotation.y) * 0.12;
      }

      renderer.render(scene, camera);
    };
    render();

    // 8. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Rebuild 3D Model when Scan or Shading Mode Changes
  useEffect(() => {
    if (!sceneRef.current) return;

    if (modelGroupRef.current) {
      sceneRef.current.remove(modelGroupRef.current);
    }

    const newModel = AnatomicalMeshBuilder.buildAnatomicalScene(
      scan,
      shadingMode,
      isClippingActive && clipPlaneRef.current ? clipPlaneRef.current : undefined
    );
    newModel.rotation.set(rotTarget.current.x, rotTarget.current.y, 0);
    sceneRef.current.add(newModel);
    modelGroupRef.current = newModel;
  }, [scan.id, shadingMode, isClippingActive]);

  // Update Clipping Plane Constant
  useEffect(() => {
    if (clipPlaneRef.current) {
      clipPlaneRef.current.constant = clipOffset;
    }
  }, [clipOffset]);

  // Sync Clipping Plane with Slice Index if active
  useEffect(() => {
    if (isClippingActive && totalSlices > 1) {
      // Map slice 1..total to +2.0..-2.0
      const norm = (currentSlice - 1) / (totalSlices - 1);
      const newOffset = 2.0 - norm * 4.0;
      setClipOffset(newOffset);
    }
  }, [currentSlice, totalSlices, isClippingActive]);

  // Touchless Gesture Controller (Pinch-to-Orbit & Holographic Hand Tilt)
  useEffect(() => {
    // 1. Holographic Hand-Tilt Mode (Direct 3D orientation tracking from landmarks)
    if (isHoloTiltEnabled && landmarks && landmarks.length >= 21) {
      const orientation = handOrientationService.computeOrientation(landmarks);
      // Map palm pitch & yaw to model rotation
      rotTarget.current.x = orientation.smoothedPitch * 1.5;
      rotTarget.current.y = orientation.smoothedYaw * 1.8;
      return;
    }

    // 2. Pinch-to-Orbit Trackball Mode
    if (cursor.isPinching && !cursor.isFrozen) {
      if (lastPinchPos.current) {
        const dx = cursor.x - lastPinchPos.current.x;
        const dy = cursor.y - lastPinchPos.current.y;
        rotTarget.current.y += dx * 0.008;
        rotTarget.current.x += dy * 0.008;

        // Clamp pitch to avoid full inversion
        rotTarget.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotTarget.current.x));
      }
      lastPinchPos.current = { x: cursor.x, y: cursor.y };
    } else {
      lastPinchPos.current = null;
    }

    // 3. 3D Spatial Depth Camera Zoom
    if (cameraRef.current && cursor.depth) {
      const targetDist = 6.5 * (cursor.depth || 1.0);
      cameraRef.current.position.z += (targetDist - cameraRef.current.position.z) * 0.15;
    }
  }, [
    cursor.isPinching,
    cursor.x,
    cursor.y,
    cursor.depth,
    cursor.isFrozen,
    landmarks,
    isHoloTiltEnabled,
  ]);

  const handleResetView = () => {
    rotTarget.current = { x: 0.2, y: -0.35 };
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 6.5);
    }
    audioService.playClick();
  };

  const handleRotateQuarter = () => {
    rotTarget.current.y += Math.PI / 2;
    audioService.playTick(900);
  };

  const handleToggleShading = () => {
    setShadingMode((prev) => (prev === 'CLINICAL' ? 'HOLOGRAPHIC' : 'CLINICAL'));
    audioService.playClick();
  };

  const handleToggleHoloTilt = () => {
    const next = !isHoloTiltEnabled;
    setIsHoloTiltEnabled(next);
    audioService.playClick();
  };

  const handleToggleClipping = () => {
    setIsClippingActive((prev) => !prev);
    audioService.playClick();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#05070a] overflow-hidden select-none flex items-center justify-center"
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Floating 3D Surgical HUD Top-Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="font-mono font-bold text-xs bg-slate-900/90 text-cyan-300 border border-slate-700/80 px-2.5 py-1 rounded-xl shadow-lg flex items-center gap-2 backdrop-blur-md">
          <Box className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D RECONSTRUCTION</span>
          <span className="text-slate-600">|</span>
          <span className="text-[10px] text-white">
            {shadingMode === 'CLINICAL' ? 'PBR BONE' : 'HOLO WIREFRAME'}
          </span>
        </span>
      </div>

      {/* Floating 3D Control Toolbar (Top Right) */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1 rounded-2xl shadow-2xl backdrop-blur-md">
        {/* Holographic Hand-Tilt Toggle */}
        <button
          onClick={handleToggleHoloTilt}
          data-touchless-clickable="true"
          title="Toggle Holographic Mid-Air Hand-Tilt Tracking"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
            isHoloTiltEnabled
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/80 shadow-md shadow-cyan-950'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${isHoloTiltEnabled ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Hand Tilt</span>
        </button>

        {/* Shading Mode Toggle (Clinical vs Holo) */}
        <button
          onClick={handleToggleShading}
          data-touchless-clickable="true"
          title="Switch between Bone Shading and Holographic Wireframe"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Dynamic Axial Slicing / Clipping Plane Toggle */}
        <button
          onClick={handleToggleClipping}
          data-touchless-clickable="true"
          title="Toggle 3D Axial Clipping Plane (Slice Volume)"
          className={`p-1.5 rounded-xl transition ${
            isClippingActive
              ? 'bg-rose-500/20 text-rose-300 border border-rose-400/80'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Scissors className="w-3.5 h-3.5" />
        </button>

        {/* 90° Orbit Turn */}
        <button
          onClick={handleRotateQuarter}
          data-touchless-clickable="true"
          title="Rotate 90 Degrees"
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        {/* Reset 3D View */}
        <button
          onClick={handleResetView}
          data-touchless-clickable="true"
          title="Reset 3D Orientation & Camera"
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dynamic Axial Clipping Plane Slider (Bottom Left) */}
      {isClippingActive && (
        <div className="absolute bottom-5 left-5 z-20 bg-slate-900/90 border border-rose-500/60 p-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <Scissors className="w-4 h-4 text-rose-400" />
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-rose-300 font-bold uppercase tracking-wider">
              Axial Cut-Plane Level
            </span>
            <input
              type="range"
              min={-2.2}
              max={2.2}
              step={0.05}
              value={clipOffset}
              onChange={(e) => setClipOffset(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-400 mt-1"
            />
          </div>
          <span className="text-xs font-mono text-white font-bold min-w-[36px] text-right">
            {clipOffset.toFixed(2)}
          </span>
        </div>
      )}

      {/* Holographic Palm Tilt Active Banner */}
      {isHoloTiltEnabled && (
        <div className="absolute bottom-5 right-5 z-20 bg-cyan-950/80 border border-cyan-400/80 px-3 py-1.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2 text-cyan-200 text-xs font-mono animate-in fade-in duration-150">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>HOLOGRAPHIC HAND TILT ACTIVE</span>
        </div>
      )}
    </div>
  );
};
