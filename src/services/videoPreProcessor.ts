/**
 * SterileTouch Video Pre-Processor for Harsh OT Lighting & Gloved Hands
 *
 * Solves:
 * 1. Specular highlight blowouts from 40k - 160k lux overhead surgical lamps.
 * 2. Low contrast / edge loss on Cobalt Blue, Surgical Green, and Stark White nitrile gloves.
 * 3. Color channel rebalancing to feed optimal silhouettes to MediaPipe Vision.
 */

export type GloveType = 'BLUE_NITRILE' | 'GREEN_LATEX' | 'WHITE_LATEX' | 'BARE_SKIN';

export interface LightingAssessment {
  luxCategory: 'HARSH_OVERHEAD_GLARE' | 'OPTIMAL_SURGICAL' | 'DIMMED_LAPAROSCOPIC';
  specularBlowoutRatio: number; // 0..1 percentage of blown out pixels (> 245)
  averageLuminance: number; // 0..255
  activeGloveMode: GloveType;
  filterApplied: boolean;
}

export class VideoPreProcessor {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private activeGloveMode: GloveType = 'BLUE_NITRILE';
  private antiGlareEnabled: boolean = true;
  private lastAssessment: LightingAssessment = {
    luxCategory: 'OPTIMAL_SURGICAL',
    specularBlowoutRatio: 0,
    averageLuminance: 128,
    activeGloveMode: 'BLUE_NITRILE',
    filterApplied: false,
  };

  constructor() {
    if (typeof document !== 'undefined') {
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = 640;
      this.offscreenCanvas.height = 480;
      this.ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }
  }

  public setGloveMode(mode: GloveType) {
    this.activeGloveMode = mode;
    this.lastAssessment.activeGloveMode = mode;
  }

  public getGloveMode(): GloveType {
    return this.activeGloveMode;
  }

  public setAntiGlareEnabled(enabled: boolean) {
    this.antiGlareEnabled = enabled;
  }

  public isAntiGlareEnabled(): boolean {
    return this.antiGlareEnabled;
  }

  public getLightingAssessment(): LightingAssessment {
    return { ...this.lastAssessment };
  }

  /**
   * Processes a video frame with anti-glare clamping and glove contour enhancement.
   * Returns a CanvasImageSource ready to be passed to MediaPipe detectForVideo.
   */
  public processFrame(video: HTMLVideoElement): HTMLCanvasElement | HTMLVideoElement {
    if (!this.antiGlareEnabled && this.activeGloveMode === 'BARE_SKIN') {
      return video;
    }

    if (!this.offscreenCanvas || !this.ctx) {
      return video;
    }

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    if (this.offscreenCanvas.width !== w || this.offscreenCanvas.height !== h) {
      this.offscreenCanvas.width = w;
      this.offscreenCanvas.height = h;
    }

    // 1. Draw raw video frame to offscreen canvas
    this.ctx.drawImage(video, 0, 0, w, h);

    // Sample downsampled grid for fast 60fps lighting evaluation
    try {
      const imgData = this.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const totalPixels = w * h;

      let blowoutCount = 0;
      let totalLuma = 0;

      // Sample every 4th pixel for speed (stride = 16 bytes)
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuma += luma;

        if (r > 240 && g > 240 && b > 240) {
          blowoutCount++;
        }
      }

      const sampleCount = Math.floor(totalPixels / 4);
      const avgLuma = totalLuma / sampleCount;
      const blowoutRatio = blowoutCount / sampleCount;

      let luxCategory: LightingAssessment['luxCategory'] = 'OPTIMAL_SURGICAL';
      if (blowoutRatio > 0.08 || avgLuma > 210) {
        luxCategory = 'HARSH_OVERHEAD_GLARE';
      } else if (avgLuma < 60) {
        luxCategory = 'DIMMED_LAPAROSCOPIC';
      }

      this.lastAssessment = {
        luxCategory,
        specularBlowoutRatio: Number(blowoutRatio.toFixed(3)),
        averageLuminance: Math.round(avgLuma),
        activeGloveMode: this.activeGloveMode,
        filterApplied: true,
      };

      // 2. Pixel-level transformation if harsh glare or colored gloves active
      if (luxCategory === 'HARSH_OVERHEAD_GLARE' || this.activeGloveMode !== 'BARE_SKIN') {
        const mode = this.activeGloveMode;
        const clampGlare = luxCategory === 'HARSH_OVERHEAD_GLARE';

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Highlight Clamping for Harsh Overhead OR Lamps
          if (clampGlare && (r > 230 || g > 230 || b > 230)) {
            // Compress dynamic range on blown out areas to reveal finger edges
            r = Math.min(215, Math.floor(r * 0.88));
            g = Math.min(215, Math.floor(g * 0.88));
            b = Math.min(215, Math.floor(b * 0.88));
          }

          // Glove Color Separation Enhancers
          if (mode === 'BLUE_NITRILE') {
            // Boost blue dominance so MediaPipe detects dark contour against bright background
            if (b > r && b > g) {
              b = Math.min(255, Math.floor(b * 1.25));
              r = Math.floor(r * 0.75);
            }
          } else if (mode === 'GREEN_LATEX') {
            // Boost surgical green channel
            if (g > r && g > b) {
              g = Math.min(255, Math.floor(g * 1.25));
              r = Math.floor(r * 0.75);
              b = Math.floor(b * 0.75);
            }
          } else if (mode === 'WHITE_LATEX') {
            // High contrast edge curve for white gloves
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;
            if (luma > 160) {
              r = Math.min(255, Math.floor(r * 1.1));
              g = Math.min(255, Math.floor(g * 1.1));
              b = Math.min(255, Math.floor(b * 1.1));
            } else {
              r = Math.floor(r * 0.85);
              g = Math.floor(g * 0.85);
              b = Math.floor(b * 0.85);
            }
          }

          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }

        this.ctx.putImageData(imgData, 0, 0);
      }

      return this.offscreenCanvas;
    } catch {
      // In case canvas access is restricted or tainted, return raw video safely
      return video;
    }
  }
}

export const videoPreProcessor = new VideoPreProcessor();
