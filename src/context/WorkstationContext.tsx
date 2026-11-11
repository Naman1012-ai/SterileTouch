import React, { createContext, useContext, useEffect, useState } from 'react';

export type WorkstationMode = 'SIMPLE' | 'ADVANCED';

export interface WorkstationContextValue {
  mode: WorkstationMode;
  isSimple: boolean;
  isAdvanced: boolean;
  setMode: (mode: WorkstationMode) => void;
  toggleMode: () => void;
  isLargeDisplay: boolean;
  touchlessTargetSize: string; // Tailwind class string for hit target scale
}

const WorkstationContext = createContext<WorkstationContextValue | null>(null);

const STORAGE_KEY = 'steriletouch_ui_mode';

export const WorkstationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<WorkstationMode>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === 'ADVANCED') return 'ADVANCED';
      }
    } catch {}
    return 'SIMPLE'; // Simple mode is default
  });

  const [isLargeDisplay, setIsLargeDisplay] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1920;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsLargeDisplay(window.innerWidth >= 1920);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setMode = (newMode: WorkstationMode) => {
    setModeState(newMode);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, newMode);
      }
    } catch {}
  };

  const toggleMode = () => {
    setMode(mode === 'SIMPLE' ? 'ADVANCED' : 'SIMPLE');
  };

  const value: WorkstationContextValue = {
    mode,
    isSimple: mode === 'SIMPLE',
    isAdvanced: mode === 'ADVANCED',
    setMode,
    toggleMode,
    isLargeDisplay,
    touchlessTargetSize:
      mode === 'SIMPLE'
        ? isLargeDisplay
          ? 'min-h-14 min-w-14'
          : 'min-h-12 min-w-12'
        : isLargeDisplay
        ? 'min-h-11 min-w-11'
        : 'min-h-9 min-w-9',
  };

  return <WorkstationContext.Provider value={value}>{children}</WorkstationContext.Provider>;
};

export const useWorkstation = (): WorkstationContextValue => {
  const ctx = useContext(WorkstationContext);
  if (!ctx) {
    // Graceful fallback for tests or isolated components outside provider
    return {
      mode: 'SIMPLE',
      isSimple: true,
      isAdvanced: false,
      setMode: () => {},
      toggleMode: () => {},
      isLargeDisplay: false,
      touchlessTargetSize: 'min-h-11 min-w-11',
    };
  }
  return ctx;
};
