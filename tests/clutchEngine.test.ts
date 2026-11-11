import { describe, it } from 'node:test';
import assert from 'node:assert';
import { CursorManager } from '../src/services/cursorManager';

describe('SterileTouch Midas Touch & Surgical Clutch Engine', () => {
  it('Initializes in STANDBY state without unintentional hovering', () => {
    const manager = new CursorManager();
    const initial = manager.getState();
    assert.strictEqual(initial.clutchState, 'STANDBY');
    assert.strictEqual(initial.isHovering, false);
    assert.strictEqual(initial.hoverProgress, 0);
  });

  it('Suppresses DOM clicks and hovers while in STANDBY mode', () => {
    const manager = new CursorManager();
    let clickFired = false;
    manager.addClickListener(() => {
      clickFired = true;
    });

    // Update in STANDBY with point gesture
    const state = manager.update({ x: 0.5, y: 0.5 }, false, false, true, 1.0);
    assert.strictEqual(state.clutchState, 'STANDBY');
    assert.strictEqual(state.isHovering, false);
    assert.strictEqual(clickFired, false, 'Click must not fire in STANDBY');
  });

  it('Transitions from STANDBY to ENGAGED upon explicit hold or toggle', () => {
    const manager = new CursorManager();
    assert.strictEqual(manager.getState().clutchState, 'STANDBY');

    // Manually engage or toggle clutch
    manager.toggleClutch();
    assert.strictEqual(manager.getState().clutchState, 'ENGAGED');

    // Clutched freeze toggle
    manager.toggleClutch();
    assert.strictEqual(manager.getState().clutchState, 'CLUTCHED');
    assert.strictEqual(manager.getState().isFrozen, true);

    // Re-engage
    manager.toggleClutch();
    assert.strictEqual(manager.getState().clutchState, 'ENGAGED');
    assert.strictEqual(manager.getState().isFrozen, false);
  });

  it('Disengages to STANDBY when hand drops below chest line (normalizedY > 0.88)', () => {
    const manager = new CursorManager();
    manager.setClutchState('ENGAGED');
    assert.strictEqual(manager.getState().clutchState, 'ENGAGED');

    // Hand drops below chest (y = 0.92)
    const state = manager.update({ x: 0.5, y: 0.92 }, false, false, true, 1.0);
    assert.strictEqual(state.clutchState, 'STANDBY', 'Must disengage when dropping hands below chest');
  });

  it('Locks into CLUTCHED state upon Fist (Sterile Freeze)', () => {
    const manager = new CursorManager();
    manager.setClutchState('ENGAGED');

    // Clench fist
    const state = manager.update({ x: 0.5, y: 0.5 }, false, true, true, 1.0);
    assert.strictEqual(state.clutchState, 'CLUTCHED');
    assert.strictEqual(state.isFrozen, true);
  });
});
