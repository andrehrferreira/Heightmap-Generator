# Navigation and Collision System

## Overview

The system generates navigation and collision maps that can be used in Unreal Engine to automatically create NavMesh and collision volumes. This enables automatic pathfinding setup and collision management for players and entities.

## Navigation Map Types

### Navigable Areas Map

Maps all areas where players and entities can navigate:

```typescript
interface NavigationMap {
  walkable: Uint8Array;      // Walkable areas (land)
  swimable: Uint8Array;      // Swimmable areas (water)
  flyable: Uint8Array;       // Flyable areas (air/3D space)
  nonNavigable: Uint8Array;  // Non-navigable areas (cliffs, blocked)
}
```

### Navigation Mask Values

```typescript
enum NavigationType {
  WALKABLE = 255,      // Land navigation (255)
  SWIMABLE = 200,      // Water navigation (200)
  FLYABLE = 150,       // Air/3D navigation (150)
  NON_NAVIGABLE = 0,   // Cannot navigate (0)
  TRANSITION = 128,    // Transition area (128)
}
```

## Navigation Map Generation

### Phase 1: Base Navigation

```typescript
function generateBaseNavigation(grid: Grid): NavigationMap {
  const navMap: NavigationMap = {
    walkable: new Uint8Array(grid.width * grid.height),
    swimable: new Uint8Array(grid.width * grid.height),
    flyable: new Uint8Array(grid.width * grid.height),
    nonNavigable: new Uint8Array(grid.width * grid.height),
  };
  
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      
      // Check cell properties
      if (cell.flags.blocked || cell.flags.cliff) {
        navMap.nonNavigable[y * grid.width + x] = 255;
      } else if (cell.flags.water || cell.flags.underwater) {
        navMap.swimable[y * grid.width + x] = 200;
      } else if (cell.flags.playable) {
        navMap.walkable[y * grid.width + x] = 255;
      }
      
      // All areas are flyable (3D game)
      navMap.flyable[y * grid.width + x] = 150;
    }
  }
  
  return navMap;
}
```

### Phase 2: Road Navigation

Roads are always walkable and have priority:

```typescript
function applyRoadNavigation(
  navMap: NavigationMap,
  roads: Road[],
  grid: Grid
): void {
  for (const road of roads) {
    for (const cell of road.cells) {
      const index = cell.y * grid.width + cell.x;
      
      // Roads are walkable
      navMap.walkable[index] = 255;
      
      // Roads override water (bridges)
      if (navMap.swimable[index] > 0) {
        navMap.swimable[index] = 0;
      }
    }
  }
}
```

### Phase 3: Ramp Navigation

Ramps connect walkable areas:

```typescript
function applyRampNavigation(
  navMap: NavigationMap,
  ramps: Ramp[],
  grid: Grid
): void {
  for (const ramp of ramps) {
    for (const cell of ramp.cells) {
      const index = cell.y * grid.width + cell.x;
      
      // Ramps are walkable
      navMap.walkable[index] = 255;
      
      // Mark as transition area
      navMap.walkable[index] = 128; // Transition value
    }
  }
}
```

### Phase 4: Underwater Navigation

Underwater areas are swimmable:

```typescript
function applyUnderwaterNavigation(
  navMap: NavigationMap,
  underwaterAreas: UnderwaterArea[],
  grid: Grid
): void {
  for (const area of underwaterAreas) {
    for (const cell of area.cells) {
      const index = cell.y * grid.width + cell.x;
      
      // Underwater is swimmable
      navMap.swimable[index] = 200;
      
      // Also flyable (3D movement)
      navMap.flyable[index] = 150;
    }
  }
}
```

## Navigation Mask Export

### Combined Navigation Mask

Single mask combining all navigation types:

```typescript
function exportCombinedNavigationMask(navMap: NavigationMap): Uint8Array {
  const combined = new Uint8Array(navMap.walkable.length);
  
  for (let i = 0; i < combined.length; i++) {
    // Priority: walkable > swimable > flyable > non-navigable
    if (navMap.walkable[i] > 0) {
      combined[i] = NavigationType.WALKABLE;
    } else if (navMap.swimable[i] > 0) {
      combined[i] = NavigationType.SWIMABLE;
    } else if (navMap.flyable[i] > 0) {
      combined[i] = NavigationType.FLYABLE;
    } else {
      combined[i] = NavigationType.NON_NAVIGABLE;
    }
  }
  
  return combined;
}
```

### Separate Navigation Masks

Export separate masks for each navigation type:

```typescript
interface NavigationMasks {
  walkable_mask: Uint8Array;      // 8-bit PNG
  swimable_mask: Uint8Array;      // 8-bit PNG
  flyable_mask: Uint8Array;       // 8-bit PNG
  combined_nav_mask: Uint8Array;  // 8-bit PNG
}
```

## Collision Map Generation

### Collision Types

```typescript
enum CollisionType {
  NONE = 0,              // No collision (air)
  WALKABLE = 100,        // Walkable collision (land)
  WATER = 150,           // Water collision (swimmable)
  BLOCKED = 255,         // Blocked collision (cliffs, walls)
  TRANSITION = 128,      // Transition collision (ramps)
}
```

### Collision Map Generation

```typescript
function generateCollisionMap(
  grid: Grid,
  navMap: NavigationMap
): Uint8Array {
  const collisionMap = new Uint8Array(grid.width * grid.height);
  
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.cells[y][x];
      const index = y * grid.width + x;
      
      if (cell.flags.blocked || cell.flags.cliff) {
        collisionMap[index] = CollisionType.BLOCKED;
      } else if (cell.flags.water || cell.flags.underwater) {
        collisionMap[index] = CollisionType.WATER;
      } else if (cell.flags.road || cell.flags.ramp) {
        collisionMap[index] = CollisionType.TRANSITION;
      } else if (cell.flags.playable) {
        collisionMap[index] = CollisionType.WALKABLE;
      } else {
        collisionMap[index] = CollisionType.NONE;
      }
    }
  }
  
  return collisionMap;
}
```

## Export Format

### Navigation Masks Export

```
output/
  ├── navigation_walkable_mask.png    # Walkable areas (8-bit)
  ├── navigation_swimable_mask.png   # Swimmable areas (8-bit)
  ├── navigation_flyable_mask.png    # Flyable areas (8-bit)
  ├── navigation_combined_mask.png   # Combined navigation (8-bit)
  └── collision_map.png               # Collision map (8-bit)
```

### Mask Values

**Navigation Masks:**
- `255`: Fully navigable (walkable/swimable/flyable)
- `200`: Swimmable (water)
- `150`: Flyable (air/3D)
- `128`: Transition area (ramps, edges)
- `0`: Non-navigable (blocked, cliffs)

**Collision Map:**
- `255`: Blocked collision (cliffs, walls)
- `150`: Water collision (swimmable)
- `128`: Transition collision (ramps)
- `100`: Walkable collision (land)
- `0`: No collision (air)

## Unreal Engine Integration

### NavMesh Generation (Plugin)

The navigation masks can be used to automatically generate NavMesh in Unreal:

```cpp
// Plugin: Auto NavMesh Generator

class AutoNavMeshGenerator {
public:
    // Generate NavMesh from navigation mask
    void GenerateNavMesh(
        UTexture2D* NavigationMask,
        float AgentRadius,
        float AgentHeight,
        float MaxSlope
    );
    
    // Generate separate NavMesh for water
    void GenerateWaterNavMesh(
        UTexture2D* SwimableMask,
        float AgentRadius,
        float AgentHeight
    );
    
    // Generate 3D NavMesh for flying
    void GenerateFlyNavMesh(
        UTexture2D* FlyableMask,
        float AgentRadius,
        float AgentHeight,
        float MaxHeight
    );
};
```

### Collision Volume Generation (Plugin)

Generate collision volumes automatically:

```cpp
// Plugin: Auto Collision Generator

class AutoCollisionGenerator {
public:
    // Generate collision volumes from collision map
    void GenerateCollisionVolumes(
        UTexture2D* CollisionMap,
        ULandscape* Landscape,
        float CellSize
    );
    
    // Generate water collision volumes
    void GenerateWaterCollision(
        UTexture2D* WaterMask,
        ULandscape* Landscape,
        float WaterHeight
    );
    
    // Generate blocked collision volumes
    void GenerateBlockedCollision(
        UTexture2D* BlockedMask,
        ULandscape* Landscape
    );
};
```

### Navigation Component

Runtime navigation management:

```cpp
// Component for managing navigation

class UNavigationComponent : public UActorComponent {
public:
    // Check if position is navigable
    bool IsNavigable(FVector Position, ENavigationType Type);
    
    // Get navigation type at position
    ENavigationType GetNavigationType(FVector Position);
    
    // Update navigation (for runtime changes)
    void UpdateNavigation(FVector Position, ENavigationType NewType);
    
    // Get nearest navigable position
    FVector GetNearestNavigable(FVector Position, ENavigationType Type);
};
```

## Runtime Navigation Management

### Navigation Updates

The system supports runtime updates to navigation:

```typescript
interface NavigationUpdate {
  position: { x: number; y: number };
  radius: number;
  newType: NavigationType;
  oldType: NavigationType;
}

function updateNavigation(
  navMap: NavigationMap,
  update: NavigationUpdate
): void {
  // Update navigation map at runtime
  // This can be used for dynamic obstacles, construction, etc.
}
```

### Water Navigation Management

Water areas can be managed separately:

```typescript
interface WaterNavigationConfig {
  depth: number;              // Water depth
  current: boolean;            // Has water current
  swimmable: boolean;          // Can swim here
  boatNavigable: boolean;     // Can use boat
  underwater: boolean;         // Is underwater area
}

function configureWaterNavigation(
  waterArea: WaterArea,
  config: WaterNavigationConfig
): void {
  // Configure water navigation properties
  // Can be updated at runtime
}
```

## Plugin Implementation (Future)

### Plugin Structure

```
UnrealNavMeshPlugin/
  ├── Source/
  │   ├── AutoNavMeshGenerator/
  │   │   ├── AutoNavMeshGenerator.h
  │   │   ├── AutoNavMeshGenerator.cpp
  │   │   └── NavMeshBuilder.h
  │   ├── AutoCollisionGenerator/
  │   │   ├── AutoCollisionGenerator.h
  │   │   ├── AutoCollisionGenerator.cpp
  │   │   └── CollisionVolumeBuilder.h
  │   └── NavigationComponent/
  │       ├── NavigationComponent.h
  │       └── NavigationComponent.cpp
  ├── Content/
  │   └── Blueprints/
  │       ├── BP_NavMeshGenerator.uasset
  │       └── BP_CollisionGenerator.uasset
  └── AutoNavMeshPlugin.Build.cs
```

### Plugin Features

1. **Automatic NavMesh Generation**
   - Import navigation masks
   - Generate NavMesh automatically
   - Support for walkable, swimmable, flyable
   - Runtime updates

2. **Automatic Collision Generation**
   - Import collision map
   - Generate collision volumes
   - Water collision volumes
   - Blocked area collision

3. **Runtime Management**
   - Update navigation at runtime
   - Manage water navigation
   - Dynamic obstacle handling
   - Performance optimization

## Usage Workflow

### Step 1: Export Navigation Masks

1. Generate heightmap and masks
2. Export navigation masks:
   - `navigation_walkable_mask.png`
   - `navigation_swimable_mask.png`
   - `navigation_flyable_mask.png`
   - `navigation_combined_mask.png`
   - `collision_map.png`

### Step 2: Import to Unreal

1. Import navigation masks as textures
2. Import collision map as texture
3. Set up import settings (8-bit, grayscale)

### Step 3: Generate NavMesh (Plugin)

1. Use Auto NavMesh Generator plugin
2. Select navigation mask
3. Configure agent settings (radius, height, max slope)
4. Generate NavMesh automatically

### Step 4: Generate Collision (Plugin)

1. Use Auto Collision Generator plugin
2. Select collision map
3. Configure collision settings
4. Generate collision volumes automatically

### Step 5: Runtime Management

1. Use Navigation Component for runtime checks
2. Update navigation as needed
3. Manage water navigation separately
4. Handle dynamic obstacles

## Metadata

Navigation information in metadata:

```json
{
  "navigation": {
    "walkableArea": 800000,
    "swimableArea": 50000,
    "flyableArea": 1048576,
    "nonNavigableArea": 48676,
    "transitionAreas": 10240
  },
  "collision": {
    "blockedArea": 25600,
    "waterArea": 50000,
    "walkableArea": 800000
  }
}
```

## Benefits

1. **Automatic Setup**: No manual NavMesh painting
2. **Accurate Navigation**: Based on generated terrain
3. **Water Support**: Separate water navigation
4. **Runtime Management**: Update navigation dynamically
5. **Performance**: Optimized collision volumes
6. **Flexibility**: Manage navigation after generation

## Future Enhancements

1. **Dynamic Obstacles**: Runtime obstacle placement
2. **Multi-Agent Support**: Different NavMesh for different agent sizes
3. **Pathfinding Optimization**: Hierarchical pathfinding
4. **Visualization Tools**: Debug visualization of navigation
5. **AI Integration**: Direct integration with AI systems

