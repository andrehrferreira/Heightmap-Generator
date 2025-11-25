# Unreal Engine Integration Workflow

## Overview

This document describes the complete workflow for importing generated heightmaps and masks into Unreal Engine and setting up the terrain system with auto-materials, PCG/Foliage, water system, and ambient assets.

## Export Package

### Complete Export Structure

```
output/
  ├── heightmap.png                      # 16-bit heightmap for Landscape
  ├── roads_mask.png                     # Road areas (8-bit)
  ├── water_mask.png                     # Water areas - rivers, lakes (8-bit)
  ├── underwater_mask.png                # Underwater areas (8-bit)
  ├── cliffs_mask.png                    # Cliff/rock areas (8-bit)
  ├── level_mask.png                     # Level ID mapping (8-bit)
  ├── biome_mask.png                     # Biome type mapping (8-bit)
  ├── playable_mask.png                  # Playable vs non-playable areas (8-bit)
  ├── visual_only_mask.png               # Visual-only elements (peaks) (8-bit)
  ├── navigation_walkable_mask.png        # Walkable navigation areas (8-bit)
  ├── navigation_swimable_mask.png        # Swimmable navigation areas (8-bit)
  ├── navigation_flyable_mask.png        # Flyable navigation areas (8-bit)
  ├── navigation_combined_mask.png        # Combined navigation map (8-bit)
  ├── collision_map.png                  # Collision map (8-bit)
  └── metadata.json                      # Complete generation metadata
```

### Additional Masks

**Biome Mask**: Maps biome types to value bands for material selection
- Desert: 0-31
- Forest: 32-63
- Tundra: 64-95
- Canyon: 96-127
- Mountain: 128-159
- Plains: 160-191
- Ocean: 192-223
- Custom: 224-255

**Playable Mask**: Distinguishes playable from non-playable areas
- 255: Playable area
- 128: Border/transition area
- 0: Non-playable (background/scenery)

## Step 1: Landscape Import

### Import Heightmap

1. **Import Settings**
   - File → Import → Select `heightmap.png`
   - Import as **Landscape**
   - Resolution: Match metadata (e.g., 1024x1024)
   - Scale: Use metadata `scale` value (Unreal units per pixel)

2. **Landscape Configuration**
   - Component Size: 63x63 quads (default)
   - Section Size: 7x7 quads
   - Number of Components: Calculate from metadata
   - Overall Resolution: Match map dimensions

3. **Height Range**
   - Min Height: From metadata `minHeight`
   - Max Height: From metadata `maxHeight`
   - Scale: From metadata `scale`

### Landscape Material Setup

Create a **Landscape Material** with auto-material shader:

```hlsl
// Landscape Material Shader Structure

// Input Textures (Masks)
- Roads Mask (Texture Sample)
- Water Mask (Texture Sample)
- Cliffs Mask (Texture Sample)
- Level Mask (Texture Sample)
- Biome Mask (Texture Sample)

// Landscape Data
- Landscape Layer Blend (for multiple materials)
- Landscape Visibility Mask (playable_mask)
- Landscape Grass Output (for grass/foliage)

// Material Layers
1. Base Terrain Material (grass/dirt/sand based on biome)
2. Road Material (blend using roads_mask)
3. Water Material (blend using water_mask)
4. Cliff/Rock Material (blend using cliffs_mask + slope)
5. Underwater Material (blend using underwater_mask)
```

### Auto-Material Shader Logic

```hlsl
// Pseudo-code for auto-material shader

float3 CalculateMaterialBlend(float2 UV) {
    // Sample masks
    float roads = RoadsMask.Sample(UV).r;
    float water = WaterMask.Sample(UV).r;
    float cliffs = CliffsMask.Sample(UV).r;
    float underwater = UnderwaterMask.Sample(UV).r;
    float biome = BiomeMask.Sample(UV).r;
    
    // Calculate slope
    float slope = CalculateSlope(UV);
    
    // Material selection priority
    if (underwater > 0.5) {
        return UnderwaterMaterial;
    }
    if (water > 0.5) {
        return WaterMaterial;
    }
    if (roads > 0.5) {
        return RoadMaterial;
    }
    if (cliffs > 0.5 || slope > SlopeThreshold) {
        return CliffMaterial;
    }
    
    // Base material based on biome
    return GetBiomeMaterial(biome);
}
```

### Material Layers Setup

1. **Layer 1: Base Terrain**
   - Use `biome_mask` to select base material
   - Blend based on altitude (from `level_mask`)
   - Apply noise for variation

2. **Layer 2: Roads**
   - Blend road material using `roads_mask`
   - Smooth transition at edges
   - Apply decals if needed

3. **Layer 3: Water**
   - Blend water material using `water_mask`
   - Animated water shader
   - Foam at edges

4. **Layer 4: Cliffs**
   - Blend rock material using `cliffs_mask`
   - Use slope calculation for additional blending
   - Detail normal maps

5. **Layer 5: Underwater**
   - Blend underwater material using `underwater_mask`
   - Caustics and light scattering
   - Visibility fog

## Step 2: PCG (Procedural Content Generation) Setup

### PCG Graph Structure

Create PCG graph for vegetation and assets:

```cpp
// PCG Graph Nodes

1. Landscape Data Source
   - Use Landscape as input
   - Sample height and masks

2. Surface Sampler
   - Sample points on landscape surface
   - Use density settings

3. Filter Nodes
   - Exclude roads (roads_mask > 0.5)
   - Exclude water (water_mask > 0.5)
   - Exclude cliffs (cliffs_mask > 0.5)
   - Include only playable areas (playable_mask > 0.5)

4. Biome Filter
   - Use biome_mask to select vegetation types
   - Different density per biome

5. Level Filter
   - Use level_mask for altitude-based spawning
   - Different vegetation at different levels

6. Spawn Actors
   - Trees (based on biome and level)
   - Rocks (based on cliffs_mask)
   - Grass (foliage system)
   - Ambient props
```

### Vegetation Rules

**Forest Biome:**
- Trees: High density, exclude roads/water
- Grass: Medium density, all areas
- Rocks: Low density, near cliffs
- Bushes: Medium density, exclude roads

**Desert Biome:**
- Cacti: Medium density, exclude roads/water
- Sand dunes: Use heightmap variation
- Rocks: High density, near cliffs
- Sparse grass: Low density

**Mountain Biome:**
- Trees: Lower density at higher altitudes
- Rocks: High density on cliffs
- Snow: At highest levels
- Sparse vegetation: High altitude

### PCG Density Settings

```typescript
interface PCGDensity {
  trees: {
    forest: 0.8,      // 80% density
    desert: 0.1,     // 10% density
    mountain: 0.3,   // 30% density
  };
  grass: {
    forest: 1.0,     // 100% density
    desert: 0.2,     // 20% density
    mountain: 0.5,   // 50% density
  };
  rocks: {
    cliffs: 0.9,     // 90% on cliffs
    general: 0.1,    // 10% elsewhere
  };
}
```

## Step 3: Foliage System

### Foliage Types

1. **Grass**
   - Use Landscape Grass Output from material
   - Density based on biome_mask
   - Exclude roads and water

2. **Ground Cover**
   - Bushes, flowers, small plants
   - PCG-based placement
   - Biome-specific types

3. **Trees**
   - PCG-based placement
   - LOD system for performance
   - Biome-specific models

### Foliage Placement Rules

```cpp
// Foliage placement logic

bool CanPlaceFoliage(float2 Position) {
    // Check masks
    float roads = RoadsMask.Sample(Position).r;
    float water = WaterMask.Sample(Position).r;
    float playable = PlayableMask.Sample(Position).r;
    float slope = CalculateSlope(Position);
    
    // Exclude roads and water
    if (roads > 0.5 || water > 0.5) return false;
    
    // Only playable areas
    if (playable < 0.5) return false;
    
    // Slope check (no foliage on steep slopes)
    if (slope > 45.0) return false;
    
    return true;
}
```

## Step 4: Water System

### Water Volume Creation

**Rivers:**
1. Parse `water_mask` to find river paths
2. Create **Water Body River** actors along paths
3. Set depth based on level (from `level_mask`)
4. Add flow direction and speed
5. Apply river material

**Lakes:**
1. Parse `water_mask` to find lake regions
2. Create **Water Body Lake** actors
3. Set depth and size from mask
4. Apply lake material
5. Add shoreline effects

**Ocean:**
1. Identify large water areas (from `water_mask`)
2. Create **Water Body Ocean** actor
3. Set sea level (level 0)
4. Apply ocean material
5. Add waves and foam

**Underwater:**
1. Parse `underwater_mask` for underwater areas
2. Create **Water Body** volumes at appropriate depths
3. Set visibility and fog properties
4. Apply underwater material
5. Add caustics and light scattering

### Water Material Setup

```hlsl
// Water Material Properties

- Base Color: Blue/cyan based on depth
- Opacity: Based on depth (deeper = more opaque)
- Normal Maps: Animated waves
- Foam: At edges and surface
- Caustics: Underwater light patterns
- Flow: For rivers (direction and speed)
```

### Water Body Configuration

```cpp
// Water Body Settings

River:
- Depth: 200-500 Unreal units
- Flow Speed: 100-300 units/sec
- Width: From roads_mask width
- Material: River material

Lake:
- Depth: 500-2000 Unreal units
- Flow Speed: 0 (static)
- Size: From water_mask region
- Material: Lake material

Ocean:
- Depth: 5000+ Unreal units
- Wave Height: 50-200 units
- Material: Ocean material
- Shoreline: Auto-generated from water_mask

Underwater:
- Depth: Based on level (negative levels)
- Visibility: Reduced at depth
- Fog Density: Increases with depth
- Material: Underwater material
```

## Step 5: Ambient Assets and Fog

### Ambient Assets Placement

**PCG-Based Asset Placement:**

1. **Roadside Assets**
   - Use `roads_mask` to place along roads
   - Signs, barriers, markers
   - Spacing: Every 100-200 units

2. **Cliff Assets**
   - Use `cliffs_mask` for placement
   - Rock meshes, cliff details
   - Density: High on cliffs

3. **Water Assets**
   - Use `water_mask` for placement
   - Docks, bridges, boats
   - At water edges

4. **Level-Specific Assets**
   - Use `level_mask` for placement
   - Different assets per level
   - Altitude-based selection

5. **Biome-Specific Assets**
   - Use `biome_mask` for placement
   - Different props per biome
   - Thematic consistency

### Fog System

**Fog Configuration:**

1. **Atmospheric Fog**
   - Height-based fog
   - Use `level_mask` for density
   - Higher levels = more fog

2. **Underwater Fog**
   - Use `underwater_mask`
   - Depth-based density
   - Color: Blue/green tint

3. **Volumetric Fog**
   - For dramatic effect
   - Place in valleys (low level_mask values)
   - Animated for movement

4. **Fog Volumes**
   - Manual placement in specific areas
   - Use metadata for guidance
   - Biome-specific colors

### Fog Settings

```cpp
// Fog Configuration

AtmosphericFog:
- Density: 0.02-0.05 (based on altitude)
- Height Falloff: 0.2
- Color: Biome-specific (blue for ocean, white for mountain)

UnderwaterFog:
- Density: 0.1-0.5 (based on depth)
- Color: Blue/cyan
- Start Distance: 0
- End Distance: Based on visibility

VolumetricFog:
- Density: 0.03-0.08
- Height: 100-500 units
- Animated: Yes
- Color: White/gray
```

## Step 6: Performance Optimization

### LOD System

1. **Landscape LOD**
   - Auto LOD based on distance
   - Use Landscape LOD settings
   - Optimize component count

2. **Foliage LOD**
   - Use Foliage LOD system
   - Cull distance based on type
   - Instanced rendering

3. **PCG LOD**
   - Use PCG LOD nodes
   - Reduce density at distance
   - Cull small objects

### Culling Rules

```cpp
// Culling based on masks

- Non-playable areas: Cull all assets
- Underwater: Cull surface assets
- Visual-only peaks: No collision, LOD only
- Roads: Always visible (important for navigation)
```

## Step 7: Navigation and Collision Setup

### NavMesh Generation

**Using Navigation Masks:**

1. **Import Navigation Masks**
   - Import `navigation_walkable_mask.png` as texture
   - Import `navigation_swimable_mask.png` as texture
   - Import `navigation_flyable_mask.png` as texture
   - Import `navigation_combined_mask.png` as texture

2. **Auto NavMesh Generator Plugin** (Future Implementation)
   - Use plugin to generate NavMesh automatically
   - Configure agent settings (radius, height, max slope)
   - Generate separate NavMesh for water areas
   - Generate 3D NavMesh for flying entities

3. **Manual NavMesh Setup** (Current)
   - Use Navigation Bounds volume
   - Paint NavMesh manually using navigation masks as reference
   - Create separate NavMesh for water areas

### Collision Volume Generation

**Using Collision Map:**

1. **Import Collision Map**
   - Import `collision_map.png` as texture
   - Set up as 8-bit grayscale texture

2. **Auto Collision Generator Plugin** (Future Implementation)
   - Use plugin to generate collision volumes automatically
   - Create collision volumes for blocked areas
   - Create water collision volumes
   - Create walkable collision volumes

3. **Manual Collision Setup** (Current)
   - Use collision map as reference
   - Place collision volumes manually
   - Configure collision types (blocked, water, walkable)

### Water Navigation Management

**Water Areas:**

1. **Water NavMesh**
   - Generate separate NavMesh for water areas
   - Use `navigation_swimable_mask` for placement
   - Configure for swimming entities
   - Support for boats (if applicable)

2. **Underwater Navigation**
   - Use `underwater_mask` for underwater NavMesh
   - Configure 3D navigation
   - Set depth-based navigation rules

3. **Runtime Management**
   - Update water navigation dynamically
   - Handle water level changes
   - Manage water current effects

See [Navigation & Collision](NAVIGATION_AND_COLLISION.md) for detailed documentation.

## Step 8: Boundaries and Blocking Zones

### Boundary Setup

**Using Boundary Masks:**

1. **Import Boundary Masks**
   - Import `boundary_mask.png` as texture
   - Import `blocking_zones_mask.png` as texture
   - Import `boundaries.json` for boundary definitions

2. **Generate Boundary Collision**
   - Use boundary mask to create collision volumes
   - Edge boundaries: Create walls/barriers at map edges
   - Interior boundaries: Create barriers in middle of map
   - Ocean boundaries: Create invisible barriers in ocean

3. **Teleport Setup** (if multiple maps)
   - Use `boundaries.json` to setup teleport points
   - Configure transition zones
   - Setup seamless connections (if applicable)

### Boundary Types

**Edge Boundaries:**
- Map edge boundaries (visible walls/barriers)
- Define playable area limits
- Generate collision automatically

**Interior Boundaries:**
- Boundaries in middle of map
- Can be in ocean or on land
- Useful for zone separation

**Ocean Boundaries:**
- Boundaries in middle of ocean
- Invisible barriers
- Prevent player from crossing

See [Boundaries & Blocking](BOUNDARIES_AND_BLOCKING.md) for detailed documentation.

## Step 9: Validation and Testing

### Validation Checklist

- [ ] Heightmap imported correctly
- [ ] All masks imported and assigned
- [ ] Auto-material working correctly
- [ ] PCG vegetation spawning correctly
- [ ] Foliage placed appropriately
- [ ] Water volumes created correctly
- [ ] Ambient assets placed
- [ ] Fog configured properly
- [ ] Performance acceptable
- [ ] Playable areas accessible
- [ ] Roads navigable
- [ ] Water volumes functional

### Testing Steps

1. **Visual Inspection**
   - Check material blending
   - Verify mask accuracy
   - Test water appearance

2. **Gameplay Testing**
   - Walkability of roads
   - Accessibility of areas
   - Water interaction
   - Underwater navigation

3. **Performance Testing**
   - Frame rate check
   - LOD transitions
   - Culling effectiveness
   - Memory usage

## Metadata Usage

The `metadata.json` file contains all information needed for setup:

```json
{
  "unreal": {
    "landscapeSize": { "x": 1024, "y": 1024 },
    "componentCount": { "x": 2, "y": 2 },
    "recommendedMaterial": {
      "slopeThreshold": 45,
      "altitudeBands": [-540, 0, 270, 540, 810, 1080]
    },
    "waterLevels": {
      "seaLevel": 0,
      "underwaterLevels": [-270, -540, -810]
    },
    "biomeMapping": {
      "desert": 0,
      "forest": 32,
      "mountain": 128
    }
  }
}
```

## Workflow Summary

1. **Import** heightmap as Landscape
2. **Create** auto-material shader using masks
3. **Setup** PCG graph for vegetation
4. **Configure** Foliage system
5. **Create** Water Body actors from masks
6. **Place** ambient assets using PCG
7. **Configure** fog system
8. **Setup** Navigation and Collision (NavMesh, collision volumes)
9. **Setup** Boundaries and Blocking Zones (edge, interior, ocean)
10. **Optimize** with LOD and culling
11. **Test** and validate

This workflow ensures a complete, playable terrain in Unreal Engine with all systems properly integrated, supporting both single large maps and multiple connected maps with harmonic transitions.

