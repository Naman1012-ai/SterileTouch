import { Point2D, VirtualCursorState } from '../types/gestures';
import { audioService } from './audioFeedback';

export type CursorClickCallback = (x: number, y: number, target: HTMLElement | null) => void;

export class CursorManager {
  private state: VirtualCursorState = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    normalizedX: 0.5,
    normalizedY: 0.5,
    isVisible: false,
    isPinching: false,
    isHovering: false,
    isFrozen: false,
    hoverProgress: 0,
    activeTargetId: null,
    mode: 'POINTER',
  };

  private smoothedPos: Point2D = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  private currentTarget: HTMLElement | null = null;
  private hoverStartTime: number = 0;
  private readonly DWELL_THRESHOLD_MS: number = 750; // Dwell hold time to trigger click
  private wasPinching: boolean = false;
  private onClickListeners: CursorClickCallback[] = [];

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

  public update(
    rawNormalized: Point2D,
    isPinching: boolean,
    isFist: boolean,
    handPresent: boolean
  ): VirtualCursorState {
    if (!handPresent) {
      this.state.isVisible = false;
      this.state.hoverProgress = 0;
      this.currentTarget = null;
      return this.getState();
    }

    this.state.isVisible = true;

    // Sterile Freeze Toggle
    if (isFist) {
      if (!this.state.isFrozen) {
        audioService.playLock();
      }
      this.state.isFrozen = true;
      this.state.hoverProgress = 0;
      return this.getState();
    } else {
      if (this.state.isFrozen) {
        audioService.playUnlock();
      }
      this.state.isFrozen = false;
    }

    // Mirror horizontal coordinate for natural selfie-camera interaction
    const mirroredX = 1 - rawNormalized.x;
    const targetPixelX = mirroredX * window.innerWidth;
    const targetPixelY = rawNormalized.y * window.innerHeight;

    // Adaptive Exponential Moving Average smoothing
    const dx = targetPixelX - this.smoothedPos.x;
    const dy = targetPixelY - this.smoothedPos.y;
    const speed = Math.hypot(dx, dy);

    // Dynamic alpha: more responsive when moving fast, heavy smoothing when hovering still
    const alpha = speed > 40 ? 0.35 : 0.18;
    this.smoothedPos.x += (targetPixelX - this.smoothedPos.x) * alpha;
    this.smoothedPos.y += (targetPixelY - this.smoothedPos.y) * alpha;

    this.state.x = Math.max(0, Math.min(window.innerWidth, this.smoothedPos.x));
    this.state.y = Math.max(0, Math.min(window.innerHeight, this.smoothedPos.y));
    this.state.normalizedX = this.state.x / window.innerWidth;
    this.state.normalizedY = this.state.y / window.innerHeight;
    this.state.isPinching = isPinching;

    // Element detection under virtual cursor
    const elementUnderCursor = document.elementFromPoint(this.state.x, this.state.y) as HTMLElement | null;
    const clickable = elementUnderCursor?.closest<HTMLElement>(
      'button, [data-touchless-clickable="true"], a, input, select, [role="button"]'
    );

    const now = performance.now();

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
    // Native simulated DOM click
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
