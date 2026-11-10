import { GestureDetectionResult, GestureType, Point2D, Point3D } from '../types/gestures';

export class GestureClassifier {
  private history: { x: number; y: number; timestamp: number }[] = [];
  private lastSwipeTime: number = 0;
  private swipeCooldownMs: number = 600; // Debounce between swipes
  private fistFrameCount: number = 0;
  private thumbsUpFrameCount: number = 0;

  private dist2D(a: Point2D | Point3D, b: Point2D | Point3D): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public classify(
    landmarks: Point3D[],
    handedness: 'Left' | 'Right' = 'Right'
  ): GestureDetectionResult {
    if (!landmarks || landmarks.length < 21) {
      return {
        gesture: 'NONE',
        confidence: 0,
        pinchDistance: 1,
        pinchCenter: { x: 0.5, y: 0.5 },
        rawCursor: { x: 0.5, y: 0.5 },
        handPresent: false,
        handedness,
        velocity: { x: 0, y: 0 },
        isFist: false,
        isThumbsUp: false,
        isPeace: false,
        depthEstimate: 1,
      };
    }

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const indexMcp = landmarks[5];
    const indexPip = landmarks[6];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];
    const middlePip = landmarks[10];
    const middleTip = landmarks[12];
    const ringMcp = landmarks[13];
    const ringPip = landmarks[14];
    const ringTip = landmarks[16];
    const pinkyMcp = landmarks[17];
    const pinkyPip = landmarks[18];
    const pinkyTip = landmarks[20];

    // Reference scale: distance between wrist and middle MCP
    const palmScale = Math.max(0.05, this.dist2D(wrist, middleMcp));
    const depthEstimate = Math.min(2.5, Math.max(0.4, 0.28 / palmScale));

    // Pinch distance normalized
    const rawPinchDist = this.dist2D(thumbTip, indexTip);
    const normalizedPinchDist = rawPinchDist / palmScale;
    const isPinching = normalizedPinchDist < 0.28;

    const pinchCenter: Point2D = {
      x: (thumbTip.x + indexTip.x) / 2,
      y: (thumbTip.y + indexTip.y) / 2,
    };

    // Extension checks: distance from wrist to tip vs wrist to PIP
    const isIndexExtended = this.dist2D(wrist, indexTip) > this.dist2D(wrist, indexPip) * 1.15;
    const isMiddleExtended = this.dist2D(wrist, middleTip) > this.dist2D(wrist, middlePip) * 1.15;
    const isRingExtended = this.dist2D(wrist, ringTip) > this.dist2D(wrist, ringPip) * 1.15;
    const isPinkyExtended = this.dist2D(wrist, pinkyTip) > this.dist2D(wrist, pinkyPip) * 1.15;

    // Fist (Sterile Freeze): all 4 fingers curled inward
    const allFingersCurled = !isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended;
    const isFist = allFingersCurled && thumbTip.y > thumbMcp.y - 0.05;

    // Thumbs Up: thumb extended upward (tip significantly above MCP and wrist), other 4 fingers curled
    const thumbPointingUp = thumbTip.y < thumbMcp.y - 0.08 && thumbTip.y < indexMcp.y - 0.05;
    const isThumbsUp = allFingersCurled && thumbPointingUp;

    // Peace / V-Sign: index and middle extended, ring and pinky curled
    const isPeace = isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended &&
      this.dist2D(indexTip, middleTip) > palmScale * 0.25;

    // Velocity & Swipe Detection via Middle MCP history
    const now = performance.now();
    this.history.push({ x: middleMcp.x, y: middleMcp.y, timestamp: now });
    // Keep last 150ms of history
    this.history = this.history.filter((h) => now - h.timestamp <= 160);

    let velocity: Point2D = { x: 0, y: 0 };
    if (this.history.length >= 3) {
      const oldest = this.history[0];
      const newest = this.history[this.history.length - 1];
      const dt = Math.max(16, newest.timestamp - oldest.timestamp) / 1000;
      velocity = {
        x: (newest.x - oldest.x) / dt,
        y: (newest.y - oldest.y) / dt,
      };
    }

    // Swipe gesture check with cooldown
    let swipeGesture: GestureType | null = null;
    const SWIPE_VELOCITY_THRESHOLD = 1.35; // Normalized units per second

    if (now - this.lastSwipeTime > this.swipeCooldownMs && !isFist && !isPinching) {
      if (velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
        // Mirrored camera feed: hand moving screen-left
        swipeGesture = 'SWIPE_LEFT';
        this.lastSwipeTime = now;
      } else if (velocity.x > SWIPE_VELOCITY_THRESHOLD) {
        swipeGesture = 'SWIPE_RIGHT';
        this.lastSwipeTime = now;
      } else if (velocity.y < -SWIPE_VELOCITY_THRESHOLD * 1.2) {
        swipeGesture = 'SWIPE_UP';
        this.lastSwipeTime = now;
      } else if (velocity.y > SWIPE_VELOCITY_THRESHOLD * 1.2) {
        swipeGesture = 'SWIPE_DOWN';
        this.lastSwipeTime = now;
      }
    }

    // Frame debouncing for discrete state gestures
    if (isFist) {
      this.fistFrameCount++;
    } else {
      this.fistFrameCount = Math.max(0, this.fistFrameCount - 1);
    }

    if (isThumbsUp) {
      this.thumbsUpFrameCount++;
    } else {
      this.thumbsUpFrameCount = Math.max(0, this.thumbsUpFrameCount - 1);
    }

    // Determine primary gesture state
    let primaryGesture: GestureType = 'NONE';
    let confidence = 0.7;

    if (swipeGesture) {
      primaryGesture = swipeGesture;
      confidence = 0.95;
    } else if (this.thumbsUpFrameCount >= 3) {
      primaryGesture = 'THUMBS_UP';
      confidence = 0.96;
    } else if (this.fistFrameCount >= 4) {
      primaryGesture = 'FIST';
      confidence = 0.92;
    } else if (isPinching) {
      primaryGesture = 'PINCH';
      confidence = Math.max(0.75, 1 - normalizedPinchDist);
    } else if (isPeace) {
      primaryGesture = 'PEACE';
      confidence = 0.88;
    } else if (isIndexExtended) {
      primaryGesture = 'POINT';
      confidence = 0.85;
    }

    // Raw cursor position: index tip when pointing, pinch center when pinching, palm center otherwise
    let rawCursor: Point2D;
    if (isPinching) {
      rawCursor = pinchCenter;
    } else if (isIndexExtended) {
      rawCursor = { x: indexTip.x, y: indexTip.y };
    } else {
      rawCursor = { x: middleMcp.x, y: middleMcp.y };
    }

    return {
      gesture: primaryGesture,
      confidence,
      pinchDistance: normalizedPinchDist,
      pinchCenter,
      rawCursor,
      handPresent: true,
      handedness,
      velocity,
      isFist: this.fistFrameCount >= 4,
      isThumbsUp: this.thumbsUpFrameCount >= 3,
      isPeace,
      depthEstimate,
    };
  }

  public reset() {
    this.history = [];
    this.fistFrameCount = 0;
    this.thumbsUpFrameCount = 0;
    this.lastSwipeTime = 0;
  }
}

export const gestureClassifier = new GestureClassifier();
