import { GestureType, Point2D } from './gestures';
import { DecodedMedicalSlice, DicomMetadata } from './dicom';

export type ModalityType = 'CT' | 'MRI' | 'X-RAY';

export interface PatientProfile {
  id: string;
  mrn: string; // Medical Record Number
  name: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodType: string;
  allergies: string[];
  diagnosis: string;
  scheduledProcedure: string;
  primarySurgeon: string;
  anesthesiologist: string;
  orRoom: string;
  status: 'PRE_OP' | 'INTRA_OP' | 'POST_OP';
  labs: {
    hemoglobin: string;
    platelets: string;
    wbc: string;
    ptInr: string;
    potassium: string;
    sodium: string;
  };
}

export interface MedicalFinding {
  id: string;
  label: string;
  normalizedCoords: Point2D;
  radius: number;
  confidence: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
}

export interface WindowPreset {
  id: 'DEFAULT' | 'BONE' | 'SOFT_TISSUE' | 'LUNG' | 'INVERT';
  label: string;
  windowWidth: number;
  windowLevel: number;
  invert?: boolean;
}

export interface CaliperMeasurement {
  id: string;
  pointA: Point2D;
  pointB: Point2D;
  distanceMm: number;
  label: string;
}

export interface MedicalScanSeries {
  id: string;
  patientId: string;
  modality: ModalityType;
  title: string;
  anatomicalRegion: string;
  acquisitionDate: string;
  totalSlices: number;
  currentSlice: number;
  pixelSpacingMm: number; // e.g. 0.45 mm/px for measurement calculation
  findings: MedicalFinding[];
  notes: string;
  customSlices?: DecodedMedicalSlice[];
  dicomMetadata?: DicomMetadata;
  isCustomUpload?: boolean;
}

export interface VitalsMetrics {
  heartRate: number; // bpm
  spo2: number; // %
  bpSystolic: number; // mmHg
  bpDiastolic: number; // mmHg
  meanArterialPressure: number; // mmHg
  respiratoryRate: number; // breaths/min
  coreTempC: number; // Celsius
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  activeAlarm: string | null;
}

export type ChecklistPhase = 'SIGN_IN' | 'TIME_OUT' | 'SIGN_OUT';

export interface WHOChecklistItem {
  id: string;
  phase: ChecklistPhase;
  phaseTitle: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  verifiedGesture?: GestureType | 'CLICK';
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: 'CHECKLIST' | 'SCAN_ADJUSTMENT' | 'MEASUREMENT' | 'SYSTEM';
  action: string;
  details: string;
  operator: string;
  verifiedTouchless: boolean;
}
