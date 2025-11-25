# Underwater Content and Mountain Peaks

## Overview

Unlike top-down games like Albion Online, ToS (Throne of Secrets) is a **3D MMO** that supports:
1. **Underwater gameplay** with negative levels
2. **Mountain peaks** that extend above the maximum walkable level

These features leverage the 3D nature of the game to create more immersive and varied gameplay.

## Underwater Content (Negative Levels)

### Concept

Negative levels represent **playable underwater areas** where players can move in 3D space (up/down/depth). This is fundamentally different from top-down games where negative levels might only represent underground areas.

### Level Structure

```typescript
interface UnderwaterLevels {
  [-3]: -1800,  // Deep underwater / abyss (playable)
  [-2]: -1200,  // Underwater / deep sea (playable)
  [-1]: -600,   // Shallow underwater / near surface (playable)
  [0]: 0,       // Sea level / ground level
}
```

### Underwater Features

#### 1. Playable Underwater Zones

```typescript
interface UnderwaterZone {
  levelId: number;        // Negative level (-1, -2, -3)
  depth: number;         // Depth in Unreal units
  playable: boolean;     // Always true for underwater levels
  waterVolume: {
    top: number;         // Top of water volume
    bottom: number;      // Bottom of water volume
  };
}
```

#### 2. Underwater Roads/Ramps

Underwater navigation uses roads and ramps just like surface areas:

```typescript
interface UnderwaterRoad {
  roadId: string;
  levelId: number;       // Negative level
  path: Point3D[];      // 3D path (includes depth)
  width: number;
  depth: number;        // Constant depth along road
}
```

**Characteristics:**
- Roads maintain constant depth (like surface roads maintain constant height)
- Ramps transition between underwater levels smoothly
- Progressive slopes apply underwater as well

#### 3. Underwater POIs

Points of Interest can be placed underwater:

```typescript
interface UnderwaterPOI {
  id: string;
  type: 'ruin' | 'cave' | 'resource' | 'dungeon';
  position: Point3D;    // Includes depth (z coordinate)
  levelId: number;       // Negative level
  depth: number;        // Depth from surface
}
```

**Examples:**
- Underwater ruins
- Submerged caves
- Underwater resource nodes
- Underwater dungeons

#### 4. Water Volumes

Water volumes are placed at appropriate depths:

```typescript
interface WaterVolume {
  id: string;
  topLevel: number;     // Top of water (e.g., 0 for sea level)
  bottomLevel: number;  // Bottom of water (e.g., -2)
  cells: Cell[];         // Cells covered by this volume
  properties: {
    visibility: number;  // Underwater visibility
    current: boolean;    // Has water current
    temperature: number; // Water temperature
  };
}
```

### Underwater Generation

#### Phase 1: Underwater Level Distribution

```typescript
function distributeUnderwaterLevels(grid: Grid, config: UnderwaterConfig): void {
  // Select regions for underwater levels
  for (const level of [-3, -2, -1]) {
    const regions = selectUnderwaterRegions(level, config);
    
    for (const region of regions) {
      floodFillLevel(grid, region, level);
      markAsUnderwater(grid, region);
    }
  }
}
```

#### Phase 2: Underwater Roads

```typescript
function generateUnderwaterRoads(
  pois: POINode[],
  underwaterLevels: number[]
): Road[] {
  // Generate roads connecting underwater POIs
  // Roads maintain constant depth (like surface roads maintain height)
  const roads: Road[] = [];
  
  for (const level of underwaterLevels) {
    const levelPOIs = pois.filter(p => p.levelId === level);
    const levelRoads = generateRoadNetwork(levelPOIs, level);
    
    // Mark as underwater roads
    levelRoads.forEach(road => {
      road.underwater = true;
      road.depth = calculateRoadDepth(road, level);
    });
    
    roads.push(...levelRoads);
  }
  
  return roads;
}
```

#### Phase 3: Underwater Heightmap

```typescript
function generateUnderwaterHeightmap(
  grid: Grid,
  underwaterLevels: number[]
): void {
  for (const level of underwaterLevels) {
    const baseHeight = baseHeightMap[level];
    
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (grid.levelId[y][x] === level) {
          // Underwater height (negative)
          grid.height[y][x] = baseHeight + underwaterNoise(x, y);
          grid.flags[y][x].underwater = true;
          grid.flags[y][x].playable = true; // Underwater is playable
        }
      }
    }
  }
}
```

## Mountain Peaks Above Walkable Level

### Concept

Since ToS is **3D** (not top-down), mountains can extend **above the maximum walkable level**. The peak is **visual/impassable**, creating dramatic skylines and natural boundaries.

### Mountain Structure

```typescript
interface Mountain {
  id: string;
  baseLevel: number;        // Base level (walkable, e.g., 1)
  peakLevel: number;        // Peak level (above walkable, e.g., 3)
  maxWalkableLevel: number; // Maximum walkable level (e.g., 2)
  basePosition: Point2D;
  peakPosition: Point3D;    // Includes height
  visualOnly: boolean;      // Peak is visual/impassable
}
```

### Mountain Configuration

```typescript
interface MountainConfig {
  baseLevel: number;        // Where mountain starts (walkable)
  peakLevel: number;        // Peak height (above walkable)
  maxWalkableLevel: number; // Players can't go higher
  baseRadius: number;       // Base radius
  peakRadius: number;        // Peak radius (smaller)
  slopeCurve: SlopeCurve;   // How mountain rises
}
```

### Mountain Generation

#### Phase 1: Mountain Base Placement

```typescript
function placeMountainBases(
  grid: Grid,
  config: MountainConfig[]
): void {
  for (const mountainConfig of config) {
    // Place base at walkable level
    const baseRegion = selectMountainBaseRegion(
      grid,
      mountainConfig.baseLevel
    );
    
    // Mark base cells
    for (const cell of baseRegion) {
      grid.levelId[cell.y][cell.x] = mountainConfig.baseLevel;
      grid.flags[cell.y][cell.x].playable = true;
    }
  }
}
```

#### Phase 3: Mountain Peak Generation

```typescript
function generateMountainPeaks(
  grid: Grid,
  mountains: Mountain[]
): void {
  for (const mountain of mountains) {
    const peakCells = calculatePeakCells(mountain);
    
    for (const cell of peakCells) {
      // Calculate height above walkable level
      const height = calculateMountainHeight(
        cell,
        mountain.baseLevel,
        mountain.peakLevel,
        mountain.slopeCurve
      );
      
      grid.height[cell.y][cell.x] = height;
      grid.levelId[cell.y][cell.x] = mountain.peakLevel;
      grid.flags[cell.y][cell.x].visualOnly = true; // Impassable
      grid.flags[cell.y][cell.x].playable = false;  // Not walkable
    }
  }
}

function calculateMountainHeight(
  cell: Point2D,
  baseLevel: number,
  peakLevel: number,
  curve: SlopeCurve
): number {
  const distanceFromBase = calculateDistance(cell, mountainBase);
  const maxDistance = mountain.baseRadius;
  const t = Math.min(distanceFromBase / maxDistance, 1.0);
  
  // Use progressive slope curve
  const heightFactor = calculateProgressiveSlope(t, {
    startAngle: 30,  // Gentle base
    endAngle: 89,    // Near-vertical peak
    curveType: curve,
  });
  
  const baseHeight = baseHeightMap[baseLevel];
  const peakHeight = baseHeightMap[peakLevel];
  
  return lerp(baseHeight, peakHeight, heightFactor);
}
```

### Visual-Only Elements

Mountain peaks are marked as `visualOnly`:

```typescript
interface VisualOnlyElement {
  type: 'mountain_peak' | 'sky_island' | 'floating_structure';
  levelId: number;        // Level above max walkable
  height: number;         // Height in Unreal units
  impassable: boolean;    // Always true for visual-only
  collision: boolean;     // Whether it has collision (usually false)
}
```

**Characteristics:**
- **Visible** in 3D space (creates skyline)
- **Impassable** - players cannot reach
- **No collision** (usually) - players pass through if they somehow reach
- **Natural boundaries** - creates visual barriers

## Integration with Existing Systems

### Layer System

Underwater and mountain peaks use the layer system:

```typescript
// Underwater layer
const underwaterLayer: Layer = {
  type: LayerType.UNDERWATER,
  name: "Underwater Zones",
  color: { r: 0, g: 100, b: 200 }, // Blue
  // ... layer properties
};

// Mountain peaks layer
const mountainPeaksLayer: Layer = {
  type: LayerType.MOUNTAINS,
  name: "Mountain Peaks",
  color: { r: 139, g: 69, b: 19 }, // Brown
  visualOnly: true, // Mark as visual-only
  // ... layer properties
};
```

### Export Masks

Additional masks for underwater and visual-only elements:

```typescript
interface ExportMasks {
  heightmap: ImageData;
  roads_mask: ImageData;
  water_mask: ImageData;
  underwater_mask: ImageData;      // NEW: Underwater areas
  cliffs_mask: ImageData;
  level_mask: ImageData;
  visual_only_mask: ImageData;    // NEW: Visual-only elements (peaks)
}
```

### Unreal Engine Integration

#### Underwater Volumes

```typescript
// In Unreal, create water volumes based on underwater_mask
function createUnderwaterVolumes(mask: ImageData): WaterVolume[] {
  const volumes: WaterVolume[] = [];
  
  // Parse mask to find underwater regions
  const regions = findRegions(mask, UNDERWATER_VALUE);
  
  for (const region of regions) {
    const volume: WaterVolume = {
      top: 0,              // Sea level
      bottom: region.level * -600, // Based on level
      bounds: region.bounds,
      properties: {
        visibility: calculateVisibility(region.level),
        current: region.hasCurrent,
      },
    };
    
    volumes.push(volume);
  }
  
  return volumes;
}
```

#### Visual-Only Elements

```typescript
// In Unreal, create visual-only meshes for mountain peaks
function createVisualOnlyMeshes(mask: ImageData): Mesh[] {
  const meshes: Mesh[] = [];
  
  // Parse visual_only_mask
  const peaks = findRegions(mask, VISUAL_ONLY_VALUE);
  
  for (const peak of peaks) {
    const mesh: Mesh = {
      type: 'mountain_peak',
      position: peak.position,
      height: peak.height,
      collision: false,  // No collision
      visible: true,      // Visible
    };
    
    meshes.push(mesh);
  }
  
  return meshes;
}
```

## Gameplay Implications

### Underwater Gameplay

1. **3D Movement**: Players can move up/down/depth underwater
2. **Breathing Mechanics**: May need air sources or breathing mechanics
3. **Visibility**: Reduced visibility at depth
4. **Navigation**: Underwater roads/ramps for navigation
5. **Combat**: Underwater combat mechanics

### Mountain Peaks

1. **Visual Interest**: Dramatic skylines in 3D space
2. **Natural Boundaries**: Visual barriers without collision
3. **Atmosphere**: Creates sense of scale and grandeur
4. **Navigation**: Players must navigate around peaks
5. **No Climbing**: Peaks are impassable (no climbing mechanics)

## Configuration

### Underwater Configuration

```typescript
interface UnderwaterConfig {
  enabled: boolean;
  levels: number[];              // Negative levels to use (e.g., [-3, -2, -1])
  distribution: {
    [levelId: number]: number;   // Percentage of map for each level
  };
  features: {
    ruins: { count: number };
    caves: { count: number };
    resources: { count: number };
  };
}
```

### Mountain Configuration

```typescript
interface MountainConfig {
  enabled: boolean;
  count: number;
  baseLevel: number;        // Base level (walkable)
  peakLevel: number;       // Peak level (above walkable)
  maxWalkableLevel: number; // Maximum walkable level
  minHeight: number;       // Minimum peak height
  maxHeight: number;       // Maximum peak height
  visualOnly: boolean;     // Always true for peaks
}
```

