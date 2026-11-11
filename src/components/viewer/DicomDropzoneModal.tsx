import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  FileCode2,
  HardDriveUpload,
  Layers,
  Shield,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { DicomSeriesUploadResult } from '../../types/dicom';
import { DicomParser } from '../../services/dicomParser';
import { audioService } from '../../services/audioFeedback';
import { SterileTouchLogo } from '../brand/SterileTouchLogo';

interface DicomDropzoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (result: DicomSeriesUploadResult) => void;
}

export const DicomDropzoneModal: React.FC<DicomDropzoneModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoAnonymize, setAutoAnonymize] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusMsg(`Parsing ${files.length} medical file(s)...`);
    audioService.playTick(900);

    try {
      const result = await DicomParser.parseFileList(files, autoAnonymize);
      setStatusMsg(`Successfully decoded ${result.totalSlices} slice(s)! Loading workstation...`);
      audioService.playChime();
      setTimeout(() => {
        setIsProcessing(false);
        onUploadSuccess(result);
        onClose();
      }, 400);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setIsProcessing(false);
      audioService.playLock();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleLoadSample = (sampleType: 'CHEST_CT' | 'CRANIAL_MRI') => {
    setIsProcessing(true);
    setErrorMsg(null);
    setStatusMsg('Generating 16-bit Part 10 CT series with calibrated Hounsfield Units...');
    audioService.playTick(950);

    setTimeout(() => {
      const result = DicomParser.createSampleDicomSeries();
      if (sampleType === 'CRANIAL_MRI') {
        result.title = 'Brain MRI T1 Axial Reconstruction';
        result.modality = 'MRI';
        result.metadata.modality = 'MRI';
        result.metadata.seriesDescription = 'Brain MRI T1 Weighted (0.45mm)';
      }
      setStatusMsg('Sample DICOM dataset ready!');
      audioService.playChime();
      setIsProcessing(false);
      onUploadSuccess(result);
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <SterileTouchLogo variant="icon" size="sm" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Touchless DICOM & Scan Dropzone</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  PACS Client
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                100% In-Browser Zero-Server Execution • Client-Side Confidentiality
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
        <div className="p-6 space-y-5">
          {/* Main Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-touchless-clickable="true"
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_30px_rgba(6,182,212,0.25)] scale-[1.01]'
                : 'border-slate-700/80 bg-slate-950/50 hover:border-cyan-500/60 hover:bg-slate-950/80'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".dcm,.dicom,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />

            <div className="p-4 rounded-full bg-slate-900 border border-slate-700/80 text-cyan-400 mb-3 group-hover:scale-110 transition">
              <Upload className="w-8 h-8" />
            </div>

            <h3 className="text-sm font-semibold text-slate-200 mb-1">
              Drag & Drop DICOM Files or Folders Here
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-3">
              Accepts raw <code className="text-cyan-300 font-mono">.dcm</code> slices, multi-slice series stacks, or standard radiographs (<code className="text-slate-300 font-mono">.png, .jpg</code>).
            </p>

            <span className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 font-mono text-xs font-semibold hover:bg-cyan-900/60 transition shadow-sm">
              Browse Local Files
            </span>
          </div>

          {/* HIPAA PHI De-Identification Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  HIPAA Patient De-Identification
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Automatically sanitize patient names and medical record IDs on import
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoAnonymize}
                onChange={(e) => setAutoAnonymize(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Quick-Load Real Clinical Samples */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Or Load 1-Click Verified DICOM Datasets (No Files Required)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleLoadSample('CHEST_CT')}
                data-touchless-clickable="true"
                disabled={isProcessing}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/60 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800/80">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition">
                      Thoracic CT Helical Series
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      12 Slices • 512x512 • 16-bit HU
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  CT
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample('CRANIAL_MRI')}
                data-touchless-clickable="true"
                disabled={isProcessing}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/60 text-left transition flex items-center justify-between group disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                      Cranial MRI T1 Multi-Slice
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      12 Slices • High-Contrast Brain
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                  MRI
                </span>
              </button>
            </div>
          </div>

          {/* Processing Status & Error Feedback */}
          {isProcessing && (
            <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/60 flex items-center gap-3 text-cyan-200 text-xs animate-pulse">
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono">{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px]">
            Supported Formats: .DCM, .DICOM, .PNG, .JPG, .WEBP
          </span>

          <button
            onClick={() => {
              audioService.playClick();
              onClose();
            }}
            data-touchless-clickable="true"
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold border border-slate-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
