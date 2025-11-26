/**
 * Unit tests for Stamp System.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  StampLibrary,
  StampDefinition,
  StampInstance,
  calculateStampHeight,
  createStampInstance,
} from '../../../src/core/stamp.js';

describe('Stamp System', () => {
  describe('StampLibrary', () => {
    let library: StampLibrary;

    beforeEach(() => {
      library = new StampLibrary();
    });

    it('should load builtin stamps on creation', () => {
      const stamps = library.getAllStamps();
      expect(stamps.length).toBeGreaterThan(0);
    });

    it('should have mountain stamps', () => {
      const mountains = library.getStampsByCategory('mountain');
      expect(mountains.length).toBeGreaterThan(0);
      expect(mountains.every(s => s.category === 'mountain')).toBe(true);
    });

    it('should have valley stamps', () => {
      const valleys = library.getStampsByCategory('valley');
      expect(valleys.length).toBeGreaterThan(0);
    });

    it('should have water stamps', () => {
      const water = library.getStampsByCategory('water');
      expect(water.length).toBeGreaterThan(0);
    });

    it('should get stamp by ID', () => {
      const stamp = library.getStamp('mountain-small');
      expect(stamp).toBeDefined();
      expect(stamp?.name).toBe('Small Hill');
    });

    it('should return undefined for non-existent stamp', () => {
      const stamp = library.getStamp('non-existent');
      expect(stamp).toBeUndefined();
    });

    describe('createCustomStamp', () => {
      it('should create custom stamp with height data', () => {
        const heightData = new Float32Array(100);
        heightData.fill(50);

        const stamp = library.createCustomStamp('My Stamp', 10, 10, heightData);

        expect(stamp.id).toMatch(/^custom-\d+$/);
        expect(stamp.name).toBe('My Stamp');
        expect(stamp.shape).toBe('custom');
        expect(stamp.heightData).toBe(heightData);
      });

      it('should add custom stamp to library', () => {
        const heightData = new Float32Array(25);
        library.createCustomStamp('Test', 5, 5, heightData);

        const customs = library.getStampsByCategory('custom');
        expect(customs.length).toBe(1);
      });
    });

    describe('removeStamp', () => {
      it('should remove custom stamps', () => {
        const heightData = new Float32Array(25);
        const stamp = library.createCustomStamp('Test', 5, 5, heightData);

        const result = library.removeStamp(stamp.id);

        expect(result).toBe(true);
        expect(library.getStamp(stamp.id)).toBeUndefined();
      });

      it('should not remove builtin stamps', () => {
        const result = library.removeStamp('mountain-small');
        expect(result).toBe(false);
        expect(library.getStamp('mountain-small')).toBeDefined();
      });
    });
  });

  describe('createStampInstance', () => {
    it('should create instance with defaults', () => {
      const instance = createStampInstance('mountain-small', 100, 200);

      expect(instance.stampId).toBe('mountain-small');
      expect(instance.x).toBe(100);
      expect(instance.y).toBe(200);
      expect(instance.scale).toBe(1);
      expect(instance.rotation).toBe(0);
      expect(instance.heightMultiplier).toBe(1);
      expect(instance.visible).toBe(true);
    });

    it('should create instance with custom options', () => {
      const instance = createStampInstance('mountain-small', 50, 50, {
        scale: 2,
        rotation: 45,
        heightMultiplier: 0.5,
        visible: false,
        layerId: 'my-layer',
      });

      expect(instance.scale).toBe(2);
      expect(instance.rotation).toBe(45);
      expect(instance.heightMultiplier).toBe(0.5);
      expect(instance.visible).toBe(false);
      expect(instance.layerId).toBe('my-layer');
    });

    it('should generate unique IDs', () => {
      const inst1 = createStampInstance('mountain-small', 0, 0);
      const inst2 = createStampInstance('mountain-small', 0, 0);
      expect(inst1.id).not.toBe(inst2.id);
    });
  });

  describe('calculateStampHeight', () => {
    let library: StampLibrary;
    let mountainStamp: StampDefinition;

    beforeEach(() => {
      library = new StampLibrary();
      mountainStamp = library.getStamp('mountain-small')!;
    });

    it('should return max height at center', () => {
      const instance = createStampInstance('mountain-small', 50, 50);
      const height = calculateStampHeight(mountainStamp, instance, 50, 50);
      
      // Center should be close to full height
      expect(height).toBeGreaterThan(mountainStamp.heightOffset * 0.9);
    });

    it('should return reduced height at edges', () => {
      const instance = createStampInstance('mountain-small', 50, 50);
      const halfRadius = mountainStamp.width / 2 - 1;
      
      const edgeHeight = calculateStampHeight(mountainStamp, instance, 50 + halfRadius, 50);
      const centerHeight = calculateStampHeight(mountainStamp, instance, 50, 50);
      
      expect(edgeHeight).toBeLessThan(centerHeight);
    });

    it('should return zero outside stamp', () => {
      const instance = createStampInstance('mountain-small', 50, 50);
      const farAway = calculateStampHeight(mountainStamp, instance, 200, 200);
      
      expect(farAway).toBe(0);
    });

    it('should apply scale', () => {
      const instance1 = createStampInstance('mountain-small', 50, 50, { scale: 1 });
      const instance2 = createStampInstance('mountain-small', 50, 50, { scale: 2 });
      
      // At distance equal to original radius, scaled stamp should still have height
      const radius = mountainStamp.width / 2;
      const height1 = calculateStampHeight(mountainStamp, instance1, 50 + radius, 50);
      const height2 = calculateStampHeight(mountainStamp, instance2, 50 + radius, 50);
      
      expect(height1).toBe(0); // Original: outside
      expect(height2).toBeGreaterThan(0); // Scaled: inside
    });

    it('should apply height multiplier', () => {
      const instance1 = createStampInstance('mountain-small', 50, 50, { heightMultiplier: 1 });
      const instance2 = createStampInstance('mountain-small', 50, 50, { heightMultiplier: 0.5 });
      
      const height1 = calculateStampHeight(mountainStamp, instance1, 50, 50);
      const height2 = calculateStampHeight(mountainStamp, instance2, 50, 50);
      
      expect(height2).toBeCloseTo(height1 * 0.5, 1);
    });

    it('should handle valley (negative height) stamps', () => {
      const valleyStamp = library.getStamp('valley-small')!;
      const instance = createStampInstance('valley-small', 50, 50);
      
      const height = calculateStampHeight(valleyStamp, instance, 50, 50);
      
      expect(height).toBeLessThan(0);
    });

    it('should handle square stamps', () => {
      const plateauStamp = library.getStamp('plateau-small')!;
      const instance = createStampInstance('plateau-small', 50, 50);
      
      // Check corners are within bounds
      const halfSize = plateauStamp.width / 2 - 1;
      const cornerHeight = calculateStampHeight(plateauStamp, instance, 50 + halfSize, 50 + halfSize);
      
      expect(cornerHeight).toBeGreaterThan(0);
    });
  });
});

