import React, { useEffect, useRef, useState } from 'react';
import { Header } from './components/layout/Header';
import { ActiveTab, NavigationBar } from './components/layout/NavigationBar';
import { MedicalViewer } from './components/viewer/MedicalViewer';
import { SurgicalChecklist } from './components/checklist/SurgicalChecklist';
import { VitalsMonitor } from './components/vitals/VitalsMonitor';
import { PatientRecords } from './components/records/PatientRecords';
import { PacsPassthroughView } from './components/pacs/PacsPassthroughView';
import { CameraFeed } from './components/hud/CameraFeed';
import { VirtualCursor } from './components/hud/VirtualCursor';
import { AuditLogModal } from './components/checklist/AuditLogModal';
import { GesturesHelpModal } from './components/hud/GesturesHelpModal';
import { DicomDropzoneModal } from './components/viewer/DicomDropzoneModal';
import { DicomMetadataDrawer } from './components/viewer/DicomMetadataDrawer';
import { DoctorOnboardingTutorial } from './components/onboarding/DoctorOnboardingTutorial';
import { WorkstationProvider } from './context/WorkstationContext';

import { MOCK_PATIENTS } from './data/mockPatients';
import { MOCK_SCANS } from './data/mockScans';
import { handTrackingService } from './services/handTracking';
import { gestureClassifier } from './services/gestureClassifier';
import { cursorManager } from './services/cursorManager';
import { audioService } from './services/audioFeedback';
import { voiceAssistantService } from './services/voiceAssistant';

import {
  GestureDetectionResult,
  Point3D,
  TrackingMetrics,
  VirtualCursorState,
} from './types/gestures';
import { AuditLogEntry, MedicalScanSeries, PatientProfile } from './types/medical';
import { VoiceCommandResult } from './types/speech';
import { DicomSeriesUploadResult } from './types/dicom';

export const App: React.FC = () => {
  // Navigation & Patient Selection State
  const [activeTab, setActiveTab] = useState<ActiveTab>('RADIOLOGY');
  const [currentPatientId, setCurrentPatientId] = useState<string>('pt-001');

  // Modals & UI Toggles
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isMetadataDrawerOpen, setIsMetadataDrawerOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem('steriletouch_onboarded') !== 'true';
    } catch {
      return false;
    }
  });
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Dynamic Uploaded DICOM & Image series
  const [uploadedScans, setUploadedScans] = useState<MedicalScanSeries[]>([]);
  const [customPatients, setCustomPatients] = useState<PatientProfile[]>([]);

  // Vision Pipeline & Tracking State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);

  const [landmarks, setLandmarks] = useState<Point3D[] | null>(null);
  const [metrics, setMetrics] = useState<TrackingMetrics>({
    fps: 0,
    latencyMs: 0,
    handDetected: false,
    lightQuality: 'OPTIMAL',
    distanceQuality: 'OPTIMAL',
  });

  const [gestureResult, setGestureResult] = useState<GestureDetectionResult>({
    gesture: 'NONE',
    confidence: 0,
    pinchDistance: 1,
    pinchCenter: { x: 0.5, y: 0.5 },
    rawCursor: { x: 0.5, y: 0.5 },
    handPresent: false,
    handedness: 'Right',
    velocity: { x: 0, y: 0 },
    isFist: false,
    isThumbsUp: false,
    isPeace: false,
    depthEstimate: 1,
  });

  const [cursor, setCursor] = useState<VirtualCursorState>(cursorManager.getState());

  // Compliance Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: '14:00:12 UTC',
      category: 'SYSTEM',
      action: 'SterileTouch Terminal Initialized',
      details: 'OR Suite 3 terminal calibrated. Touchless sterile field active.',
      operator: 'System Daemon',
      verifiedTouchless: true,
    },
    {
      id: 'log-init-2',
      timestamp: '14:05:44 UTC',
      category: 'CHECKLIST',
      action: 'Verified: Patient Identity & Consent',
      details: 'Phase 1: Sign In verbally confirmed.',
      operator: 'Dr. S. K. Nair (Anesthesia)',
      verifiedTouchless: true,
    },
  ]);

  const allPatients: PatientProfile[] = [...MOCK_PATIENTS, ...customPatients];
  const allScans: MedicalScanSeries[] = [...MOCK_SCANS, ...uploadedScans];

  const activePatient: PatientProfile =
    allPatients.find((p) => p.id === currentPatientId) || allPatients[0];

  const activeScan: MedicalScanSeries =
    allScans.find((s) => s.patientId === currentPatientId || s.id === currentPatientId) || allScans[0];

  const handleUploadSuccess = (result: DicomSeriesUploadResult) => {
    const customPatient: PatientProfile = {
      id: result.patientId,
      mrn: result.patientId,
      name: result.metadata.patientName,
      age: parseInt(result.metadata.patientAge || '54', 10) || 54,
      gender: (result.metadata.patientSex as any) || 'M',
      bloodType: 'O POS',
      allergies: ['None Reported (Imported Scan)'],
      diagnosis: result.title,
      scheduledProcedure: 'Diagnostic Touchless Evaluation',
      primarySurgeon: 'Staff Radiologist',
      anesthesiologist: 'On Duty',
      orRoom: 'Reading Bay 4',
      status: 'INTRA_OP',
      labs: {
        hemoglobin: '14.2 g/dL',
        platelets: '240 k/uL',
        wbc: '6.8 k/uL',
        ptInr: '1.0',
        potassium: '4.1 mEq/L',
        sodium: '139 mEq/L',
      },
    };

    const newScanSeries: MedicalScanSeries = {
      id: result.scanId,
      patientId: result.patientId,
      modality: result.modality,
      title: result.title,
      anatomicalRegion:
        result.metadata.seriesDescription || result.metadata.studyDescription || 'Clinical Scan',
      acquisitionDate: result.metadata.studyDate,
      totalSlices: result.totalSlices,
      currentSlice: 1,
      pixelSpacingMm: result.pixelSpacingMm,
      findings: [],
      notes: result.notes,
      customSlices: result.slices,
      dicomMetadata: result.metadata,
      isCustomUpload: true,
    };

    setCustomPatients((prev) => [customPatient, ...prev]);
    setUploadedScans((prev) => [newScanSeries, ...prev]);
    setCurrentPatientId(result.patientId);
    setActiveTab('RADIOLOGY');

    handleAddAuditLog({
      id: `log-dcm-${Date.now()}`,
      timestamp: `${new Date().toLocaleTimeString('en-US', { hour12: false })} UTC`,
      category: 'SCAN_ADJUSTMENT',
      action: `Imported DICOM Dataset: ${result.title}`,
      details: `${result.totalSlices} slices • Matrix ${result.metadata.columns}x${result.metadata.rows} • Spacing ${result.pixelSpacingMm.toFixed(3)}mm`,
      operator: 'Dr. Aris Thorne (Lead Surgeon)',
      verifiedTouchless: true,
    });
  };

  const [lastVoiceCommand, setLastVoiceCommand] = useState<VoiceCommandResult | null>(null);

  // Wire Voice Assistant commands into Application State
  useEffect(() => {
    const handleVoiceCommand = (cmd: VoiceCommandResult) => {
      setLastVoiceCommand(cmd);

      switch (cmd.intent) {
        case 'NAV_RADIOLOGY':
          setActiveTab('RADIOLOGY');
          break;
        case 'NAV_CHECKLIST':
          setActiveTab('CHECKLIST');
          break;
        case 'SELECT_CHECKLIST_PHASE':
          setActiveTab('CHECKLIST');
          break;
        case 'NAV_VITALS':
          setActiveTab('VITALS');
          break;
        case 'NAV_RECORDS':
          setActiveTab('RECORDS');
          break;
        case 'NAV_PACS':
          setActiveTab('PACS_MIRROR');
          break;
        case 'SWITCH_PATIENT': {
          const idx = Number(cmd.params?.patientIndex);
          if (idx === 1) setCurrentPatientId('pt-001');
          else if (idx === 2) setCurrentPatientId('pt-002');
          else if (idx === 3) setCurrentPatientId('pt-003');
          break;
        }
        case 'NEXT_PATIENT': {
          const curIdx = MOCK_PATIENTS.findIndex((p) => p.id === currentPatientId);
          const nextIdx = (curIdx + 1) % MOCK_PATIENTS.length;
          setCurrentPatientId(MOCK_PATIENTS[nextIdx].id);
          break;
        }
        case 'PREV_PATIENT': {
          const curIdx = MOCK_PATIENTS.findIndex((p) => p.id === currentPatientId);
          const prevIdx = (curIdx - 1 + MOCK_PATIENTS.length) % MOCK_PATIENTS.length;
          setCurrentPatientId(MOCK_PATIENTS[prevIdx].id);
          break;
        }
        case 'OPEN_AUDIT_LOG':
          setIsAuditModalOpen(true);
          break;
        case 'OPEN_UPLOAD_MODAL':
          setIsUploadModalOpen(true);
          break;
        case 'TOGGLE_METADATA_DRAWER':
          setIsMetadataDrawerOpen((prev) => !prev);
          break;
        case 'SHOW_HELP':
          setIsHelpModalOpen(true);
          break;
        case 'OPEN_TUTORIAL':
          setIsOnboardingOpen(true);
          break;
        case 'CLOSE_MODAL':
          setIsHelpModalOpen(false);
          setIsAuditModalOpen(false);
          setIsUploadModalOpen(false);
          setIsMetadataDrawerOpen(false);
          setIsOnboardingOpen(false);
          break;
        case 'TOGGLE_FULLSCREEN':
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          break;
        case 'TOGGLE_AUDIO':
          handleToggleMute();
          break;
        case 'STERILE_FREEZE':
          cursorManager.update(
            { x: 1 - cursor.normalizedX, y: cursor.normalizedY },
            cursor.isPinching,
            true,
            true
          );
          setCursor(cursorManager.getState());
          setGestureResult((prev) => ({
            ...prev,
            isFist: true,
            gesture: 'FIST',
            confidence: 0.98,
          }));
          break;
        case 'STERILE_UNFREEZE':
          cursorManager.update(
            { x: 1 - cursor.normalizedX, y: cursor.normalizedY },
            cursor.isPinching,
            false,
            true
          );
          setCursor(cursorManager.getState());
          setGestureResult((prev) => ({
            ...prev,
            isFist: false,
            gesture: 'POINT',
            confidence: 0.9,
          }));
          break;
        case 'CLUTCH_ENGAGE':
          cursorManager.setClutchState('ENGAGED');
          setCursor(cursorManager.getState());
          break;
        case 'CLUTCH_STANDBY':
          cursorManager.setClutchState('STANDBY');
          setCursor(cursorManager.getState());
          break;
      }
    };

    voiceAssistantService.onCommand(handleVoiceCommand);
    return () => {
      voiceAssistantService.removeCommandListener(handleVoiceCommand);
    };
  }, [cursor.normalizedX, cursor.normalizedY, cursor.isPinching]);

  // Camera stream lifecycle
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await handTrackingService.initialize();

      if (videoRef.current) {
        handTrackingService.start(
          videoRef.current,
          (rawLandmarks, handedness, currentMetrics) => {
            setLandmarks(rawLandmarks);
            setMetrics(currentMetrics);

            if (rawLandmarks) {
              const detected = gestureClassifier.classify(rawLandmarks, handedness);
              setGestureResult(detected);

              const updatedCursor = cursorManager.update(
                detected.rawCursor,
                detected.gesture === 'PINCH',
                detected.isFist,
                detected.handPresent,
                detected.depthEstimate
              );
              setCursor(updatedCursor);

              // Gesture triggers
              if (detected.gesture === 'SWIPE_LEFT') {
                audioService.playSwipe();
              } else if (detected.gesture === 'SWIPE_RIGHT') {
                audioService.playSwipe();
              }
            } else {
              setGestureResult((prev) => ({
                ...prev,
                gesture: 'NONE',
                confidence: 0,
                handPresent: false,
                isFist: false,
                isThumbsUp: false,
              }));
              setCursor(cursorManager.update({ x: 0.5, y: 0.5 }, false, false, false));
            }
          }
        );
      }

      setIsCameraActive(true);
      setIsSimulated(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('Webcam access error:', msg);
      setCameraError(msg);
      setIsCameraActive(false);
      // Automatically fallback to simulation mode so demo never fails
      setIsSimulated(true);
    }
  };

  const stopCamera = () => {
    handTrackingService.stop();
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setLandmarks(null);
  };

  const handleToggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleToggleSimulated = () => {
    if (!isSimulated) {
      stopCamera();
      setIsSimulated(true);
      setCursor((prev) => ({ ...prev, isVisible: true }));
      setGestureResult((prev) => ({ ...prev, handPresent: true }));
    } else {
      setIsSimulated(false);
      setCursor((prev) => ({ ...prev, isVisible: false }));
      setGestureResult((prev) => ({ ...prev, handPresent: false }));
    }
  };

  // Keyboard Simulation Controls (Fail-safe hackathon presentation shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space: Toggle Pinch
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setCursor((prev) =>
          cursorManager.update(
            { x: 1 - prev.normalizedX, y: prev.normalizedY },
            true,
            prev.isFrozen,
            true,
            1.0,
            true
          )
        );
        setGestureResult((prev) => ({ ...prev, gesture: 'PINCH', confidence: 0.95 }));
      }

      // 'F': Toggle Sterile Freeze
      if (e.key.toLowerCase() === 'f' && !e.repeat) {
        setGestureResult((prev) => {
          const nextFist = !prev.isFist;
          cursorManager.update(
            { x: 1 - cursor.normalizedX, y: cursor.normalizedY },
            cursor.isPinching,
            nextFist,
            true
          );
          return {
            ...prev,
            isFist: nextFist,
            gesture: nextFist ? 'FIST' : 'POINT',
            confidence: 0.96,
          };
        });
        setCursor(cursorManager.getState());
      }

      // 'T': Thumbs Up
      if (e.key.toLowerCase() === 't' && !e.repeat) {
        setGestureResult((prev) => ({
          ...prev,
          isThumbsUp: true,
          gesture: 'THUMBS_UP',
          confidence: 0.98,
        }));
      }

      // 'C': Toggle Clutch (Standby / Engaged)
      if (e.key.toLowerCase() === 'c' && !e.repeat) {
        cursorManager.toggleClutch();
        setCursor(cursorManager.getState());
      }

      // 'M': Mute audio
      if (e.key.toLowerCase() === 'm' && !e.repeat) {
        handleToggleMute();
      }

      // Tabs 1 - 5
      if (e.key === '1') setActiveTab('RADIOLOGY');
      if (e.key === '2') setActiveTab('CHECKLIST');
      if (e.key === '3') setActiveTab('VITALS');
      if (e.key === '4') setActiveTab('RECORDS');
      if (e.key === '5') setActiveTab('PACS_MIRROR');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setCursor((prev) =>
          cursorManager.update(
            { x: 1 - prev.normalizedX, y: prev.normalizedY },
            false,
            prev.isFrozen,
            true,
            1.0,
            true
          )
        );
        setGestureResult((prev) => ({ ...prev, gesture: 'POINT', confidence: 0.8 }));
      }
      if (e.key.toLowerCase() === 't') {
        setGestureResult((prev) => ({
          ...prev,
          isThumbsUp: false,
          gesture: 'POINT',
        }));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isSimulated) {
        const normX = e.clientX / window.innerWidth;
        const normY = e.clientY / window.innerHeight;
        // cursorManager mirrors horizontal coordinate
        const updated = cursorManager.update(
          { x: 1 - normX, y: normY },
          cursor.isPinching,
          cursor.isFrozen,
          true,
          1.0,
          true // Force engaged in simulation mouse mode
        );
        setCursor(updated);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSimulated, cursor.isPinching, cursor.isFrozen]);

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    audioService.setMuted(next);
    if (!next) {
      audioService.playClick();
    }
  };

  const handleAddAuditLog = (entry: AuditLogEntry) => {
    setAuditLogs((prev) => [entry, ...prev]);
  };

  return (
    <WorkstationProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans relative">
        {/* Operating Room Header with Integrated Telemetry */}
        <Header
          patient={activePatient}
          gestureResult={gestureResult}
          cursor={cursor}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onOpenHelp={() => setIsHelpModalOpen(true)}
          onOpenTutorial={() => setIsOnboardingOpen(true)}
        />

        {/* Navigation Bar & Case Switcher */}
        <NavigationBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          patients={allPatients}
          currentPatientId={currentPatientId}
          onPatientChange={setCurrentPatientId}
        />

        {/* Main Workspace Display Port */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'RADIOLOGY' && (
            <MedicalViewer
              scan={activeScan}
              cursor={cursor}
              landmarks={landmarks}
              voiceCommand={lastVoiceCommand}
              onOpenUploadModal={() => setIsUploadModalOpen(true)}
              onToggleMetadataDrawer={() => setIsMetadataDrawerOpen((prev) => !prev)}
              isMetadataDrawerOpen={isMetadataDrawerOpen}
            />
          )}

          {activeTab === 'CHECKLIST' && (
            <SurgicalChecklist
              gestureResult={gestureResult}
              voiceCommand={lastVoiceCommand}
              onAuditLogAdded={handleAddAuditLog}
              onOpenAuditModal={() => setIsAuditModalOpen(true)}
            />
          )}

          {activeTab === 'VITALS' && (
            <VitalsMonitor
              voiceCommand={lastVoiceCommand}
              onAcknowledgeAlarm={() => {
                handleAddAuditLog({
                  id: `log-alm-${Date.now()}`,
                  timestamp: `${new Date().toLocaleTimeString('en-US', { hour12: false })} UTC`,
                  category: 'SYSTEM',
                  action: 'Critical Alarm Silenced & Reset',
                  details: 'Hemodynamic stability acknowledged touchlessly by surgical team.',
                  operator: 'Dr. Aris Thorne (Lead Surgeon)',
                  verifiedTouchless: true,
                });
              }}
            />
          )}

          {activeTab === 'RECORDS' && (
            <PatientRecords patient={activePatient} />
          )}

          {activeTab === 'PACS_MIRROR' && (
            <PacsPassthroughView cursor={cursor} />
          )}
        </main>

        {/* Picture-In-Picture Surgeon HUD Camera Feed (Bottom-Right) */}
        <CameraFeed
          videoRef={videoRef}
          landmarks={landmarks}
          metrics={metrics}
          isSimulated={isSimulated}
          onToggleSimulated={handleToggleSimulated}
          isCameraActive={isCameraActive}
          onToggleCamera={handleToggleCamera}
          cameraError={cameraError}
        />

        {/* Virtual Sterile Pointer & Dwell Ring Overlay */}
        <VirtualCursor cursor={cursor} />

        {/* Modals & Drawers */}
        <AuditLogModal
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          logs={auditLogs}
        />

        <GesturesHelpModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
        />

        <DicomDropzoneModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUploadSuccess={handleUploadSuccess}
        />

        <DicomMetadataDrawer
          isOpen={isMetadataDrawerOpen}
          onClose={() => setIsMetadataDrawerOpen(false)}
          metadata={activeScan.dicomMetadata}
        />

        {/* Doctor Onboarding & Interactive Calibration Tutorial */}
        <DoctorOnboardingTutorial
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          gestureResult={gestureResult}
          cursor={cursor}
          landmarks={landmarks}
          metrics={metrics}
          isCameraActive={isCameraActive}
          onStartCamera={startCamera}
          voiceCommand={lastVoiceCommand}
        />
      </div>
    </WorkstationProvider>
  );
};

export default App;
