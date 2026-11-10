import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellOff,
  Heart,
  Thermometer,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { VitalsMetrics } from '../../types/medical';
import { audioService } from '../../services/audioFeedback';

interface VitalsMonitorProps {
  onAcknowledgeAlarm?: () => void;
}

export const VitalsMonitor: React.FC<VitalsMonitorProps> = ({
  onAcknowledgeAlarm,
}) => {
  const ecgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const plethCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Vitals State
  const [vitals, setVitals] = useState<VitalsMetrics>({
    heartRate: 74,
    spo2: 98,
    bpSystolic: 122,
    bpDiastolic: 78,
    meanArterialPressure: 92,
    respiratoryRate: 16,
    coreTempC: 36.8,
    status: 'NORMAL',
    activeAlarm: null,
  });

  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [isSimulatingEmergency, setIsSimulatingEmergency] = useState<boolean>(false);

  // Animation cursor
  const ecgScanX = useRef<number>(0);
  const plethScanX = useRef<number>(0);
  const ecgHistory = useRef<number[]>([]);
  const plethHistory = useRef<number[]>([]);

  // Simulation emergency toggle
  const toggleEmergencySimulation = () => {
    if (!isSimulatingEmergency) {
      setIsSimulatingEmergency(true);
      setVitals((prev) => ({
        ...prev,
        heartRate: 136,
        spo2: 89,
        bpSystolic: 85,
        bpDiastolic: 52,
        meanArterialPressure: 63,
        respiratoryRate: 28,
        status: 'CRITICAL',
        activeAlarm: 'HEMODYNAMIC INSTABILITY: TACHYCARDIA & HYPOTENSION',
      }));
      audioService.playPulseBeep(true);
    } else {
      silenceAlarm();
    }
  };

  const silenceAlarm = () => {
    setIsSimulatingEmergency(false);
    setVitals({
      heartRate: 74,
      spo2: 98,
      bpSystolic: 122,
      bpDiastolic: 78,
      meanArterialPressure: 92,
      respiratoryRate: 16,
      coreTempC: 36.8,
      status: 'NORMAL',
      activeAlarm: null,
    });
    audioService.playClick();
    onAcknowledgeAlarm?.();
  };

  // Real-time Canvas ECG Renderer
  useEffect(() => {
    const canvas = ecgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      // Calculate ECG P-Q-R-S-T curve
      const bpm = vitals.heartRate;
      const cycleLength = (60 / bpm) * 60; // frames per beat (~48 frames at 75bpm)
      const phase = (t % cycleLength) / cycleLength; // 0..1

      let ecgVal = 0;
      if (phase > 0.1 && phase < 0.18) {
        // P wave
        ecgVal = Math.sin(((phase - 0.1) / 0.08) * Math.PI) * 0.15;
      } else if (phase > 0.22 && phase < 0.24) {
        // Q wave
        ecgVal = -0.15;
      } else if (phase >= 0.24 && phase <= 0.3) {
        // R wave peak
        ecgVal = Math.sin(((phase - 0.24) / 0.06) * Math.PI) * 1.0;
        if (phase >= 0.26 && phase <= 0.28 && soundEnabled && Math.floor(t) % Math.floor(cycleLength) === Math.floor(cycleLength * 0.27)) {
          audioService.playPulseBeep(vitals.status === 'CRITICAL');
        }
      } else if (phase > 0.3 && phase < 0.34) {
        // S wave
        ecgVal = -0.3;
      } else if (phase > 0.42 && phase < 0.58) {
        // T wave
        ecgVal = Math.sin(((phase - 0.42) / 0.16) * Math.PI) * 0.25;
      }

      // Add minor physiological baseline drift
      ecgVal += Math.sin(t * 0.02) * 0.04;

      const y = midY - ecgVal * (h * 0.38);

      // Record in circular buffer
      const currentX = ecgScanX.current;
      ecgHistory.current[currentX] = y;

      // Draw sweeping sweep line
      const speed = 2.5;
      ecgScanX.current = (ecgScanX.current + speed) % w;

      // Clear ahead of scan head
      ctx.fillStyle = '#06090e';
      ctx.fillRect(ecgScanX.current, 0, 16, h);

      // Re-draw grid behind
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = Math.floor(ecgScanX.current); gx < ecgScanX.current + 16; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // Draw waveform stroke
      ctx.strokeStyle = vitals.status === 'CRITICAL' ? '#f43f5e' : '#10b981';
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();

      const prevX = (currentX - speed + w) % w;
      const prevY = ecgHistory.current[Math.floor(prevX)] || midY;

      if (currentX >= speed) {
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currentX, y);
        ctx.stroke();
      }

      t++;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [vitals.heartRate, vitals.status, soundEnabled]);

  // Pleth (SpO2) Canvas Renderer
  useEffect(() => {
    const canvas = plethCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      const bpm = vitals.heartRate;
      const cycleLength = (60 / bpm) * 60;
      const phase = (t % cycleLength) / cycleLength;

      // Dicrotic notch photoplethysmogram curve
      let plethVal = 0;
      if (phase < 0.4) {
        plethVal = Math.sin((phase / 0.4) * Math.PI) * 0.8;
      } else if (phase >= 0.4 && phase < 0.6) {
        // Dicrotic wave reflection
        plethVal = Math.sin(((phase - 0.4) / 0.2) * Math.PI) * 0.25;
      }

      const y = midY - plethVal * (h * 0.35);
      const currentX = plethScanX.current;
      plethHistory.current[currentX] = y;

      const speed = 2.5;
      plethScanX.current = (plethScanX.current + speed) % w;

      ctx.fillStyle = '#06090e';
      ctx.fillRect(plethScanX.current, 0, 16, h);

      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const prevX = (currentX - speed + w) % w;
      const prevY = plethHistory.current[Math.floor(prevX)] || midY;

      if (currentX >= speed) {
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(currentX, y);
        ctx.stroke();
      }

      t++;
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [vitals.heartRate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-y-auto select-none">
      {/* Active Alarm Banner */}
      {vitals.activeAlarm && (
        <div className="mb-4 bg-rose-950/90 border border-rose-500 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <div className="text-xs font-mono font-bold tracking-wider text-rose-300">
                CRITICAL PHYSIOLOGICAL ALARM
              </div>
              <div className="text-sm font-bold text-white">
                {vitals.activeAlarm}
              </div>
            </div>
          </div>

          <button
            onClick={silenceAlarm}
            data-touchless-clickable="true"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950 transition active:scale-95"
          >
            <BellOff className="w-4 h-4" />
            <span>Touchless Silence & Reset</span>
          </button>
        </div>
      )}

      {/* Main Cardiac Waveforms & Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {/* ECG Lead II Waveform */}
        <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-mono text-xs font-bold text-slate-200">
                ECG - LEAD II (1.0 mV/cm, 25 mm/s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                data-touchless-clickable="true"
                className={`p-1.5 rounded-lg border text-xs transition ${
                  soundEnabled
                    ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Toggle Cardiac Pulse Tone"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={toggleEmergencySimulation}
                data-touchless-clickable="true"
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition ${
                  isSimulatingEmergency
                    ? 'bg-rose-950 text-rose-300 border-rose-500/60'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                {isSimulatingEmergency ? 'Reset Vitals' : 'Simulate Tachycardia'}
              </button>
            </div>
          </div>

          {/* Canvas Waveforms */}
          <div className="flex-1 min-h-[160px] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden relative">
            <canvas
              ref={ecgCanvasRef}
              width={750}
              height={180}
              className="w-full h-full block"
            />
          </div>

          {/* Plethysmogram (Pulse Oximetry Wave) */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400 mb-1">
              <span>PLETH - PULSE OXIMETRY DUAL BEAM</span>
              <span>INDEX: 98%</span>
            </div>
            <div className="h-20 bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden">
              <canvas
                ref={plethCanvasRef}
                width={750}
                height={80}
                className="w-full h-full block"
              />
            </div>
          </div>
        </div>

        {/* Primary Cardiac Vitals Tile */}
        <div className="flex flex-col gap-3">
          {/* Heart Rate Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              vitals.status === 'CRITICAL'
                ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <Heart
                  className={`w-4 h-4 ${
                    vitals.status === 'CRITICAL'
                      ? 'text-rose-400 animate-ping'
                      : 'text-emerald-400 animate-pulse'
                  }`}
                />
                <span className="font-semibold">HEART RATE</span>
              </div>
              <span className="text-[10px] text-slate-400">BPM</span>
            </div>
            <div className="text-4xl font-mono font-bold mt-2 text-white">
              {vitals.heartRate}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Limits: 50 - 110 BPM
            </div>
          </div>

          {/* SpO2 Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              vitals.spo2 < 92
                ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
                : 'bg-slate-900/90 border-slate-800 text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">SpO2 PULSE OX</span>
              </div>
              <span className="text-[10px] text-slate-400">%</span>
            </div>
            <div className="text-4xl font-mono font-bold mt-2 text-cyan-300">
              {vitals.spo2}
            </div>
            <div className="text-[11px] font-mono text-slate-400 mt-1">
              Normal: 95 - 100%
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Hemodynamic Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* NIBP / Arterial Line */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span>NIBP BLOOD PRESSURE</span>
            <span>mmHg</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-mono font-bold text-amber-300">
              {vitals.bpSystolic}/{vitals.bpDiastolic}
            </span>
            <span className="text-xs font-mono text-slate-400">
              (MAP {vitals.meanArterialPressure})
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2">
            Target MAP &gt; 65 mmHg
          </div>
        </div>

        {/* Respiration Rate */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-indigo-400" />
              <span>RESPIRATION RATE</span>
            </div>
            <span>/min</span>
          </div>
          <div className="text-3xl font-mono font-bold text-indigo-300 mt-1">
            {vitals.respiratoryRate}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2">
            Mechanical Ventilator Synchronized
          </div>
        </div>

        {/* Core Temperature */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <div className="flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span>CORE BODY TEMP</span>
            </div>
            <span>°C</span>
          </div>
          <div className="text-3xl font-mono font-bold text-orange-300 mt-1">
            {vitals.coreTempC}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2">
            Esophageal Temperature Probe
          </div>
        </div>
      </div>
    </div>
  );
};
