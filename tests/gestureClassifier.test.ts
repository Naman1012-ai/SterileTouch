import assert from 'node:assert';
import { GestureClassifier } from '../src/services/gestureClassifier.ts';
import { Point3D } from '../src/types/gestures.ts';

console.log('--- RUNNING STERILETOUCH GESTURE CLASSIFIER SUITE ---');

const classifier = new GestureClassifier();

// Helper to create synthetic 21 landmarks
function createMockHand(overrides: Partial<Record<number, Point3D>> = {}): Point3D[] {
  const points: Point3D[] = [];
  for (let i = 0; i < 21; i++) {
    // Default open palm in front of camera
    points.push({
      x: 0.5 + (i % 5) * 0.02,
      y: 0.6 - Math.floor(i / 4) * 0.08,
      z: 0,
      ...overrides[i],
    });
  }
  // Wrist
  points[0] = { x: 0.5, y: 0.8, z: 0, ...overrides[0] };
  // Middle MCP
  points[9] = { x: 0.5, y: 0.5, z: 0, ...overrides[9] };
  return points;
}

// 1. Edge Case: Empty / Null landmarks
{
  console.log('Test 1: Empty or deficient landmarks handling');
  const resEmpty = classifier.classify([]);
  assert.strictEqual(resEmpty.gesture, 'NONE');
  assert.strictEqual(resEmpty.handPresent, false);
  console.log('✓ Passed Test 1');
}

// 2. Pinch Detection: Thumb tip (4) and Index tip (8) touching
{
  console.log('Test 2: Pinch gesture recognition');
  const hand = createMockHand({
    0: { x: 0.5, y: 0.8, z: 0 },
    9: { x: 0.5, y: 0.5, z: 0 }, // palmScale = 0.3
    4: { x: 0.52, y: 0.35, z: 0 }, // Thumb tip
    8: { x: 0.53, y: 0.36, z: 0 }, // Index tip (dist = 0.014 -> normalized = 0.047 < 0.28)
  });

  const res = classifier.classify(hand);
  assert.strictEqual(res.handPresent, true);
  assert.strictEqual(res.gesture, 'PINCH');
  assert.strictEqual(res.pinchDistance < 0.28, true);
  console.log(`✓ Passed Test 2 (Pinch distance: ${res.pinchDistance.toFixed(3)})`);
}

// 3. Fist (Sterile Freeze): All fingers curled
{
  console.log('Test 3: Closed Fist (Sterile Freeze) recognition');
  classifier.reset();

  // Curled hand where tips are close to wrist
  const curledHand = createMockHand({
    0: { x: 0.5, y: 0.8, z: 0 }, // Wrist
    5: { x: 0.45, y: 0.6, z: 0 }, // Index MCP
    6: { x: 0.45, y: 0.55, z: 0 }, // Index PIP
    8: { x: 0.45, y: 0.7, z: 0 }, // Index tip curled back toward wrist
    9: { x: 0.5, y: 0.6, z: 0 },
    10: { x: 0.5, y: 0.55, z: 0 },
    12: { x: 0.5, y: 0.7, z: 0 }, // Middle tip curled
    13: { x: 0.55, y: 0.6, z: 0 },
    14: { x: 0.55, y: 0.55, z: 0 },
    16: { x: 0.55, y: 0.7, z: 0 }, // Ring tip curled
    17: { x: 0.6, y: 0.6, z: 0 },
    18: { x: 0.6, y: 0.55, z: 0 },
    20: { x: 0.6, y: 0.7, z: 0 }, // Pinky tip curled
    2: { x: 0.4, y: 0.65, z: 0 }, // Thumb MCP
    4: { x: 0.42, y: 0.66, z: 0 }, // Thumb tip tucked
  });

  // Run 5 frames to satisfy debouncer
  let lastRes = classifier.classify(curledHand);
  for (let f = 0; f < 5; f++) {
    lastRes = classifier.classify(curledHand);
  }

  assert.strictEqual(lastRes.isFist, true);
  assert.strictEqual(lastRes.gesture, 'FIST');
  console.log('✓ Passed Test 3 (Fist detected and debounced)');
}

// 4. Thumbs Up Recognition
{
  console.log('Test 4: Thumbs Up safety sign-off gesture');
  classifier.reset();

  const thumbsUpHand = createMockHand({
    0: { x: 0.5, y: 0.8, z: 0 }, // Wrist
    2: { x: 0.42, y: 0.6, z: 0 }, // Thumb MCP
    4: { x: 0.42, y: 0.42, z: 0 }, // Thumb Tip extended high above MCP
    5: { x: 0.48, y: 0.6, z: 0 },
    6: { x: 0.48, y: 0.55, z: 0 },
    8: { x: 0.48, y: 0.7, z: 0 }, // Index curled
    9: { x: 0.52, y: 0.6, z: 0 },
    10: { x: 0.52, y: 0.55, z: 0 },
    12: { x: 0.52, y: 0.7, z: 0 }, // Middle curled
    13: { x: 0.56, y: 0.6, z: 0 },
    14: { x: 0.56, y: 0.55, z: 0 },
    16: { x: 0.56, y: 0.7, z: 0 }, // Ring curled
    17: { x: 0.6, y: 0.6, z: 0 },
    18: { x: 0.6, y: 0.55, z: 0 },
    20: { x: 0.6, y: 0.7, z: 0 }, // Pinky curled
  });

  let lastRes = classifier.classify(thumbsUpHand);
  for (let f = 0; f < 4; f++) {
    lastRes = classifier.classify(thumbsUpHand);
  }

  assert.strictEqual(lastRes.isThumbsUp, true);
  assert.strictEqual(lastRes.gesture, 'THUMBS_UP');
  console.log('✓ Passed Test 4 (Thumbs-up verified)');
}

// 5. Point Gesture
{
  console.log('Test 5: Point / Cursor guidance gesture');
  classifier.reset();

  const pointHand = createMockHand({
    0: { x: 0.5, y: 0.8, z: 0 }, // Wrist
    5: { x: 0.48, y: 0.6, z: 0 },
    6: { x: 0.48, y: 0.5, z: 0 },
    8: { x: 0.48, y: 0.25, z: 0 }, // Index Tip extended far upwards
    9: { x: 0.52, y: 0.6, z: 0 },
    10: { x: 0.52, y: 0.55, z: 0 },
    12: { x: 0.52, y: 0.7, z: 0 }, // Middle curled
    13: { x: 0.56, y: 0.6, z: 0 },
    14: { x: 0.56, y: 0.55, z: 0 },
    16: { x: 0.56, y: 0.7, z: 0 }, // Ring curled
    17: { x: 0.6, y: 0.6, z: 0 },
    18: { x: 0.6, y: 0.55, z: 0 },
    20: { x: 0.6, y: 0.7, z: 0 }, // Pinky curled
  });

  const res = classifier.classify(pointHand);
  assert.strictEqual(res.gesture, 'POINT');
  assert.strictEqual(res.rawCursor.x, 0.48);
  assert.strictEqual(res.rawCursor.y, 0.25);
  console.log('✓ Passed Test 5 (Pointing coordinates matched to index tip)');
}

console.log('ALL 5 GESTURE ENGINE AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀');
