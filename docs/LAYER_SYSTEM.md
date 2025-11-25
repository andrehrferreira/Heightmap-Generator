# Layer System

## Overview

The heightmap generator uses a Photoshop-like layer system to organize and edit terrain features. Each feature type (rivers, lakes, mountains, canyons, roads) exists on its own layer, allowing independent editing, visibility control, and manual stamp placement.

## Layer Structure

### Layer Types

```typescript
enum LayerType {
  RIVERS = 'rivers',
  LAKES = 'lakes',
  MOUNTAINS = 'mountains',
  CANYONS = 'canyons',
  ROADS = 'roads',
  CUSTOM = 'custom',  // User-defined layers
}

interface Layer {
  id: string;                    // Unique layer identifier
  name: string;                  // Display name
  type: LayerType;
  visible: boolean;              // Visibility toggle
  opacity: number;               // Opacity 0.0-1.0
  locked: boolean;               // Prevent editing
  color: RGB;                    // Solid color for identification
  data: LayerData;               // Layer-specific data
  blendMode: BlendMode;         // How layer blends with below layers
  stamps: Stamp[];               // Manual stamps placed on this layer
}

interface RGB {
  r: number;  // 0-255
  g: number;  // 0-255
  b: number;  // 0-255
}

enum BlendMode {
  NORMAL = 'normal',
  ADD = 'add',
  MULTIPLY = 'multiply',
  OVERLAY = 'overlay',
  REPLACE = 'replace',  // Replace underlying data
}
```

### Layer Data

Each layer contains a grid matching the map dimensions:

```typescript
interface LayerData {
  width: number;
  height: number;
  cells: Uint8Array;  // 8-bit mask: 0-255 intensity
  metadata: {
    generated: boolean;     // Auto-generated vs manual
    seed?: number;          // Generation seed
    parameters?: object;    // Generation parameters
  };
}
```

### Color Identification

Each layer type has a default solid color for easy visual identification:

```typescript
const LAYER_COLORS: Record<LayerType, RGB> = {
  [LayerType.RIVERS]: { r: 0, g: 100, b: 255 },      // Blue
  [LayerType.LAKES]: { r: 0, g: 150, b: 200 },       // Cyan
  [LayerType.MOUNTAINS]: { r: 139, g: 69, b: 19 },   // Brown
  [LayerType.CANYONS]: { r: 101, g: 67, b: 33 },     // Dark brown
  [LayerType.ROADS]: { r: 128, g: 128, b: 128 },     // Gray
  [LayerType.CUSTOM]: { r: 255, g: 0, b: 255 },      // Magenta
};
```

## Layer Stack

Layers are organized in a stack (bottom to top):

```typescript
interface LayerStack {
  layers: Layer[];
  activeLayerId: string | null;  // Currently selected layer
  order: string[];               // Layer order (bottom to top)
}
```

### Layer Ordering

- Bottom layers affect base terrain
- Top layers override bottom layers
- Order matters for blending and final heightmap calculation

### Default Layer Order (bottom to top)

1. Base terrain (level distribution)
2. Canyons
3. Mountains
4. Lakes
5. Rivers
6. Roads

## Stamp System

### Stamp Definition

Stamps allow manual placement of terrain features in specific areas:

```typescript
interface Stamp {
  id: string;
  layerId: string;
  type: StampType;
  position: { x: number; y: number };
  rotation: number;              // Rotation in degrees
  scale: number;                  // Scale factor (0.5 - 2.0)
  intensity: number;             // Intensity 0.0-1.0
  shape: StampShape;
  parameters: StampParameters;   // Type-specific parameters
}

enum StampType {
  MOUNTAIN = 'mountain',
  RIVER = 'river',
  LAKE = 'lake',
  CANYON = 'canyon',
  ROAD = 'road',
  CUSTOM = 'custom',
}

interface StampShape {
  type: 'circle' | 'ellipse' | 'rectangle' | 'polygon' | 'spline';
  bounds: BoundingBox;
  points?: Point[];  // For polygon/spline
}

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

### Stamp Parameters

Type-specific parameters for each stamp:

```typescript
interface MountainStampParameters {
  height: number;              // Mountain height
  baseRadius: number;         // Base radius
  peakSharpness: number;      // 0.0 (rounded) to 1.0 (sharp)
  noiseAmount: number;         // Surface variation
}

interface RiverStampParameters {
  width: number;               // River width
  depth: number;               // River depth
  flowDirection: number;       // Flow direction in degrees
  meanderAmount: number;       // Meandering amount
}

interface LakeStampParameters {
  radius: number;              // Lake radius
  depth: number;               // Lake depth
  shoreSmoothness: number;     // Shore transition smoothness
}

interface CanyonStampParameters {
  width: number;               // Canyon width
  depth: number;               // Canyon depth
  length: number;              // Canyon length
  direction: number;           // Canyon direction in degrees
}

interface RoadStampParameters {
  width: number;               // Road width
  startLevel: number;          // Starting level ID
  endLevel: number;            // Ending level ID (for ramps)
  smoothness: number;          // Road smoothness
}
```

### Stamp Placement

Stamps are placed manually by the user:

1. Select a layer
2. Choose a stamp type
3. Click/drag on the map to place
4. Adjust parameters in the properties panel
5. Apply stamp to layer data

### Stamp Rendering

Stamps are rendered as colored overlays on the preview:

- Each stamp type has a distinct color
- Stamps show their bounds and influence area
- Selected stamps show handles for editing (position, rotation, scale)

## Layer Operations

### Layer Management

```typescript
interface LayerOperations {
  createLayer(type: LayerType, name: string): Layer;
  deleteLayer(layerId: string): void;
  duplicateLayer(layerId: string): Layer;
  reorderLayer(layerId: string, newIndex: number): void;
  toggleVisibility(layerId: string): void;
  setOpacity(layerId: string, opacity: number): void;
  lockLayer(layerId: string): void;
  unlockLayer(layerId: string): void;
}
```

### Layer Editing

```typescript
interface LayerEditing {
  paint(layerId: string, x: number, y: number, radius: number, intensity: number): void;
  erase(layerId: string, x: number, y: number, radius: number): void;
  addStamp(layerId: string, stamp: Stamp): void;
  removeStamp(stampId: string): void;
  updateStamp(stampId: string, updates: Partial<Stamp>): void;
}
```

### Layer Blending

When calculating final heightmap, layers are blended according to their blend mode:

```typescript
function blendLayers(layers: Layer[], baseHeightmap: Float32Array): Float32Array {
  let result = baseHeightmap;
  
  for (const layer of layers) {
    if (!layer.visible) continue;
    
    const layerData = layer.data.cells;
    result = applyBlendMode(result, layerData, layer.blendMode, layer.opacity);
  }
  
  return result;
}
```

## Layer Export

Each layer can be exported as a separate mask:

```typescript
interface LayerExport {
  exportMask(layerId: string): Uint8Array;  // 8-bit mask
  exportColorized(layerId: string): ImageData;  // Color-coded visualization
  exportAllLayers(): Record<string, Uint8Array>;  // All layer masks
}
```

## UI Integration

### Layer Panel

- List of all layers with visibility toggles
- Opacity sliders
- Lock/unlock buttons
- Reorder by drag-and-drop
- Color swatches for identification
- Active layer highlight

### Stamp Toolbar

- Stamp type selector
- Stamp size/scale controls
- Rotation control
- Intensity slider
- Apply button

### Canvas Interaction

- Click to place stamp
- Drag to adjust stamp size/position
- Right-click to delete stamp
- Paint tool for manual painting
- Eraser tool for manual erasing

