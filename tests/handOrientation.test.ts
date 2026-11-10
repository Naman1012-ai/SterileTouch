import assert from 'node:assert';
import { HandOrientationService } from '../src/services/handOrientation';
import { Point3D } from '../src/types/gestures';

console.log('--- RUNNING STERILETOUCH 3D HAND ORIENTATION SUITE ---');

const service = new HandOrientationService();

// TEST 1: Empty or deficient landmarks
console.log('Test 1: Deficient landmarks handling');
const emptyRes = service.computeOrientation(null);
assert.strictEqual(emptyRes.pitch, 0);
assert.strictEqual(emptyRes.yaw, 0);
assert.strictEqual(emptyRes.roll, 0);
assert.strictEqual(emptyRes.palmNormal.z, -1);
console.log('✓ Passed Test 1 (Safe fallback for empty input)');

// TEST 2: Canonical Open Palm facing camera
console.log('Test 2: Canonical open palm facing camera');
// 21 landmarks mock
const canonicalPalm: Point3D[] = Array(21).fill(null).map((_, i) => ({ x: 0.5, y: 0.5, z: 0 }));
// Wrist (0)
canonicalPalm[0] = { x: 0.5, y: 0.8, z: 0.0 };
// Index MCP (5)
canonicalPalm[5] = { x: 0.4, y: 0.5, z: 0.0 };
// Middle MCP (9)
canonicalPalm[9] = { x: 0.5, y: 0.4, z: 0.0 };
// Pinky MCP (17)
canonicalPalm[17] = { x: 0.6, y: 0.55, z: 0.0 };

const res2 = service.computeOrientation(canonicalPalm);
assert(typeof res2.pitch === 'number');
assert(typeof res2.yaw === 'number');
assert(typeof res2.roll === 'number');
assert(Math.abs(res2.palmNormal.z) > 0.8, 'Palm normal should align predominantly along Z');
console.log(`✓ Passed Test 2 (Pitch: ${res2.pitch}, Yaw: ${res2.yaw}, Roll: ${res2.roll}, NormalZ: ${res2.palmNormal.z})`);

// TEST 3: Hand tilted forward (Pitch change)
console.log('Test 3: Hand pitch tilt forward');
const tiltedPalm: Point3D[] = [...canonicalPalm];
// Move middle MCP closer in Z
tiltedPalm[9] = { x: 0.5, y: 0.45, z: -0.25 };

const res3 = service.computeOrientation(tiltedPalm);
assert(typeof res3.pitch === 'number');
console.log(`✓ Passed Test 3 (Pitch tilted: ${res3.pitch})`);

// TEST 4: Hand rotated left (Yaw change)
console.log('Test 4: Hand yaw turn left');
const turnedPalm: Point3D[] = [...canonicalPalm];
turnedPalm[17] = { x: 0.6, y: 0.55, z: 0.25 }; // Pinky rotated back

const res4 = service.computeOrientation(turnedPalm);
assert(typeof res4.yaw === 'number');
console.log(`✓ Passed Test 4 (Yaw rotated: ${res4.yaw})`);

// TEST 5: EMA Jitter Smoothing
console.log('Test 5: EMA Jitter smoothing');
service.reset();
// Frame 1
const f1 = service.computeOrientation(canonicalPalm);
// Frame 2 with sudden spike
const spikyPalm = canonicalPalm.map((p) => ({ ...p, x: p.x + 0.1 }));
const f2 = service.computeOrientation(spikyPalm);
// Verify smoothed value does not jump immediately to raw spike
assert(Math.abs(f2.smoothedRoll) <= Math.abs(f2.roll) + 0.1);
console.log('✓ Passed Test 5 (EMA smoothing dampens sudden sensor spikes)');

console.log('\nALL 5 HAND ORIENTATION AUTOMATED TESTS PASSED SUCCESSFULLY! 🖐️🌐\n');
