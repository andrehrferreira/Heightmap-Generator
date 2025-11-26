# Multi-Resolution Export

## Overview

Export heightmaps and masks at multiple resolutions from the same project, with support for Unreal Engine Landscape presets and tiled exports.

## Resolution Presets

### Standard Resolutions

| Preset | Size | Use Case |
|--------|------|----------|
| Preview | 256x256 | Quick preview, thumbnails |
| Low | 512x512 | Testing, low-end targets |
| Medium | 1024x1024 | Default, most projects |
| High | 2048x2048 | High quality |
| Ultra | 4096x4096 | Maximum detail |
| Custom | Any | User-defined |

### Unreal Landscape Presets

Unreal Engine requires specific sizes for Landscape import:

| Preset | Overall Size | Quads/Section | Sections/Component | Components |
|--------|--------------|---------------|---------------------|------------|
| 8x8_127 | 1009x1009 | 127 | 1 | 8x8 |
| 8x8_255 | 2017x2017 | 255 | 1 | 8x8 |
| 16x16_127 | 2017x2017 | 127 | 1 | 16x16 |
| 16x16_255 | 4033x4033 | 255 | 1 | 16x16 |

### Unreal Size Formula

```
Overall size = (Quads/Section * Sections/Component * Components) + 1
```

## Export Configuration

### Resolution Settings

```typescript
interface ResolutionExportConfig {
  // Target resolution
  resolution: ResolutionPreset | number;
  
  // Unreal-specific
  unrealPreset?: UnrealLandscapePreset;
  
  // Scaling algorithm
  scalingAlgorithm: ScalingAlgorithm;
  
  // Output settings
  outputFormat: ExportFormat;
  bitDepth: 8 | 16 | 32;
}

type ResolutionPreset = 'preview' | 'low' | 'medium' | 'high' | 'ultra';

type ScalingAlgorithm = 
  | 'nearest'     // No interpolation (fastest)
  | 'bilinear'    // Linear interpolation
  | 'bicubic'     // Cubic interpolation (smooth)
  | 'lanczos'     // High quality (slowest)
  | 'mitchell';   // Mitchell-Netravali (balanced)
```

### Batch Resolution Export

Export multiple resolutions at once:

```typescript
interface BatchResolutionExport {
  resolutions: ResolutionExportConfig[];
  
  naming: {
    pattern: string;    // e.g., "{name}_{resolution}"
    includeSize: boolean;
  };
  
  organization: {
    separateFolders: boolean;   // Folder per resolution
    folderPattern: string;       // e.g., "{resolution}/"
  };
}

// Example
const batchConfig: BatchResolutionExport = {
  resolutions: [
    { resolution: 'preview', scalingAlgorithm: 'bilinear' },
    { resolution: 'medium', scalingAlgorithm: 'bicubic' },
    { resolution: 2017, scalingAlgorithm: 'lanczos', unrealPreset: '16x16_127' },
  ],
  naming: { pattern: '{name}_{resolution}', includeSize: true },
  organization: { separateFolders: true, folderPattern: '{resolution}/' },
};
```

## Scaling Algorithms

### Comparison

| Algorithm | Quality | Speed | Best For |
|-----------|---------|-------|----------|
| Nearest | Low | Fastest | Preview, debugging |
| Bilinear | Medium | Fast | General use |
| Bicubic | High | Medium | Final export |
| Lanczos | Highest | Slow | Maximum quality |
| Mitchell | High | Medium | Balanced |

### Detail Preservation

```typescript
interface DetailPreservation {
  enabled: boolean;
  
  // Preserve important features during downscale
  preserveRoads: boolean;      // Keep road visibility
  preserveCliffs: boolean;     // Maintain cliff edges
  preserveWaterEdges: boolean; // Sharp water boundaries
  
  // Edge detection threshold
  edgeThreshold: number;       // 0.0-1.0
}
```

## Tiled Export

### World Composition Support

Export as tiles for Unreal World Composition:

```typescript
interface TiledExportConfig {
  enabled: boolean;
  
  // Grid configuration
  grid: {
    columns: number;          // Number of tiles X
    rows: number;             // Number of tiles Y
  };
  
  // Tile settings
  tile: {
    size: number;             // Pixels per tile
    overlap: number;          // Overlap pixels (for seamless)
  };
  
  // Naming
  naming: {
    pattern: string;          // e.g., "Tile_X{x}_Y{y}"
    zeroPadding: number;      // Digits for X/Y (e.g., 2 -> X01_Y01)
  };
  
  // World Composition metadata
  worldComposition: {
    generateBounds: boolean;    // Generate tile bounds file
    streamingDistance: number;  // Default streaming distance
  };
}
```

### Seamless Tiling

```typescript
interface SeamlessConfig {
  enabled: boolean;
  
  // Edge blending
  blendWidth: number;         // Pixels to blend at edges
  blendMode: 'linear' | 'smooth' | 'cosine';
  
  // Height matching
  matchHeights: boolean;      // Ensure matching heights at borders
  heightTolerance: number;    // Maximum height difference
}
```

## Output Structure

### Single Resolution

```
output/
├── heightmap.png           # 16-bit heightmap
├── roads_mask.png          # Roads
├── water_mask.png          # Water
├── cliffs_mask.png         # Cliffs
├── level_mask.png          # Levels
├── ... other masks ...
└── metadata.json           # Export metadata
```

### Multi-Resolution

```
output/
├── preview/
│   ├── heightmap_256.png
│   ├── roads_mask_256.png
│   └── ...
├── medium/
│   ├── heightmap_1024.png
│   ├── roads_mask_1024.png
│   └── ...
├── high/
│   ├── heightmap_2048.png
│   ├── roads_mask_2048.png
│   └── ...
└── metadata.json
```

### Tiled Export

```
output/
├── tiles/
│   ├── Tile_X0_Y0/
│   │   ├── heightmap.png
│   │   └── masks/...
│   ├── Tile_X1_Y0/
│   │   └── ...
│   ├── Tile_X0_Y1/
│   │   └── ...
│   └── Tile_X1_Y1/
│       └── ...
├── world_composition.json
└── metadata.json
```

## Metadata

### Per-Export Metadata

```typescript
interface ExportMetadata {
  version: string;
  timestamp: string;
  
  source: {
    projectName: string;
    originalResolution: number;
    seed: number;
  };
  
  export: {
    resolution: number;
    scalingAlgorithm: string;
    bitDepth: number;
    format: string;
  };
  
  unreal: {
    landscapePreset?: string;
    componentSize?: number;
    scale: { x: number; y: number; z: number };
    recommendedImportSettings: UnrealImportSettings;
  };
  
  tiles?: {
    grid: { columns: number; rows: number };
    tileSize: number;
    overlap: number;
    naming: string;
  };
}
```

## API

### Single Export

```typescript
async function exportAtResolution(
  project: Project,
  config: ResolutionExportConfig
): Promise<ExportResult>;
```

### Batch Export

```typescript
async function exportMultipleResolutions(
  project: Project,
  configs: ResolutionExportConfig[]
): Promise<ExportResult[]>;
```

### Tiled Export

```typescript
async function exportAsTiles(
  project: Project,
  config: TiledExportConfig
): Promise<TiledExportResult>;
```

## Performance

### Memory Optimization

- Process tiles sequentially for large exports
- Use streaming for 4K+ exports
- Garbage collect between tiles

### Progress Reporting

```typescript
interface ExportProgress {
  phase: 'scaling' | 'processing' | 'writing';
  currentFile: string;
  filesCompleted: number;
  totalFiles: number;
  percentComplete: number;
}
```

## Best Practices

### For Unreal Engine

1. Use Unreal Landscape presets for correct sizing
2. Export 16-bit PNG for heightmaps
3. Export 8-bit PNG for masks
4. Use Lanczos for final quality exports
5. Match tile size to Landscape component size

### For Performance

1. Start with preview resolution during editing
2. Export high resolution only when needed
3. Use bilinear for quick iterations
4. Enable detail preservation for downscaling

