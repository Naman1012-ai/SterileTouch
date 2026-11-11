import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { Point3D, TrackingMetrics } from '../types/gestures';
import { videoPreProcessor } from './videoPreProcessor';

export type LandmarksCallback = (
  landmarks: Point3D[] | null,
  handedness: 'Left' | 'Right',
  metrics: TrackingMetrics
) => void;

class HandTrackingService {
  private handLandmarker: HandLandmarker | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastVideoTime: number = -1;
  private callback: LandmarksCallback | null = null;

  // Performance telemetry
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 0;
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;
  private initError: string | null = null;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
        const modelPath =
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

        const vision = await FilesetResolver.forVisionTasks(wasmPath);

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        this.isInitialized = true;
        this.initError = null;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('Primary GPU HandLandmarker initialization failed, retrying on CPU delegate...', message);
        try {
          const wasmPath = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
          const modelPath =
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

          const vision = await FilesetResolver.forVisionTasks(wasmPath);
          this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: modelPath,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numHands: 1,
            minHandDetectionConfidence: 0.5,
            minHandPresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          this.isInitialized = true;
          this.initError = null;
        } catch (cpuErr: unknown) {
          const cpuMsg = cpuErr instanceof Error ? cpuErr.message : String(cpuErr);
          this.initError = cpuMsg;
          console.error('Failed to initialize MediaPipe HandLandmarker:', cpuErr);
          throw cpuErr;
        }
      }
    })();

    return this.initPromise;
  }

  public getInitError(): string | null {
    return this.initError;
  }

  public isReady(): boolean {
    return this.isInitialized && !!this.handLandmarker;
  }

  public start(video: HTMLVideoElement, onResults: LandmarksCallback) {
    this.videoElement = video;
    this.callback = onResults;
    this.isRunning = true;
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    if (
      this.handLandmarker &&
      this.videoElement &&
      this.videoElement.readyState >= 2 &&
      !this.videoElement.paused &&
      this.videoElement.currentTime !== this.lastVideoTime
    ) {
      this.lastVideoTime = this.videoElement.currentTime;
      const startTime = performance.now();

      try {
        const processedSource = videoPreProcessor.processFrame(this.videoElement);
        const result = this.handLandmarker.detectForVideo(processedSource as HTMLVideoElement, startTime);
        const latencyMs = Math.round(performance.now() - startTime);
        const assessment = videoPreProcessor.getLightingAssessment();

        if (result.landmarks && result.landmarks.length > 0) {
          const rawLandmarks = result.landmarks[0] as Point3D[];
          const handednessCategory = result.handedness?.[0]?.[0]?.categoryName;
          const handedness: 'Left' | 'Right' = handednessCategory === 'Left' ? 'Left' : 'Right';

          // Distance estimation based on palm scale
          const wrist = rawLandmarks[0];
          const middleMcp = rawLandmarks[9];
          const palmDist = Math.hypot(wrist.x - middleMcp.x, wrist.y - middleMcp.y);

          let distanceQuality: 'TOO_CLOSE' | 'OPTIMAL' | 'TOO_FAR' = 'OPTIMAL';
          if (palmDist > 0.38) distanceQuality = 'TOO_CLOSE';
          else if (palmDist < 0.12) distanceQuality = 'TOO_FAR';

          const metrics: TrackingMetrics = {
            fps: this.currentFps || 30,
            latencyMs,
            handDetected: true,
            lightQuality: assessment.luxCategory === 'OPTIMAL_SURGICAL' ? 'OPTIMAL' : 'FAIR',
            distanceQuality,
          };

          if (this.callback) {
            this.callback(rawLandmarks, handedness, metrics);
          }
        } else {
          if (this.callback) {
            this.callback(null, 'Right', {
              fps: this.currentFps || 30,
              latencyMs,
              handDetected: false,
              lightQuality: 'OPTIMAL',
              distanceQuality: 'OPTIMAL',
            });
          }
        }
      } catch (err) {
        console.warn('Tracking loop detection error:', err);
      }
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}

export const handTrackingService = new HandTrackingService();
