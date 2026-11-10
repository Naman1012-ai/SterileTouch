import { ModalityType } from './medical';

export interface DicomTag {
  group: string; // e.g. "0010"
  element: string; // e.g. "0010"
  tagHex: string; // e.g. "(0010,0010)"
  name: string; // e.g. "PatientName"
  vr: string; // Value Representation, e.g. "PN", "LO", "US", "DS"
  value: string | number | number[];
}

export interface DicomMetadata {
  // Patient Details
  patientName: string;
  patientId: string;
  patientAge?: string;
  patientSex?: 'M' | 'F' | 'O' | string;

  // Study & Series
  modality: ModalityType | string;
  studyDate: string;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  seriesNumber?: number;
  instanceNumber: number;

  // Dimensions & Geometry
  rows: number;
  columns: number;
  pixelSpacing: [number, number]; // [rowSpacingMm, colSpacingMm]
  sliceThicknessMm?: number;
  sliceLocation?: number;
  imagePositionPatient?: [number, number, number]; // [x, y, z]

  // Photometric & Pixel Representation
  samplesPerPixel: number;
  photometricInterpretation: string; // "MONOCHROME1", "MONOCHROME2", "RGB"
  bitsAllocated: number; // 8 or 16
  bitsStored: number;
  highBit: number;
  pixelRepresentation: number; // 0 = unsigned, 1 = 2's complement signed

  // Windowing & Rescale
  windowCenter: number; // Level
  windowWidth: number; // Width
  rescaleIntercept: number;
  rescaleSlope: number;

  // Raw Tag Dump for PACS Inspector
  rawTags: DicomTag[];
}

export interface DecodedMedicalSlice {
  sliceIndex: number;
  instanceNumber: number;
  sliceLocation?: number;
  width: number;
  height: number;
  pixelSpacingMm: number;
  // Hounsfield Units (for CT) or normalized intensity values
  pixelData: Float32Array;
  minVal: number;
  maxVal: number;
  windowCenter: number;
  windowWidth: number;
  rescaleSlope: number;
  rescaleIntercept: number;
  isColor?: boolean;
  colorData?: Uint8ClampedArray; // For RGB ultrasound or histology
  thumbnailUrl?: string;
}

export interface DicomSeriesUploadResult {
  scanId: string;
  patientId: string;
  title: string;
  modality: ModalityType;
  metadata: DicomMetadata;
  slices: DecodedMedicalSlice[];
  totalSlices: number;
  pixelSpacingMm: number;
  notes: string;
}
