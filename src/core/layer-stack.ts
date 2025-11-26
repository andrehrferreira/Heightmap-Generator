/**
 * Layer Stack - Manages a collection of layers and their composition.
 */

import { 
  Layer, 
  LayerType, 
  BlendMode,
  createLayer, 
  createLayerWithData,
  getLayerHeightAt,
  blendHeights,
  createLayerData,
} from './layer.js';
import { Grid } from './grid.js';

/**
 * Layer stack configuration.
 */
export interface LayerStackConfig {
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** Whether to auto-create base layer */
  autoCreateBase?: boolean;
}

/**
 * Layer stack manages multiple layers and their composition.
 */
export class LayerStack {
  private layers: Map<string, Layer> = new Map();
  private layerOrder: string[] = [];
  private width: number;
  private height: number;
  private nextId: number = 1;

  constructor(config: LayerStackConfig) {
    this.width = config.width;
    this.height = config.height;

    if (config.autoCreateBase !== false) {
      this.addLayer('base', 'Base Terrain', 'base');
    }
  }

  /**
   * Adds a new layer to the stack.
   */
  addLayer(id: string | null, name: string, type: LayerType, withData: boolean = true): Layer {
    const layerId = id || `layer-${this.nextId++}`;
    const order = this.layerOrder.length;

    const layer = withData
      ? createLayerWithData(layerId, name, type, this.width, this.height, order)
      : createLayer(layerId, name, type, order);

    this.layers.set(layerId, layer);
    this.layerOrder.push(layerId);

    return layer;
  }

  /**
   * Removes a layer from the stack.
   */
  removeLayer(id: string): boolean {
    if (!this.layers.has(id)) return false;

    // Don't allow removing base layer
    const layer = this.layers.get(id)!;
    if (layer.type === 'base') return false;

    this.layers.delete(id);
    this.layerOrder = this.layerOrder.filter(lid => lid !== id);
    this.reorderLayers();

    return true;
  }

  /**
   * Gets a layer by ID.
   */
  getLayer(id: string): Layer | undefined {
    return this.layers.get(id);
  }

  /**
   * Gets all layers in order (bottom to top).
   */
  getLayers(): Layer[] {
    return this.layerOrder.map(id => this.layers.get(id)!);
  }

  /**
   * Gets visible layers in order.
   */
  getVisibleLayers(): Layer[] {
    return this.getLayers().filter(l => l.visibility.visible);
  }

  /**
   * Gets active (non-locked, visible) layers.
   */
  getActiveLayers(): Layer[] {
    return this.getLayers().filter(l => 
      l.visibility.visible && 
      l.visibility.active && 
      !l.visibility.locked
    );
  }

  /**
   * Moves a layer to a new position in the stack.
   */
  moveLayer(id: string, newOrder: number): void {
    const currentIndex = this.layerOrder.indexOf(id);
    if (currentIndex === -1) return;

    // Don't move base layer from bottom
    const layer = this.layers.get(id)!;
    if (layer.type === 'base' && newOrder !== 0) return;

    // Remove from current position
    this.layerOrder.splice(currentIndex, 1);

    // Insert at new position
    const insertIndex = Math.max(0, Math.min(this.layerOrder.length, newOrder));
    this.layerOrder.splice(insertIndex, 0, id);

    this.reorderLayers();
  }

  /**
   * Moves a layer up in the stack.
   */
  moveLayerUp(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index < this.layerOrder.length - 1) {
      this.moveLayer(id, index + 1);
    }
  }

  /**
   * Moves a layer down in the stack.
   */
  moveLayerDown(id: string): void {
    const index = this.layerOrder.indexOf(id);
    if (index > 0) {
      this.moveLayer(id, index - 1);
    }
  }

  /**
   * Updates layer order numbers.
   */
  private reorderLayers(): void {
    this.layerOrder.forEach((id, index) => {
      const layer = this.layers.get(id);
      if (layer) {
        layer.order = index;
      }
    });
  }

  /**
   * Sets layer visibility.
   */
  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visibility.visible = visible;
    }
  }

  /**
   * Toggles layer lock state.
   */
  setLayerLocked(id: string, locked: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visibility.locked = locked;
    }
  }

  /**
   * Sets layer blend mode.
   */
  setLayerBlendMode(id: string, mode: BlendMode): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.blendMode = mode;
    }
  }

  /**
   * Sets layer opacity.
   */
  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.style.opacity = Math.max(0, Math.min(1, opacity));
    }
  }

  /**
   * Sets layer color.
   */
  setLayerColor(id: string, color: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.style.color = color;
    }
  }

  /**
   * Composes all visible layers into a single height array.
   */
  compose(): Float32Array {
    const result = new Float32Array(this.width * this.height);
    const visibleLayers = this.getVisibleLayers();

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        let composedHeight = 0;

        for (const layer of visibleLayers) {
          if (!layer.data || !layer.visibility.active) continue;

          const { offset, mask } = getLayerHeightAt(layer, x, y);
          if (mask === 0) continue;

          const alpha = (mask / 255) * layer.style.opacity;
          composedHeight = blendHeights(composedHeight, offset, layer.blendMode, alpha);
        }

        result[index] = composedHeight;
      }
    }

    return result;
  }

  /**
   * Applies layer composition to a Grid.
   */
  applyToGrid(grid: Grid): void {
    const composed = this.compose();
    const cols = grid.getCols();
    const rows = grid.getRows();

    for (let y = 0; y < Math.min(rows, this.height); y++) {
      for (let x = 0; x < Math.min(cols, this.width); x++) {
        const layerOffset = composed[y * this.width + x];
        const cell = grid.getCell(x, y);
        grid.setHeight(x, y, cell.height + layerOffset);
      }
    }
  }

  /**
   * Creates a layer from grid flags.
   */
  createLayerFromFlags(grid: Grid, flagName: keyof typeof grid extends never ? never : string, layerName: string, type: LayerType): Layer {
    const layer = this.addLayer(null, layerName, type);
    
    if (!layer.data) {
      layer.data = createLayerData(this.width, this.height);
    }

    grid.forEachCell((cell, x, y) => {
      const flags = cell.flags as Record<string, boolean>;
      if (flags[flagName]) {
        layer.data!.mask[y * this.width + x] = 255;
      }
    });

    return layer;
  }

  /**
   * Duplicates a layer.
   */
  duplicateLayer(id: string, newName?: string): Layer | null {
    const source = this.layers.get(id);
    if (!source) return null;

    const newLayer = this.addLayer(null, newName || `${source.name} (copy)`, source.type);
    
    // Copy properties
    newLayer.blendMode = source.blendMode;
    newLayer.style = { ...source.style };
    newLayer.visibility = { ...source.visibility };
    
    // Copy data if exists
    if (source.data && newLayer.data) {
      newLayer.data.heightOffsets.set(source.data.heightOffsets);
      newLayer.data.mask.set(source.data.mask);
    }

    return newLayer;
  }

  /**
   * Merges a layer into the one below it.
   */
  mergeDown(id: string): boolean {
    const index = this.layerOrder.indexOf(id);
    if (index <= 0) return false;

    const topLayer = this.layers.get(id);
    const bottomId = this.layerOrder[index - 1];
    const bottomLayer = this.layers.get(bottomId);

    if (!topLayer || !bottomLayer) return false;
    if (!topLayer.data || !bottomLayer.data) return false;

    // Merge top into bottom
    for (let i = 0; i < this.width * this.height; i++) {
      const topMask = topLayer.data.mask[i];
      if (topMask === 0) continue;

      const alpha = (topMask / 255) * topLayer.style.opacity;
      const bottomHeight = bottomLayer.data.heightOffsets[i];
      const topHeight = topLayer.data.heightOffsets[i];

      bottomLayer.data.heightOffsets[i] = blendHeights(bottomHeight, topHeight, topLayer.blendMode, alpha);
      bottomLayer.data.mask[i] = Math.max(bottomLayer.data.mask[i], topMask);
    }

    // Remove top layer
    this.removeLayer(id);

    return true;
  }

  /**
   * Flattens all visible layers into one.
   */
  flatten(): Layer {
    const composed = this.compose();
    
    // Create new base layer with composed heights
    const flatLayer = createLayerWithData('flattened', 'Flattened', 'base', this.width, this.height, 0);
    flatLayer.data!.heightOffsets.set(composed);
    flatLayer.data!.mask.fill(255);

    // Clear existing layers and add flattened
    this.layers.clear();
    this.layerOrder = [];
    this.layers.set(flatLayer.id, flatLayer);
    this.layerOrder.push(flatLayer.id);

    return flatLayer;
  }

  /**
   * Gets layer count.
   */
  get count(): number {
    return this.layers.size;
  }

  /**
   * Gets stack dimensions.
   */
  get dimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Serializes layer stack to JSON.
   */
  toJSON(): object {
    return {
      width: this.width,
      height: this.height,
      nextId: this.nextId,
      layerOrder: this.layerOrder,
      layers: this.getLayers().map(layer => ({
        id: layer.id,
        name: layer.name,
        type: layer.type,
        blendMode: layer.blendMode,
        order: layer.order,
        visibility: layer.visibility,
        style: layer.style,
        metadata: layer.metadata,
        // Convert typed arrays to regular arrays for JSON
        data: layer.data ? {
          width: layer.data.width,
          height: layer.data.height,
          heightOffsets: Array.from(layer.data.heightOffsets),
          mask: Array.from(layer.data.mask),
        } : null,
      })),
    };
  }

  /**
   * Creates layer stack from JSON.
   */
  static fromJSON(json: ReturnType<LayerStack['toJSON']>): LayerStack {
    const data = json as {
      width: number;
      height: number;
      nextId: number;
      layerOrder: string[];
      layers: Array<{
        id: string;
        name: string;
        type: LayerType;
        blendMode: BlendMode;
        order: number;
        visibility: Layer['visibility'];
        style: Layer['style'];
        metadata?: Record<string, unknown>;
        data: {
          width: number;
          height: number;
          heightOffsets: number[];
          mask: number[];
        } | null;
      }>;
    };

    const stack = new LayerStack({
      width: data.width,
      height: data.height,
      autoCreateBase: false,
    });

    stack.nextId = data.nextId;
    stack.layerOrder = data.layerOrder;

    for (const layerData of data.layers) {
      const layer: Layer = {
        id: layerData.id,
        name: layerData.name,
        type: layerData.type,
        blendMode: layerData.blendMode,
        order: layerData.order,
        visibility: layerData.visibility,
        style: layerData.style,
        metadata: layerData.metadata,
      };

      if (layerData.data) {
        layer.data = {
          width: layerData.data.width,
          height: layerData.data.height,
          heightOffsets: new Float32Array(layerData.data.heightOffsets),
          mask: new Uint8Array(layerData.data.mask),
        };
      }

      stack.layers.set(layer.id, layer);
    }

    return stack;
  }
}

