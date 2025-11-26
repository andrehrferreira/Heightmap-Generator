# Heightmap Import and Blend

## Overview

Import external heightmaps and blend them with procedurally generated terrain. Supports various formats and provides flexible blending options.

## Supported Formats

### Image Formats

| Format | Bit Depth | Notes |
|--------|-----------|-------|
| PNG | 8, 16 | Most common, lossless |
| TIFF | 8, 16, 32 | Professional, floating point support |
| EXR | 16, 32 | HDR, floating point |
| RAW | 16, 32 | Unreal Engine format |
| R16 | 16 | Raw 16-bit little-endian |

### Import Configuration

```typescript
interface HeightmapImportConfig {
  file: File;
  
  // Format detection
  format: 'auto' | HeightmapFormat;
  
  // For RAW formats (no header)
  rawConfig?: {
    width: number;
    height: number;
    bitDepth: 16 | 32;
    byteOrder: 'little' | 'big';
    dataType: 'unsigned' | 'signed' | 'float';
  };
  
  // Height interpretation
  heightMapping: HeightMapping;
  
  // Positioning
  placement: ImportPlacement;
}

interface HeightMapping {
  // Input range (from file)
  inputMin: number;           // e.g., 0 for 16-bit
  inputMax: number;           // e.g., 65535 for 16-bit
  
  // Output range (in generator units)
  outputMin: number;          // e.g., -1000
  outputMax: number;          // e.g., 1000
  
  // Normalization
  autoNormalize: boolean;     // Auto-detect min/max from data
}

interface ImportPlacement {
  // Position
  offsetX: number;            // Offset from origin
  offsetY: number;
  
  // Size
  mode: 'original' | 'fit' | 'stretch' | 'tile';
  
  // For 'fit' mode
  fitMethod: 'contain' | 'cover';
  
  // Scaling
  scaleX: number;
  scaleY: number;
  
  // Rotation
  rotation: number;           // Degrees
  
  // Mirroring
  mirrorX: boolean;
  mirrorY: boolean;
}
```

## Blending

### Blend Modes

```typescript
type ImportBlendMode = 
  | 'replace'       // Replace terrain completely
  | 'add'           // Add heights
  | 'subtract'      // Subtract heights
  | 'multiply'      // Multiply heights
  | 'max'           // Take maximum
  | 'min'           // Take minimum
  | 'average'       // Average heights
  | 'lerp'          // Linear interpolation
  | 'overlay'       // Photoshop-style overlay
  | 'soft_light'    // Soft light blend
  | 'hard_light';   // Hard light blend
```

### Blend Configuration

```typescript
interface ImportBlendConfig {
  mode: ImportBlendMode;
  
  // Blend strength
  opacity: number;            // 0.0-1.0
  
  // For lerp mode
  lerpFactor?: number;        // 0.0-1.0 (0=terrain, 1=import)
  
  // Mask
  mask?: BlendMask;
  
  // Height offset
  heightOffset: number;       // Add to imported heights
  heightScale: number;        // Multiply imported heights
}

interface BlendMask {
  type: 'none' | 'gradient' | 'radial' | 'custom' | 'paint';
  
  // Gradient mask
  gradient?: {
    direction: number;        // Degrees
    start: number;            // Start position (0-1)
    end: number;              // End position (0-1)
  };
  
  // Radial mask
  radial?: {
    center: Point2D;
    innerRadius: number;
    outerRadius: number;
  };
  
  // Custom mask
  customMask?: Uint8Array;
  
  // Painted mask
  paintedMask?: Uint8Array;
  
  // Mask properties
  invert: boolean;
  feather: number;
}
```

## Edge Blending

### Seamless Edge Integration

```typescript
interface EdgeBlending {
  enabled: boolean;
  
  // Blend width at edges
  blendWidth: number;         // Cells
  
  // Blend curve
  curve: 'linear' | 'smooth' | 'cosine' | 'custom';
  customCurve?: CurvePoint[];
  
  // Per-edge settings
  edges: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
  
  // Match heights
  matchTerrainHeight: boolean;
}
```

## Import Layers

### Layer-Based Import

Import as a separate layer:

```typescript
interface ImportAsLayer {
  name: string;
  
  // Layer properties
  visible: boolean;
  opacity: number;
  blendMode: ImportBlendMode;
  
  // Non-destructive
  preserveOriginal: boolean;
}
```

### Multiple Imports

Stack multiple imported heightmaps:

```typescript
interface ImportStack {
  imports: ImportLayer[];
  
  // Processing order
  order: string[];            // Layer IDs
  
  // Final blend with terrain
  terrainBlend: ImportBlendConfig;
}

interface ImportLayer {
  id: string;
  name: string;
  config: HeightmapImportConfig;
  blendConfig: ImportBlendConfig;
  enabled: boolean;
}
```

## Reference Mode

Use import as visual reference without affecting terrain:

```typescript
interface ReferenceMode {
  enabled: boolean;
  
  // Display
  opacity: number;
  colorTint: RGB;
  
  // Overlay position
  position: 'above' | 'below' | 'side-by-side';
  
  // Alignment guides
  showGrid: boolean;
  gridSize: number;
}
```

## Preprocessing

### Before Blending

```typescript
interface ImportPreprocessing {
  // Resize
  resize?: {
    method: 'bilinear' | 'bicubic' | 'lanczos';
    width: number;
    height: number;
  };
  
  // Rotation
  rotation?: {
    angle: number;
    interpolation: 'nearest' | 'bilinear' | 'bicubic';
  };
  
  // Filters
  filters?: {
    blur?: { radius: number };
    sharpen?: { amount: number };
    levels?: { black: number; white: number; gamma: number };
    invert?: boolean;
  };
  
  // Crop
  crop?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

## Export Original

Save imported heightmap separately:

```typescript
interface ExportImported {
  format: HeightmapFormat;
  bitDepth: 8 | 16 | 32;
  includePreprocessing: boolean;
  separate: boolean;          // Export as separate file
}
```

## UI Components

### Import Dialog

- File selector with drag-and-drop
- Format detection display
- Raw format settings (if needed)
- Preview with histogram
- Height range inputs
- Placement controls
- Blend mode selector
- Mask painter

### Import Layer Panel

- List of import layers
- Visibility toggles
- Opacity sliders
- Reorder by drag-and-drop
- Delete buttons

### Reference Overlay

- Transparency slider
- Position offset controls
- Scale controls
- Toggle visibility

## API

```typescript
// Import heightmap
async function importHeightmap(
  config: HeightmapImportConfig
): Promise<HeightmapData>;

// Blend with terrain
function blendHeightmap(
  terrain: Float32Array,
  imported: Float32Array,
  blendConfig: ImportBlendConfig,
  width: number,
  height: number
): Float32Array;

// Import as layer
function importAsLayer(
  config: HeightmapImportConfig,
  layerConfig: ImportAsLayer
): ImportLayer;

// Preprocess imported data
function preprocessHeightmap(
  data: Float32Array,
  config: ImportPreprocessing,
  width: number,
  height: number
): Float32Array;
```

## Use Cases

### Real-World Terrain

1. Import DEM (Digital Elevation Model) data
2. Scale to match project units
3. Blend with procedural details

### Hand-Painted Terrain

1. Paint heightmap in external tool (Photoshop, etc.)
2. Import as base terrain
3. Add procedural noise for detail

### Hybrid Workflow

1. Generate procedural base terrain
2. Export to external tool for editing
3. Re-import and blend changes

### Terrain Stitching

1. Import multiple heightmaps
2. Position as tiles
3. Use edge blending for seamless joins

