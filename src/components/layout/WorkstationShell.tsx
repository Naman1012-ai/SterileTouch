import React from 'react';
import { useWorkstation } from '../../context/WorkstationContext';

interface WorkstationShellProps {
  header: React.ReactNode;
  navigation: React.ReactNode;
  patientContext?: React.ReactNode;
  statusBar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const WorkstationShell: React.FC<WorkstationShellProps> = ({
  header,
  navigation,
  patientContext,
  statusBar,
  children,
  className = '',
}) => {
  const { mode } = useWorkstation();
  const isSimple = mode === 'SIMPLE';

  return (
    <div
      data-workstation-mode={mode.toLowerCase()}
      className={`flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans relative ${
        isSimple ? 'sterile-simple-mode' : 'sterile-advanced-mode'
      } ${className}`}
    >
      {/* 1. Global Workstation Header */}
      <div className="shrink-0 z-30">
        {header}
      </div>

      {/* 2. Primary Module Navigation */}
      <div className="shrink-0 z-20">
        {navigation}
      </div>

      {/* 3. Context-Aware Patient Information Bar */}
      {patientContext && (
        <div className="shrink-0 z-10">
          {patientContext}
        </div>
      )}

      {/* 4. Main Clinical Workspace Viewport */}
      <main
        id="workspace-viewport"
        role="region"
        aria-label="Clinical Module Workspace"
        className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-slate-950"
      >
        {children}
      </main>

      {/* 5. Workstation System Status & Feedback Tray */}
      {statusBar && (
        <div className="shrink-0 z-20">
          {statusBar}
        </div>
      )}
    </div>
  );
};
