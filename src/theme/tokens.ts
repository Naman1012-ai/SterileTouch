/**
 * SterileTouch Centralized Design Tokens
 * 
 * Strict clinical palette, typography scales, touchless target dimensions,
 * elevation glows, and semantic status indicators for surgical operating rooms.
 */

export const CLINICAL_TOKENS = {
  // Surfaces & Backgrounds
  colors: {
    bg: {
      primary: '#020617', // Deep slate surgical theater base
      surface: '#090e17', // Elevated clinical card / panel
      surfaceHover: '#111827', // Interactive hover state
      surfaceActive: '#1e293b', // Active selection state
      overlay: 'rgba(2, 6, 23, 0.85)', // Modal & drawer backdrop
    },
    border: {
      subtle: '#1e293b', // Subtle structural boundary
      medium: '#334155', // Standard panel border
      active: '#06b6d4', // Focused / active border
      glow: 'rgba(6, 182, 212, 0.4)', // Glowing interactive boundary
    },
    // Medical Semantic Accents
    telemetry: {
      cyan: {
        base: '#06b6d4',
        light: '#67e8f9',
        dark: '#083344',
        glow: 'rgba(6, 182, 212, 0.35)',
      },
      emerald: {
        base: '#10b981',
        light: '#6ee7b7',
        dark: '#022c22',
        glow: 'rgba(16, 185, 129, 0.35)',
      },
      rose: {
        base: '#f43f5e',
        light: '#fda4af',
        dark: '#4c0519',
        glow: 'rgba(244, 63, 94, 0.35)',
      },
      amber: {
        base: '#f59e0b',
        light: '#fcd34d',
        dark: '#451a03',
        glow: 'rgba(245, 158, 11, 0.35)',
      },
      indigo: {
        base: '#6366f1',
        light: '#a5b4fc',
        dark: '#1e1b4b',
        glow: 'rgba(99, 102, 241, 0.35)',
      },
    },
    // Physiological Channel Colors
    vitals: {
      ecg: '#10b981', // Lead II ECG Green
      spo2: '#06b6d4', // Plethysmograph Cyan
      nibp: '#fbbf24', // Blood Pressure Gold
      resp: '#818cf8', // Respiration Rate Indigo
      temp: '#f97316', // Core Temp Orange
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
      disabled: '#475569',
      accent: '#22d3ee',
    },
  },

  // Typography Scales
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    fontSize: {
      xs: '0.625rem', // 10px (telemetry sub-labels)
      sm: '0.75rem', // 12px (badges, timestamps)
      base: '0.875rem', // 14px (standard UI labels)
      md: '1rem', // 16px (panel headers, patient name)
      lg: '1.25rem', // 20px (primary module headers)
      xl: '1.75rem', // 28px (vitals numeric readouts)
      xxl: '2.5rem', // 40px (emergency indicators)
    },
  },

  // Touchless Spatial Sizing & Ergonomics
  touchless: {
    minHitTargetLaptop: '44px', // Minimum target height/width on laptops
    minHitTargetWorkstation: '56px', // Minimum target height/width on 4K OR screens
    dwellThresholdStandard: 750, // ms
    dwellThresholdFast: 500, // ms
    dwellThresholdPrecise: 1000, // ms
    clutchEngagementHold: 420, // ms
  },

  // Corner Radii
  radii: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },

  // Elevation & Glow Shadows
  shadows: {
    panel: '0 4px 20px -2px rgba(0, 0, 0, 0.75)',
    cyanGlow: '0 0 16px rgba(6, 182, 212, 0.35)',
    emeraldGlow: '0 0 16px rgba(16, 185, 129, 0.35)',
    roseGlow: '0 0 20px rgba(244, 63, 94, 0.45)',
    amberGlow: '0 0 16px rgba(245, 158, 11, 0.35)',
  },

  // Transitions
  transitions: {
    fast: '100ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '200ms cubic-bezier(0.4, 0, 0.2, 1)',
    smooth: '300ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
} as const;

export type ClinicalTokens = typeof CLINICAL_TOKENS;
