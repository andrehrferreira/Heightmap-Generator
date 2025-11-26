# Procedural Mask Generation

## Overview

Automatic generation of terrain masks based on analysis of the heightmap. These masks can be used for material blending, vegetation placement, and other purposes in Unreal Engine.

## Analysis-Based Masks

### Slope Map

Calculates terrain slope angle at each cell:

```typescript
interface SlopeMapConfig {
  enabled: boolean;
  algorithm: 'sobel' | 'prewitt' | 'central_difference';
  
  // Output range
  outputMode: 'angle' | 'normalized' | 'gradient';
  
  // Angle mode: 0-90 degrees mapped to 0-255
  // Normalized mode: 0-1 mapped to 0-255
  // Gradient mode: raw gradient magnitude
}
```

### Curvature Map

Identifies convex (ridges) and concave (valleys) areas:

```typescript
interface CurvatureMapConfig {
  enabled: boolean;
  type: 'mean' | 'gaussian' | 'plan' | 'profile';
  
  // Output mapping
  neutralValue: 128;          // Flat areas
  convexRange: [129, 255];    // Ridges (positive curvature)
  concaveRange: [0, 127];     // Valleys (negative curvature)
  
  // Sensitivity
  scale: number;              // Curvature sensitivity
}
```

### Aspect Map

Direction the terrain faces (N/S/E/W):

```typescript
interface AspectMapConfig {
  enabled: boolean;
  
  // Output encoding
  encoding: 'degrees' | 'cardinal' | 'rgb';
  
  // Degrees: 0-360 mapped to 0-255
  // Cardinal: N=0, E=64, S=128, W=192
  // RGB: R=E-W, G=N-S, B=flat
}
```

### Flow Accumulation Map

Simulated water flow accumulation:

```typescript
interface FlowMapConfig {
  enabled: boolean;
  algorithm: 'd8' | 'dinf' | 'mfd';
  
  // D8: 8 discrete flow directions
  // DInf: Infinite flow directions
  // MFD: Multiple flow directions
  
  // Accumulation threshold
  logarithmic: boolean;       // Log scale for visualization
  threshold: number;          // Minimum accumulation
}
```

### Exposure Map

Solar exposure based on terrain orientation:

```typescript
interface ExposureMapConfig {
  enabled: boolean;
  
  sunPosition: {
    azimuth: number;          // Sun direction (0-360)
    elevation: number;        // Sun height (0-90)
  };
  
  // Consider shadows
  shadows: boolean;
  shadowSoftness: number;
}
```

## Derived Masks

### Cliff Mask

Areas too steep for walking:

```typescript
interface CliffMaskConfig {
  enabled: boolean;
  
  // Slope thresholds (degrees)
  minSlope: number;           // Start of cliff (e.g., 45)
  maxSlope: number;           // Full cliff (e.g., 70)
  
  // Feathering
  feather: boolean;
  featherWidth: number;
}
```

### Plateau Mask

Flat elevated areas:

```typescript
interface PlateauMaskConfig {
  enabled: boolean;
  
  // Flatness threshold
  maxSlope: number;           // Maximum slope (e.g., 5 degrees)
  
  // Elevation threshold
  minElevation: number;       // Minimum height percentile
  
  // Size filter
  minSize: number;            // Minimum area in cells
}
```

### Valley Mask

Low-lying areas between elevations:

```typescript
interface ValleyMaskConfig {
  enabled: boolean;
  
  // Detection method
  method: 'curvature' | 'flow' | 'elevation';
  
  // Curvature threshold
  curvatureThreshold: number;
  
  // Flow accumulation threshold
  flowThreshold: number;
}
```

### Ridge Mask

Elevated linear features:

```typescript
interface RidgeMaskConfig {
  enabled: boolean;
  
  // Detection
  curvatureThreshold: number;
  minLength: number;          // Minimum ridge length
  
  // Width
  ridgeWidth: number;         // Mask width around ridge
}
```

### Wetland Mask

Areas likely to hold water:

```typescript
interface WetlandMaskConfig {
  enabled: boolean;
  
  // Based on flow accumulation
  flowThreshold: number;
  
  // Based on slope (flat areas)
  maxSlope: number;
  
  // Based on curvature (depressions)
  curvatureThreshold: number;
  
  // Exclude existing water
  excludeWater: boolean;
}
```

### Erosion Mask

Areas prone to erosion:

```typescript
interface ErosionMaskConfig {
  enabled: boolean;
  
  // Based on slope and flow
  slopeWeight: number;
  flowWeight: number;
  
  // Simulate erosion
  simulateErosion: boolean;
  iterations: number;
}
```

### Deposition Mask

Areas where sediment accumulates:

```typescript
interface DepositionMaskConfig {
  enabled: boolean;
  
  // Based on slope change (steep to flat)
  slopeChangeThreshold: number;
  
  // Based on flow deceleration
  flowDecelerationThreshold: number;
}
```

## Combination Masks

### Custom Mask Expression

Combine masks using expressions:

```typescript
interface CustomMaskConfig {
  name: string;
  expression: string;
  
  // Example expressions:
  // "slope > 0.5 && elevation > 0.3"
  // "cliff * 0.8 + ridge * 0.2"
  // "lerp(valley, wetland, 0.5)"
}

// Available variables in expressions:
// - height: Normalized height (0-1)
// - slope: Slope (0-1)
// - curvature: Curvature (-1 to 1)
// - aspect: Aspect direction (0-1)
// - flow: Flow accumulation (0-1)
// - exposure: Sun exposure (0-1)
// - cliff, plateau, valley, ridge, wetland: Derived masks
```

### Mask Operations

```typescript
interface MaskOperations {
  // Binary operations
  union(maskA: Uint8Array, maskB: Uint8Array): Uint8Array;
  intersection(maskA: Uint8Array, maskB: Uint8Array): Uint8Array;
  difference(maskA: Uint8Array, maskB: Uint8Array): Uint8Array;
  
  // Arithmetic operations
  add(maskA: Uint8Array, maskB: Uint8Array): Uint8Array;
  multiply(maskA: Uint8Array, maskB: Uint8Array): Uint8Array;
  lerp(maskA: Uint8Array, maskB: Uint8Array, t: number): Uint8Array;
  
  // Filters
  blur(mask: Uint8Array, radius: number): Uint8Array;
  sharpen(mask: Uint8Array, amount: number): Uint8Array;
  dilate(mask: Uint8Array, radius: number): Uint8Array;
  erode(mask: Uint8Array, radius: number): Uint8Array;
  
  // Adjustments
  levels(mask: Uint8Array, black: number, white: number, gamma: number): Uint8Array;
  invert(mask: Uint8Array): Uint8Array;
  threshold(mask: Uint8Array, value: number): Uint8Array;
}
```

## Export

### Export Configuration

```typescript
interface MaskExportConfig {
  // Which masks to generate
  analysisMap: {
    slope: boolean;
    curvature: boolean;
    aspect: boolean;
    flow: boolean;
    exposure: boolean;
  };
  
  derivedMasks: {
    cliff: boolean;
    plateau: boolean;
    valley: boolean;
    ridge: boolean;
    wetland: boolean;
    erosion: boolean;
    deposition: boolean;
  };
  
  customMasks: CustomMaskConfig[];
  
  // Output settings
  bitDepth: 8 | 16;
  format: 'png' | 'raw';
}
```

### Output Structure

```
output/
├── analysis/
│   ├── slope_map.png
│   ├── curvature_map.png
│   ├── aspect_map.png
│   ├── flow_map.png
│   └── exposure_map.png
├── derived/
│   ├── cliff_mask.png
│   ├── plateau_mask.png
│   ├── valley_mask.png
│   ├── ridge_mask.png
│   ├── wetland_mask.png
│   ├── erosion_mask.png
│   └── deposition_mask.png
├── custom/
│   └── [custom_mask_name].png
└── masks_metadata.json
```

## Use Cases in Unreal

### Material Blending

- Use slope_map for grass/rock blending
- Use cliff_mask for cliff material
- Use wetland_mask for mud/wet materials
- Use aspect_map for moss on north-facing surfaces

### Vegetation Placement

- Use plateau_mask for tree placement
- Use valley_mask for water-loving plants
- Use slope_map to exclude vegetation from steep areas
- Use exposure_map for sun-loving plants

### Gameplay

- Use cliff_mask for unclimbable areas
- Use flow_map for water effects
- Use ridge_mask for strategic high ground
- Use valley_mask for natural paths

## Performance

- Masks are generated on-demand
- Use caching for expensive calculations (flow)
- Support incremental updates for sculpting
- Export runs in Web Worker

