# ARK: Survival Evolved Procedural Generation Insights

## Overview

ARK: Survival Evolved uses a sophisticated procedural map generation system with granular controls for terrain and foliage. This document analyzes their approach and identifies valuable insights for our heightmap generator.

## ARK's Procedural System

### Map Settings

ARK uses several key parameters for terrain generation:

1. **Map Seed**: Reproducibility and variation
2. **Landscape Radius**: Map size control
3. **Erosion System**: Erosion steps and strength
4. **Turbulence Power**: Terrain variation
5. **Deposition Strength**: Material deposition
6. **Mountain Parameters**: Frequency, height, slope
7. **Terrain Scale**: Multiplier for X, Y, Z axes
8. **Slope Thresholds**: For trees and shores
9. **Water Parameters**: Frequency, level, ocean floor

### Foliage Settings

ARK uses **biome-specific density controls**:

- Grass density per biome (grasslands, jungle, snow, redwood, mountain)
- Tree density per biome
- Water object density (inland and underwater)
- Slope-based thresholds

## Key Insights

### 1. Erosion System

**ARK Approach:**
- Erosion Steps: Number of erosion iterations
- Erosion Strength: How much erosion affects terrain
- Deposition Strength: How much material is deposited

**Our Application:**
```typescript
interface ErosionConfig {
  enabled: boolean;
  steps: number;              // Number of erosion iterations (e.g., 4)
  strength: number;           // Erosion strength (0.0-1.0, e.g., 0.75)
  depositionStrength: number; // Deposition strength (0.0-1.0, e.g., 0.5)
  turbulencePower: number;    // Additional variation (e.g., 0.0125)
}
```

**Benefits:**
- More realistic terrain
- Natural-looking valleys and ridges
- Eroded mountain sides
- Deposition in valleys

### 2. Turbulence Power

**ARK Approach:**
- Small value (0.0125) for subtle variation
- Adds natural randomness to terrain

**Our Application:**
```typescript
interface TurbulenceConfig {
  enabled: boolean;
  power: number;              // Turbulence strength (e.g., 0.0125)
  frequency: number;           // Turbulence frequency
  octaves: number;            // Noise octaves
}
```

**Benefits:**
- Natural terrain variation
- Breaks up repetitive patterns
- Adds realism without being too chaotic

### 3. Mountain Parameters

**ARK Approach:**
- Mountain Frequency: How often mountains appear
- Mountain Height: Height multiplier
- Mountain Slope: Slope steepness

**Our Application:**
```typescript
interface MountainConfig {
  frequency: number;           // Mountain frequency (e.g., 12.0)
  height: number;              // Height multiplier (e.g., 1.25)
  slope: number;               // Slope steepness (e.g., 1.8)
  baseRadius: number;          // Base radius
  peakSharpness: number;       // Peak sharpness
}
```

**Benefits:**
- Fine-grained control over mountain generation
- Can create different mountain types
- Adjustable frequency for map variety

### 4. Terrain Scale Multiplier

**ARK Approach:**
- Separate X, Y, Z multipliers
- Allows anisotropic terrain scaling

**Our Application:**
```typescript
interface TerrainScaleConfig {
  x: number;                   // X-axis scale (e.g., 1.0)
  y: number;                   // Y-axis scale (e.g., 1.0)
  z: number;                   // Z-axis (height) scale (e.g., 1.0)
}
```

**Benefits:**
- Stretch terrain in specific directions
- Create elongated features
- Adjust height exaggeration independently

### 5. Slope Thresholds

**ARK Approach:**
- Trees Slope Threshold: Maximum slope for trees
- Shore Slope: Slope of shorelines

**Our Application:**
```typescript
interface SlopeThresholds {
  trees: number;               // Max slope for trees (e.g., 0.5)
  shore: number;               // Shore slope (e.g., 1.0)
  walkable: number;            // Max walkable slope (45°)
  vegetation: number;          // Max slope for vegetation
}
```

**Benefits:**
- Realistic vegetation placement
- Natural shorelines
- Gameplay-appropriate thresholds

### 6. Water Parameters

**ARK Approach:**
- Water Frequency: How often water features appear
- Water Level: Base water level
- Ocean Floor Level: Depth of ocean floor

**Our Application:**
```typescript
interface WaterConfig {
  frequency: number;           // Water feature frequency (e.g., 5.0)
  level: number;               // Base water level (e.g., -0.72)
  oceanFloorLevel: number;     // Ocean floor depth (e.g., -1.0)
  rivers: {
    frequency: number;
    minLength: number;
    maxLength: number;
  };
  lakes: {
    frequency: number;
    minSize: number;
    maxSize: number;
  };
}
```

**Benefits:**
- Control water feature density
- Adjustable water levels
- Separate ocean floor control

### 7. Biome-Specific Foliage Density

**ARK Approach:**
- Different grass density per biome
- Different tree density per biome
- Slope-based adjustments

**Our Application:**
```typescript
interface BiomeFoliageConfig {
  [biome: string]: {
    grassDensity: number;      // Grass density (0.0-1.0)
    treeDensity: number;       // Tree density (0.0-1.0)
    slopeThreshold: number;    // Max slope for vegetation
    waterObjectsDensity: number; // Water objects density
    underwaterObjectsDensity: number; // Underwater objects density
  };
}

// Example
const foliageConfig: BiomeFoliageConfig = {
  grasslands: {
    grassDensity: 1.0,
    treeDensity: 0.003,
    slopeThreshold: 0.5,
  },
  jungle: {
    grassDensity: 0.02,
    treeDensity: 0.66,
    slopeThreshold: 0.5,
  },
  mountain: {
    grassDensity: 0.05,
    treeDensity: 0.01,
    slopeThreshold: 0.3,
  },
  // ... other biomes
};
```

**Benefits:**
- Realistic biome variation
- Fine-grained control
- Slope-aware placement

### 8. Map Seed System

**ARK Approach:**
- Seed value for reproducibility
- Same seed = same map

**Our Application:**
```typescript
interface GenerationConfig {
  seed: number;                // Map seed (e.g., 999)
  // ... other config
}

function generateWithSeed(seed: number, config: GenerationConfig): Map {
  // Set random seed
  setRandomSeed(seed);
  
  // Generate map
  return generateMap(config);
}
```

**Benefits:**
- Reproducibility
- Share seeds for specific maps
- Version control friendly

## Integration with Our System

### Enhanced Configuration

```typescript
interface EnhancedGenerationConfig {
  // Existing config
  map: MapConfig;
  biome: BiomeConfig;
  levels: LevelConfig;
  roads: RoadConfig;
  water: WaterConfig;
  features: TerrainFeatures;
  boundaries: BoundaryConfig;
  
  // New ARK-inspired config
  erosion: ErosionConfig;
  turbulence: TurbulenceConfig;
  terrainScale: TerrainScaleConfig;
  slopeThresholds: SlopeThresholds;
  biomeFoliage: BiomeFoliageConfig;
  seed: number;
}
```

### Erosion Implementation

```typescript
function applyErosion(
  heightmap: Float32Array,
  config: ErosionConfig
): Float32Array {
  let result = heightmap;
  
  for (let step = 0; step < config.steps; step++) {
    // Erosion pass
    result = erodeTerrain(result, config.strength);
    
    // Deposition pass
    result = depositMaterial(result, config.depositionStrength);
    
    // Turbulence
    if (config.turbulencePower > 0) {
      result = applyTurbulence(result, config.turbulencePower);
    }
  }
  
  return result;
}

function erodeTerrain(
  heightmap: Float32Array,
  strength: number
): Float32Array {
  // Simulate water erosion
  // Higher areas erode more
  // Material flows downhill
  // ... erosion algorithm
}

function depositMaterial(
  heightmap: Float32Array,
  strength: number
): Float32Array {
  // Deposit eroded material in valleys
  // Create alluvial plains
  // ... deposition algorithm
}
```

### Turbulence Application

```typescript
function applyTurbulence(
  heightmap: Float32Array,
  power: number
): Float32Array {
  const noise = generateNoise(heightmap.width, heightmap.height);
  
  for (let i = 0; i < heightmap.length; i++) {
    heightmap[i] += noise[i] * power;
  }
  
  return heightmap;
}
```

### Biome-Specific Foliage

```typescript
function generateBiomeFoliage(
  grid: Grid,
  biomeFoliage: BiomeFoliageConfig
): FoliageMap {
  const foliage = new Map<string, FoliageData>();
  
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      const biome = getBiomeAt(cell);
      const slope = calculateSlope(cell);
      const config = biomeFoliage[biome];
      
      // Check slope threshold
      if (slope > config.slopeThreshold) {
        continue; // Too steep for vegetation
      }
      
      // Generate grass
      if (Math.random() < config.grassDensity) {
        addGrass(foliage, x, y, biome);
      }
      
      // Generate trees
      if (Math.random() < config.treeDensity) {
        addTree(foliage, x, y, biome);
      }
    }
  }
  
  return foliage;
}
```

## Phase Integration

### Phase 1: Enhanced Level Distribution

Add erosion and turbulence to level distribution:

```typescript
// Phase 1: Logical Level Grid
function distributeBaseLevels(grid: Grid, config: EnhancedGenerationConfig): void {
  // Initial level distribution
  distributeLevels(grid, config.levels);
  
  // Apply erosion (if enabled)
  if (config.erosion.enabled) {
    applyErosionToLevels(grid, config.erosion);
  }
  
  // Apply turbulence
  if (config.turbulence.enabled) {
    applyTurbulenceToLevels(grid, config.turbulence);
  }
}
```

### Phase 3: Enhanced Heightmap

Apply terrain scale and erosion:

```typescript
// Phase 3: Convert to Heightmap
function generateHeightmap(
  grid: Grid,
  config: EnhancedGenerationConfig
): Float32Array {
  // Base heightmap
  let heightmap = calculateBaseHeights(grid);
  
  // Apply terrain scale
  heightmap = applyTerrainScale(heightmap, config.terrainScale);
  
  // Apply erosion
  if (config.erosion.enabled) {
    heightmap = applyErosion(heightmap, config.erosion);
  }
  
  // Apply turbulence
  if (config.turbulence.enabled) {
    heightmap = applyTurbulence(heightmap, config.turbulence);
  }
  
  return heightmap;
}
```

## Configuration UI

### Enhanced Configuration Panel

```typescript
interface EnhancedConfigUI {
  // Map Settings
  mapSeed: number;
  landscapeRadius: number;
  terrainScale: { x: number; y: number; z: number };
  
  // Erosion Settings
  erosionEnabled: boolean;
  erosionSteps: number;
  erosionStrength: number;
  depositionStrength: number;
  turbulencePower: number;
  
  // Mountain Settings
  mountainFrequency: number;
  mountainHeight: number;
  mountainSlope: number;
  
  // Water Settings
  waterFrequency: number;
  waterLevel: number;
  oceanFloorLevel: number;
  
  // Slope Thresholds
  treesSlopeThreshold: number;
  shoreSlope: number;
  
  // Biome Foliage (per biome)
  biomeFoliage: {
    [biome: string]: {
      grassDensity: number;
      treeDensity: number;
      waterObjectsDensity: number;
      underwaterObjectsDensity: number;
    };
  };
}
```

## Benefits

1. **More Realistic Terrain**: Erosion creates natural-looking valleys and ridges
2. **Fine-Grained Control**: Granular parameters for precise adjustments
3. **Biome Variation**: Different foliage per biome for realism
4. **Reproducibility**: Seed system for consistent generation
5. **Natural Variation**: Turbulence adds subtle randomness
6. **Slope Awareness**: Vegetation respects slope thresholds

## Implementation Priority

### High Priority

1. **Map Seed System**: Easy to implement, high value
2. **Biome-Specific Foliage**: Already have biome system
3. **Slope Thresholds**: Already have slope system
4. **Terrain Scale Multiplier**: Simple scaling

### Medium Priority

5. **Turbulence Power**: Add subtle variation
6. **Enhanced Mountain Parameters**: More control
7. **Water Parameters**: Fine-tune water features

### Low Priority (Future)

8. **Erosion System**: Complex but valuable
9. **Deposition System**: Part of erosion

## Example Configuration

```typescript
const arkInspiredConfig: EnhancedGenerationConfig = {
  seed: 999,
  map: {
    width: 1024,
    height: 1024,
    cellSize: 1,
  },
  erosion: {
    enabled: true,
    steps: 4,
    strength: 0.75,
    depositionStrength: 0.5,
    turbulencePower: 0.0125,
  },
  terrainScale: {
    x: 1.0,
    y: 1.0,
    z: 1.0,
  },
  features: {
    mountains: {
      enabled: true,
      frequency: 12.0,
      height: 1.25,
      slope: 1.8,
    },
  },
  water: {
    frequency: 5.0,
    level: -0.72,
    oceanFloorLevel: -1.0,
  },
  slopeThresholds: {
    trees: 0.5,
    shore: 1.0,
    walkable: 45, // degrees
  },
  biomeFoliage: {
    grasslands: {
      grassDensity: 1.0,
      treeDensity: 0.003,
    },
    jungle: {
      grassDensity: 0.02,
      treeDensity: 0.66,
    },
    // ... other biomes
  },
};
```

## Conclusion

ARK's procedural generation system provides valuable insights:

1. **Erosion System**: Creates more natural terrain
2. **Granular Controls**: Fine-tuned parameters for precision
3. **Biome-Specific Settings**: Realistic variation per biome
4. **Seed System**: Reproducibility and sharing
5. **Slope Thresholds**: Realistic vegetation placement
6. **Turbulence**: Natural variation without chaos

These features can enhance our system while maintaining our core architecture of levels, roads, and procedural generation with minimal manual intervention.

