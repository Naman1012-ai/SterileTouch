export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type GestureType =
  | 'NONE'
  | 'POINT'
  | 'PINCH'
  | 'SWIPE_LEFT'
  | 'SWIPE_RIGHT'
  | 'SWIPE_UP'
  | 'SWIPE_DOWN'
  | 'FIST'
  | 'THUMBS_UP'
  | 'PEACE';

export type ClutchState = 'STANDBY' | 'ENGAGING' | 'ENGAGED' | 'CLUTCHED';

export type EngagementMode = 'PINCH_HOLD' | 'DWELL_HOLD' | 'INSTANT_AUTO';

export interface GestureDetectionResult {
  gesture: GestureType;
  confidence: number;
  pinchDistance: number;
  pinchCenter: Point2D;
  rawCursor: Point2D;
  handPresent: boolean;
  handedness: 'Left' | 'Right';
  velocity: Point2D;
  isFist: boolean;
  isThumbsUp: boolean;
  isPeace: boolean;
  depthEstimate: number; // relative distance based on palm span
}

export interface VirtualCursorState {
  x: number; // screen pixel X
  y: number; // screen pixel Y
  normalizedX: number; // 0..1
  normalizedY: number; // 0..1
  isVisible: boolean;
  isPinching: boolean;
  isHovering: boolean;
  isFrozen: boolean;
  hoverProgress: number; // 0..1 dwell progress ring
  activeTargetId: string | null;
  mode: 'POINTER' | 'CALIPER' | 'PAN_ZOOM';
  depth: number; // smoothed depth estimate (1.0 nominal, <1.0 closer, >1.0 farther)
  // Midas Touch Defense & Surgical Clutch Telemetry
  clutchState: ClutchState;
  clutchProgress: number; // 0..1 engagement transition
  engagementMode: EngagementMode;
}

export interface TrackingMetrics {
  fps: number;
  latencyMs: number;
  handDetected: boolean;
  lightQuality: 'OPTIMAL' | 'FAIR' | 'LOW';
  distanceQuality: 'TOO_CLOSE' | 'OPTIMAL' | 'TOO_FAR';
}
