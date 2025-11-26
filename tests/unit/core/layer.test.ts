/**
 * Unit tests for Layer System.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Layer,
  LayerType,
  BlendMode,
  createLayer,
  createLayerWithData,
  createLayerData,
  createLayerVisibility,
  createLayerStyle,
  setLayerHeightAt,
  getLayerHeightAt,
  clearLayerData,
  applyBrush,
  blendHeights,
} from '../../../src/core/layer.js';

describe('Layer System', () => {
  describe('createLayerData', () => {
    it('should create layer data with correct dimensions', () => {
      const data = createLayerData(100, 50);
      expect(data.width).toBe(100);
      expect(data.height).toBe(50);
      expect(data.heightOffsets.length).toBe(5000);
      expect(data.mask.length).toBe(5000);
    });

    it('should initialize arrays with zeros', () => {
      const data = createLayerData(10, 10);
      expect(data.heightOffsets.every(v => v === 0)).toBe(true);
      expect(data.mask.every(v => v === 0)).toBe(true);
    });
  });

  describe('createLayerVisibility', () => {
    it('should create default visibility state', () => {
      const visibility = createLayerVisibility();
      expect(visibility.visible).toBe(true);
      expect(visibility.locked).toBe(false);
      expect(visibility.active).toBe(true);
    });
  });

  describe('createLayerStyle', () => {
    it('should create style based on layer type', () => {
      const baseStyle = createLayerStyle('base');
      expect(baseStyle.color).toBe('#3fb950');
      expect(baseStyle.opacity).toBe(1);

      const roadsStyle = createLayerStyle('roads');
      expect(roadsStyle.color).toBe('#d29922');

      const riversStyle = createLayerStyle('rivers');
      expect(riversStyle.color).toBe('#58a6ff');
    });
  });

  describe('createLayer', () => {
    it('should create layer with correct properties', () => {
      const layer = createLayer('test', 'Test Layer', 'mountains', 5);
      expect(layer.id).toBe('test');
      expect(layer.name).toBe('Test Layer');
      expect(layer.type).toBe('mountains');
      expect(layer.order).toBe(5);
      expect(layer.visibility.visible).toBe(true);
    });

    it('should set correct blend mode for base layer', () => {
      const layer = createLayer('base', 'Base', 'base');
      expect(layer.blendMode).toBe('normal');
    });

    it('should set add blend mode for non-base layers', () => {
      const layer = createLayer('test', 'Test', 'roads');
      expect(layer.blendMode).toBe('add');
    });
  });

  describe('createLayerWithData', () => {
    it('should create layer with data initialized', () => {
      const layer = createLayerWithData('test', 'Test', 'mountains', 100, 100);
      expect(layer.data).toBeDefined();
      expect(layer.data?.width).toBe(100);
      expect(layer.data?.height).toBe(100);
    });
  });

  describe('Layer height operations', () => {
    let layer: Layer;

    beforeEach(() => {
      layer = createLayerWithData('test', 'Test', 'mountains', 50, 50);
    });

    it('should set and get height at position', () => {
      setLayerHeightAt(layer, 10, 20, 100, 255);
      const result = getLayerHeightAt(layer, 10, 20);
      expect(result.offset).toBe(100);
      expect(result.mask).toBe(255);
    });

    it('should handle out of bounds gracefully', () => {
      setLayerHeightAt(layer, -1, 0, 100);
      setLayerHeightAt(layer, 100, 0, 100);
      
      const result1 = getLayerHeightAt(layer, -1, 0);
      const result2 = getLayerHeightAt(layer, 100, 0);
      
      expect(result1.offset).toBe(0);
      expect(result2.offset).toBe(0);
    });

    it('should clamp mask value to 0-255', () => {
      setLayerHeightAt(layer, 5, 5, 50, 300);
      const result = getLayerHeightAt(layer, 5, 5);
      expect(result.mask).toBe(255);

      setLayerHeightAt(layer, 5, 5, 50, -50);
      const result2 = getLayerHeightAt(layer, 5, 5);
      expect(result2.mask).toBe(0);
    });

    it('should return zero for layer without data', () => {
      const noDataLayer = createLayer('nodata', 'No Data', 'roads');
      const result = getLayerHeightAt(noDataLayer, 0, 0);
      expect(result.offset).toBe(0);
      expect(result.mask).toBe(0);
    });
  });

  describe('clearLayerData', () => {
    it('should clear all layer data', () => {
      const layer = createLayerWithData('test', 'Test', 'mountains', 20, 20);
      setLayerHeightAt(layer, 5, 5, 100, 255);
      setLayerHeightAt(layer, 10, 10, 200, 128);
      
      clearLayerData(layer);
      
      const result1 = getLayerHeightAt(layer, 5, 5);
      const result2 = getLayerHeightAt(layer, 10, 10);
      
      expect(result1.offset).toBe(0);
      expect(result1.mask).toBe(0);
      expect(result2.offset).toBe(0);
      expect(result2.mask).toBe(0);
    });
  });

  describe('applyBrush', () => {
    it('should apply circular brush with falloff', () => {
      const layer = createLayerWithData('test', 'Test', 'mountains', 50, 50);
      applyBrush(layer, 25, 25, 10, 100, 1);
      
      // Center should have full height
      const center = getLayerHeightAt(layer, 25, 25);
      expect(center.offset).toBeGreaterThan(90);
      
      // Edge should have reduced height
      const edge = getLayerHeightAt(layer, 33, 25);
      expect(edge.offset).toBeLessThan(50);
      
      // Outside should be zero
      const outside = getLayerHeightAt(layer, 40, 25);
      expect(outside.offset).toBe(0);
    });

    it('should accumulate brush strokes', () => {
      const layer = createLayerWithData('test', 'Test', 'mountains', 50, 50);
      applyBrush(layer, 25, 25, 5, 50, 1);
      applyBrush(layer, 25, 25, 5, 50, 1);
      
      const center = getLayerHeightAt(layer, 25, 25);
      expect(center.offset).toBeGreaterThan(90);
    });
  });

  describe('blendHeights', () => {
    it('should blend with normal mode', () => {
      expect(blendHeights(100, 50, 'normal', 1)).toBe(50);
      expect(blendHeights(100, 50, 'normal', 0.5)).toBe(75);
      expect(blendHeights(100, 50, 'normal', 0)).toBe(100);
    });

    it('should blend with add mode', () => {
      expect(blendHeights(100, 50, 'add', 1)).toBe(150);
      expect(blendHeights(100, 50, 'add', 0.5)).toBe(125);
    });

    it('should blend with max mode', () => {
      expect(blendHeights(100, 50, 'max', 1)).toBe(150);
      expect(blendHeights(100, -50, 'max', 1)).toBe(100);
    });

    it('should blend with min mode', () => {
      expect(blendHeights(100, -50, 'min', 1)).toBe(50);
      expect(blendHeights(100, 50, 'min', 1)).toBe(100);
    });
  });
});

