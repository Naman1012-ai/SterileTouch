import { ClutchState, EngagementMode, Point2D, VirtualCursorState } from '../types/gestures';
import { audioService } from './audioFeedback';

export type CursorClickCallback = (x: number, y: number, target: HTMLElement | null) => void;

export class CursorManager {
  private state: VirtualCursorState = {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
    normalizedX: 0.5,
    normalizedY: 0.5,
    isVisible: false,
    isPinching: false,
    isHovering: false,
    isFrozen: false,
    hoverProgress: 0,
    activeTargetId: null,
    mode: 'POINTER',
    depth: 1.0,
    clutchState: 'STANDBY',
    clutchProgress: 0,
    engagementMode: 'PINCH_HOLD',
  };

  private smoothedPos: Point2D = {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
  };
  private smoothedDepth: number = 1.0;
  private currentTarget: HTMLElement | null = null;
  private hoverStartTime: number = 0;
  private readonly DWELL_THRESHOLD_MS: number = 750; // Dwell hold time to trigger click
  private wasPinching: boolean = false;
  private onClickListeners: CursorClickCallback[] = [];

  // Midas Touch Defense & Engagement Tracking
  private engageStartTime: number = 0;
  private readonly ENGAGE_HOLD_MS: number = 420; // Explicit intentional hold to engage cursor
  private lastPos: Point2D = {
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
  };
  private lastUpdateTime: number = performance.now();
  private lastHandPresentTime: number = 0;
  private steadyHoverFrames: number = 0;

  public addClickListener(cb: CursorClickCallback) {
    this.onClickListeners.push(cb);
  }

  public removeClickListener(cb: CursorClickCallback) {
    this.onClickListeners = this.onClickListeners.filter((c) => c !== cb);
  }

  public getState(): VirtualCursorState {
    return { ...this.state };
  }

  public setMode(mode: 'POINTER' | 'CALIPER' | 'PAN_ZOOM') {
    this.state.mode = mode;
  }

  public setEngagementMode(mode: EngagementMode) {
    this.state.engagementMode = mode;
  }

  public setClutchState(state: ClutchState) {
    if (this.state.clutchState === state) return;
    this.state.clutchState = state;
    this.state.clutchProgress = 0;
    this.engageStartTime = 0;

    if (state === 'ENGAGED') {
      this.state.isFrozen = false;
      audioService.playChime();
    } else if (state === 'CLUTCHED') {
      this.state.isFrozen = true;
      audioService.playLock();
    } else if (state === 'STANDBY') {
      this.state.isFrozen = false;
      this.state.isHovering = false;
      this.state.hoverProgress = 0;
      this.currentTarget = null;
      audioService.playUnlock();
    }
  }

  public toggleClutch() {
    if (this.state.clutchState === 'ENGAGED') {
      this.setClutchState('CLUTCHED');
    } else if (this.state.clutchState === 'CLUTCHED') {
      this.setClutchState('ENGAGED');
    } else {
      this.setClutchState('ENGAGED');
    }
  }

  public update(
    rawNormalized: Point2D,
    isPinching: boolean,
    isFist: boolean,
    handPresent: boolean,
    depth: number = 1.0,
    forceEngaged: boolean = false
  ): VirtualCursorState {
    const now = performance.now();
    const dt = Math.max(1, now - this.lastUpdateTime);
    this.lastUpdateTime = now;

    if (!handPresent) {
      // Disengage if hand has left field for > 500ms
      if (now - this.lastHandPresentTime > 500 && this.state.clutchState !== 'STANDBY' && !forceEngaged) {
        this.state.clutchState = 'STANDBY';
        this.state.clutchProgress = 0;
        this.engageStartTime = 0;
      }
      this.state.isVisible = false;
      this.state.hoverProgress = 0;
      this.currentTarget = null;
      return this.getState();
    }

    this.lastHandPresentTime = now;
    this.state.isVisible = true;

    // Smooth 3D depth estimate
    this.smoothedDepth += (depth - this.smoothedDepth) * 0.22;
    this.state.depth = Number(this.smoothedDepth.toFixed(3));

    // Instant bypass if forced (e.g. desktop simulation mouse mode or fast-track)
    if (forceEngaged || this.state.engagementMode === 'INSTANT_AUTO') {
      if (this.state.clutchState === 'STANDBY' || this.state.clutchState === 'ENGAGING') {
        this.state.clutchState = 'ENGAGED';
        this.state.clutchProgress = 1;
      }
    }

    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Mirror horizontal coordinate for natural selfie-camera interaction
    const mirroredX = 1 - rawNormalized.x;
    const targetPixelX = mirroredX * winWidth;
    const targetPixelY = rawNormalized.y * winHeight;

    // Velocity & speed calculation for intentionality defense
    const frameDx = targetPixelX - this.lastPos.x;
    const frameDy = targetPixelY - this.lastPos.y;
    const pixelVelocity = (Math.hypot(frameDx, frameDy) / dt) * 1000; // px / sec
    this.lastPos = { x: targetPixelX, y: targetPixelY };

    // --- MIDAS TOUCH DEFENSE 1: Drop to Standby on Sudden Arm Flailing (> 2400 px/s) ---
    // If surgeon rapidly reaches for a surgical tool or flails arm, drop to STANDBY to prevent stray clicks
    if (this.state.clutchState === 'ENGAGED' && pixelVelocity > 2400 && !forceEngaged) {
      this.setClutchState('STANDBY');
      return this.getState();
    }

    // --- MIDAS TOUCH DEFENSE 2: Lower-Chest Drop Boundary (normalizedY > 0.88) ---
    // If surgeon drops hands below chest line, automatically disengage
    if (this.state.clutchState === 'ENGAGED' && rawNormalized.y > 0.88 && !forceEngaged) {
      this.setClutchState('STANDBY');
      return this.getState();
    }

    // Sterile Freeze Toggle (Clutched)
    if (isFist) {
      if (this.state.clutchState !== 'CLUTCHED') {
        this.setClutchState('CLUTCHED');
      }
      this.state.isFrozen = true;
      this.state.hoverProgress = 0;
      return this.getState();
    } else {
      if (this.state.clutchState === 'CLUTCHED') {
        // Unfreezing fist transitions back to ENGAGED
        this.state.clutchState = 'ENGAGED';
        this.state.isFrozen = false;
        audioService.playUnlock();
      }
    }

    // Adaptive Exponential Moving Average smoothing
    const dx = targetPixelX - this.smoothedPos.x;
    const dy = targetPixelY - this.smoothedPos.y;
    const speed = Math.hypot(dx, dy);

    // Dynamic alpha: more responsive when moving fast, heavy smoothing when hovering still
    const alpha = speed > 40 ? 0.35 : 0.18;
    this.smoothedPos.x += (targetPixelX - this.smoothedPos.x) * alpha;
    this.smoothedPos.y += (targetPixelY - this.smoothedPos.y) * alpha;

    this.state.x = Math.max(0, Math.min(winWidth, this.smoothedPos.x));
    this.state.y = Math.max(0, Math.min(winHeight, this.smoothedPos.y));
    this.state.normalizedX = this.state.x / winWidth;
    this.state.normalizedY = this.state.y / winHeight;
    this.state.isPinching = isPinching;

    // --- MIDAS TOUCH DEFENSE 3: Explicit Surgical Engagement Clutch ---
    if (this.state.clutchState === 'STANDBY' || this.state.clutchState === 'ENGAGING') {
      let isIntentionalEngagementPose = false;

      if (this.state.engagementMode === 'PINCH_HOLD') {
        // Holding pinch in mid-air for 420ms explicitly grabs the surgical stylus
        isIntentionalEngagementPose = isPinching;
      } else if (this.state.engagementMode === 'DWELL_HOLD') {
        // Holding hand steady in one location for 500ms
        if (speed < 12) {
          this.steadyHoverFrames++;
          if (this.steadyHoverFrames > 12) isIntentionalEngagementPose = true;
        } else {
          this.steadyHoverFrames = 0;
        }
      }

      if (isIntentionalEngagementPose) {
        if (this.engageStartTime === 0) {
          this.engageStartTime = now;
          this.state.clutchState = 'ENGAGING';
          audioService.playTick(600);
        }

        const elapsed = now - this.engageStartTime;
        this.state.clutchProgress = Math.min(1.0, elapsed / this.ENGAGE_HOLD_MS);

        if (this.state.clutchProgress >= 1.0) {
          this.setClutchState('ENGAGED');
          this.engageStartTime = 0;
          this.state.clutchProgress = 0;
        }
      } else {
        // Reset engagement if pose is broken early
        this.engageStartTime = 0;
        this.state.clutchProgress = 0;
        this.state.clutchState = 'STANDBY';
      }

      // IN STANDBY / ENGAGING: Do NOT interact with DOM elements (NO clicks, NO hovers)
      this.currentTarget = null;
      this.state.isHovering = false;
      this.state.hoverProgress = 0;
      this.state.activeTargetId = null;
      this.wasPinching = isPinching;
      return this.getState();
    }

    // --- ACTIVE SURGICAL INTERACTION (STATE: ENGAGED) ---
    // Element detection under virtual cursor
    const elementUnderCursor =
      typeof document !== 'undefined' && document.elementFromPoint
        ? (document.elementFromPoint(this.state.x, this.state.y) as HTMLElement | null)
        : null;
    const clickable = elementUnderCursor?.closest<HTMLElement>(
      'button, [data-touchless-clickable="true"], a, input, select, [role="button"]'
    );

    if (clickable) {
      if (clickable !== this.currentTarget) {
        this.currentTarget = clickable;
        this.hoverStartTime = now;
        this.state.isHovering = true;
        this.state.activeTargetId = clickable.id || clickable.getAttribute('data-id') || 'target';
        audioService.playHover();
      } else {
        // Increment dwell progress
        const elapsed = now - this.hoverStartTime;
        this.state.hoverProgress = Math.min(1.0, elapsed / this.DWELL_THRESHOLD_MS);

        if (this.state.hoverProgress >= 1.0) {
          this.triggerClick(clickable);
          this.hoverStartTime = now + 400; // Reset dwell timer with slight pause
          this.state.hoverProgress = 0;
        }
      }
    } else {
      this.currentTarget = null;
      this.state.isHovering = false;
      this.state.hoverProgress = 0;
      this.state.activeTargetId = null;
    }

    // Pinch-click trigger: rising edge of pinch
    if (isPinching && !this.wasPinching) {
      audioService.playPinch();
      if (clickable) {
        this.triggerClick(clickable);
        this.hoverStartTime = now + 400;
        this.state.hoverProgress = 0;
      } else {
        // Emit click at current coordinate for Canvas Caliper placement
        this.emitClick(this.state.x, this.state.y, elementUnderCursor);
      }
    }

    this.wasPinching = isPinching;
    return this.getState();
  }

  private triggerClick(element: HTMLElement) {
    audioService.playClick();
    element.click();
    this.emitClick(this.state.x, this.state.y, element);
  }

  private emitClick(x: number, y: number, target: HTMLElement | null) {
    this.onClickListeners.forEach((listener) => {
      try {
        listener(x, y, target);
      } catch (err) {
        console.error('Error in click listener:', err);
      }
    });
  }
}

export const cursorManager = new CursorManager();
