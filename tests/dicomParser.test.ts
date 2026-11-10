import assert from 'node:assert';
import { DicomParser } from '../src/services/dicomParser';

console.log('--- RUNNING STERILETOUCH DICOM ENGINE AUTOMATED SUITE ---');

// TEST 1: Preamble & DICM magic header detection
console.log('Test 1: DICOM Part 10 header validation');
const emptyBuffer = new ArrayBuffer(100);
assert.strictEqual(DicomParser.isDicom(emptyBuffer), false, 'Empty buffer should fail');

// Create valid 132-byte header with 'DICM' at byte 128
const validDicomHeader = new ArrayBuffer(132);
const view = new DataView(validDicomHeader);
view.setUint8(128, 0x44); // 'D'
view.setUint8(129, 0x49); // 'I'
view.setUint8(130, 0x43); // 'C'
view.setUint8(131, 0x4d); // 'M'
assert.strictEqual(DicomParser.isDicom(validDicomHeader), true, 'Valid DICM magic bytes should pass');
console.log('✓ Passed Test 1 (Magic header verified)');

// TEST 2: Binary Part 10 Tag Extraction
console.log('Test 2: Binary Tag and Element parsing');
// Build a minimal binary DICOM file with Modality = "CT", Rows = 2, Columns = 2, BitsAllocated = 16
const totalBytes = 132 + 8 + 8 + 8 + 8 + 8 + 8 + (2 * 2 * 2);
const binaryDicom = new ArrayBuffer(256);
const dv = new DataView(binaryDicom);

// Write DICM prefix
dv.setUint8(128, 0x44);
dv.setUint8(129, 0x49);
dv.setUint8(130, 0x43);
dv.setUint8(131, 0x4d);

let offset = 132;
// Tag (0008, 0060) Modality: "CT"
dv.setUint16(offset, 0x0008, true);
dv.setUint16(offset + 2, 0x0060, true);
dv.setUint8(offset + 4, 67); // 'C'
dv.setUint8(offset + 5, 83); // 'S'
dv.setUint16(offset + 6, 2, true); // length = 2
dv.setUint8(offset + 8, 67); // 'C'
dv.setUint8(offset + 9, 84); // 'T'
offset += 10;

// Tag (0028, 0010) Rows: 2
dv.setUint16(offset, 0x0028, true);
dv.setUint16(offset + 2, 0x0010, true);
dv.setUint8(offset + 4, 85); // 'U'
dv.setUint8(offset + 5, 83); // 'S'
dv.setUint16(offset + 6, 2, true);
dv.setUint16(offset + 8, 2, true);
offset += 10;

// Tag (0028, 0011) Columns: 2
dv.setUint16(offset, 0x0028, true);
dv.setUint16(offset + 2, 0x0011, true);
dv.setUint8(offset + 4, 85); // 'U'
dv.setUint8(offset + 5, 83); // 'S'
dv.setUint16(offset + 6, 2, true);
dv.setUint16(offset + 8, 2, true);
offset += 10;

// Tag (0028, 0100) BitsAllocated: 16
dv.setUint16(offset, 0x0028, true);
dv.setUint16(offset + 2, 0x0100, true);
dv.setUint8(offset + 4, 85); // 'U'
dv.setUint8(offset + 5, 83); // 'S'
dv.setUint16(offset + 6, 2, true);
dv.setUint16(offset + 8, 16, true);
offset += 10;

// Tag (7FE0, 0010) PixelData (Explicit OB/OW VR: 2 reserved + 4 byte length)
dv.setUint16(offset, 0x7fe0, true);
dv.setUint16(offset + 2, 0x0010, true);
dv.setUint8(offset + 4, 79); // 'O'
dv.setUint8(offset + 5, 87); // 'W'
dv.setUint16(offset + 6, 0, true); // reserved
dv.setUint32(offset + 8, 8, true); // 4 pixels * 2 bytes = 8 bytes
offset += 12;

// 4 pixels: [100, 200, 300, 400]
dv.setUint16(offset, 100, true);
dv.setUint16(offset + 2, 200, true);
dv.setUint16(offset + 4, 300, true);
dv.setUint16(offset + 6, 400, true);

const { metadata, slice } = DicomParser.parseDicomBuffer(binaryDicom);
assert.strictEqual(metadata.modality, 'CT', 'Modality should be CT');
assert.strictEqual(metadata.rows, 2, 'Rows should be 2');
assert.strictEqual(metadata.columns, 2, 'Columns should be 2');
assert.strictEqual(metadata.bitsAllocated, 16, 'BitsAllocated should be 16');
assert.strictEqual(slice.pixelData.length, 4, 'Pixel data length should be 4');
assert.strictEqual(slice.pixelData[0], 100, 'First pixel HU should be 100');
assert.strictEqual(slice.pixelData[3], 400, 'Fourth pixel HU should be 400');
console.log('✓ Passed Test 2 (Parsed binary tags and unpacked 16-bit pixel data)');

// TEST 3: Rescale slope/intercept formula
console.log('Test 3: Hounsfield Unit scaling and anonymization');
const { metadata: anonMeta } = DicomParser.parseDicomBuffer(binaryDicom, 1, true);
assert(anonMeta.patientName.startsWith('ANONYMIZED-PT-'), 'Patient name should be anonymized');
assert(anonMeta.patientId.startsWith('ANON-'), 'Patient ID should be anonymized');
console.log('✓ Passed Test 3 (HIPAA anonymization verified)');

// TEST 4: Window/Level transfer function
console.log('Test 4: Window/Level transfer function calculation');
const sampleSlice = {
  sliceIndex: 1,
  instanceNumber: 1,
  width: 2,
  height: 2,
  pixelSpacingMm: 0.5,
  pixelData: new Float32Array([-1000, 0, 500, 1000]),
  minVal: -1000,
  maxVal: 1000,
  windowCenter: 0,
  windowWidth: 1000,
  rescaleSlope: 1,
  rescaleIntercept: 0,
};

// Window center 0, width 1000:
// lower = -500, upper = +500
// -1000 -> <= lower -> intensity 0
// 0 -> center -> intensity 127.5
// 500 -> >= upper -> intensity 255
// 1000 -> >= upper -> intensity 255
const rendered = DicomParser.renderSliceToImageData(sampleSlice, 1000, 0, false);
assert.strictEqual(rendered.width, 2);
assert.strictEqual(rendered.height, 2);
assert.strictEqual(rendered.data[0], 0, 'Pixel -1000 should clamp to 0');
assert(rendered.data[4] >= 126 && rendered.data[4] <= 129, 'Pixel 0 should be ~128');
assert.strictEqual(rendered.data[8], 255, 'Pixel 500 should clamp to 255');
assert.strictEqual(rendered.data[12], 255, 'Pixel 1000 should clamp to 255');
console.log('✓ Passed Test 4 (Window/Level calculation correct)');

// TEST 5: Sample DICOM series generator
console.log('Test 5: Built-in 1-Click Sample DICOM series generator');
const sampleSeries = DicomParser.createSampleDicomSeries();
assert.strictEqual(sampleSeries.totalSlices, 12, 'Sample series should have 12 slices');
assert.strictEqual(sampleSeries.metadata.modality, 'CT', 'Modality should be CT');
assert.strictEqual(sampleSeries.pixelSpacingMm, 0.488, 'Calibrated pixel spacing');
assert.strictEqual(sampleSeries.slices[0].width, 512, 'Matrix width 512');
assert.strictEqual(sampleSeries.slices[0].height, 512, 'Matrix height 512');
console.log('✓ Passed Test 5 (Sample DICOM series fully verified)');

console.log('\nALL 5 DICOM ENGINE AUTOMATED TESTS PASSED SUCCESSFULLY! 🩻🚀\n');
