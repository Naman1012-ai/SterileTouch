import React from 'react';
import { Download, FileText, ShieldCheck, X } from 'lucide-react';
import { AuditLogEntry } from '../../types/medical';
import { audioService } from '../../services/audioFeedback';
import { SterileTouchLogo } from '../brand/SterileTouchLogo';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
}) => {
  if (!isOpen) return null;

  const exportAuditLogJson = () => {
    audioService.playClick();
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `SterileTouch_AuditLog_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <SterileTouchLogo variant="icon" size="sm" />
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Sterilization & Surgical Audit Trail
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Cryptographically logged touchless events & verification timestamps
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

        {/* Log Entries List */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              No audit records generated yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{log.timestamp}</span>
                    <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                      {log.category}
                    </span>
                  </div>
                  {log.verifiedTouchless && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/50 px-1.5 py-0.5 rounded text-[10px]">
                      TOUCHLESS COMPLIANT
                    </span>
                  )}
                </div>
                <div className="text-slate-200 font-semibold text-[13px]">
                  {log.action}
                </div>
                <div className="text-slate-400 text-[11px]">{log.details}</div>
                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  Signed: {log.operator}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <span className="text-xs font-mono text-slate-400">
            {logs.length} logged entries
          </span>
          <button
            onClick={exportAuditLogJson}
            data-touchless-clickable="true"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md shadow-cyan-950 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Log</span>
          </button>
        </div>
      </div>
    </div>
  );
};
