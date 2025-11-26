# Terrain Filters

## Overview

Post-processing filters for modifying the generated heightmap. Filters are non-destructive and can be stacked, reordered, and masked.

## Filter System

### Filter Stack

```typescript
interface FilterStack {
  filters: TerrainFilter[];
  enabled: boolean;
  
  // Real-time preview
  previewEnabled: boolean;
  previewQuality: 'fast' | 'full';
}

interface TerrainFilter {
  id: string;
  type: FilterType;
  enabled: boolean;
  settings: FilterSettings;
  mask?: FilterMask;
  blendMode: FilterBlendMode;
  opacity: number;            // 0.0-1.0
}

type FilterBlendMode = 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';
```

### Filter Masking

Apply filter only to specific areas:

```typescript
interface FilterMask {
  type: 'none' | 'height' | 'slope' | 'custom' | 'paint';
  
  // Height-based mask
  heightRange?: { min: number; max: number };
  
  // Slope-based mask
  slopeRange?: { min: number; max: number };
  
  // Custom mask (from procedural masks)
  customMask?: string;        // Mask name
  
  // Painted mask
  paintedMask?: Uint8Array;
  
  // Mask properties
  invert: boolean;
  feather: number;
}
```

## Blur Filters

### Gaussian Blur

Smooth terrain with gaussian kernel:

```typescript
interface GaussianBlurFilter {
  type: 'gaussian_blur';
  settings: {
    radius: number;           // Blur radius (1-50)
    sigma?: number;           // Standard deviation (auto if undefined)
  };
}
```

### Box Blur

Fast blur with box kernel:

```typescript
interface BoxBlurFilter {
  type: 'box_blur';
  settings: {
    radius: number;           // Blur radius (1-50)
    iterations: number;       // Multiple passes (1-5)
  };
}
```

### Bilateral Filter

Edge-preserving smoothing:

```typescript
interface BilateralFilter {
  type: 'bilateral';
  settings: {
    spatialSigma: number;     // Spatial smoothing
    rangeSigma: number;       // Range smoothing (edge preservation)
    iterations: number;
  };
}
```

## Detail Filters

### Sharpen

Enhance terrain details:

```typescript
interface SharpenFilter {
  type: 'sharpen';
  settings: {
    amount: number;           // Sharpening strength (0-5)
    radius: number;           // Sharpening radius (1-10)
    threshold: number;        // Ignore small differences (0-1)
  };
}
```

### High Pass

Extract high-frequency details:

```typescript
interface HighPassFilter {
  type: 'high_pass';
  settings: {
    radius: number;           // Filter radius
    strength: number;         // Effect strength
  };
}
```

### Emboss

Create embossed effect:

```typescript
interface EmbossFilter {
  type: 'emboss';
  settings: {
    angle: number;            // Light direction (0-360)
    strength: number;         // Effect strength
    elevation: number;        // Light elevation
  };
}
```

## Shape Filters

### Terrace

Create stepped terrain:

```typescript
interface TerraceFilter {
  type: 'terrace';
  settings: {
    levels: number;           // Number of terrace levels (2-50)
    sharpness: number;        // Edge sharpness (0-1)
    
    // Optional: non-uniform terraces
    customLevels?: number[];  // Specific height levels
  };
}
```

### Quantize

Reduce height values to discrete levels:

```typescript
interface QuantizeFilter {
  type: 'quantize';
  settings: {
    levels: number;           // Number of height levels
    dithering: boolean;       // Add dithering to reduce banding
  };
}
```

### Clamp

Limit height range:

```typescript
interface ClampFilter {
  type: 'clamp';
  settings: {
    min: number;              // Minimum height
    max: number;              // Maximum height
    mode: 'hard' | 'soft';    // Hard clamp or smooth falloff
    softness?: number;        // For soft mode
  };
}
```

### Normalize

Remap height range:

```typescript
interface NormalizeFilter {
  type: 'normalize';
  settings: {
    targetMin: number;        // Target minimum (default: 0)
    targetMax: number;        // Target maximum (default: 1)
    
    // Optional: use percentile instead of min/max
    usePercentile: boolean;
    lowPercentile: number;    // e.g., 2 (ignore lowest 2%)
    highPercentile: number;   // e.g., 98 (ignore highest 2%)
  };
}
```

## Adjustment Filters

### Levels

Adjust black point, white point, and gamma:

```typescript
interface LevelsFilter {
  type: 'levels';
  settings: {
    inputBlack: number;       // Input black point (0-1)
    inputWhite: number;       // Input white point (0-1)
    gamma: number;            // Gamma correction (0.1-10)
    outputBlack: number;      // Output black point (0-1)
    outputWhite: number;      // Output white point (0-1)
  };
}
```

### Curves

Custom height remapping curve:

```typescript
interface CurvesFilter {
  type: 'curves';
  settings: {
    points: CurvePoint[];     // Control points
    interpolation: 'linear' | 'cubic' | 'monotone';
  };
}

interface CurvePoint {
  input: number;              // Input height (0-1)
  output: number;             // Output height (0-1)
}
```

### Gamma

Simple gamma correction:

```typescript
interface GammaFilter {
  type: 'gamma';
  settings: {
    value: number;            // Gamma value (0.1-10)
  };
}
```

### Invert

Invert terrain heights:

```typescript
interface InvertFilter {
  type: 'invert';
  settings: {
    // No settings needed
  };
}
```

### Posterize

Reduce to limited color levels with smooth blending:

```typescript
interface PosterizeFilter {
  type: 'posterize';
  settings: {
    levels: number;           // Number of levels (2-256)
    smoothing: number;        // Smooth transitions (0-1)
  };
}
```

## Erosion Filters

### Hydraulic Erosion

Simulate water erosion:

```typescript
interface HydraulicErosionFilter {
  type: 'hydraulic_erosion';
  settings: {
    iterations: number;       // Simulation iterations (1000-100000)
    rainAmount: number;       // Water per iteration
    evaporation: number;      // Evaporation rate
    sedimentCapacity: number; // Sediment carrying capacity
    erosionRate: number;      // Erosion strength
    depositionRate: number;   // Deposition strength
    
    // Droplet settings
    dropletInertia: number;
    dropletMinSlope: number;
    dropletCapacity: number;
  };
}
```

### Thermal Erosion

Simulate rockfall erosion:

```typescript
interface ThermalErosionFilter {
  type: 'thermal_erosion';
  settings: {
    iterations: number;       // Simulation iterations
    talusAngle: number;       // Angle of repose (degrees)
    erosionRate: number;      // Amount of material moved
  };
}
```

### Wind Erosion

Simulate wind erosion:

```typescript
interface WindErosionFilter {
  type: 'wind_erosion';
  settings: {
    iterations: number;
    windDirection: number;    // Wind direction (0-360)
    windStrength: number;     // Wind strength
    saltation: number;        // Sand jumping effect
    abrasion: number;         // Rock wearing effect
  };
}
```

## Noise Filters

### Add Noise

Add noise to terrain:

```typescript
interface AddNoiseFilter {
  type: 'add_noise';
  settings: {
    noiseType: NoiseType;
    frequency: number;
    amplitude: number;
    octaves: number;
    seed: number;
  };
}
```

### Displace

Displace terrain using noise:

```typescript
interface DisplaceFilter {
  type: 'displace';
  settings: {
    noiseType: NoiseType;
    strength: number;         // Displacement amount
    frequency: number;
    direction: 'horizontal' | 'vertical' | 'both';
  };
}
```

## UI Components

### Filter Panel

- Add filter button
- Filter list with drag-and-drop reordering
- Per-filter enable/disable toggle
- Per-filter settings expandable
- Per-filter mask settings
- Opacity slider
- Delete filter button

### Filter Presets

Save and load filter stack presets:

```typescript
interface FilterPreset {
  name: string;
  description: string;
  filters: TerrainFilter[];
}

const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    name: 'Natural Terrain',
    filters: [
      { type: 'hydraulic_erosion', ... },
      { type: 'thermal_erosion', ... },
      { type: 'bilateral', ... },
    ],
  },
  {
    name: 'Stylized',
    filters: [
      { type: 'terrace', levels: 10, ... },
      { type: 'sharpen', ... },
    ],
  },
];
```

## Performance

### Optimization

- Use Web Workers for heavy filters (erosion)
- Cache filter results when settings unchanged
- Preview at reduced resolution
- Apply filters progressively

### Progress Reporting

```typescript
interface FilterProgress {
  filterId: string;
  filterName: string;
  progress: number;           // 0-100
  stage?: string;             // e.g., "Simulating droplets..."
}
```

## API

```typescript
// Apply single filter
function applyFilter(
  heightmap: Float32Array,
  filter: TerrainFilter,
  width: number,
  height: number
): Float32Array;

// Apply filter stack
function applyFilterStack(
  heightmap: Float32Array,
  stack: FilterStack,
  width: number,
  height: number
): Float32Array;

// Create filter
function createFilter(type: FilterType, settings?: Partial<FilterSettings>): TerrainFilter;

// Preview filter (fast, reduced quality)
function previewFilter(
  heightmap: Float32Array,
  filter: TerrainFilter,
  previewSize: number
): Float32Array;
```

