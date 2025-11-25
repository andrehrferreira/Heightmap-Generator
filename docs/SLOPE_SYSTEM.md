# Slope System

## Overview

The slope system controls the angle of transitions between different height levels. It uses a progressive slope approach to ensure walkability while preventing unauthorized climbing.

## Progressive Slope Design

### Purpose

Since the game has no climbing mechanics, transitions between levels must:
1. **Allow walking**: Gentle slopes at the start for player movement
2. **Prevent climbing**: Steep to near-vertical slopes at the end to prevent scaling
3. **Maintain visibility**: Height differences limited to 1.5x character height for harmonious ramps

### Height Difference Constraint

**Critical Constraint**: Height difference between adjacent levels **must not exceed 1.5x the default Unreal character height** (~270 Unreal units).

**Why:**
- Larger differences make ramps too steep and visually jarring
- Players need clear visibility of ramps between levels
- Harmonious ascent/descent requires controlled transitions
- Prevents ramps from becoming too steep to see or navigate

```typescript
const DEFAULT_CHARACTER_HEIGHT = 180; // Unreal units (typical humanoid)
const MAX_HEIGHT_DIFFERENCE = DEFAULT_CHARACTER_HEIGHT * 1.5; // 270 units

function validateLevelTransition(levelA: number, levelB: number): boolean {
  const heightA = levelA * MAX_HEIGHT_DIFFERENCE;
  const heightB = levelB * MAX_HEIGHT_DIFFERENCE;
  const difference = Math.abs(heightB - heightA);
  
  if (difference > MAX_HEIGHT_DIFFERENCE) {
    console.warn(`Height difference ${difference} exceeds maximum ${MAX_HEIGHT_DIFFERENCE}`);
    return false;
  }
  
  return true;
}
```

### Slope Progression

```typescript
interface SlopeConfig {
  startAngle: number;      // Starting angle in degrees (e.g., 15-30°)
  endAngle: number;       // Ending angle in degrees (e.g., 85-89°)
  transitionLength: number; // Length of transition in cells
  curveType: SlopeCurve;   // Progression curve type
}

enum SlopeCurve {
  LINEAR = 'linear',
  EASE_IN = 'ease-in',      // Gentle start, steep end
  EASE_OUT = 'ease-out',     // Steep start, gentle end
  EASE_IN_OUT = 'ease-in-out', // Gentle start/end, steep middle
  EXPONENTIAL = 'exponential', // Exponential increase
}
```

### Slope Calculation

```typescript
function calculateProgressiveSlope(
  t: number,              // Normalized position (0.0 to 1.0)
  config: SlopeConfig
): number {
  // Map t to angle progression
  const angle = lerp(config.startAngle, config.endAngle, t);
  
  // Convert angle to height factor
  // For gentle slopes: height increases gradually
  // For steep slopes: height increases rapidly
  const slopeFactor = calculateSlopeFactor(angle, config.curveType);
  
  return slopeFactor;
}

function calculateSlopeFactor(angle: number, curveType: SlopeCurve): number {
  // Convert angle to normalized height factor
  // 0° = 0.0 (flat)
  // 90° = 1.0 (vertical)
  
  const normalizedAngle = angle / 90.0;
  
  switch (curveType) {
    case SlopeCurve.LINEAR:
      return normalizedAngle;
    
    case SlopeCurve.EASE_IN:
      // Gentle start, steep end
      return normalizedAngle * normalizedAngle;
    
    case SlopeCurve.EASE_OUT:
      // Steep start, gentle end
      return 1 - (1 - normalizedAngle) * (1 - normalizedAngle);
    
    case SlopeCurve.EASE_IN_OUT:
      // Smooth S-curve
      return normalizedAngle < 0.5
        ? 2 * normalizedAngle * normalizedAngle
        : 1 - 2 * (1 - normalizedAngle) * (1 - normalizedAngle);
    
    case SlopeCurve.EXPONENTIAL:
      // Exponential increase
      return Math.pow(normalizedAngle, 2.5);
    
    default:
      return normalizedAngle;
  }
}
```

## Ramp Generation

### Ramp Structure

```typescript
interface Ramp {
  id: string;
  startCell: { x: number; y: number };
  endCell: { x: number; y: number };
  startLevel: number;
  endLevel: number;
  startHeight: number;
  endHeight: number;
  cells: RampCell[];
  slopeConfig: SlopeConfig;
}

interface RampCell {
  x: number;
  y: number;
  height: number;
  slope: number;        // Current slope angle at this cell
  walkable: boolean;    // Whether player can walk here
}
```

### Ramp Height Calculation

```typescript
function generateRampHeight(
  ramp: Ramp,
  cellIndex: number
): number {
  const totalCells = ramp.cells.length;
  const t = cellIndex / (totalCells - 1);  // 0.0 to 1.0
  
  // Calculate progressive slope factor
  const slopeFactor = calculateProgressiveSlope(t, ramp.slopeConfig);
  
  // Interpolate height based on slope factor
  const height = lerp(ramp.startHeight, ramp.endHeight, slopeFactor);
  
  return height;
}
```

### Walkability Check

```typescript
function isCellWalkable(slope: number): boolean {
  // Players can walk on slopes up to ~45 degrees
  // Beyond that, it becomes unclimbable
  const MAX_WALKABLE_SLOPE = 45;  // degrees
  
  return slope <= MAX_WALKABLE_SLOPE;
}
```

## Cliff Generation

### Cliff vs Ramp

- **Ramp**: Progressive slope transition (walkable → unclimbable)
- **Cliff**: Immediate vertical transition (unclimbable)

```typescript
function generateCliff(
  startHeight: number,
  endHeight: number,
  transitionWidth: number
): number[] {
  // Cliffs have minimal transition (1-2 cells)
  // Create near-vertical drop
  
  const heights: number[] = [];
  
  for (let i = 0; i < transitionWidth; i++) {
    const t = i / (transitionWidth - 1);
    
    // Use exponential curve for sharp drop
    const factor = Math.pow(t, 3);  // Cubic for sharp transition
    const height = lerp(startHeight, endHeight, factor);
    
    heights.push(height);
  }
  
  return heights;
}
```

## Slope Visualization

### Color Coding

In the preview, slopes can be color-coded for visualization:

```typescript
function getSlopeColor(slope: number): RGB {
  // Green: Walkable (0-30°)
  // Yellow: Difficult (30-45°)
  // Orange: Very difficult (45-60°)
  // Red: Unclimbable (60-90°)
  
  if (slope <= 30) {
    return { r: 0, g: 255, b: 0 };      // Green
  } else if (slope <= 45) {
    return { r: 255, g: 255, b: 0 };    // Yellow
  } else if (slope <= 60) {
    return { r: 255, g: 165, b: 0 };    // Orange
  } else {
    return { r: 255, g: 0, b: 0 };      // Red
  }
}
```

## Configuration

### Default Slope Settings

```typescript
const DEFAULT_SLOPE_CONFIG: SlopeConfig = {
  startAngle: 20,           // 20° - gentle start
  endAngle: 87,             // 87° - near-vertical end
  transitionLength: 50,     // 50 cells transition
  curveType: SlopeCurve.EASE_IN_OUT,  // Smooth progression
};

// Calculate transition length based on height difference
function calculateHarmoniousTransitionLength(heightDiff: number): number {
  // Ensure ramp is long enough to be visible and harmonious
  // Use 30° slope for calculation (harmonious and visible)
  const HARMONIOUS_SLOPE = 30;
  const minLength = calculateMinRampLength(heightDiff, HARMONIOUS_SLOPE);
  
  // Add extra length for smoother transition (20% buffer)
  return Math.ceil(minLength * 1.2);
}
```

### Per-Biome Slope Settings

Different biomes can have different slope characteristics:

```typescript
const BIOME_SLOPE_CONFIGS: Record<BiomeType, SlopeConfig> = {
  [BiomeType.DESERT]: {
    startAngle: 15,
    endAngle: 85,
    transitionLength: 60,
    curveType: SlopeCurve.EASE_IN,
  },
  [BiomeType.MOUNTAIN]: {
    startAngle: 25,
    endAngle: 89,
    transitionLength: 40,
    curveType: SlopeCurve.EXPONENTIAL,
  },
  // ... other biomes
};
```

## Integration with Road System

### Road Ramps

Roads connecting different levels use ramps with controlled slopes:

```typescript
interface RoadRamp extends Ramp {
  roadId: string;
  width: number;              // Road width
  smoothness: number;          // Smoothing factor
}
```

### Road Ramp Generation

```typescript
function generateRoadRamp(
  road: Road,
  startLevel: number,
  endLevel: number
): RoadRamp {
  // Validate height difference constraint
  if (!validateLevelTransition(startLevel, endLevel)) {
    throw new Error(
      `Height difference between level ${startLevel} and ${endLevel} exceeds maximum ${MAX_HEIGHT_DIFFERENCE}`
    );
  }
  
  const startHeight = calculateBaseHeight(startLevel);
  const endHeight = calculateBaseHeight(endLevel);
  
  // Height difference is guaranteed to be <= MAX_HEIGHT_DIFFERENCE
  const heightDiff = Math.abs(endHeight - startHeight);
  
  // Calculate required length for harmonious, visible ramp
  // Use gentle slope (30°) for better visibility and harmony
  const HARMONIOUS_SLOPE = 30; // degrees - gentle and visible
  const minLength = calculateMinRampLength(heightDiff, HARMONIOUS_SLOPE);
  
  // Generate ramp cells with sufficient length for visibility
  const rampCells = generateRampPath(road.path, minLength);
  
  // Apply progressive slope
  const ramp: RoadRamp = {
    ...createRamp(startLevel, endLevel, rampCells),
    roadId: road.id,
    width: road.width,
    smoothness: 0.8,
  };
  
  return ramp;
}

function calculateMinRampLength(heightDiff: number, maxSlope: number): number {
  // Calculate minimum length for walkable slope
  // tan(maxSlope) = heightDiff / length
  // length = heightDiff / tan(maxSlope)
  
  const maxSlopeRad = (maxSlope * Math.PI) / 180;
  return heightDiff / Math.tan(maxSlopeRad);
}
```

## Performance Considerations

### Slope Pre-calculation

Slopes can be pre-calculated and cached:

```typescript
class SlopeCache {
  private cache: Map<string, number[]> = new Map();
  
  getSlopeProfile(config: SlopeConfig): number[] {
    const key = this.getCacheKey(config);
    
    if (!this.cache.has(key)) {
      const profile = this.calculateProfile(config);
      this.cache.set(key, profile);
    }
    
    return this.cache.get(key)!;
  }
  
  private calculateProfile(config: SlopeConfig): number[] {
    const profile: number[] = [];
    const steps = config.transitionLength;
    
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const factor = calculateProgressiveSlope(t, config);
      profile.push(factor);
    }
    
    return profile;
  }
}
```

