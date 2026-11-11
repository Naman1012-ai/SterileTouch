import React, { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  HeartPulse,
  Pill,
  User,
} from 'lucide-react';
import { PatientProfile } from '../../types/medical';
import { audioService } from '../../services/audioFeedback';

interface PatientRecordsProps {
  patient: PatientProfile;
  onPrevRecord?: () => void;
  onNextRecord?: () => void;
}

type RecordTab = 'LABS' | 'ANESTHESIA' | 'ALLERGIES' | 'SURGICAL_HISTORY';

export const PatientRecords: React.FC<PatientRecordsProps> = ({
  patient,
  onPrevRecord,
  onNextRecord,
}) => {
  const [activeTab, setActiveTab] = useState<RecordTab>('LABS');

  const tabs = [
    { id: 'LABS' as RecordTab, label: 'Pre-Op Laboratory Diagnostic Panel', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'ANESTHESIA' as RecordTab, label: 'Anesthesia & Airway Pre-Op', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'ALLERGIES' as RecordTab, label: 'Allergies & Contraindications', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'SURGICAL_HISTORY' as RecordTab, label: 'Surgical Notes & Consents', icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const handleTabChange = (tabId: RecordTab) => {
    setActiveTab(tabId);
    audioService.playClick();
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-y-auto select-none">
      {/* Patient Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-lg font-mono">
              {patient.gender}/{patient.age}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {patient.name}
                </h2>
                <span className="font-mono text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  {patient.mrn}
                </span>
                <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                  Blood: {patient.bloodType}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Primary Diagnosis:{' '}
                <strong className="text-slate-200">{patient.diagnosis}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right text-xs font-mono text-slate-400">
              <div>Surgeon: <span className="text-slate-200">{patient.primarySurgeon}</span></div>
              <div>Anesthesia: <span className="text-slate-200">{patient.anesthesiologist}</span></div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/80 overflow-x-auto">
          {tabs.map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                data-touchless-clickable="true"
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-slate-800 border border-cyan-500/50 text-cyan-300 shadow-md'
                    : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Panes */}
      <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        {activeTab === 'LABS' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  STAT Complete Blood Count & Coagulation Profile
                </h3>
                <p className="text-[11px] font-mono text-slate-400">
                  Sample Drawn: Today 13:10 UTC | Verified by Central Pathology Lab
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>SPECIMEN SUFFICIENT FOR CRANIOTOMY</span>
              </div>
            </div>

            {/* Labs Data Table with Reference Range Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>HEMOGLOBIN (Hb)</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">NORMAL</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.hemoglobin}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Range: 13.0 - 17.5 g/dL</span>
                  <span className="text-emerald-400 font-semibold">14.2 g/dL</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>PLATELET COUNT</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">NORMAL</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.platelets}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Range: 150K - 450K /uL</span>
                  <span className="text-emerald-400 font-semibold">Adequate</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '55%' }} />
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>WHITE BLOOD CELLS (WBC)</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">NORMAL</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.wbc}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Range: 4.5 - 11.0 /uL</span>
                  <span className="text-emerald-400 font-semibold">6.8 /uL</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '45%' }} />
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>COAGULATION PT / INR</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">CLEAR</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.ptInr}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Target: &lt; 1.20 Neurosurgery</span>
                  <span className="text-emerald-400 font-semibold">1.0 INR</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '35%' }} />
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>SERUM POTASSIUM (K+)</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">NORMAL</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.potassium}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Range: 3.5 - 5.0 mEq/L</span>
                  <span className="text-emerald-400 font-semibold">4.1 mEq/L</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '50%' }} />
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>SERUM SODIUM (Na+)</span>
                  <span className="text-emerald-400 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/40">NORMAL</span>
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">
                  {patient.labs.sodium}
                </div>
                <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                  <span>Range: 135 - 145 mEq/L</span>
                  <span className="text-emerald-400 font-semibold">139 mEq/L</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '48%' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ANESTHESIA' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide">
              Anesthesia Pre-Induction Airway & Risk Evaluation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-cyan-400">Airway Assessment</div>
                <p className="text-slate-300">Mallampati Classification: <strong className="text-white">Class II</strong></p>
                <p className="text-slate-300">Thyromental Distance: <strong className="text-white">&gt; 6.5 cm</strong></p>
                <p className="text-slate-300">Neck Mobility: Full cervical extension intact</p>
                <p className="text-slate-300">Dentition: Intact, no loose teeth or caps</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-amber-400">ASA Physical Status</div>
                <p className="text-slate-300">Classification: <strong className="text-white">ASA Class 3E (Emergency)</strong></p>
                <p className="text-slate-300">NPO Status: Last oral intake &gt; 8 hours prior</p>
                <p className="text-slate-300">Cardiac Assessment: Normal sinus rhythm on baseline telemetry</p>
                <p className="text-slate-300">Estimated Blood Loss: 200 - 450 mL (2 Units PRBC cross-matched)</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'ALLERGIES' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white tracking-wide">
              Verified Allergies & Adverse Drug Reactions
            </h3>
            <div className="space-y-2">
              {patient.allergies.map((allergy, idx) => (
                <div
                  key={idx}
                  className="bg-rose-950/60 border border-rose-500/60 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 text-rose-200 font-semibold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                    <span>{allergy}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-rose-900/80 text-rose-300 px-2 py-0.5 rounded">
                    Severe Anaphylaxis Risk
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'SURGICAL_HISTORY' && (
          <div className="space-y-4 text-xs text-slate-300">
            <h3 className="text-sm font-bold text-white tracking-wide">
              Informed Surgical Consent & Clinical History
            </h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <p>
                <strong className="text-white">Procedure:</strong> {patient.scheduledProcedure}
              </p>
              <p>
                <strong className="text-white">Surgical Indication:</strong> Acute non-contrast head CT demonstrates 18mm thickness acute right subdural hematoma causing severe brain herniation.
              </p>
              <p>
                <strong className="text-white">Consent:</strong> Emergency surrogate consent signed by designated healthcare proxy and witnessed by two attending physicians.
              </p>
              <p>
                <strong className="text-white">Sterilization Clearance:</strong> Sterile OR suite prepped and certified according to AORN touchless protocol.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
