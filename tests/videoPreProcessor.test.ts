import { describe, it } from 'node:test';
import assert from 'node:assert';
import { VideoPreProcessor } from '../src/services/videoPreProcessor';

describe('SterileTouch Video Pre-Processor for OT Harsh Lighting & Nitrile Gloves', () => {
  it('Initializes with Blue Nitrile glove mode and Anti-Glare enabled', () => {
    const processor = new VideoPreProcessor();
    assert.strictEqual(processor.getGloveMode(), 'BLUE_NITRILE');
    assert.strictEqual(processor.isAntiGlareEnabled(), true);
  });

  it('Supports updating glove mode between Nitrile, Latex, White, and Bare Skin', () => {
    const processor = new VideoPreProcessor();

    processor.setGloveMode('GREEN_LATEX');
    assert.strictEqual(processor.getGloveMode(), 'GREEN_LATEX');

    processor.setGloveMode('WHITE_LATEX');
    assert.strictEqual(processor.getGloveMode(), 'WHITE_LATEX');

    processor.setGloveMode('BARE_SKIN');
    assert.strictEqual(processor.getGloveMode(), 'BARE_SKIN');
  });

  it('Toggles anti-glare specular highlight clamping state', () => {
    const processor = new VideoPreProcessor();
    processor.setAntiGlareEnabled(false);
    assert.strictEqual(processor.isAntiGlareEnabled(), false);

    processor.setAntiGlareEnabled(true);
    assert.strictEqual(processor.isAntiGlareEnabled(), true);
  });

  it('Returns a valid default lighting assessment', () => {
    const processor = new VideoPreProcessor();
    const assessment = processor.getLightingAssessment();
    assert.ok(assessment);
    assert.strictEqual(assessment.activeGloveMode, 'BLUE_NITRILE');
    assert.ok(['HARSH_OVERHEAD_GLARE', 'OPTIMAL_SURGICAL', 'DIMMED_LAPAROSCOPIC'].includes(assessment.luxCategory));
  });
});
