import React, { useState } from 'react';
import {
  Activity,
  Binary,
  Calendar,
  ChevronRight,
  Database,
  FileText,
  Maximize2,
  Search,
  Sliders,
  User,
  X,
} from 'lucide-react';
import { DicomMetadata } from '../../types/dicom';
import { audioService } from '../../services/audioFeedback';

interface DicomMetadataDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  metadata?: DicomMetadata | null;
}

export const DicomMetadataDrawer: React.FC<DicomMetadataDrawerProps> = ({
  isOpen,
  onClose,
  metadata,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const rawTags = metadata?.rawTags || [];
  const filteredTags = rawTags.filter(
    (t) =>
      t.tagHex.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(t.value).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900/95 border-l border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col text-xs text-slate-300 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
              <span>PACS Header Inspector</span>
              {metadata && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {metadata.modality}
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              DICOM Part 10 Clinical Elements
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

      {/* Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!metadata ? (
          <div className="p-6 text-center text-slate-400 space-y-2">
            <Database className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No external DICOM metadata loaded.</p>
            <p className="text-[11px] text-slate-400 font-mono">
              Upload a .dcm scan or load a sample CT series to inspect header tags.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Patient Demographics */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-wider text-[11px]">
                <User className="w-3.5 h-3.5" />
                <span>Patient Demographics</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">NAME (0010,0010)</span>
                  <span className="text-white font-semibold">{metadata.patientName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MRN / ID (0010,0020)</span>
                  <span className="text-cyan-300 font-semibold">{metadata.patientId}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AGE (0010,1010)</span>
                  <span className="text-slate-200">{metadata.patientAge || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SEX (0010,0040)</span>
                  <span className="text-slate-200">{metadata.patientSex || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* 2. Study & Series */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
                <Calendar className="w-3.5 h-3.5" />
                <span>Study & Acquisition</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">STUDY DATE (0008,0020)</span>
                  <span className="text-white">{metadata.studyDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">MODALITY (0008,0060)</span>
                  <span className="text-cyan-300 font-semibold">{metadata.modality}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">SERIES DESC (0008,103E)</span>
                  <span className="text-slate-200">{metadata.seriesDescription || metadata.studyDescription || 'Clinical Series'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">INSTANCE # (0020,0013)</span>
                  <span className="text-slate-200">{metadata.instanceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">SLICE THICKNESS</span>
                  <span className="text-slate-200">{metadata.sliceThicknessMm ? `${metadata.sliceThicknessMm} mm` : '1.25 mm'}</span>
                </div>
              </div>
            </div>

            {/* 3. Geometry & Pixel Spacing */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Spatial Geometry & Caliper Calibration</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">MATRIX (ROWS x COLS)</span>
                  <span className="text-white">{metadata.rows} x {metadata.columns}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PIXEL SPACING (0028,0030)</span>
                  <span className="text-emerald-300 font-semibold">
                    {metadata.pixelSpacing[0].toFixed(3)} mm / px
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">BITS ALLOCATED (0028,0100)</span>
                  <span className="text-slate-200">{metadata.bitsAllocated}-bit ({metadata.bitsStored} stored)</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">REPRESENTATION</span>
                  <span className="text-slate-200">
                    {metadata.pixelRepresentation === 1 ? "Signed (2's Compl)" : 'Unsigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Windowing & Rescale Intercept */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                <Sliders className="w-3.5 h-3.5" />
                <span>Radiometric & Window Level (HU)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">WINDOW CENTER (0028,1050)</span>
                  <span className="text-white">{metadata.windowCenter} HU</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">WINDOW WIDTH (0028,1051)</span>
                  <span className="text-white">{metadata.windowWidth} HU</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">RESCALE INTERCEPT</span>
                  <span className="text-slate-200">{metadata.rescaleIntercept}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">RESCALE SLOPE</span>
                  <span className="text-slate-200">{metadata.rescaleSlope}</span>
                </div>
              </div>
            </div>

            {/* 5. Searchable Raw DICOM Element Dictionary */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Binary className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Raw Elements ({filteredTags.length})</span>
                </span>
              </div>

              {/* Search filter input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter tag (e.g. 0028, Spacing, Window)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Tag table list */}
              <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 divide-y divide-slate-800/60 font-mono text-[10px]">
                {filteredTags.length === 0 ? (
                  <div className="p-3 text-center text-slate-400">No matching tags</div>
                ) : (
                  filteredTags.map((tag, idx) => (
                    <div key={idx} className="p-2 hover:bg-slate-800/40 flex items-start justify-between gap-2">
                      <div className="shrink-0">
                        <span className="text-cyan-400 font-semibold">{tag.tagHex}</span>
                        <span className="text-slate-400 ml-1.5">[{tag.vr}]</span>
                        <div className="text-slate-300 text-[10px]">{tag.name}</div>
                      </div>
                      <div className="text-right text-slate-400 max-w-[180px] truncate" title={String(tag.value)}>
                        {Array.isArray(tag.value) ? tag.value.join('\\') : String(tag.value)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-slate-400 text-[11px] font-mono">
        <span>DICOM PS 3.10 Standard</span>
        <button
          onClick={() => {
            audioService.playClick();
            onClose();
          }}
          data-touchless-clickable="true"
          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-semibold transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
