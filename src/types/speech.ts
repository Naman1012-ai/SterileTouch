export type VoiceCommandIntent =
  | 'NEXT_SLICE'
  | 'PREV_SLICE'
  | 'GO_TO_SLICE'
  | 'ZOOM_IN'
  | 'ZOOM_OUT'
  | 'RESET_VIEW'
  | 'SET_WINDOW_PRESET'
  | 'TOGGLE_CALIPER'
  | 'CLEAR_CALIPER'
  | 'TOGGLE_AI_FINDINGS'
  | 'NAV_RADIOLOGY'
  | 'NAV_CHECKLIST'
  | 'SELECT_CHECKLIST_PHASE'
  | 'NAV_VITALS'
  | 'NAV_RECORDS'
  | 'NAV_PACS'
  | 'SWITCH_PATIENT'
  | 'NEXT_PATIENT'
  | 'PREV_PATIENT'
  | 'SIGN_OFF_CHECKLIST'
  | 'OPEN_AUDIT_LOG'
  | 'SILENCE_ALARM'
  | 'SIMULATE_EMERGENCY'
  | 'STERILE_FREEZE'
  | 'STERILE_UNFREEZE'
  | 'TOGGLE_AUDIO'
  | 'SHOW_HELP'
  | 'CLOSE_MODAL'
  | 'TOGGLE_FULLSCREEN'
  | 'OPEN_UPLOAD_MODAL'
  | 'TOGGLE_METADATA_DRAWER'
  | 'VIEW_MODE_2D'
  | 'VIEW_MODE_3D'
  | 'VIEW_MODE_SPLIT'
  | 'RESET_3D_VIEW'
  | 'TOGGLE_3D_HOLO'
  | 'OPEN_TUTORIAL'
  | 'CLUTCH_ENGAGE'
  | 'CLUTCH_STANDBY'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  intent: VoiceCommandIntent;
  rawTranscript: string;
  matchedPhrase: string;
  params?: Record<string, string | number>;
  confidence: number;
  isInterimMatch?: boolean;
}

export type VoiceRecognitionState =
  | 'IDLE'
  | 'LISTENING'
  | 'PROCESSING'
  | 'EXECUTED'
  | 'ERROR'
  | 'UNSUPPORTED';

export interface VoiceAssistantStatus {
  state: VoiceRecognitionState;
  isListening: boolean;
  isSpeaking: boolean;
  speechResponseEnabled: boolean;
  lastTranscript: string;
  lastCommand: VoiceCommandResult | null;
  errorMessage: string | null;
}

// Global browser SpeechRecognition declarations
export interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: { error: string; message?: string }) => void) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: any) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => IWindowSpeechRecognition;
    webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
  }
}
