import React, { useEffect, useState } from 'react';
import {
  Check,
  Mic,
  MicOff,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { VoiceAssistantStatus, VoiceCommandResult } from '../../types/speech';
import { voiceAssistantService } from '../../services/voiceAssistant';

export const VoiceIndicatorHUD: React.FC = () => {
  const [status, setStatus] = useState<VoiceAssistantStatus>(
    voiceAssistantService.getStatus()
  );
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastExecuted, setLastExecuted] = useState<VoiceCommandResult | null>(null);

  useEffect(() => {
    const handleStatus = (newStatus: VoiceAssistantStatus) => {
      setStatus(newStatus);
    };

    const handleTranscript = (transcript: string) => {
      setLiveTranscript(transcript);
    };

    const handleCommand = (cmd: VoiceCommandResult) => {
      setLastExecuted(cmd);
      // Auto-clear pill after 3.5 seconds
      setTimeout(() => {
        setLastExecuted((prev) => (prev === cmd ? null : prev));
        setLiveTranscript('');
      }, 3500);
    };

    voiceAssistantService.onStatus(handleStatus);
    voiceAssistantService.onTranscript(handleTranscript);
    voiceAssistantService.onCommand(handleCommand);

    return () => {
      voiceAssistantService.removeCommandListener(handleCommand);
    };
  }, []);

  const toggleMic = () => {
    voiceAssistantService.toggleListening();
  };

  const toggleSpeechResponse = () => {
    voiceAssistantService.setSpeechResponseEnabled(!status.speechResponseEnabled);
  };

  if (!voiceAssistantService.isApiSupported()) {
    return null; // Silently omit if browser completely lacks Web Speech API
  }

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Live Voice Transcription Bubble / Pill */}
      {(liveTranscript || lastExecuted) && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/95 border border-cyan-500/50 text-xs text-cyan-200 backdrop-blur-md shadow-lg animate-fade-in max-w-xs truncate">
          {lastExecuted ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="font-mono text-[11px] truncate">
                <strong className="text-white">{lastExecuted.matchedPhrase}</strong>
              </span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin shrink-0" />
              <span className="font-mono text-[11px] text-slate-300 italic truncate">
                "{liveTranscript}"
              </span>
            </>
          )}
        </div>
      )}

      {/* Main Microphone Capsule Button */}
      <button
        onClick={toggleMic}
        data-touchless-clickable="true"
        title={
          status.isListening
            ? 'Voice Assistant Active (Click to Mute Voice)'
            : 'Click to Enable Voice Assistant Commands'
        }
        className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
          status.isListening
            ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {status.isListening ? (
            <>
              <Mic className="w-3.5 h-3.5 text-cyan-400" />
              {/* Animated sound wave bars */}
              <div className="absolute -right-3.5 flex items-end gap-0.5 h-3">
                <span className="w-0.5 h-2 bg-cyan-400 animate-pulse" />
                <span className="w-0.5 h-3 bg-cyan-300 animate-ping" />
                <span className="w-0.5 h-1.5 bg-cyan-400 animate-pulse" />
              </div>
            </>
          ) : (
            <MicOff className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>

        <span className="font-mono text-[11px] ml-3 hidden sm:inline">
          {status.isListening ? 'Voice Active' : 'Mic Idle'}
        </span>
      </button>

      {/* Verbal Response Toggle (Spoken Voice ON / OFF) */}
      <button
        onClick={toggleSpeechResponse}
        data-touchless-clickable="true"
        title={
          status.speechResponseEnabled
            ? 'Spoken Voice Replies: ON (Click to switch to subtle chimes)'
            : 'Spoken Voice Replies: OFF (Click to enable spoken responses)'
        }
        className={`p-1.5 rounded-lg border text-xs transition ${
          status.speechResponseEnabled
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
        }`}
      >
        {status.speechResponseEnabled ? (
          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 text-slate-500" />
        )}
      </button>
    </div>
  );
};
