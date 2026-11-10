import assert from 'node:assert';
import { VoiceAssistantService } from '../src/services/voiceAssistant.ts';

console.log('--- RUNNING STERILETOUCH VOICE ASSISTANT INTENT PARSER SUITE ---');

const assistant = new VoiceAssistantService();

// Test suite for Clinical Voice Intent Parsing
const testCases = [
  // 1. Radiology Slice Navigation
  { input: 'next slice', expectedIntent: 'NEXT_SLICE' },
  { input: 'advance', expectedIntent: 'NEXT_SLICE' },
  { input: 'previous slice', expectedIntent: 'PREV_SLICE' },
  { input: 'slice down', expectedIntent: 'PREV_SLICE' },
  { input: 'go to slice 18', expectedIntent: 'GO_TO_SLICE', expectedParam: { key: 'sliceNumber', value: 18 } },
  { input: 'show slice 5', expectedIntent: 'GO_TO_SLICE', expectedParam: { key: 'sliceNumber', value: 5 } },

  // 2. Zoom & Pan
  { input: 'zoom in', expectedIntent: 'ZOOM_IN' },
  { input: 'magnify', expectedIntent: 'ZOOM_IN' },
  { input: 'zoom out', expectedIntent: 'ZOOM_OUT' },
  { input: 'reset view', expectedIntent: 'RESET_VIEW' },
  { input: 'center scan', expectedIntent: 'RESET_VIEW' },

  // 3. Window / Level Presets (including single-word commands)
  { input: 'bone window', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'BONE' } },
  { input: 'show bones', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'BONE' } },
  { input: 'bone', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'BONE' } },
  { input: 'soft tissue', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'SOFT_TISSUE' } },
  { input: 'tissue', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'SOFT_TISSUE' } },
  { input: 'lung window', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'LUNG' } },
  { input: 'lungs', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'LUNG' } },
  { input: 'invert contrast', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'INVERT' } },
  { input: 'invert', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'INVERT' } },

  // 4. Caliper & AI Findings
  { input: 'measure', expectedIntent: 'TOGGLE_CALIPER' },
  { input: 'caliper', expectedIntent: 'TOGGLE_CALIPER' },
  { input: 'clear measurements', expectedIntent: 'CLEAR_CALIPER' },
  { input: 'toggle ai findings', expectedIntent: 'TOGGLE_AI_FINDINGS' },

  // 5. Navigation & "Go back to radiology/ct suite"
  { input: 'open checklist', expectedIntent: 'NAV_CHECKLIST' },
  { input: 'open vitals', expectedIntent: 'NAV_VITALS' },
  { input: 'open patient records', expectedIntent: 'NAV_RECORDS' },
  { input: 'open radiology', expectedIntent: 'NAV_RADIOLOGY' },
  { input: 'go back to radiology', expectedIntent: 'NAV_RADIOLOGY' },
  { input: 'return to ct suite', expectedIntent: 'NAV_RADIOLOGY' },
  { input: 'ct suite', expectedIntent: 'NAV_RADIOLOGY' },
  { input: 'radiology', expectedIntent: 'NAV_RADIOLOGY' },

  // 6. Patient Switcher & Navigation
  { input: 'switch to case 2', expectedIntent: 'SWITCH_PATIENT', expectedParam: { key: 'patientIndex', value: 2 } },
  { input: 'next patient', expectedIntent: 'NEXT_PATIENT' },
  { input: 'next case', expectedIntent: 'NEXT_PATIENT' },
  { input: 'previous patient', expectedIntent: 'PREV_PATIENT' },

  // 7. WHO Checklist Phases & Sign-Off
  { input: 'open phase 1', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'SIGN_IN' } },
  { input: 'sign in', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'SIGN_IN' } },
  { input: 'time out', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'TIME_OUT' } },
  { input: 'open phase 2', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'TIME_OUT' } },
  { input: 'phase 3 in who checklist', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'SIGN_OUT' } },
  { input: 'sign out', expectedIntent: 'SELECT_CHECKLIST_PHASE', expectedParam: { key: 'phase', value: 'SIGN_OUT' } },
  { input: 'sign off', expectedIntent: 'SIGN_OFF_CHECKLIST' },
  { input: 'verify time out', expectedIntent: 'SIGN_OFF_CHECKLIST' },

  // 8. Gestures Help & Modal Dismissal
  { input: 'open gestures', expectedIntent: 'SHOW_HELP' },
  { input: 'show gestures', expectedIntent: 'SHOW_HELP' },
  { input: 'gestures', expectedIntent: 'SHOW_HELP' },
  { input: 'close guide', expectedIntent: 'CLOSE_MODAL' },
  { input: 'close modal', expectedIntent: 'CLOSE_MODAL' },
  { input: 'dismiss', expectedIntent: 'CLOSE_MODAL' },
  { input: 'fullscreen', expectedIntent: 'TOGGLE_FULLSCREEN' },

  // 9. Alarms & Sterile Field Control
  { input: 'silence alarm', expectedIntent: 'SILENCE_ALARM' },
  { input: 'acknowledge alarm', expectedIntent: 'SILENCE_ALARM' },
  { input: 'simulate emergency', expectedIntent: 'SIMULATE_EMERGENCY' },
  { input: 'sterile freeze', expectedIntent: 'STERILE_FREEZE' },
  { input: 'freeze screen', expectedIntent: 'STERILE_FREEZE' },
  { input: 'unlock screen', expectedIntent: 'STERILE_UNFREEZE' },

  // 10. Wake-Word Prefixed Commands
  { input: 'sterile, next slice', expectedIntent: 'NEXT_SLICE' },
  { input: 'sterile zoom in', expectedIntent: 'ZOOM_IN' },
  { input: 'computer, bone window', expectedIntent: 'SET_WINDOW_PRESET', expectedParam: { key: 'preset', value: 'BONE' } },
  { input: 'steriletouch silence alarm', expectedIntent: 'SILENCE_ALARM' },

  // 11. DICOM Uploader & PACS Inspector
  { input: 'upload scan', expectedIntent: 'OPEN_UPLOAD_MODAL' },
  { input: 'import dicom', expectedIntent: 'OPEN_UPLOAD_MODAL' },
  { input: 'show metadata', expectedIntent: 'TOGGLE_METADATA_DRAWER' },
  { input: 'pacs tags', expectedIntent: 'TOGGLE_METADATA_DRAWER' },

  // 12. Unknown/Ambient conversation
  { input: 'pass me the scalpels please', expectedIntent: 'UNKNOWN' },
];

let passedCount = 0;

testCases.forEach((tc, idx) => {
  const res = assistant.parseIntent(tc.input);
  assert.strictEqual(
    res.intent,
    tc.expectedIntent,
    `Test #${idx + 1} Failed for input "${tc.input}": Expected ${tc.expectedIntent}, Got ${res.intent}`
  );

  if (tc.expectedParam) {
    assert.strictEqual(
      res.params?.[tc.expectedParam.key],
      tc.expectedParam.value,
      `Param mismatch for input "${tc.input}": Expected ${tc.expectedParam.key}=${tc.expectedParam.value}, Got ${res.params?.[tc.expectedParam.key]}`
    );
  }

  passedCount++;
  console.log(`✓ Test #${idx + 1} Passed: "${tc.input}" -> [${res.intent}]`);
});

console.log(`\nALL ${passedCount} VOICE INTENT AUTOMATED TESTS PASSED SUCCESSFULLY! 🎙️🚀`);
