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

  // Fast-trigger interim tracking & debounce
  private lastExecutedIntent: VoiceCommandIntent | null = null;
  private lastExecutedPhrase: string = '';
  private lastExecutedTime: number = 0;
  private readonly FAST_TRIGGER_DEBOUNCE_MS: number = 850;

  // SpeechSynthesis voice selection cache
  private preferredVoice: SpeechSynthesisVoice | null = null;

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

      // Initialize SpeechSynthesis voices
      if (window.speechSynthesis) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  private loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Look for high-quality natural English voices
        this.preferredVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('en') &&
              (v.name.includes('Natural') ||
                v.name.includes('Google') ||
                v.name.includes('Jenny') ||
                v.name.includes('David') ||
                v.name.includes('Samantha') ||
                v.name.includes('Zira'))
          ) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;
      }
    } catch (e) {
      console.warn('Voice loading error:', e);
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

        // FAST-TRIGGER: Evaluate intent on every speech chunk (<50ms execution)
        const recognized = this.parseIntent(currentText);
        const now = performance.now();

        if (recognized.intent !== 'UNKNOWN') {
          const isSameCommand =
            this.lastExecutedIntent === recognized.intent &&
            (this.lastExecutedPhrase === recognized.matchedPhrase ||
              now - this.lastExecutedTime < this.FAST_TRIGGER_DEBOUNCE_MS);

          if (!isSameCommand) {
            this.lastExecutedIntent = recognized.intent;
            this.lastExecutedPhrase = recognized.matchedPhrase;
            this.lastExecutedTime = now;
            recognized.isInterimMatch = !finalTranscript;

            this.executeCommand(recognized);
          }
        }
      };

      this.recognition.onerror = (event: { error: string; message?: string }) => {
        if (event.error !== 'no-speech') {
          console.warn('Voice recognition error:', event.error);
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
            setTimeout(() => {
              if (this.isListening) {
                try {
                  this.recognition?.start();
                } catch {}
              }
            }, 250);
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
    if (enabled) {
      this.speak('Voice responses enabled');
    }
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

  // EXPANSIVE CLINICAL INTENT PARSER & SYNONYM MATCHER
  public parseIntent(raw: string): VoiceCommandResult {
    let clean = raw.toLowerCase().trim();

    // Strip wake words if present (surgeons can speak directly or use wake word)
    clean = clean
      .replace(/^(sterile|steriletouch|computer|doctor|terminal|assistant)[,\s]+/i, '')
      .trim();

    let intent: VoiceCommandIntent = 'UNKNOWN';
    let matchedPhrase = clean;
    const params: Record<string, string | number> = {};
    let confidence = 0.92;

    // 1. Radiology Slice Navigation
    if (
      /^(next slice|next image|slice up|next|advance)$/i.test(clean) ||
      clean.includes('next slice')
    ) {
      intent = 'NEXT_SLICE';
    } else if (
      /^(previous slice|prev slice|slice down|back|previous)$/i.test(clean) ||
      clean.includes('previous slice')
    ) {
      intent = 'PREV_SLICE';
    } else if (/(?:go to|show|slice|layer)\s+(\d+)/i.test(clean)) {
      const match = clean.match(/(?:go to|show|slice|layer)\s+(\d+)/i);
      if (match) {
        intent = 'GO_TO_SLICE';
        params.sliceNumber = parseInt(match[1], 10);
      }
    }

    // 2. Zoom & Pan
    else if (
      /^(zoom in|enlarge|magnify|closer|zoom in scan)$/i.test(clean) ||
      clean.includes('zoom in')
    ) {
      intent = 'ZOOM_IN';
    } else if (
      /^(zoom out|smaller|shrink|step back|zoom out scan)$/i.test(clean) ||
      clean.includes('zoom out')
    ) {
      intent = 'ZOOM_OUT';
    } else if (
      /^(reset view|reset zoom|center scan|center|reset)$/i.test(clean) ||
      clean.includes('reset view')
    ) {
      intent = 'RESET_VIEW';
    }

    // 3. Caliper & Measurements (check CLEAR before MEASURE)
    else if (
      /(clear measurements|clear caliper|delete measurements|clear ruler|delete caliper)/i.test(
        clean
      )
    ) {
      intent = 'CLEAR_CALIPER';
    } else if (
      /(measure lesion|measure fracture|measure|caliper tool|caliper|ruler tool|toggle caliper|ruler)/i.test(
        clean
      )
    ) {
      intent = 'TOGGLE_CALIPER';
    }

    // 4. Window / Level Filters (allow single-word presets: "bone", "lungs", "tissue", "invert")
    else if (/(bone window|bone contrast|show bones|bones|bone filter|\bbone\b)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'BONE';
    } else if (
      /(soft tissue window|soft tissue|brain window|tissue contrast|\btissue\b)/i.test(clean)
    ) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'SOFT_TISSUE';
    } else if (/(lung window|show lungs|lungs|lung filter|\blung\b)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'LUNG';
    } else if (/(invert contrast|invert colors|negative view|\binvert\b)/i.test(clean)) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'INVERT';
    } else if (
      /(default window|normal contrast|reset contrast|default contrast|\bdefault\b)/i.test(clean)
    ) {
      intent = 'SET_WINDOW_PRESET';
      params.preset = 'DEFAULT';
    }

    // 5. AI Findings
    else if (
      /(toggle ai|ai findings|show findings|hide findings|ai detections|ai detection)/i.test(clean)
    ) {
      intent = 'TOGGLE_AI_FINDINGS';
    }

    // 6. WHO Checklist Verification Sign-Off
    else if (
      /(sign off|sign checklist|verify time out|confirm time out|verify checklist|confirm checklist|check item|verify item|confirm item)/i.test(
        clean
      )
    ) {
      intent = 'SIGN_OFF_CHECKLIST';
    } else if (/(open audit log|view audit trail|show audit|audit log|audit trail)/i.test(clean)) {
      intent = 'OPEN_AUDIT_LOG';
    }

    // 7. WHO Checklist Phases (e.g. "open phase 1", "phase 3 in who checklist", "sign in", "time out")
    else if (
      /(open phase 1|show phase 1|switch to phase 1|phase 1 in who checklist|phase 1 in checklist|\bphase 1\b|\bphase one\b|sign in phase|sign in tab|\bsign in\b)/i.test(
        clean
      )
    ) {
      intent = 'SELECT_CHECKLIST_PHASE';
      params.phase = 'SIGN_IN';
    } else if (
      /(open phase 2|show phase 2|switch to phase 2|phase 2 in who checklist|phase 2 in checklist|\bphase 2\b|\bphase two\b|time out phase|time out tab|\btime out\b)/i.test(
        clean
      )
    ) {
      intent = 'SELECT_CHECKLIST_PHASE';
      params.phase = 'TIME_OUT';
    } else if (
      /(open phase 3|show phase 3|switch to phase 3|phase 3 in who checklist|phase 3 in checklist|\bphase 3\b|\bphase three\b|sign out phase|sign out tab|\bsign out\b)/i.test(
        clean
      )
    ) {
      intent = 'SELECT_CHECKLIST_PHASE';
      params.phase = 'SIGN_OUT';
    }

    // 8. Navigation Tabs & "Go Back To Radiology / CT Suite"
    else if (
      /(go back to radiology|return to radiology|go back to ct|return to ct|go back to scan|open radiology|show ct|show scan|radiology view|radiology suite|open imaging|imaging suite|\bradiology\b|ct suite)/i.test(
        clean
      )
    ) {
      intent = 'NAV_RADIOLOGY';
    } else if (
      /(open checklist|surgical checklist|safety checklist|who checklist|\bchecklist\b)/i.test(
        clean
      )
    ) {
      intent = 'NAV_CHECKLIST';
    } else if (
      /(open vitals|show monitor|ecg monitor|cardiac vitals|vitals hud|vitals monitor|\bvitals\b)/i.test(
        clean
      )
    ) {
      intent = 'NAV_VITALS';
    } else if (
      /(open patient records|show labs|patient chart|medical records|show ehr|patient records|\blabs\b|\brecords\b)/i.test(
        clean
      )
    ) {
      intent = 'NAV_RECORDS';
    }

    // 9. Gestures Help & Modal Dismissal (e.g. "open gestures", "show gestures", "close guide")
    else if (
      /(open gestures|show gestures|gestures guide|gestures help|open help|show help|command guide|\bhelp\b|\bgestures\b|shortcuts)/i.test(
        clean
      )
    ) {
      intent = 'SHOW_HELP';
    } else if (
      /(close guide|close modal|close gestures|close audit|dismiss modal|dismiss guide|\bdismiss\b|exit modal|\bclose\b|hide guide)/i.test(
        clean
      )
    ) {
      intent = 'CLOSE_MODAL';
    }

    // 10. Patient Switcher
    else if (/(next patient|next case)/i.test(clean)) {
      intent = 'NEXT_PATIENT';
    } else if (/(previous patient|prev patient|previous case|prev case)/i.test(clean)) {
      intent = 'PREV_PATIENT';
    } else if (/(case 1|patient 1|first case|marcus)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 1;
    } else if (/(case 2|patient 2|second case|elena)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 2;
    } else if (/(case 3|patient 3|third case|david)/i.test(clean)) {
      intent = 'SWITCH_PATIENT';
      params.patientIndex = 3;
    }

    // 11. Vitals & Cardiac Alarms
    else if (
      /(silence alarm|mute alarm|acknowledge alarm|dismiss alarm|cancel alarm|stop alarm|\bsilence\b)/i.test(
        clean
      )
    ) {
      intent = 'SILENCE_ALARM';
    } else if (
      /(simulate emergency|simulate tachycardia|trigger alarm|emergency simulation|\btachycardia\b)/i.test(
        clean
      )
    ) {
      intent = 'SIMULATE_EMERGENCY';
    }

    // 12. Sterile Freeze
    else if (/(unfreeze|unlock screen|unlock cursor|resume interaction|\bunlock\b)/i.test(clean)) {
      intent = 'STERILE_UNFREEZE';
    } else if (/(sterile freeze|freeze screen|lock screen|lock cursor|\bfreeze\b)/i.test(clean)) {
      intent = 'STERILE_FREEZE';
    }

    // 13. System Utilities
    else if (/(mute audio|unmute audio|toggle sound|mute sound)/i.test(clean)) {
      intent = 'TOGGLE_AUDIO';
    } else if (/(full screen|fullscreen|toggle fullscreen|exit fullscreen)/i.test(clean)) {
      intent = 'TOGGLE_FULLSCREEN';
    }

    return {
      intent,
      rawTranscript: raw,
      matchedPhrase,
      params,
      confidence,
    };
  }

  private executeCommand(result: VoiceCommandResult) {
    this.lastCommand = result;
    audioService.playClick();
    this.provideVerbalConfirmation(result);
    this.emitCommand(result);
    this.emitStatus();
  }

  // ROBUST SPEECH SYNTHESIS ENGINE (Audio Unlock + Auto-Resume)
  public speak(text: string) {
    if (!this.speechResponseEnabled || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    try {
      // Chrome/Edge auto-unfreeze
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      // Ensure voices are populated
      if (!this.preferredVoice) {
        this.loadVoices();
      }

      window.speechSynthesis.cancel(); // clear previous speech queue

      const utterance = new SpeechSynthesisUtterance(text);
      if (this.preferredVoice) {
        utterance.voice = this.preferredVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      this.isSpeaking = true;
      this.emitStatus();

      utterance.onend = () => {
        this.isSpeaking = false;
        this.emitStatus();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis utterance error:', e);
        this.isSpeaking = false;
        this.emitStatus();
      };

      // Slight micro-timeout prevents Chrome cancellation race condition
      setTimeout(() => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (innerErr) {
          console.warn('SpeechSynthesis speak failed:', innerErr);
        }
      }, 20);
    } catch (err) {
      console.warn('Speech synthesis outer error:', err);
    }
  }

  private provideVerbalConfirmation(result: VoiceCommandResult) {
    if (!this.speechResponseEnabled) return;

    switch (result.intent) {
      case 'NEXT_SLICE':
      case 'PREV_SLICE':
        // Fast tick is sufficient for slice navigation
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
      case 'SELECT_CHECKLIST_PHASE': {
        const p = result.params?.phase;
        const name =
          p === 'SIGN_IN' ? 'Sign In' : p === 'TIME_OUT' ? 'Time Out' : 'Sign Out';
        this.speak(`Phase ${name} active`);
        break;
      }
      case 'NAV_VITALS':
        this.speak('Vitals monitor');
        break;
      case 'NAV_RECORDS':
        this.speak('Patient records');
        break;
      case 'SWITCH_PATIENT':
        this.speak(`Case ${result.params?.patientIndex} loaded`);
        break;
      case 'NEXT_PATIENT':
        this.speak('Next patient loaded');
        break;
      case 'PREV_PATIENT':
        this.speak('Previous patient loaded');
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
        this.speak('Commands guide');
        break;
      case 'CLOSE_MODAL':
        this.speak('Dismissed');
        break;
      case 'TOGGLE_FULLSCREEN':
        this.speak('Fullscreen toggled');
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
