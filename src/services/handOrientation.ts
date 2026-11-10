import { Point3D } from '../types/gestures';

export interface HandOrientationState {
  pitch: number; // In radians (-PI to PI)
  yaw: number; // In radians (-PI to PI)
  roll: number; // In radians (-PI to PI)
  palmNormal: { x: number; y: number; z: number };
  smoothedPitch: number;
  smoothedYaw: number;
  smoothedRoll: number;
}

export class HandOrientationService {
  private smoothedPitch: number = 0;
  private smoothedYaw: number = 0;
  private smoothedRoll: number = 0;

  /**
   * Derive 3D orientation (pitch, yaw, roll) and palm normal from 21 MediaPipe hand landmarks
   */
  public computeOrientation(landmarks: Point3D[] | null): HandOrientationState {
    if (!landmarks || landmarks.length < 21) {
      return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        palmNormal: { x: 0, y: 0, z: -1 },
        smoothedPitch: this.smoothedPitch,
        smoothedYaw: this.smoothedYaw,
        smoothedRoll: this.smoothedRoll,
      };
    }

    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const pinkyMcp = landmarks[17];

    // 1. Longitudinal axis: vector from Wrist to Middle MCP (points towards finger tips)
    const lx = middleMcp.x - wrist.x;
    const ly = middleMcp.y - wrist.y;
    const lz = (middleMcp.z || 0) - (wrist.z || 0);

    // 2. Transverse axis: vector from Index MCP to Pinky MCP (across palm width)
    const tx = pinkyMcp.x - indexMcp.x;
    const ty = pinkyMcp.y - indexMcp.y;
    const tz = (pinkyMcp.z || 0) - (indexMcp.z || 0);

    // 3. Palm Normal = Longitudinal x Transverse (cross product)
    let nx = ly * tz - lz * ty;
    let ny = lz * tx - lx * tz;
    let nz = lx * ty - ly * tx;

    const normLen = Math.hypot(nx, ny, nz) || 1;
    nx /= normLen;
    ny /= normLen;
    nz /= normLen;

    // 4. Derive Euler Angles (Pitch, Yaw, Roll)
    // Pitch: tilting hand forward (down) / backward (up)
    const rawPitch = Math.atan2(ly, -Math.hypot(lx, lz));

    // Yaw: twisting palm left / right
    const rawYaw = Math.atan2(nx, Math.abs(nz) > 0.001 ? -nz : 0.001);

    // Roll: side-to-side wrist roll
    const rawRoll = Math.atan2(lx, -ly);

    // Dynamic smoothing to filter camera sensor noise
    const ALPHA = 0.22;
    this.smoothedPitch += (rawPitch - this.smoothedPitch) * ALPHA;
    this.smoothedYaw += (rawYaw - this.smoothedYaw) * ALPHA;
    this.smoothedRoll += (rawRoll - this.smoothedRoll) * ALPHA;

    return {
      pitch: Number(rawPitch.toFixed(3)),
      yaw: Number(rawYaw.toFixed(3)),
      roll: Number(rawRoll.toFixed(3)),
      palmNormal: {
        x: Number(nx.toFixed(3)),
        y: Number(ny.toFixed(3)),
        z: Number(nz.toFixed(3)),
      },
      smoothedPitch: Number(this.smoothedPitch.toFixed(3)),
      smoothedYaw: Number(this.smoothedYaw.toFixed(3)),
      smoothedRoll: Number(this.smoothedRoll.toFixed(3)),
    };
  }

  public reset() {
    this.smoothedPitch = 0;
    this.smoothedYaw = 0;
    this.smoothedRoll = 0;
  }
}

export const handOrientationService = new HandOrientationService();
