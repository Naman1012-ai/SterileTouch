import React from 'react';
import { AlertTriangle, Droplet, HeartPulse, Stethoscope, User, ShieldAlert } from 'lucide-react';
import { PatientProfile, MedicalScanSeries } from '../../types/medical';
import { useWorkstation } from '../../context/WorkstationContext';
import { Badge } from '../ui/Badge';
import { StatusIndicator } from '../ui/StatusIndicator';

interface PatientContextBarProps {
  patient: PatientProfile;
  activeScan?: MedicalScanSeries;
  className?: string;
}

export const PatientContextBar: React.FC<PatientContextBarProps> = ({
  patient,
  activeScan,
  className = '',
}) => {
  const { mode } = useWorkstation();
  const isSimple = mode === 'SIMPLE';

  const hasAllergies =
    patient.allergies &&
    patient.allergies.length > 0 &&
    !patient.allergies.every((a) => a.toLowerCase().includes('none reported'));

  return (
    <aside
      aria-label="Active Patient Context"
      className={`bg-slate-900/95 border-b border-slate-800/90 px-4 py-1.5 flex flex-wrap items-center justify-between gap-3 text-xs select-none transition-all duration-200 ${
        isSimple ? 'py-2.5 bg-slate-900' : 'py-1.5'
      } ${className}`}
    >
      {/* Left Capsule: Active Patient Identification */}
      <div className="flex items-center flex-wrap gap-2.5">
        {/* Status Dot */}
        <div className="flex items-center gap-1.5">
          <StatusIndicator
            label="Patient Status"
            status={patient.status === 'INTRA_OP' ? 'ONLINE' : 'STANDBY'}
            customText={patient.status === 'INTRA_OP' ? 'INTRA-OP' : patient.status}
            showDot={true}
          />
        </div>

        {/* Patient Name & MRN */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-200">
            <User className={`text-cyan-400 shrink-0 ${isSimple ? 'w-4 h-4' : 'w-3.5 h-3.5'}`} />
            <span className={`font-semibold tracking-wide ${isSimple ? 'text-sm text-white' : 'text-xs text-slate-100'}`}>
              {patient.name}
            </span>
          </div>

          <span className="font-mono text-slate-400 text-[11px] bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
            {patient.mrn}
          </span>

          <Badge variant="cyan" size={isSimple ? 'sm' : 'xs'}>
            {patient.gender} • {patient.age}y
          </Badge>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block" />

        {/* Scheduled Procedure */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 text-[11px] hidden md:inline">Procedure:</span>
          <span className={`font-medium text-amber-300 max-w-[280px] xl:max-w-md truncate ${isSimple ? 'text-xs' : 'text-[11px]'}`}>
            {patient.scheduledProcedure}
          </span>
        </div>

        {/* Critical Allergy Warning */}
        {hasAllergies && (
          <div className="flex items-center gap-1">
            <Badge variant="rose" size={isSimple ? 'sm' : 'xs'} hasDot={true}>
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-400" />
                <span>ALLERGY: {patient.allergies.join(', ')}</span>
              </span>
            </Badge>
          </div>
        )}
      </div>

      {/* Right Capsule: Clinical Demographics & Diagnostics */}
      <div className="flex items-center gap-3">
        {/* Blood Type Badge */}
        {patient.bloodType && (
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            <Droplet className="w-3 h-3 text-rose-400" />
            <span className="font-semibold text-rose-300">{patient.bloodType}</span>
          </div>
        )}

        {/* Surgical Team (Advanced Mode or Large Screen) */}
        {!isSimple && (
          <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400 border-l border-slate-800 pl-3">
            <div className="flex items-center gap-1">
              <Stethoscope className="w-3 h-3 text-cyan-400" />
              <span>Surgeon:</span>
              <span className="text-slate-200 font-medium">{patient.primarySurgeon}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1">
              <span>Anesth:</span>
              <span className="text-slate-300 font-medium">{patient.anesthesiologist}</span>
            </div>
          </div>
        )}

        {/* Labs Quick Snapshot (Advanced Mode) */}
        {!isSimple && patient.labs && (
          <div className="hidden 2xl:flex items-center gap-2 text-[10px] font-mono bg-slate-950/70 border border-slate-800 px-2.5 py-0.5 rounded-lg">
            <div className="flex items-center gap-1 text-slate-400">
              <HeartPulse className="w-3 h-3 text-emerald-400" />
              <span>Hb:</span>
              <span className="text-slate-200 font-semibold">{patient.labs.hemoglobin}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span>Plt:</span>
              <span className="text-slate-200 font-semibold">{patient.labs.platelets}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span>K+:</span>
              <span className="text-slate-200 font-semibold">{patient.labs.potassium}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1 text-slate-400">
              <span>INR:</span>
              <span className="text-slate-200 font-semibold">{patient.labs.ptInr}</span>
            </div>
          </div>
        )}

        {/* Active Scan Modality Badge (if available in Advanced mode) */}
        {!isSimple && activeScan && (
          <div className="hidden lg:flex items-center gap-1">
            <Badge variant="indigo" size="xs">
              {activeScan.modality} • {activeScan.totalSlices} Slices
            </Badge>
          </div>
        )}
      </div>
    </aside>
  );
};
