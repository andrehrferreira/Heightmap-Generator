# Stamp Library

## Overview

A library system for storing, organizing, and reusing terrain stamps. Stamps are pre-defined heightmap patterns that can be placed on the terrain.

## Stamp Structure

### Stamp Definition

```typescript
interface Stamp {
  id: string;
  name: string;
  category: StampCategory;
  
  // Stamp data
  heightData: Float32Array;   // Height values
  maskData?: Uint8Array;      // Optional alpha mask
  width: number;
  height: number;
  
  // Metadata
  metadata: StampMetadata;
  
  // Preview
  thumbnail: ImageData;
}

interface StampMetadata {
  author: string;
  created: string;            // ISO date
  modified: string;
  description: string;
  tags: string[];
  
  // Terrain info
  heightRange: { min: number; max: number };
  recommendedScale: number;
  seamless: boolean;          // Can be tiled
}

type StampCategory = 
  | 'mountains'
  | 'hills'
  | 'craters'
  | 'plateaus'
  | 'cliffs'
  | 'rocks'
  | 'dunes'
  | 'custom';
```

## Built-in Stamps

### Mountain Stamps

| Name | Description | Size |
|------|-------------|------|
| Peak Sharp | Sharp mountain peak | 128x128 |
| Peak Rounded | Rounded mountain top | 128x128 |
| Mountain Range | Linear mountain range | 256x128 |
| Volcano | Volcanic cone with crater | 128x128 |
| Twin Peaks | Two adjacent peaks | 256x128 |

### Hill Stamps

| Name | Description | Size |
|------|-------------|------|
| Rolling Hill | Gentle rounded hill | 64x64 |
| Hill Cluster | Multiple small hills | 128x128 |
| Mound | Simple raised mound | 32x32 |

### Crater Stamps

| Name | Description | Size |
|------|-------------|------|
| Impact Crater | Meteor impact crater | 128x128 |
| Caldera | Large volcanic caldera | 256x256 |
| Sinkhole | Deep sinkhole | 64x64 |

### Plateau Stamps

| Name | Description | Size |
|------|-------------|------|
| Mesa | Flat-topped mesa | 128x128 |
| Butte | Tall narrow plateau | 64x64 |
| Table Mountain | Large table mountain | 256x256 |

### Cliff Stamps

| Name | Description | Size |
|------|-------------|------|
| Cliff Edge | Vertical cliff edge | 128x64 |
| Cliff Corner | Cliff corner (90°) | 128x128 |
| Overhang | Cliff with overhang | 64x64 |

## Stamp Placement

### Placement Settings

```typescript
interface StampPlacement {
  stamp: Stamp;
  position: Point2D;
  
  // Transform
  rotation: number;           // Degrees (0-360)
  scale: number;              // Scale factor (0.1-10)
  scaleX?: number;            // Independent X scale
  scaleY?: number;            // Independent Y scale
  
  // Blend
  blendMode: StampBlendMode;
  opacity: number;            // 0.0-1.0
  feather: number;            // Edge feathering (cells)
  
  // Height adjustment
  heightOffset: number;       // Add to stamp heights
  heightScale: number;        // Multiply stamp heights
  matchBase: boolean;         // Match terrain at edges
}

type StampBlendMode = 
  | 'replace'     // Replace terrain
  | 'add'         // Add to terrain
  | 'subtract'    // Subtract from terrain
  | 'max'         // Take maximum
  | 'min'         // Take minimum
  | 'blend';      // Alpha blend
```

### Scatter Placement

Place multiple stamps with variation:

```typescript
interface ScatterPlacement {
  stamp: Stamp;
  region: ScatterRegion;
  
  // Count
  count: number;
  density?: number;           // Alternative: stamps per unit area
  
  // Distribution
  distribution: 'random' | 'poisson' | 'grid' | 'jittered';
  minDistance: number;        // Minimum distance between stamps
  
  // Variation
  variation: {
    rotation: { min: number; max: number };
    scale: { min: number; max: number };
    heightOffset: { min: number; max: number };
    opacity: { min: number; max: number };
  };
  
  // Seed
  seed: number;
}

interface ScatterRegion {
  type: 'rectangle' | 'circle' | 'polygon' | 'mask';
  bounds?: BoundingBox;
  center?: Point2D;
  radius?: number;
  points?: Point2D[];
  mask?: Uint8Array;
}
```

## Creating Stamps

### From Selection

Create stamp from selected region:

```typescript
interface CreateStampFromSelection {
  region: BoundingBox;
  
  // Options
  includeAlpha: boolean;      // Create alpha mask
  normalizeHeight: boolean;   // Normalize to 0-1 range
  centerPivot: boolean;       // Center the pivot point
  
  // Metadata
  name: string;
  category: StampCategory;
  tags: string[];
}
```

### From File

Import stamp from image:

```typescript
interface ImportStampConfig {
  file: File;
  
  // Interpretation
  heightMapping: 'grayscale' | 'red' | 'alpha';
  alphaChannel: 'none' | 'alpha' | 'luminance';
  
  // Range
  inputRange: { min: number; max: number };
  outputRange: { min: number; max: number };
}
```

### Procedural Generation

Generate stamps procedurally:

```typescript
interface ProceduralStampConfig {
  type: 'cone' | 'dome' | 'crater' | 'noise' | 'ridge';
  
  size: { width: number; height: number };
  
  // Type-specific settings
  settings: {
    // Cone/Dome
    peakHeight?: number;
    baseRadius?: number;
    sharpness?: number;
    
    // Crater
    rimHeight?: number;
    floorDepth?: number;
    rimWidth?: number;
    
    // Noise
    noiseType?: NoiseType;
    frequency?: number;
    octaves?: number;
    
    // Ridge
    direction?: number;
    falloff?: number;
  };
}
```

## Library Management

### Organization

```typescript
interface StampLibrary {
  stamps: Stamp[];
  categories: StampCategory[];
  
  // User organization
  favorites: string[];        // Stamp IDs
  recent: string[];           // Recently used
  collections: StampCollection[];
}

interface StampCollection {
  id: string;
  name: string;
  stamps: string[];           // Stamp IDs
  color: RGB;                 // Collection color
}
```

### Search and Filter

```typescript
interface StampSearch {
  query: string;              // Text search
  category?: StampCategory;
  tags?: string[];
  sizeRange?: { min: number; max: number };
  onlyFavorites?: boolean;
  onlySeamless?: boolean;
}
```

## Export and Import

### Export Stamp

```typescript
interface StampExportConfig {
  format: 'hgs' | 'png' | 'raw';   // HGS = HeightmapGenerator Stamp
  
  // HGS format includes all metadata
  // PNG exports as 16-bit grayscale
  // RAW exports as float32 array
  
  includeMask: boolean;
  includeMetadata: boolean;
}
```

### Import Stamp Pack

Import multiple stamps as a pack:

```typescript
interface StampPackImport {
  file: File;                 // .zip containing stamps
  
  // On conflict
  conflictResolution: 'skip' | 'replace' | 'rename';
  
  // Target collection
  targetCollection?: string;
}
```

## UI Components

### Library Panel

- Category filter tabs
- Search bar
- Grid/list view toggle
- Stamp thumbnails with name
- Drag-and-drop to canvas
- Right-click context menu

### Stamp Inspector

- Large preview
- Metadata display
- Edit button
- Favorite toggle
- Tags editor
- Delete button

### Placement Tools

- Single stamp tool
- Scatter tool
- Transform handles on canvas
- Settings panel (blend, opacity, etc.)

## Storage

### Local Storage

```typescript
interface StampStorage {
  // Built-in stamps (read-only)
  builtin: Stamp[];
  
  // User stamps (localStorage or IndexedDB)
  user: Stamp[];
  
  // Storage limits
  maxUserStamps: number;      // e.g., 100
  maxStampSize: number;       // e.g., 512x512
}
```

### Cloud Storage (Future)

```typescript
interface CloudStampLibrary {
  // Browse community stamps
  browse(filters: StampSearch): Promise<Stamp[]>;
  
  // Download stamp
  download(stampId: string): Promise<Stamp>;
  
  // Upload stamp
  upload(stamp: Stamp): Promise<string>;
  
  // Rate stamp
  rate(stampId: string, rating: number): Promise<void>;
}
```

## Performance

- Generate thumbnails on import
- Lazy load stamp data
- Cache recently used stamps
- Compress stored stamps (LZ4)
- Use Web Workers for large stamps

