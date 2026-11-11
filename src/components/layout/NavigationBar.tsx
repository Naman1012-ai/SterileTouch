import React from 'react';
import { Activity, ClipboardCheck, FileText, Scan, Tv, UserCheck } from 'lucide-react';
import { PatientProfile } from '../../types/medical';
import { useWorkstation } from '../../context/WorkstationContext';
import { Tooltip } from '../ui/Tooltip';

export type ActiveTab = 'RADIOLOGY' | 'CHECKLIST' | 'VITALS' | 'RECORDS' | 'PACS_MIRROR';

interface NavigationBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  patients: PatientProfile[];
  currentPatientId: string;
  onPatientChange: (patientId: string) => void;
  className?: string;
}

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeTab,
  onTabChange,
  patients,
  currentPatientId,
  onPatientChange,
  className = '',
}) => {
  const { mode } = useWorkstation();
  const isSimple = mode === 'SIMPLE';

  const tabs: Array<{
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    badge: string;
    hotkey: string;
  }> = [
    {
      id: 'RADIOLOGY',
      label: 'Radiology / CT Suite',
      shortLabel: 'Radiology',
      icon: <Scan className={isSimple ? 'w-5 h-5' : 'w-4 h-4'} />,
      badge: 'DICOM',
      hotkey: '1',
    },
    {
      id: 'CHECKLIST',
      label: 'WHO Safety Checklist',
      shortLabel: 'Checklist',
      icon: <ClipboardCheck className={isSimple ? 'w-5 h-5' : 'w-4 h-4'} />,
      badge: 'Sterile Sign-Off',
      hotkey: '2',
    },
    {
      id: 'VITALS',
      label: 'ICU / OR Vitals HUD',
      shortLabel: 'Vitals',
      icon: <Activity className={isSimple ? 'w-5 h-5' : 'w-4 h-4'} />,
      badge: 'Live ECG',
      hotkey: '3',
    },
    {
      id: 'RECORDS',
      label: 'Patient Chart & Labs',
      shortLabel: 'Records',
      icon: <FileText className={isSimple ? 'w-5 h-5' : 'w-4 h-4'} />,
      badge: 'EHR',
      hotkey: '4',
    },
    {
      id: 'PACS_MIRROR',
      label: 'Universal PACS Mirror',
      shortLabel: 'PACS Mirror',
      icon: <Tv className={`text-cyan-400 ${isSimple ? 'w-5 h-5' : 'w-4 h-4'}`} />,
      badge: 'Universal PACS',
      hotkey: '5',
    },
  ];

  return (
    <nav
      aria-label="Clinical Workstation Modules"
      className={`bg-slate-950/95 border-b border-slate-800/90 px-4 py-2 flex flex-wrap items-center justify-between gap-3 select-none z-20 ${
        isSimple ? 'py-2.5' : 'py-1.5'
      } ${className}`}
    >
      {/* Primary Clinical Navigation Module Tabs */}
      <div
        role="tablist"
        aria-orientation="horizontal"
        className="flex items-center gap-2 overflow-x-auto py-0.5 no-scrollbar scroll-smooth"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Tooltip
              key={tab.id}
              content={tab.label}
              shortcut={`Key ${tab.hotkey}`}
              position="bottom"
            >
              <button
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${tab.id.toLowerCase()}`}
                id={`tab-${tab.id.toLowerCase()}`}
                onClick={() => onTabChange(tab.id)}
                data-touchless-clickable="true"
                className={`flex items-center gap-2.5 rounded-xl font-semibold transition-all relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  isSimple
                    ? 'px-4 py-2.5 text-sm min-h-[48px]'
                    : 'px-3.5 py-1.5 text-xs min-h-[38px]'
                } ${
                  isActive
                    ? 'bg-slate-900 text-white border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                }`}
              >
                {/* Tab Icon */}
                <div
                  className={`transition-colors shrink-0 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {tab.icon}
                </div>

                {/* Tab Label */}
                <span className="tracking-wide">
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </span>

                {/* Hotkey Tag */}
                <span
                  className={`text-[9px] font-mono px-1 py-0.5 rounded font-semibold hidden md:inline ${
                    isActive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  [{tab.hotkey}]
                </span>

                {/* Modality Badge (Advanced Mode) */}
                {!isSimple && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-normal uppercase hidden lg:inline ${
                      isActive
                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/60'
                        : 'bg-slate-900 text-slate-500 border border-slate-800/50'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {/* Active Bottom Glow Line Indicator */}
                {isActive && (
                  <div
                    aria-hidden="true"
                    className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.9)]"
                  />
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>

      {/* Touchless Case Switcher */}
      <div className="flex items-center gap-2">
        <div
          role="group"
          aria-label="Patient Case Selector"
          className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl"
        >
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
                  title={`${p.name} (${p.mrn}) — ${p.diagnosis}`}
                  className={`rounded-lg font-mono font-medium transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    isSimple ? 'px-3 py-1.5 text-xs min-h-[36px]' : 'px-2.5 py-1 text-xs min-h-[28px]'
                  } ${
                    isSelected
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-md shadow-cyan-950/60 font-semibold'
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
    </nav>
  );
};
