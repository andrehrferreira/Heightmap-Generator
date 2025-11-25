# Boundaries and Blocking Zones

## Overview

The system supports configurable boundaries and blocking zones that prevent player movement, even in the middle of oceans or open areas. This is essential for:
- Creating map boundaries (edges or interior)
- Defining playable vs non-playable areas
- Supporting both single large map and multiple connected maps
- Allowing harmonic connections between maps

## Boundary System

### Boundary Types

```typescript
enum BoundaryType {
  EDGE = 'edge',              // Map edge boundary
  INTERIOR = 'interior',      // Interior boundary (middle of map)
  OCEAN = 'ocean',            // Ocean boundary (middle of water)
  CUSTOM = 'custom',          // Custom boundary shape
}

interface Boundary {
  id: string;
  type: BoundaryType;
  shape: BoundaryShape;
  blocking: boolean;          // Blocks player movement
  visible: boolean;           // Visible boundary (wall, barrier)
  collision: boolean;         // Has collision
  teleport?: TeleportConfig;  // Teleport to another map/zone
}

interface BoundaryShape {
  type: 'rectangle' | 'circle' | 'polygon' | 'spline';
  points: Point2D[];
  closed: boolean;
}
```

### Boundary Configuration

```typescript
interface BoundaryConfig {
  enabled: boolean;
  boundaries: Boundary[];
  defaultBlocking: boolean;   // Default blocking for non-playable areas
  allowOceanBoundaries: boolean; // Allow boundaries in ocean
  allowInteriorBoundaries: boolean; // Allow boundaries in middle of map
}
```

## Blocking Zones

### Blocking Zone Types

```typescript
enum BlockingZoneType {
  FULL_BLOCK = 'full_block',      // Complete blocking (walls, cliffs)
  SOFT_BLOCK = 'soft_block',      // Soft blocking (invisible barrier)
  TELEPORT = 'teleport',          // Teleport to another area
  TRANSITION = 'transition',       // Transition to another map
}

interface BlockingZone {
  id: string;
  type: BlockingZoneType;
  shape: BoundaryShape;
  blocking: boolean;
  visible: boolean;
  collision: boolean;
  teleport?: TeleportConfig;
  transition?: TransitionConfig;
}
```

### Blocking Zone Configuration

```typescript
interface BlockingZoneConfig {
  enabled: boolean;
  zones: BlockingZone[];
  defaultBehavior: BlockingZoneType;
}
```

## Boundary Generation

### Procedural Boundary Generation

```typescript
function generateProceduralBoundaries(
  grid: Grid,
  config: BoundaryConfig
): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // Edge boundaries (if enabled)
  if (config.enabled) {
    boundaries.push(...generateEdgeBoundaries(grid, config));
  }
  
  // Interior boundaries (if enabled)
  if (config.allowInteriorBoundaries) {
    boundaries.push(...generateInteriorBoundaries(grid, config));
  }
  
  // Ocean boundaries (if enabled)
  if (config.allowOceanBoundaries) {
    boundaries.push(...generateOceanBoundaries(grid, config));
  }
  
  return boundaries;
}

function generateEdgeBoundaries(
  grid: Grid,
  config: BoundaryConfig
): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // North edge
  boundaries.push({
    id: 'boundary-north',
    type: BoundaryType.EDGE,
    shape: {
      type: 'rectangle',
      points: [
        { x: 0, y: 0 },
        { x: grid.width, y: 0 },
        { x: grid.width, y: 10 }, // 10 unit boundary width
        { x: 0, y: 10 },
      ],
      closed: true,
    },
    blocking: true,
    visible: true,
    collision: true,
  });
  
  // South, East, West edges similarly...
  
  return boundaries;
}

function generateOceanBoundaries(
  grid: Grid,
  config: BoundaryConfig
): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // Find large ocean areas
  const oceanRegions = findOceanRegions(grid);
  
  for (const region of oceanRegions) {
    // Create boundary in middle of ocean
    boundaries.push({
      id: `boundary-ocean-${region.id}`,
      type: BoundaryType.OCEAN,
      shape: {
        type: 'circle',
        points: calculateCirclePoints(region.center, region.radius),
        closed: true,
      },
      blocking: true,
      visible: false, // Invisible boundary in ocean
      collision: true,
    });
  }
  
  return boundaries;
}

function generateInteriorBoundaries(
  grid: Grid,
  config: BoundaryConfig
): Boundary[] {
  const boundaries: Boundary[] = [];
  
  // Create boundaries in middle of map if needed
  // For example, to separate zones or create barriers
  
  return boundaries;
}
```

## Boundary Application to Grid

### Marking Blocked Cells

```typescript
function applyBoundariesToGrid(
  grid: Grid,
  boundaries: Boundary[]
): void {
  for (const boundary of boundaries) {
    const cells = getCellsInBoundary(grid, boundary);
    
    for (const cell of cells) {
      // Mark as blocked
      grid.cells[cell.y][cell.x].flags.blocked = true;
      grid.cells[cell.y][cell.x].flags.playable = false;
      
      // Mark boundary type
      grid.cells[cell.y][cell.x].boundaryType = boundary.type;
      grid.cells[cell.y][cell.x].boundaryId = boundary.id;
    }
  }
}
```

### Boundary Mask Generation

```typescript
function generateBoundaryMask(
  grid: Grid,
  boundaries: Boundary[]
): Uint8Array {
  const mask = new Uint8Array(grid.width * grid.height);
  
  for (const boundary of boundaries) {
    const cells = getCellsInBoundary(grid, boundary);
    
    for (const cell of cells) {
      const index = cell.y * grid.width + cell.x;
      
      switch (boundary.type) {
        case BoundaryType.EDGE:
          mask[index] = 255; // Full blocking
          break;
        case BoundaryType.INTERIOR:
          mask[index] = 200; // Interior blocking
          break;
        case BoundaryType.OCEAN:
          mask[index] = 150; // Ocean blocking
          break;
        case BoundaryType.CUSTOM:
          mask[index] = 100; // Custom blocking
          break;
      }
    }
  }
  
  return mask;
}
```

## Map Connection System

### Connection Types

```typescript
enum ConnectionType {
  SEAMLESS = 'seamless',      // Seamless connection (no boundary)
  TELEPORT = 'teleport',      // Teleport connection
  TRANSITION = 'transition',  // Transition zone
  BLOCKED = 'blocked',        // Blocked connection
}

interface MapConnection {
  id: string;
  mapA: string;
  mapB: string;
  type: ConnectionType;
  boundaryA: Boundary;
  boundaryB: Boundary;
  teleport?: TeleportConfig;
}
```

### Harmonic Connection

```typescript
function createHarmonicConnection(
  mapA: Map,
  mapB: Map,
  connectionType: ConnectionType
): MapConnection {
  // Find matching boundaries
  const boundaryA = findMatchingBoundary(mapA, mapB);
  const boundaryB = findMatchingBoundary(mapB, mapA);
  
  // Create harmonic transition
  if (connectionType === ConnectionType.SEAMLESS) {
    // Blend boundaries for seamless connection
    blendBoundaries(boundaryA, boundaryB);
  } else if (connectionType === ConnectionType.TELEPORT) {
    // Create teleport points
    createTeleportPoints(boundaryA, boundaryB);
  }
  
  return {
    id: generateId(),
    mapA: mapA.id,
    mapB: mapB.id,
    type: connectionType,
    boundaryA,
    boundaryB,
  };
}
```

## Single Map vs Multiple Maps

### Single Large Map

```typescript
interface SingleMapConfig {
  type: 'single';
  size: { width: number; height: number };
  boundaries: BoundaryConfig;
  // Edge boundaries only
  // Interior boundaries optional
}
```

**Characteristics:**
- One large continuous map
- Edge boundaries define playable area
- Interior boundaries optional (for zones)
- No teleports needed

### Multiple Connected Maps

```typescript
interface MultipleMapsConfig {
  type: 'multiple';
  maps: Map[];
  connections: MapConnection[];
  boundaries: BoundaryConfig;
  // Each map has boundaries
  // Connections between maps
}
```

**Characteristics:**
- Multiple smaller maps
- Each map has boundaries
- Connections via teleports or transitions
- Harmonic connections between maps

## Boundary Export

### Boundary Mask

```typescript
function exportBoundaryMask(
  grid: Grid,
  boundaries: Boundary[]
): Uint8Array {
  const mask = new Uint8Array(grid.width * grid.height);
  
  for (const boundary of boundaries) {
    const cells = getCellsInBoundary(grid, boundary);
    
    for (const cell of cells) {
      const index = cell.y * grid.width + cell.x;
      mask[index] = getBoundaryValue(boundary.type);
    }
  }
  
  return mask;
}

function getBoundaryValue(type: BoundaryType): number {
  switch (type) {
    case BoundaryType.EDGE: return 255;
    case BoundaryType.INTERIOR: return 200;
    case BoundaryType.OCEAN: return 150;
    case BoundaryType.CUSTOM: return 100;
    default: return 0;
  }
}
```

### Export Structure

```
output/
  ├── boundary_mask.png        # Boundary map (8-bit)
  ├── blocking_zones_mask.png  # Blocking zones (8-bit)
  └── boundaries.json          # Boundary definitions (JSON)
```

## Configuration Options

### Boundary Configuration

```typescript
interface BoundaryGenerationConfig {
  // Edge boundaries
  edgeBoundaries: {
    enabled: boolean;
    width: number;              // Boundary width in cells
    visible: boolean;           // Visible walls/barriers
    collision: boolean;         // Has collision
  };
  
  // Interior boundaries
  interiorBoundaries: {
    enabled: boolean;
    allowInOcean: boolean;      // Allow boundaries in ocean
    allowInLand: boolean;       // Allow boundaries on land
    minSize: number;            // Minimum boundary size
  };
  
  // Ocean boundaries
  oceanBoundaries: {
    enabled: boolean;
    allowInOcean: boolean;      // Allow boundaries in middle of ocean
    invisible: boolean;         // Invisible boundaries
    collision: boolean;         // Has collision
  };
  
  // Custom boundaries
  customBoundaries: {
    enabled: boolean;
    shapes: BoundaryShape[];    // Manual boundary shapes
  };
}
```

## Unreal Engine Integration

### Boundary Collision Generation

```cpp
// Generate collision volumes from boundary mask

class BoundaryCollisionGenerator {
public:
    void GenerateBoundaryCollision(
        UTexture2D* BoundaryMask,
        ULandscape* Landscape,
        float CellSize
    );
    
    void GenerateOceanBoundary(
        UTexture2D* OceanBoundaryMask,
        ULandscape* Landscape,
        float WaterHeight
    );
    
    void GenerateInteriorBoundary(
        UTexture2D* InteriorBoundaryMask,
        ULandscape* Landscape
    );
};
```

### Teleport System

```cpp
// Teleport system for map connections

class TeleportSystem {
public:
    void CreateTeleport(
        FVector Position,
        FString TargetMap,
        FVector TargetPosition
    );
    
    void CreateTransitionZone(
        FVector Position,
        FString TargetMap,
        float TransitionRadius
    );
};
```

## Procedural Generation Priority

### Minimal Manual Intervention

The system prioritizes **procedural generation** with minimal manual input:

1. **Automatic Edge Boundaries**: Generated automatically based on map size
2. **Automatic Ocean Boundaries**: Generated based on ocean regions
3. **Automatic Interior Boundaries**: Generated based on zone separation
4. **Manual Override**: Allow manual placement when needed

### Manual Override

```typescript
interface ManualBoundaryOverride {
  boundaries: Boundary[];       // Manually placed boundaries
  blockingZones: BlockingZone[]; // Manually placed blocking zones
  priority: 'manual' | 'procedural'; // Which takes priority
}
```

## Workflow

### Step 1: Configure Boundaries

```typescript
const boundaryConfig: BoundaryGenerationConfig = {
  edgeBoundaries: {
    enabled: true,
    width: 10,
    visible: true,
    collision: true,
  },
  interiorBoundaries: {
    enabled: false, // Disable if single large map
    allowInOcean: true,
    allowInLand: true,
  },
  oceanBoundaries: {
    enabled: true,
    allowInOcean: true,
    invisible: true,
    collision: true,
  },
};
```

### Step 2: Generate Boundaries

```typescript
const boundaries = generateProceduralBoundaries(grid, boundaryConfig);
applyBoundariesToGrid(grid, boundaries);
```

### Step 3: Export Boundaries

```typescript
const boundaryMask = generateBoundaryMask(grid, boundaries);
exportMask('boundary_mask.png', boundaryMask);
exportBoundaries('boundaries.json', boundaries);
```

### Step 4: Unreal Integration

1. Import boundary mask
2. Generate collision volumes
3. Setup teleport points (if multiple maps)
4. Configure transition zones

## Benefits

1. **Procedural Generation**: Minimal manual intervention
2. **Flexible Boundaries**: Edge, interior, ocean boundaries
3. **Harmonic Connections**: Seamless or teleport connections
4. **Single or Multiple Maps**: Support both approaches
5. **Runtime Management**: Update boundaries dynamically
6. **Ocean Support**: Boundaries even in middle of ocean



