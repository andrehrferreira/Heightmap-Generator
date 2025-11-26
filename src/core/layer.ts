/**
 * Layer System for Heightmap Generator
 * Provides Photoshop-like layer management for terrain features.
 */

/**
 * Types of terrain layers.
 */
export type LayerType = 
  | 'base'      // Base terrain (levels)
  | 'roads'     // Road network
  | 'rivers'    // River systems
  | 'lakes'     // Lake areas
  | 'mountains' // Mountain features
  | 'canyons'   // Canyon/valley features
  | 'custom';   // User-defined custom layers

/**
 * Blend modes for combining layers.
 */
export type BlendMode = 
  | 'normal'   // Replace underlying
  | 'add'      // Add heights
  | 'multiply' // Multiply heights
  | 'overlay'  // Soft light blend
  | 'max'      // Take maximum height
  | 'min';     // Take minimum height

/**
 * Layer visibility state.
 */
export interface LayerVisibility {
  /** Whether layer is visible in preview */
  visible: boolean;
  /** Whether layer is editable */
  locked: boolean;
  /** Whether layer affects generation */
  active: boolean;
}

/**
 * Layer style for preview rendering.
 */
export interface LayerStyle {
  /** Primary color (hex) */
  color: string;
  /** Secondary/accent color (hex) */
  accentColor?: string;
  /** Opacity (0-1) */
  opacity: number;
  /** Pattern for overlay (optional) */
  pattern?: 'solid' | 'striped' | 'dotted' | 'hatched';
}

/**
 * Layer data containing height modifications.
 */
export interface LayerData {
  /** Width in cells */
  width: number;
  /** Height in cells */
  height: number;
  /** Height offset data (Float32Array for performance) */
  heightOffsets: Float32Array;
  /** Mask data (Uint8Array: 0 = not affected, 255 = fully affected) */
  mask: Uint8Array;
}

/**
 * Layer interface representing a single terrain layer.
 */
export interface Layer {
  /** Unique layer identifier */
  id: string;
  /** Human-readable layer name */
  name: string;
  /** Layer type */
  type: LayerType;
  /** Blend mode for combining with layers below */
  blendMode: BlendMode;
  /** Layer order (higher = on top) */
  order: number;
  /** Visibility settings */
  visibility: LayerVisibility;
  /** Visual style */
  style: LayerStyle;
  /** Layer data (optional, base layer may not have data) */
  data?: LayerData;
  /** Metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Creates an empty layer data container.
 */
export function createLayerData(width: number, height: number): LayerData {
  const size = width * height;
  return {
    width,
    height,
    heightOffsets: new Float32Array(size),
    mask: new Uint8Array(size),
  };
}

/**
 * Creates a default layer visibility state.
 */
export function createLayerVisibility(): LayerVisibility {
  return {
    visible: true,
    locked: false,
    active: true,
  };
}

/**
 * Creates a default layer style based on layer type.
 */
export function createLayerStyle(type: LayerType): LayerStyle {
  const styleMap: Record<LayerType, LayerStyle> = {
    base: { color: '#3fb950', opacity: 1 },
    roads: { color: '#d29922', opacity: 1, pattern: 'solid' },
    rivers: { color: '#58a6ff', opacity: 0.9, pattern: 'striped' },
    lakes: { color: '#1f6feb', opacity: 0.85 },
    mountains: { color: '#8b949e', opacity: 1 },
    canyons: { color: '#7c3aed', opacity: 0.9, pattern: 'hatched' },
    custom: { color: '#f85149', opacity: 1 },
  };
  return { ...styleMap[type] };
}

/**
 * Creates a new layer with default settings.
 */
export function createLayer(
  id: string,
  name: string,
  type: LayerType,
  order: number = 0
): Layer {
  return {
    id,
    name,
    type,
    blendMode: type === 'base' ? 'normal' : 'add',
    order,
    visibility: createLayerVisibility(),
    style: createLayerStyle(type),
  };
}

/**
 * Creates a layer with data initialized.
 */
export function createLayerWithData(
  id: string,
  name: string,
  type: LayerType,
  width: number,
  height: number,
  order: number = 0
): Layer {
  const layer = createLayer(id, name, type, order);
  layer.data = createLayerData(width, height);
  return layer;
}

/**
 * Sets height offset at a specific position.
 */
export function setLayerHeightAt(layer: Layer, x: number, y: number, offset: number, maskValue: number = 255): void {
  if (!layer.data) return;
  const { width, height, heightOffsets, mask } = layer.data;
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  
  const index = y * width + x;
  heightOffsets[index] = offset;
  mask[index] = Math.max(0, Math.min(255, maskValue));
}

/**
 * Gets height offset at a specific position.
 */
export function getLayerHeightAt(layer: Layer, x: number, y: number): { offset: number; mask: number } {
  if (!layer.data) return { offset: 0, mask: 0 };
  const { width, height, heightOffsets, mask } = layer.data;
  if (x < 0 || x >= width || y < 0 || y >= height) return { offset: 0, mask: 0 };
  
  const index = y * width + x;
  return { offset: heightOffsets[index], mask: mask[index] };
}

/**
 * Clears all layer data.
 */
export function clearLayerData(layer: Layer): void {
  if (!layer.data) return;
  layer.data.heightOffsets.fill(0);
  layer.data.mask.fill(0);
}

/**
 * Applies a circular brush to the layer.
 */
export function applyBrush(
  layer: Layer,
  centerX: number,
  centerY: number,
  radius: number,
  heightOffset: number,
  falloff: number = 1
): void {
  if (!layer.data) return;
  const { width, height } = layer.data;
  
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(centerY + radius));
  
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        // Calculate falloff
        const t = distance / radius;
        const influence = Math.pow(1 - t, falloff);
        const maskValue = Math.round(influence * 255);
        
        const existing = getLayerHeightAt(layer, x, y);
        const newOffset = existing.offset + heightOffset * influence;
        const newMask = Math.max(existing.mask, maskValue);
        
        setLayerHeightAt(layer, x, y, newOffset, newMask);
      }
    }
  }
}

/**
 * Blends two height values based on blend mode.
 */
export function blendHeights(base: number, overlay: number, mode: BlendMode, alpha: number = 1): number {
  const a = alpha;
  
  switch (mode) {
    case 'normal':
      return base * (1 - a) + overlay * a;
    case 'add':
      return base + overlay * a;
    case 'multiply':
      return base * (1 + (overlay / 100 - 1) * a);
    case 'overlay':
      if (base < 0) {
        return base * (1 - a) + (2 * base * overlay / 100) * a;
      }
      return base * (1 - a) + (base + overlay - base * overlay / 100) * a;
    case 'max':
      return Math.max(base, base + overlay * a);
    case 'min':
      return Math.min(base, base + overlay * a);
    default:
      return base + overlay * a;
  }
}

