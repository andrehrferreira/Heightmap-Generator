# System Architecture

## Mental Model

The heightmap generator does **not** generate "realistic mountains". Instead, it generates a 2D grid of cells (e.g., 1024x1024) with:

- **levelId**: Floor level (-2, -1, 0, 1, 2, ...)
- **height**: Height in Unreal units
- **flags**: Road, water, cliff, etc.

### Height Derivation

Height is primarily derived from `levelId`:

```
height = baseHeight[levelId] + small_local_variation
```

### Road Constraints

Roads enforce:
- Constant `levelId` along the path
- Nearly flat height (minimal noise)

### Ramps

Ramps are special strips where `levelId` transitions from A to B over N cells, generating a controlled slope ramp.

**Progressive Slope System**: Ramps use a progressive slope system to prevent player climbing:
- **Start**: Gentle slope (~15-30 degrees) for walkability
- **Middle**: Gradually increasing slope
- **End**: Near-vertical slope (~85-89 degrees) - unclimbable without ladders

This ensures players can walk up ramps but cannot climb cliffs or walls, as the game has no climbing mechanics.

### Cliffs

Cliffs are essentially "neighbors with different `levelId` without a ramp between them".

## Grid Output

The grid produces:

1. **16-bit heightmap** for Unreal Landscape
2. **Auxiliary masks**:
   - `roads_mask`: Road areas
   - `water_mask`: Water bodies (rivers, lakes)
   - `cliffs_mask`: High slope/cliff areas
   - `level_mask`: Level ID mapping (useful for PCG and materials)
   - `navigation_walkable_mask`: Walkable areas for NavMesh generation
   - `navigation_swimable_mask`: Swimmable areas for water NavMesh
   - `navigation_flyable_mask`: Flyable areas for 3D NavMesh
   - `collision_map`: Collision map for automatic collision volumes

## Layer System

The system uses a Photoshop-like layer system to organize terrain features:

- **Separate layers** for each feature type (rivers, lakes, mountains, canyons, roads)
- **Manual stamps** for placing features in specific areas
- **Solid color identification** for easy visual distinction
- **Layer blending** modes for combining layers
- **Independent editing** of each layer

See [Layer System](LAYER_SYSTEM.md) for detailed documentation.

## Multi-Map System

The system supports multiple interconnected maps (zones):

- **Multiple zones** in a single world (e.g., 20 zones)
- **Zone connections** for seamless transitions
- **Zone visibility** control for performance optimization
- **Cross-zone editing** capabilities
- **Independent zone editing** with active zone selection

See [Multi-Map System](MULTI_MAP_SYSTEM.md) for detailed documentation.

## Underwater and Mountain Peaks

Unlike top-down games, ToS supports **3D gameplay** with:

- **Underwater content**: Negative levels represent playable underwater areas
- **Mountain peaks**: Extend above maximum walkable level (visual/impassable)

See [Underwater and Mountains](UNDERWATER_AND_MOUNTAINS.md) for detailed documentation.

## Grid Structure

### Cell Properties

Each cell `[y][x]` contains:

```typescript
interface Cell {
  levelId: number;        // Floor level (-2, -1, 0, 1, 2, ...)
  height: number;         // Height in Unreal units
  flags: CellFlags;       // Feature flags
  roadId?: number;        // Road identifier (if part of a road)
}

interface CellFlags {
  road: boolean;          // Is part of a road
  ramp: boolean;          // Is part of a ramp
  water: boolean;         // Is water (river/lake)
  underwater: boolean;    // Is underwater (negative level)
  blocked: boolean;       // Blocked/unplayable area
  cliff: boolean;         // Is a cliff edge
  playable: boolean;      // Is playable area
  visualOnly: boolean;    // Visual only (e.g., mountain peaks above walkable)
  boundary: boolean;      // Is a boundary (edge, interior, or ocean)
  boundaryType?: BoundaryType; // Type of boundary (edge, interior, ocean, custom)
}
```

### Grid Dimensions

```typescript
cols = mapSize.width / cellSize
rows = mapSize.height / cellSize
```

Where:
- `mapSize`: Total map dimensions (e.g., 1024x1024 Unreal units)
- `cellSize`: Size of each cell (e.g., 1-4 Unreal units)

## Level System

### Height Difference Constraint

**Critical Rule**: The height difference between adjacent levels **must not exceed 1.5x the default Unreal character height**.

**Rationale:**
- Larger differences make ramps too steep and hard to see
- Players need clear visibility of ramps between levels
- Harmonious ascent/descent requires controlled height differences

**Default Unreal Character Height**: ~180 Unreal units (typical humanoid character)

**Maximum Height Difference**: `180 * 1.5 = 270 Unreal units`

### Base Heights

Each level has a base height, constrained by the maximum height difference:

```typescript
const DEFAULT_CHARACTER_HEIGHT = 180; // Unreal units
const MAX_HEIGHT_DIFFERENCE = DEFAULT_CHARACTER_HEIGHT * 1.5; // 270 units

baseHeight: Record<number, number> = {
  [-2]: -540,   // Deep underground / canyon base (2 * 270)
  [-1]: -270,   // Underground / deep rivers (1 * 270)
  [0]: 0,       // Ground level
  [1]: 270,     // Playable plateaus (1 * 270)
  [2]: 540,     // Background unreachable (2 * 270)
  // ... additional levels
  // Each level difference: MAX 270 units
}
```

**Height Calculation:**
```typescript
function calculateBaseHeight(levelId: number): number {
  return levelId * MAX_HEIGHT_DIFFERENCE;
}

// Validate height difference between levels
function validateHeightDifference(levelA: number, levelB: number): boolean {
  const heightA = calculateBaseHeight(levelA);
  const heightB = calculateBaseHeight(levelB);
  const difference = Math.abs(heightB - heightA);
  
  return difference <= MAX_HEIGHT_DIFFERENCE;
}
```

### Level Distribution

- **Level -N to -1**: Underwater / subaquatic content (playable underwater areas)
- **Level 0**: Default ground level (sea level)
- **Level 1**: Playable plateaus
- **Level 2+**: Background unreachable areas
- **Level MAX+**: Mountain peaks above walkable level (visual/impassable in 3D)

### Underwater Levels (Negative)

Unlike top-down games, ToS supports **underwater gameplay** with negative levels:

```typescript
baseHeight: Record<number, number> = {
  [-3]: -1800,  // Deep underwater / abyss
  [-2]: -1200,  // Underwater / deep sea
  [-1]: -600,   // Shallow underwater / near surface
  [0]: 0,       // Sea level / ground level
  [1]: 600,     // Playable plateaus
  [2]: 1200,    // Background unreachable
  [3]: 1800,    // Mountain peaks (above walkable, visual only)
  // ... additional levels
}
```

**Underwater Features:**
- Negative levels are fully playable (3D movement)
- Water volumes placed at appropriate depths
- Underwater roads/ramps for navigation
- Underwater POIs (ruins, caves, resources)

### Mountain Peaks Above Walkable Level

Since ToS is **3D** (not top-down like Albion), mountains can extend above the maximum walkable level:

```typescript
interface MountainConfig {
  baseLevel: number;        // Base level where mountain starts (e.g., 1)
  peakLevel: number;        // Peak level (e.g., 3) - above walkable
  maxWalkableLevel: number; // Maximum level players can walk (e.g., 2)
  visualOnly: boolean;       // True if peak is visual/impassable only
}
```

**Mountain Behavior:**
- Base at walkable level (players can reach base)
- Peak extends above maximum walkable level
- Peak is **visual/impassable** - creates dramatic skyline
- Players cannot climb to peak (no climbing mechanics)
- Creates natural boundaries and visual interest in 3D space

## Playability Rules

Areas marked as "background" that are not connected to roads become scenery only:

```typescript
flags[y][x].playable = false
```

This ensures only connected, accessible areas are marked as playable for MMO/PvP gameplay.

## Slope System

The system uses a progressive slope approach for transitions between levels:

- **Gentle start**: Ramps begin with walkable slopes (~15-30°)
- **Progressive increase**: Slope gradually increases along the transition
- **Steep end**: Ramps end with near-vertical slopes (~85-89°) to prevent climbing

This design prevents players from climbing cliffs or walls since the game has no climbing mechanics, while still allowing movement up ramps.

See [Slope System](SLOPE_SYSTEM.md) for detailed documentation.

