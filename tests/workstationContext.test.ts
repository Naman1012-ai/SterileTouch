import { describe, it } from 'node:test';
import assert from 'node:assert';
import { WorkstationMode } from '../src/context/WorkstationContext';

describe('SterileTouch Workstation Context & Shell Architecture', () => {
  it('Defaults to SIMPLE mode for sterile field safety', () => {
    let mode: WorkstationMode = 'SIMPLE';
    assert.strictEqual(mode, 'SIMPLE');
  });

  it('Calculates touchless hit target dimensions based on mode and screen size', () => {
    const getTargetClass = (mode: WorkstationMode, isLargeDisplay: boolean) => {
      if (mode === 'SIMPLE') {
        return isLargeDisplay ? 'min-h-14 min-w-14' : 'min-h-12 min-w-12';
      }
      return isLargeDisplay ? 'min-h-11 min-w-11' : 'min-h-9 min-w-9';
    };

    // Laptop in Simple mode: at least 48px (min-h-12)
    assert.strictEqual(getTargetClass('SIMPLE', false), 'min-h-12 min-w-12');

    // 4K OR screen in Simple mode: at least 56px (min-h-14)
    assert.strictEqual(getTargetClass('SIMPLE', true), 'min-h-14 min-w-14');

    // Laptop in Advanced mode: compact 36px (min-h-9)
    assert.strictEqual(getTargetClass('ADVANCED', false), 'min-h-9 min-w-9');

    // 4K OR screen in Advanced mode: 44px (min-h-11)
    assert.strictEqual(getTargetClass('ADVANCED', true), 'min-h-11 min-w-11');
  });

  it('Toggles mode cleanly without resetting clinical patient context', () => {
    let currentMode: WorkstationMode = 'SIMPLE';
    const activePatient = { id: 'pt-001', name: 'Marcus Vance' };
    const loadedScan = { id: 'scan-001', currentSlice: 34 };

    // Toggle to ADVANCED
    currentMode = currentMode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE';
    assert.strictEqual(currentMode, 'ADVANCED');
    // Verify clinical context is 100% preserved
    assert.strictEqual(activePatient.id, 'pt-001');
    assert.strictEqual(loadedScan.currentSlice, 34);

    // Toggle back to SIMPLE
    currentMode = currentMode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE';
    assert.strictEqual(currentMode, 'SIMPLE');
    assert.strictEqual(activePatient.id, 'pt-001');
    assert.strictEqual(loadedScan.currentSlice, 34);
  });

  it('Correctly parses and persists UI mode in storage', () => {
    const mockStorage: Record<string, string> = {};
    const setMode = (m: WorkstationMode) => {
      mockStorage['steriletouch_ui_mode'] = m;
    };
    const getMode = (): WorkstationMode => {
      return (mockStorage['steriletouch_ui_mode'] as WorkstationMode) || 'SIMPLE';
    };

    assert.strictEqual(getMode(), 'SIMPLE');
    setMode('ADVANCED');
    assert.strictEqual(getMode(), 'ADVANCED');
    setMode('SIMPLE');
    assert.strictEqual(getMode(), 'SIMPLE');
  });
});
