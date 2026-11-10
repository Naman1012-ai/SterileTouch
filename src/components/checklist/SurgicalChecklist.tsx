import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  History,
  Lock,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  User,
} from 'lucide-react';
import { AuditLogEntry, ChecklistPhase, WHOChecklistItem } from '../../types/medical';
import { GestureDetectionResult } from '../../types/gestures';
import { VoiceCommandResult } from '../../types/speech';
import { INITIAL_WHO_CHECKLIST } from '../../data/mockChecklist';
import { audioService } from '../../services/audioFeedback';

interface SurgicalChecklistProps {
  gestureResult: GestureDetectionResult;
  voiceCommand?: VoiceCommandResult | null;
  onAuditLogAdded: (entry: AuditLogEntry) => void;
  onOpenAuditModal: () => void;
}

export const SurgicalChecklist: React.FC<SurgicalChecklistProps> = ({
  gestureResult,
  voiceCommand,
  onAuditLogAdded,
  onOpenAuditModal,
}) => {
  const [items, setItems] = useState<WHOChecklistItem[]>(INITIAL_WHO_CHECKLIST);
  const [selectedPhase, setSelectedPhase] = useState<ChecklistPhase>('TIME_OUT');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [thumbsUpHoldTime, setThumbsUpHoldTime] = useState<number>(0);

  const completedCount = items.filter((i) => i.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Filter items by phase
  const currentPhaseItems = items.filter((i) => i.phase === selectedPhase);

  // Gesture verification via Thumbs Up
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (gestureResult.isThumbsUp && hoveredItemId) {
      interval = setInterval(() => {
        setThumbsUpHoldTime((prev) => {
          const next = prev + 100;
          if (next >= 600) {
            // Trigger item completion
            completeItem(hoveredItemId, 'THUMBS_UP');
            return 0;
          }
          return next;
        });
      }, 100);
    } else {
      setThumbsUpHoldTime(0);
    }

    return () => clearInterval(interval);
  }, [gestureResult.isThumbsUp, hoveredItemId]);

  // Voice command checklist sign-off and phase selection
  useEffect(() => {
    if (!voiceCommand) return;
    if (voiceCommand.intent === 'SIGN_OFF_CHECKLIST') {
      const pending = currentPhaseItems.find((i) => !i.isCompleted) || items.find((i) => !i.isCompleted);
      if (pending) {
        completeItem(pending.id, 'THUMBS_UP');
      }
    } else if (voiceCommand.intent === 'SELECT_CHECKLIST_PHASE') {
      const targetPhase = voiceCommand.params?.phase as ChecklistPhase;
      if (targetPhase) {
        setSelectedPhase(targetPhase);
        audioService.playClick();
      }
    }
  }, [voiceCommand]);

  const completeItem = (itemId: string, via: 'THUMBS_UP' | 'CLICK' = 'CLICK') => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId && !item.isCompleted) {
          const nowStr = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          // Play confirmation chime
          audioService.playChime();

          // Log audit entry
          const logEntry: AuditLogEntry = {
            id: `log-${Date.now()}`,
            timestamp: `${nowStr} UTC`,
            category: 'CHECKLIST',
            action: `Verified: ${item.title}`,
            details: `Phase: ${item.phaseTitle}. Touchless sign-off confirmed.`,
            operator: 'Dr. Aris Thorne, MD (Lead Surgeon)',
            verifiedTouchless: true,
          };
          onAuditLogAdded(logEntry);

          // Check if phase is now complete
          const otherPhaseItems = prev.filter(
            (i) => i.phase === item.phase && i.id !== item.id && !i.isCompleted
          );
          if (otherPhaseItems.length === 0) {
            // Trigger confetti
            confetti({
              particleCount: 60,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#06b6d4', '#38bdf8'],
            });
          }

          return {
            ...item,
            isCompleted: true,
            completedAt: `${nowStr} UTC`,
            completedBy: 'Dr. Aris Thorne (Lead Surgeon)',
            verifiedGesture: via,
          };
        }
        return item;
      })
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-y-auto select-none">
      {/* Top Banner & Progress */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                WHO Surgical Safety Verification Checklist
              </h2>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded font-semibold uppercase">
                Touchless Sign-Off
              </span>
            </div>
            <p className="text-xs text-slate-400">
              World Health Organization surgical safety standard. Verify critical checkpoints touchlessly via{' '}
              <strong className="text-emerald-400">Thumbs-Up gesture</strong> or air-click.
            </p>
          </div>

          {/* Progress & Compliance Metrics */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <div className="text-xs font-mono text-slate-300">
                Verification Progress: <span className="text-emerald-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                {completedCount} of {totalCount} Items Completed
              </div>
              <div className="w-44 h-2 bg-slate-800 rounded-full mt-1.5 overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            <button
              onClick={onOpenAuditModal}
              data-touchless-clickable="true"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 hover:text-cyan-300 hover:border-cyan-500/50 shadow-md transition"
            >
              <History className="w-4 h-4 text-cyan-400" />
              <span>Audit Trail</span>
            </button>
          </div>
        </div>

        {/* Phase Selector Tabs */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-800/80">
          {(['SIGN_IN', 'TIME_OUT', 'SIGN_OUT'] as ChecklistPhase[]).map((phase) => {
            const isSelected = selectedPhase === phase;
            const phaseItems = items.filter((i) => i.phase === phase);
            const phaseCompleted = phaseItems.every((i) => i.isCompleted);
            const phaseName =
              phase === 'SIGN_IN'
                ? 'Phase 1: Sign In'
                : phase === 'TIME_OUT'
                ? 'Phase 2: Time Out'
                : 'Phase 3: Sign Out';

            return (
              <button
                key={phase}
                onClick={() => {
                  setSelectedPhase(phase);
                  audioService.playClick();
                }}
                data-touchless-clickable="true"
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                  isSelected
                    ? 'bg-slate-800 border-cyan-500/50 text-cyan-300 shadow-md'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{phaseName}</span>
                {phaseCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-500">
                    {phaseItems.filter((i) => i.isCompleted).length}/{phaseItems.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Checklist Items for Current Phase */}
      <div className="space-y-3 max-w-4xl mx-auto w-full">
        {currentPhaseItems.map((item) => {
          const isHovered = hoveredItemId === item.id;
          return (
            <div
              key={item.id}
              id={item.id}
              data-id={item.id}
              onMouseEnter={() => setHoveredItemId(item.id)}
              onMouseLeave={() => setHoveredItemId(null)}
              className={`p-4 rounded-xl border transition-all ${
                item.isCompleted
                  ? 'bg-slate-900/60 border-emerald-900/40 text-slate-300'
                  : isHovered
                  ? 'bg-slate-900 border-cyan-500/70 shadow-lg shadow-cyan-950/40'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                      item.isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                    }`}
                  >
                    {item.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-slate-600" />
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-sm font-semibold tracking-wide ${
                        item.isCompleted ? 'text-slate-300 line-through opacity-85' : 'text-white'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Completion Metadata Badge */}
                    {item.isCompleted && (
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-emerald-400/90">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-500" />
                          <span>{item.completedAt}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-emerald-500" />
                          <span>{item.completedBy}</span>
                        </div>
                        {item.verifiedGesture && (
                          <span className="bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[10px]">
                            {item.verifiedGesture === 'THUMBS_UP'
                              ? 'THUMBS-UP SIGNED'
                              : 'TOUCHLESS CLICK'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Verification Trigger Button */}
                {!item.isCompleted && (
                  <div className="flex flex-col items-end">
                    <button
                      onClick={() => completeItem(item.id, 'CLICK')}
                      data-touchless-clickable="true"
                      data-id={item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-950 transition active:scale-95"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>Sign Off</span>
                    </button>

                    {/* Thumbs-Up Hold Feedback */}
                    {isHovered && gestureResult.isThumbsUp && (
                      <div className="mt-2 text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        <span>Holding Thumbs-Up...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
