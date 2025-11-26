/**
 * Unit tests for LayerStack.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LayerStack } from '../../../src/core/layer-stack.js';
import { setLayerHeightAt, getLayerHeightAt } from '../../../src/core/layer.js';

describe('LayerStack', () => {
  let stack: LayerStack;

  beforeEach(() => {
    stack = new LayerStack({ width: 50, height: 50 });
  });

  describe('constructor', () => {
    it('should create stack with base layer by default', () => {
      expect(stack.count).toBe(1);
      const layers = stack.getLayers();
      expect(layers[0].type).toBe('base');
    });

    it('should not create base layer when autoCreateBase is false', () => {
      const noBaseStack = new LayerStack({ width: 50, height: 50, autoCreateBase: false });
      expect(noBaseStack.count).toBe(0);
    });

    it('should store correct dimensions', () => {
      expect(stack.dimensions.width).toBe(50);
      expect(stack.dimensions.height).toBe(50);
    });
  });

  describe('addLayer', () => {
    it('should add layer with generated ID if null', () => {
      const layer = stack.addLayer(null, 'Mountains', 'mountains');
      expect(layer.id).toMatch(/^layer-\d+$/);
      expect(layer.name).toBe('Mountains');
      expect(layer.type).toBe('mountains');
    });

    it('should add layer with provided ID', () => {
      const layer = stack.addLayer('my-layer', 'My Layer', 'roads');
      expect(layer.id).toBe('my-layer');
    });

    it('should increment order for each layer', () => {
      const layer1 = stack.addLayer(null, 'L1', 'mountains');
      const layer2 = stack.addLayer(null, 'L2', 'rivers');
      expect(layer1.order).toBeLessThan(layer2.order);
    });

    it('should create layer with data by default', () => {
      const layer = stack.addLayer(null, 'Test', 'mountains');
      expect(layer.data).toBeDefined();
      expect(layer.data?.width).toBe(50);
    });

    it('should create layer without data when specified', () => {
      const layer = stack.addLayer(null, 'Test', 'mountains', false);
      expect(layer.data).toBeUndefined();
    });
  });

  describe('removeLayer', () => {
    it('should remove non-base layer', () => {
      const layer = stack.addLayer('remove-me', 'Remove', 'mountains');
      const initialCount = stack.count;
      
      const result = stack.removeLayer('remove-me');
      
      expect(result).toBe(true);
      expect(stack.count).toBe(initialCount - 1);
      expect(stack.getLayer('remove-me')).toBeUndefined();
    });

    it('should not remove base layer', () => {
      const result = stack.removeLayer('base');
      expect(result).toBe(false);
      expect(stack.getLayer('base')).toBeDefined();
    });

    it('should return false for non-existent layer', () => {
      const result = stack.removeLayer('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getLayer', () => {
    it('should return layer by ID', () => {
      const added = stack.addLayer('test', 'Test', 'mountains');
      const retrieved = stack.getLayer('test');
      expect(retrieved).toBe(added);
    });

    it('should return undefined for non-existent ID', () => {
      expect(stack.getLayer('non-existent')).toBeUndefined();
    });
  });

  describe('getLayers', () => {
    it('should return layers in order', () => {
      stack.addLayer('l1', 'Layer 1', 'mountains');
      stack.addLayer('l2', 'Layer 2', 'rivers');
      
      const layers = stack.getLayers();
      
      expect(layers[0].id).toBe('base');
      expect(layers[1].id).toBe('l1');
      expect(layers[2].id).toBe('l2');
    });
  });

  describe('getVisibleLayers', () => {
    it('should return only visible layers', () => {
      stack.addLayer('visible', 'Visible', 'mountains');
      const hidden = stack.addLayer('hidden', 'Hidden', 'rivers');
      hidden.visibility.visible = false;
      
      const visible = stack.getVisibleLayers();
      
      expect(visible.length).toBe(2); // base + visible
      expect(visible.some(l => l.id === 'hidden')).toBe(false);
    });
  });

  describe('moveLayer', () => {
    it('should move layer to new position', () => {
      stack.addLayer('l1', 'L1', 'mountains');
      stack.addLayer('l2', 'L2', 'rivers');
      stack.addLayer('l3', 'L3', 'roads');
      
      stack.moveLayer('l1', 2);
      
      const layers = stack.getLayers();
      expect(layers[0].id).toBe('base');
      expect(layers[1].id).toBe('l2');
      expect(layers[2].id).toBe('l1');
      expect(layers[3].id).toBe('l3');
    });

    it('should not move base layer from bottom', () => {
      stack.addLayer('l1', 'L1', 'mountains');
      
      stack.moveLayer('base', 1);
      
      const layers = stack.getLayers();
      expect(layers[0].id).toBe('base');
    });
  });

  describe('visibility controls', () => {
    it('should toggle visibility', () => {
      stack.addLayer('test', 'Test', 'mountains');
      
      stack.setLayerVisibility('test', false);
      expect(stack.getLayer('test')?.visibility.visible).toBe(false);
      
      stack.setLayerVisibility('test', true);
      expect(stack.getLayer('test')?.visibility.visible).toBe(true);
    });

    it('should toggle lock', () => {
      stack.addLayer('test', 'Test', 'mountains');
      
      stack.setLayerLocked('test', true);
      expect(stack.getLayer('test')?.visibility.locked).toBe(true);
    });
  });

  describe('style controls', () => {
    it('should set blend mode', () => {
      stack.addLayer('test', 'Test', 'mountains');
      
      stack.setLayerBlendMode('test', 'multiply');
      expect(stack.getLayer('test')?.blendMode).toBe('multiply');
    });

    it('should set opacity with clamping', () => {
      stack.addLayer('test', 'Test', 'mountains');
      
      stack.setLayerOpacity('test', 0.5);
      expect(stack.getLayer('test')?.style.opacity).toBe(0.5);
      
      stack.setLayerOpacity('test', 2);
      expect(stack.getLayer('test')?.style.opacity).toBe(1);
      
      stack.setLayerOpacity('test', -1);
      expect(stack.getLayer('test')?.style.opacity).toBe(0);
    });

    it('should set color', () => {
      stack.addLayer('test', 'Test', 'mountains');
      
      stack.setLayerColor('test', '#ff0000');
      expect(stack.getLayer('test')?.style.color).toBe('#ff0000');
    });
  });

  describe('compose', () => {
    it('should compose visible layers with correct height', () => {
      // Create a fresh stack without base layer
      const testStack = new LayerStack({ width: 10, height: 10, autoCreateBase: false });
      const layer = testStack.addLayer('test', 'Test', 'mountains'); // Note: 'mountains' plural
      
      // Verify layer is properly created
      expect(layer.data).toBeDefined();
      expect(layer.visibility.visible).toBe(true);
      expect(layer.visibility.active).toBe(true);
      expect(layer.style.opacity).toBe(1);
      
      // Set height at a specific point
      setLayerHeightAt(layer, 5, 5, 100, 255);
      
      // Verify the value was set
      const check = getLayerHeightAt(layer, 5, 5);
      expect(check.offset).toBe(100);
      expect(check.mask).toBe(255);
      
      // Compose and check result
      const composed = testStack.compose();
      const index = 5 * 10 + 5;
      
      // Should have the height (add blend: 0 + 100*1 = 100)
      expect(composed[index]).toBe(100);
    });

    it('should skip hidden layers', () => {
      const testStack = new LayerStack({ width: 10, height: 10, autoCreateBase: false });
      const layer = testStack.addLayer('test', 'Test', 'mountains');
      setLayerHeightAt(layer, 5, 5, 100, 255);
      layer.visibility.visible = false;
      
      const composed = testStack.compose();
      
      expect(composed[5 * 10 + 5]).toBe(0);
    });

    it('should skip inactive layers', () => {
      const testStack = new LayerStack({ width: 10, height: 10, autoCreateBase: false });
      const layer = testStack.addLayer('test', 'Test', 'mountains');
      setLayerHeightAt(layer, 5, 5, 100, 255);
      layer.visibility.active = false;
      
      const composed = testStack.compose();
      
      expect(composed[5 * 10 + 5]).toBe(0);
    });
  });

  describe('duplicateLayer', () => {
    it('should duplicate layer with new name', () => {
      const original = stack.addLayer('orig', 'Original', 'mountains');
      setLayerHeightAt(original, 10, 10, 50, 128);
      
      const duplicate = stack.duplicateLayer('orig', 'Copy');
      
      expect(duplicate).not.toBeNull();
      expect(duplicate?.name).toBe('Copy');
      expect(duplicate?.type).toBe(original.type);
      
      const origHeight = getLayerHeightAt(original, 10, 10);
      const copyHeight = getLayerHeightAt(duplicate!, 10, 10);
      expect(copyHeight.offset).toBe(origHeight.offset);
    });

    it('should return null for non-existent layer', () => {
      const result = stack.duplicateLayer('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize', () => {
      const layer = stack.addLayer('test', 'Test Layer', 'mountains');
      setLayerHeightAt(layer, 5, 5, 100, 200);
      layer.style.color = '#ff0000';
      
      const json = stack.toJSON();
      const restored = LayerStack.fromJSON(json);
      
      expect(restored.count).toBe(stack.count);
      
      const restoredLayer = restored.getLayer('test');
      expect(restoredLayer?.name).toBe('Test Layer');
      expect(restoredLayer?.style.color).toBe('#ff0000');
      
      const height = getLayerHeightAt(restoredLayer!, 5, 5);
      expect(height.offset).toBe(100);
      expect(height.mask).toBe(200);
    });
  });
});

