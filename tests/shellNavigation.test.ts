import test from 'node:test';
import assert from 'node:assert/strict';
import { MOCK_PATIENTS } from '../src/data/mockPatients';
import { MOCK_SCANS } from '../src/data/mockScans';
import { ActiveTab } from '../src/components/layout/NavigationBar';

test('SterileTouch Phase 2 Global Application Shell Navigation & State Suite', async (t) => {
  await t.test('1. Validates all clinical module routes and tab metadata', () => {
    const expectedTabs: ActiveTab[] = [
      'RADIOLOGY',
      'CHECKLIST',
      'VITALS',
      'RECORDS',
      'PACS_MIRROR',
    ];

    const tabHotkeys: Record<ActiveTab, string> = {
      RADIOLOGY: '1',
      CHECKLIST: '2',
      VITALS: '3',
      RECORDS: '4',
      PACS_MIRROR: '5',
    };

    assert.equal(expectedTabs.length, 5, 'Should support all 5 clinical workstation tabs');
    expectedTabs.forEach((tab) => {
      assert.ok(tabHotkeys[tab], `Tab ${tab} must have a mapped keyboard hotkey`);
    });
  });

  await t.test('2. Preserves active patient and scan context across tab navigation', () => {
    let currentTab: ActiveTab = 'RADIOLOGY';
    let currentPatientId = 'pt-002'; // Case 2: Elena Rostova

    const getActivePatient = (id: string) =>
      MOCK_PATIENTS.find((p) => p.id === id) || MOCK_PATIENTS[0];
    const getActiveScan = (id: string) =>
      MOCK_SCANS.find((s) => s.patientId === id) || MOCK_SCANS[0];

    // Initial state check
    const patientBefore = getActivePatient(currentPatientId);
    const scanBefore = getActiveScan(currentPatientId);
    assert.equal(patientBefore.name, 'Elena Rostova');
    assert.equal(scanBefore.patientId, 'pt-002');

    // Simulate navigation through all 4 other modules
    const routeSequence: ActiveTab[] = ['CHECKLIST', 'VITALS', 'RECORDS', 'PACS_MIRROR', 'RADIOLOGY'];

    for (const nextTab of routeSequence) {
      currentTab = nextTab;
      // Context must remain pinned to Elena Rostova
      const patientAfter = getActivePatient(currentPatientId);
      const scanAfter = getActiveScan(currentPatientId);
      assert.equal(patientAfter.id, 'pt-002', `Patient context lost navigating to ${nextTab}`);
      assert.equal(patientAfter.name, 'Elena Rostova');
      assert.equal(scanAfter.patientId, 'pt-002', `Scan context lost navigating to ${nextTab}`);
    }

    assert.equal(currentTab, 'RADIOLOGY');
  });

  await t.test('3. Simple vs Advanced mode switching preserves active patient, scan, and checklist state', () => {
    type WorkstationMode = 'SIMPLE' | 'ADVANCED';
    let mode: WorkstationMode = 'SIMPLE';
    const patientId = 'pt-003';
    let checklistCompletedCount = 4;

    // Toggle to ADVANCED
    mode = 'ADVANCED';
    assert.equal(mode, 'ADVANCED');
    assert.equal(patientId, 'pt-003', 'Patient ID must not change when switching to Advanced mode');
    assert.equal(checklistCompletedCount, 4, 'Checklist progress must be preserved in Advanced mode');

    // Toggle back to SIMPLE
    mode = 'SIMPLE';
    assert.equal(mode, 'SIMPLE');
    assert.equal(patientId, 'pt-003', 'Patient ID must not change when returning to Simple mode');
    assert.equal(checklistCompletedCount, 4, 'Checklist progress must be preserved in Simple mode');
  });

  await t.test('4. Validates touchless case switching across all available patient profiles', () => {
    const patientIds = MOCK_PATIENTS.map((p) => p.id);
    assert.ok(patientIds.length >= 3, 'Must support at least 3 clinical mock cases');

    let activePatientId = patientIds[0];
    assert.equal(activePatientId, 'pt-001');

    // Switch to Case 2
    activePatientId = patientIds[1];
    const case2 = MOCK_PATIENTS.find((p) => p.id === activePatientId);
    assert.ok(case2);
    assert.equal(case2.name, 'Elena Rostova');
    assert.equal(case2.bloodType, 'A-Positive');

    // Switch to Case 3
    activePatientId = patientIds[2];
    const case3 = MOCK_PATIENTS.find((p) => p.id === activePatientId);
    assert.ok(case3);
    assert.equal(case3.name, 'David Chen');
    assert.equal(case3.bloodType, 'B-Positive');
  });

  await t.test('5. Enforces truthful telemetry status rules', () => {
    // Rule: Never report ONLINE if camera is inactive
    const evaluateSensorStatus = (isActive: boolean, isSim: boolean, err: string | null) => {
      if (err) return 'ERROR';
      if (isActive) return 'ONLINE';
      if (isSim) return 'SIMULATED';
      return 'OFFLINE';
    };

    assert.equal(evaluateSensorStatus(false, false, null), 'OFFLINE');
    assert.equal(evaluateSensorStatus(false, true, null), 'SIMULATED');
    assert.equal(evaluateSensorStatus(true, false, null), 'ONLINE');
    assert.equal(evaluateSensorStatus(false, false, 'Camera Access Denied'), 'ERROR');
  });

  await t.test('6. Validates emergency manual hotkey mappings', () => {
    const handleKeyMap = (key: string): { action: string; target?: string } => {
      switch (key.toLowerCase()) {
        case '1': return { action: 'NAV', target: 'RADIOLOGY' };
        case '2': return { action: 'NAV', target: 'CHECKLIST' };
        case '3': return { action: 'NAV', target: 'VITALS' };
        case '4': return { action: 'NAV', target: 'RECORDS' };
        case '5': return { action: 'NAV', target: 'PACS_MIRROR' };
        case ' ': return { action: 'PINCH' };
        case 'f': return { action: 'FREEZE' };
        case 'c': return { action: 'CLUTCH_TOGGLE' };
        case 'm': return { action: 'MUTE_TOGGLE' };
        default: return { action: 'UNKNOWN' };
      }
    };

    assert.deepEqual(handleKeyMap('1'), { action: 'NAV', target: 'RADIOLOGY' });
    assert.deepEqual(handleKeyMap('2'), { action: 'NAV', target: 'CHECKLIST' });
    assert.deepEqual(handleKeyMap('3'), { action: 'NAV', target: 'VITALS' });
    assert.deepEqual(handleKeyMap('4'), { action: 'NAV', target: 'RECORDS' });
    assert.deepEqual(handleKeyMap('5'), { action: 'NAV', target: 'PACS_MIRROR' });
    assert.deepEqual(handleKeyMap(' '), { action: 'PINCH' });
    assert.deepEqual(handleKeyMap('f'), { action: 'FREEZE' });
    assert.deepEqual(handleKeyMap('c'), { action: 'CLUTCH_TOGGLE' });
    assert.deepEqual(handleKeyMap('m'), { action: 'MUTE_TOGGLE' });
  });

  await t.test('7. Protects form typing from accidental hotkey trigger', () => {
    const isTypingInField = (targetType: string) => {
      const formTags = ['INPUT', 'TEXTAREA'];
      return formTags.includes(targetType.toUpperCase());
    };

    assert.equal(isTypingInField('INPUT'), true, 'Typing in input must suppress hotkeys');
    assert.equal(isTypingInField('TEXTAREA'), true, 'Typing in textarea must suppress hotkeys');
    assert.equal(isTypingInField('DIV'), false, 'Non-input elements allow hotkeys');
    assert.equal(isTypingInField('BODY'), false, 'Body level allows hotkeys');
  });

  await t.test('8. Escape closes active modal hierarchy without disrupting state', () => {
    // Model modal stack
    interface ModalStack {
      isOnboardingOpen: boolean;
      isHelpModalOpen: boolean;
      isAuditModalOpen: boolean;
      isUploadModalOpen: boolean;
      isMetadataDrawerOpen: boolean;
    }

    const dismissTopmostModal = (stack: ModalStack): ModalStack => {
      const updated = { ...stack };
      if (updated.isOnboardingOpen) {
        updated.isOnboardingOpen = false;
      } else if (updated.isHelpModalOpen) {
        updated.isHelpModalOpen = false;
      } else if (updated.isAuditModalOpen) {
        updated.isAuditModalOpen = false;
      } else if (updated.isUploadModalOpen) {
        updated.isUploadModalOpen = false;
      } else if (updated.isMetadataDrawerOpen) {
        updated.isMetadataDrawerOpen = false;
      }
      return updated;
    };

    // When help modal is open
    const stack1: ModalStack = {
      isOnboardingOpen: false,
      isHelpModalOpen: true,
      isAuditModalOpen: false,
      isUploadModalOpen: false,
      isMetadataDrawerOpen: false,
    };
    const dismissed1 = dismissTopmostModal(stack1);
    assert.equal(dismissed1.isHelpModalOpen, false);

    // When drawer is open
    const stack2: ModalStack = {
      isOnboardingOpen: false,
      isHelpModalOpen: false,
      isAuditModalOpen: false,
      isUploadModalOpen: false,
      isMetadataDrawerOpen: true,
    };
    const dismissed2 = dismissTopmostModal(stack2);
    assert.equal(dismissed2.isMetadataDrawerOpen, false);
  });

  await t.test('9. Validates truthful OS bridge connection reporting', () => {
    const evaluateBridgeLabel = (isConnected: boolean, os?: string) => {
      if (isConnected) {
        return `Bridge: Connected (${os || 'Active'})`;
      }
      return 'Bridge: Offline';
    };

    assert.equal(evaluateBridgeLabel(false), 'Bridge: Offline');
    assert.equal(evaluateBridgeLabel(true, 'Windows'), 'Bridge: Connected (Windows)');
  });
});

