# Advanced Noise System

## Overview

The noise system provides multiple algorithms for procedural terrain generation, allowing complex terrain patterns through layered noise combination.

## Noise Algorithms

### Supported Types

| Algorithm | Description | Best For |
|-----------|-------------|----------|
| Perlin | Classic coherent noise | General terrain |
| Simplex | Improved Perlin, less artifacts | Smooth terrain |
| Worley | Cellular/Voronoi patterns | Cracked terrain, rocks |
| Ridged | Inverted FBM for ridges | Mountain ridges |
| Billow | Rounded cloud-like | Rolling hills |
| Domain Warp | Distorted noise | Organic shapes |
| FBM | Fractal Brownian Motion | Natural detail |

### Noise Configuration

```typescript
interface NoiseConfig {
  type: NoiseType;
  seed: number;
  frequency: number;      // Base frequency (0.001-1.0)
  amplitude: number;      // Output scale (0.0-1.0)
  octaves: number;        // Detail layers (1-8)
  lacunarity: number;     // Frequency multiplier per octave (1.5-3.0)
  persistence: number;    // Amplitude multiplier per octave (0.3-0.7)
  offset: { x: number; y: number };
}
```

## Noise Layering

### Layer Stack

Multiple noise layers can be combined:

```typescript
interface NoiseLayerStack {
  layers: NoiseLayer[];
  globalSeed: number;
  outputRange: { min: number; max: number };
}

interface NoiseLayer {
  id: string;
  name: string;
  enabled: boolean;
  config: NoiseConfig;
  weight: number;         // Layer influence (0.0-1.0)
  blendMode: NoiseBlendMode;
  mask?: NoiseMask;       // Optional application mask
}

type NoiseBlendMode = 
  | 'add'       // Sum values
  | 'multiply'  // Multiply values
  | 'max'       // Take maximum
  | 'min'       // Take minimum
  | 'average'   // Average values
  | 'subtract'  // Subtract from base
  | 'overlay';  // Photoshop-style overlay
```

### Layer Masking

Apply noise only to specific regions:

```typescript
interface NoiseMask {
  type: 'height' | 'slope' | 'custom' | 'level';
  
  // For height-based mask
  heightRange?: { min: number; max: number };
  
  // For slope-based mask
  slopeRange?: { min: number; max: number };
  
  // For level-based mask
  levels?: number[];
  
  // For custom mask
  customMask?: Uint8Array;
  
  // Mask properties
  feather: number;        // Edge softness (0-50 cells)
  invert: boolean;
}
```

## Fractal Brownian Motion (FBM)

### Configuration

```typescript
interface FBMConfig extends NoiseConfig {
  type: 'fbm';
  baseNoise: NoiseType;   // Underlying noise type
  ridged: boolean;        // Use ridged variant
  terraced: boolean;      // Add terracing effect
  terraceCount?: number;  // Number of terraces
}
```

### FBM Formula

```
fbm(p) = Σ amplitude^i * noise(frequency^i * p)
         i=0 to octaves
```

## Domain Warping

Distort noise coordinates for organic shapes:

```typescript
interface DomainWarpConfig {
  enabled: boolean;
  warpNoise: NoiseConfig;   // Noise used for warping
  warpStrength: number;     // Distortion amount (0-100)
  iterations: number;       // Warp iterations (1-3)
}
```

## Presets

### Terrain Presets

```typescript
const NOISE_PRESETS = {
  // Gentle rolling hills
  rollingHills: {
    type: 'simplex',
    frequency: 0.005,
    octaves: 4,
    persistence: 0.5,
    amplitude: 0.3,
  },
  
  // Sharp mountain ridges
  mountainRidges: {
    type: 'ridged',
    frequency: 0.008,
    octaves: 6,
    persistence: 0.6,
    amplitude: 0.8,
  },
  
  // Cracked desert
  crackedDesert: {
    type: 'worley',
    frequency: 0.02,
    octaves: 2,
    amplitude: 0.2,
  },
  
  // Natural terrain
  naturalTerrain: {
    layers: [
      { type: 'simplex', weight: 0.6 },    // Base shape
      { type: 'ridged', weight: 0.3 },     // Mountain detail
      { type: 'fbm', weight: 0.1 },        // Fine detail
    ],
  },
};
```

## Integration

### With Level System

Noise is applied after base level heights:

```typescript
function applyNoiseToGrid(grid: Grid, noiseStack: NoiseLayerStack): void {
  grid.forEachCell((cell, x, y) => {
    const baseHeight = cell.height;
    const noiseValue = evaluateNoiseStack(noiseStack, x, y);
    
    // Apply noise based on layer settings
    cell.height = baseHeight + noiseValue;
  });
}
```

### With Masks

Noise respects existing masks:

- **Roads**: Minimal noise (preserve flatness)
- **Water**: No noise below water level
- **Cliffs**: Enhanced noise for detail

## Performance

### Optimization

- Pre-compute permutation tables per seed
- Use SIMD for parallel evaluation
- Cache octave values when possible
- Support Web Workers for large grids

### Memory

- Noise is evaluated on-demand (not stored)
- Layer results cached during composition
- Final heightmap stored in Float32Array

## API Reference

```typescript
// Create noise generator
const noise = createNoiseGenerator(config: NoiseConfig): NoiseGenerator;

// Evaluate at point
const value = noise.evaluate(x: number, y: number): number;

// Evaluate grid region
const values = noise.evaluateRegion(
  x: number, y: number, 
  width: number, height: number
): Float32Array;

// Create layer stack
const stack = createNoiseLayerStack(layers: NoiseLayer[]): NoiseLayerStack;

// Evaluate stack
const height = evaluateNoiseStack(stack: NoiseLayerStack, x: number, y: number): number;
```

