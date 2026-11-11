import React from 'react';
import { Activity, ClipboardCheck, FileText, Scan, User, UserCheck } from 'lucide-react';
import { PatientProfile } from '../../types/medical';

export type ActiveTab = 'RADIOLOGY' | 'CHECKLIST' | 'VITALS' | 'RECORDS';

interface NavigationBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  patients: PatientProfile[];
  currentPatientId: string;
  onPatientChange: (patientId: string) => void;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onTabChange,
  patients,
  currentPatientId,
  onPatientChange,
}) => {
  const activePatient = patients.find((p) => p.id === currentPatientId) || patients[0];

  const tabs = [
    {
      id: 'RADIOLOGY' as ActiveTab,
      label: 'Radiology / CT Suite',
      icon: <Scan className="w-4 h-4" />,
      badge: 'DICOM',
    },
    {
      id: 'CHECKLIST' as ActiveTab,
      label: 'WHO Safety Checklist',
      icon: <ClipboardCheck className="w-4 h-4" />,
      badge: 'Sterile Sign-Off',
    },
    {
      id: 'VITALS' as ActiveTab,
      label: 'ICU / OR Vitals HUD',
      icon: <Activity className="w-4 h-4" />,
      badge: 'Live ECG',
    },
    {
      id: 'RECORDS' as ActiveTab,
      label: 'Patient Chart & Labs',
      icon: <FileText className="w-4 h-4" />,
      badge: 'EHR',
    },
  ];

  return (
    <div className="bg-slate-950/90 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 select-none">
      {/* Primary Clinical Navigation Module Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              data-touchless-clickable="true"
              className={`flex items-center gap-2.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all relative ${
                isActive
                  ? 'bg-slate-900 text-white border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
              }`}
            >
              <div
                className={`transition-colors ${
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {tab.icon}
              </div>
              <span>{tab.label}</span>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-normal uppercase ${
                  isActive
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-900 text-slate-500 border border-slate-800/50'
                }`}
              >
                {tab.badge}
              </span>

              {/* Bottom active line indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Patient Profile Context & Touchless Case Switcher */}
      <div className="flex items-center gap-3">
        {/* Active Patient Detail Capsule */}
        {activePatient && (
          <div className="hidden lg:flex items-center gap-2.5 bg-slate-900/90 border border-slate-800/90 px-3 py-1 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div className="text-xs">
              <span className="font-semibold text-slate-200">{activePatient.name}</span>
              <span className="text-slate-400 font-mono ml-1.5">({activePatient.mrn})</span>
            </div>
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50">
              {activePatient.gender}/{activePatient.age}
            </span>
            <span className="text-[11px] text-amber-300 font-medium max-w-[160px] truncate">
              {activePatient.scheduledProcedure}
            </span>
          </div>
        )}

        {/* Case Selector Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl">
          <div className="flex items-center gap-1 px-2 text-slate-400 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] font-medium hidden sm:inline">Case:</span>
          </div>

          <div className="flex items-center gap-1">
            {patients.map((p, idx) => {
              const isSelected = p.id === currentPatientId;
              return (
                <button
                  key={p.id}
                  onClick={() => onPatientChange(p.id)}
                  data-touchless-clickable="true"
                  title={`${p.name} - ${p.diagnosis}`}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-md shadow-cyan-950/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  Case {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
