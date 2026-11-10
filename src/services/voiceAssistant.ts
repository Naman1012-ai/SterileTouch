import {
  IWindowSpeechRecognition,
  VoiceAssistantStatus,
  VoiceCommandIntent,
  VoiceCommandResult,
} from '../types/speech';
import { audioService } from './audioFeedback';

export type VoiceCommandListener = (result: VoiceCommandResult) => void;
export type VoiceStatusListener = (status: VoiceAssistantStatus) => void;
export type VoiceTranscriptListener = (transcript: string, isFinal: boolean) => void;

export class VoiceAssistantService {
  private recognition: IWindowSpeechRecognition | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;
  private speechResponseEnabled: boolean = true; // Verbal confirmations enabled by default
  private isSupported: boolean = false;
  private lastTranscript: string = '';
  private lastCommand: VoiceCommandResult | null = null;
  private errorMessage: string | null = null;

  // Listeners
  private commandListeners: VoiceCommandListener[] = [];
  private statusListeners: VoiceStatusListener[] = [];
  private transcriptListeners: VoiceTranscriptListener[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRec) {
        this.isSupported = true;
        this.initRecognition(SpeechRec);
      }
    }
  }

  private initRecognition(SpeechRec: new () => IWindowSpeechRecognition) {
    try {
      this.recognition = new SpeechRec();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.errorMessage = null;
        this.emitStatus();
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const currentText = (finalTranscript || interimTranscript).trim();
        if (currentText) {
          this.lastTranscript = currentText;
          this.emitTranscript(currentText, !!finalTranscript);
        }

        if (finalTranscript.trim()) {
          this.handleFinalTranscript(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: { error: string; message?: string }) => {
        console.warn('Voice recognition event error:', event.error);
        if (event.error !== 'no-speech') {
          this.errorMessage = `Voice Error: ${event.error}`;
        }
        this.emitStatus();
      };

      this.recognition.onend = () => {
        // Auto-restart continuous listening in clinical environment
        if (this.isListening) {
          try {
            this.recognition?.start();
          } catch {
            // Browser cooldown delay
            setTimeout(() => {
              if (this.isListening) {
                try {
                  this.recognition?.start();
                } catch {}
              }
            }, 300);
          }
        }
        this.emitStatus();
      };
    } catch (err) {
      console.error('Speech recognition initialization error:', err);
      this.isSupported = false;
    }
  }

  public isApiSupported(): boolean {
    return this.isSupported;
  }

  public getStatus(): VoiceAssistantStatus {
    return {
      state: !this.isSupported
        ? 'UNSUPPORTED'
        : this.isListening
        ? 'LISTENING'
        : 'IDLE',
      isListening: this.isListening,
      isSpeaking: this.isSpeaking,
      speechResponseEnabled: this.speechResponseEnabled,
      lastTranscript: this.lastTranscript,
      lastCommand: this.lastCommand,
      errorMessage: this.errorMessage,
    };
  }

  public setSpeechResponseEnabled(enabled: boolean) {
    this.speechResponseEnabled = enabled;
    this.emitStatus();
  }

  public toggleListening(): boolean {
    if (this.isListening) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public start() {
    if (!this.isSupported || !this.recognition) return;
    this.isListening = true;
    try {
      this.recognition.start();
    } catch {
      // Already running
    }
    audioService.playClick();
    this.emitStatus();
  }

  public stop() {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    audioService.playClick();
    this.emitStatus();
  }

  // CLINICAL INTENT PARSER & SYNONYM MATCHER
  public parseIntent(raw: string): VoiceCommandResult {
    let clean = raw.toLowerCase().trim();

    // Strip wake words if present (surgeons can speak directly or use wake word)
    clean = clean.replace(/^(sterile|steriletouch|computer|doctor|terminal|assistant)[,\s]+/i, '').trim();

    let intent: VoiceCommandIntent = 'UNKNOWN';
    let matchedPhrase = clean;
    const params: Record<string, string | number> = {};
    let confidence = 0.9;

    // 1. Radiology Slice Navigation
    if (/^(next slice|next image|slice up|next|advance)$/i.test(clean) || clean.includes('next slice')) {
      intent = 'NEXT_SLICE';
    } else if (/^(previous slice|prev slice|slice down|back|previous)$/i.test(clean) || clean.includes('previous slice')) {
      intent = 'PREV_SLICE';
    } else if (/(?:go to|show|slice|layer)\s+(\d+)/i.test(clean)) {
      const match = clean.match(/(?:go to|show|slice|layer)\s+(\d+)/i);
      if (match) {
        intent = 'GO_TO_SLICE';
        params.sliceNumber = parseInt(match[1], 10);
      }
    }

    // 2. Zoom & Pan
    else if (/^(zoom in|enlarge|magnify|closer)$/i.test(clean) || clean.includes('zoom in')) {
      intent = 'ZOOM_IN';
    } else if (/^(zoom out|smaller|shrink|step back)$/i.test(clean) || clean.includes('zoom out')) {
      intent = 'ZOOM_OUT';
    } else if (/^(reset view|reset zoom|center scan|center|reset)$/i.test(clean) || clean.includes('reset view')) {
      intent = 'RESET_VIEW';
    }

    // 3. Window / Level Filters
    else if (/(bone window|bone contrast|show bones|bones)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'BONE';
    } else if (/(soft tissue|brain window|tissue contrast|tissue)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'SOFT_TISSUE';
    } else if (/(lung window|show lungs|lungs)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'LUNG';
    } else if (/(invert contrast|invert colors|negative view|invert)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'INVERT';
    } else if (/(default window|normal contrast|reset contrast|default)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'DEFAULT';
    }

    // 4. Caliper & Measurements
    else if (/(clear measurements|clear caliper|delete measurements|clear ruler)/i.test(clean)) {
      intent = 'CLEAR_CALIPER';
    } else if (/(measure|caliper|ruler tool|toggle caliper)/i.test(clean)) {
      intent = 'TOGGLE_CALIPER';
    }

    // 5. AI Findings
    else if (/(toggle ai|ai findings|show findings|hide findings|ai detections)/i.test(clean)) {
      intent = 'TOGGLE_AI_FINDINGS';
    }

    // 6. Navigation Tabs
    else if (/(open radiology|show ct|show scan|radiology view|radiology suite|open imaging)/i.test(clean)) {
      intent = 'NAV_RADIOLOGY';
    } else if (/(open checklist|surgical checklist|safety checklist|who checklist)/i.test(clean)) {
      intent = 'NAV_CHECKLIST';
    } else if (/(open vitals|show monitor|ecg monitor|cardiac vitals|vitals hud)/i.test(clean)) {
      intent = 'NAV_VITALS';
    } else if (/(open patient records|show labs|patient chart|medical records|show ehr)/i.test(clean)) {
      intent = 'NAV_RECORDS';
    }

    // 7. Patient Switcher
    else if (/(case 1|patient 1|first case)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 1;
    } else if (/(case 2|patient 2|second case)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 2;
    } else if (/(case 3|patient 3|third case)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 3;
    }

    // 8. WHO Checklist Verification
    else if (/(sign off|sign checklist|verify time out|confirm checklist|check item|verify item)/i.test(clean)) {
      intent = 'SIGN_OFF_CHECKLIST';
    } else if (/(open audit log|view audit trail|show audit|audit log)/i.test(clean)) {
      intent = 'OPEN_AUDIT_LOG';
    }

    // 9. Vitals & Cardiac Alarms
    else if (/(silence alarm|mute alarm|acknowledge alarm|dismiss alarm|cancel alarm)/i.test(clean)) {
      intent = 'SILENCE_ALARM';
    } else if (/(simulate emergency|simulate tachycardia|trigger alarm|emergency simulation)/i.test(clean)) {
      intent = 'SIMULATE_EMERGENCY';
    }

    // 10. Sterile Freeze
    else if (/(unfreeze|unlock screen|unlock cursor|resume interaction|unlock)/i.test(clean)) {
      intent = 'STERILE_UNFREEZE';
    } else if (/(sterile freeze|freeze screen|lock screen|lock cursor|freeze)/i.test(clean)) {
      intent = 'STERILE_FREEZE';
    }

    // 11. Audio & Help
    else if (/(mute audio|unmute audio|toggle sound|mute sound)/i.test(clean)) {
      intent = 'TOGGLE_AUDIO';
    } else if (/(show help|gestures help|command guide|help)/i.test(clean)) {
      intent = 'SHOW_HELP';
    }

    return {
      intent,
      rawTranscript: raw,
      matchedPhrase,
      params,
      confidence,
    };
  }

  private handleFinalTranscript(transcript: string) {
    const result = this.parseIntent(transcript);
    this.lastCommand = result;

    if (result.intent !== 'UNKNOWN') {
      audioService.playClick();
      this.provideVerbalConfirmation(result);
      this.emitCommand(result);
    } else {
      console.log('Unrecognized voice transcript:', transcript);
    }

    this.emitStatus();
  }

  // Spoken verbal response via browser speech synthesis
  public speak(text: string) {
    if (!this.speechResponseEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Stop prior speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.85;

      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
        this.emitStatus();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        this.emitStatus();
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  }

  private provideVerbalConfirmation(result: VoiceCommandResult) {
    if (!this.speechResponseEnabled) return;

    switch (result.intent) {
      case 'NEXT_SLICE':
      case 'PREV_SLICE':
        // Keep slice traversal quiet with just ticks
        break;
      case 'GO_TO_SLICE':
        this.speak(`Slice ${result.params?.sliceNumber}`);
        break;
      case 'ZOOM_IN':
        this.speak('Zooming in');
        break;
      case 'ZOOM_OUT':
        this.speak('Zooming out');
        break;
      case 'RESET_VIEW':
        this.speak('View reset');
        break;
      case 'SET_WINDOW_PRESET':
        this.speak(`${result.params?.preset} window active`);
        break;
      case 'TOGGLE_CALIPER':
        this.speak('Caliper tool toggled');
        break;
      case 'CLEAR_CALIPER':
        this.speak('Measurements cleared');
        break;
      case 'TOGGLE_AI_FINDINGS':
        this.speak('AI findings toggled');
        break;
      case 'NAV_RADIOLOGY':
        this.speak('Radiology suite');
        break;
      case 'NAV_CHECKLIST':
        this.speak('Surgical checklist');
        break;
      case 'NAV_VITALS':
        this.speak('Vitals monitor');
        break;
      case 'NAV_RECORDS':
        this.speak('Patient records');
        break;
      case 'SWITCH_PATIENT':
        this.speak(`Switched to Case ${result.params?.patientIndex}`);
        break;
      case 'SIGN_OFF_CHECKLIST':
        this.speak('Safety checklist confirmed');
        break;
      case 'SILENCE_ALARM':
        this.speak('Alarm silenced and logged');
        break;
      case 'SIMULATE_EMERGENCY':
        this.speak('Tachycardia alert simulated');
        break;
      case 'STERILE_FREEZE':
        this.speak('Sterile freeze engaged');
        break;
      case 'STERILE_UNFREEZE':
        this.speak('Sterile field unlocked');
        break;
      case 'OPEN_AUDIT_LOG':
        this.speak('Opening audit log');
        break;
      case 'SHOW_HELP':
        this.speak('Showing commands guide');
        break;
    }
  }

  // Listener subscriptions
  public onCommand(cb: VoiceCommandListener) {
    this.commandListeners.push(cb);
  }

  public removeCommandListener(cb: VoiceCommandListener) {
    this.commandListeners = this.commandListeners.filter((c) => c !== cb);
  }

  public onStatus(cb: VoiceStatusListener) {
    this.statusListeners.push(cb);
  }

  public onTranscript(cb: VoiceTranscriptListener) {
    this.transcriptListeners.push(cb);
  }

  private emitCommand(result: VoiceCommandResult) {
    this.commandListeners.forEach((cb) => {
      try {
        cb(result);
      } catch (err) {
        console.error('Command listener error:', err);
      }
    });
  }

  private emitStatus() {
    const status = this.getStatus();
    this.statusListeners.forEach((cb) => {
      try {
        cb(status);
      } catch (err) {
        console.error('Status listener error:', err);
      }
    });
  }

  private emitTranscript(transcript: string, isFinal: boolean) {
    this.transcriptListeners.forEach((cb) => {
      try {
        cb(transcript, isFinal);
      } catch (err) {
        console.error('Transcript listener error:', err);
      }
    });
  }
}

export const voiceAssistantService = new VoiceAssistantService();
