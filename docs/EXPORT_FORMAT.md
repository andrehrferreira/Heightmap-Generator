# Export Format Specification

## Heightmap Format

### File Format

- **Primary**: 16-bit PNG (`.png`)
- **Alternative**: Raw 16-bit (`.r16`)

### Data Mapping

Height values in Unreal units are mapped to 16-bit integers [0, 65535]:

```typescript
function mapHeightToPixel(height: number, minHeight: number, maxHeight: number): number {
  const normalized = (height - minHeight) / (maxHeight - minHeight);
  return Math.floor(normalized * 65535);
}
```

### Unreal Import

- Import as **Landscape** asset
- Scale factor: `(maxHeight - minHeight) / 65535` Unreal units per pixel value
- Landscape size: Matches map dimensions

## Mask Formats

### Road Mask

- **Format**: 8-bit or 16-bit PNG
- **Values**:
  - `255` (or `65535`): Road area
  - `0`: Non-road area
- **Usage**: Material blending, decal placement, PCG spawns

### Water Mask

- **Format**: 8-bit or 16-bit PNG
- **Values**:
  - `255` (or `65535`): Water area (rivers, lakes)
  - `0`: Non-water area
- **Usage**: Water material, water volume placement

### Cliffs Mask

- **Format**: 8-bit or 16-bit PNG
- **Values**:
  - `255` (or `65535`): Cliff area (high slope/level transition)
  - `0`: Non-cliff area
- **Usage**: Rock material, cliff mesh placement

### Level Mask

- **Format**: 8-bit PNG (recommended)
- **Values**: Each `levelId` mapped to a value band
  - Level -2: `0-31`
  - Level -1: `32-63`
  - Level 0: `64-95`
  - Level 1: `96-127`
  - Level 2: `128-159`
  - Level 3+: `160-255`
- **Usage**: PCG rules, material selection, foliage placement

## Metadata Format

### JSON Metadata

```typescript
interface GenerationMetadata {
  version: string;              // Generator version
  timestamp: string;            // ISO 8601 timestamp
  config: GenerationConfig;    // Full generation configuration
  statistics: {
    totalCells: number;
    roadCells: number;
    waterCells: number;
    cliffCells: number;
    playableCells: number;
    levelDistribution: Record<number, number>; // Cell count per level
  };
  export: {
    heightmap: {
      format: 'png' | 'r16';
      bitDepth: 16;
      minHeight: number;
      maxHeight: number;
      scale: number;            // Unreal units per pixel value
    };
    masks: {
      format: 'png';
      bitDepth: 8 | 16;
    };
  };
  unreal: {
    landscapeSize: {
      x: number;
      y: number;
    };
    componentCount: {
      x: number;
      y: number;
    };
    recommendedMaterial: {
      slopeThreshold: number;   // Degrees for cliff detection
      altitudeBands: number[];  // Altitude bands for materials
    };
  };
}
```

### Example Metadata

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T10:30:00Z",
  "config": {
    "map": { "width": 1024, "height": 1024, "cellSize": 1 },
    "biome": { "type": "desert" },
    "levels": { "count": 5 },
    "roads": { "enabled": true, "count": 10 },
    "water": { "rivers": { "enabled": true, "count": 3 } },
    "features": { "mountains": { "enabled": true, "count": 5 } }
  },
  "statistics": {
    "totalCells": 1048576,
    "roadCells": 10240,
    "waterCells": 5120,
    "cliffCells": 25600,
    "playableCells": 800000,
    "levelDistribution": {
      "-1": 50000,
      "0": 700000,
      "1": 250000,
      "2": 48676
    }
  },
  "export": {
    "heightmap": {
      "format": "png",
      "bitDepth": 16,
      "minHeight": -1200,
      "maxHeight": 2400,
      "scale": 0.0549
    },
    "masks": {
      "format": "png",
      "bitDepth": 8
    }
  },
  "unreal": {
    "landscapeSize": { "x": 1024, "y": 1024 },
    "componentCount": { "x": 2, "y": 2 },
    "recommendedMaterial": {
      "slopeThreshold": 45,
      "altitudeBands": [-1200, 0, 600, 1200, 1800, 2400]
    }
  }
}
```

## Export Directory Structure

```
output/
  ├── heightmap.png                      # 16-bit heightmap
  ├── roads_mask.png                     # Road mask (8-bit)
  ├── water_mask.png                     # Water mask (8-bit)
  ├── underwater_mask.png                # Underwater areas (8-bit)
  ├── cliffs_mask.png                    # Cliffs mask (8-bit)
  ├── level_mask.png                     # Level ID mask (8-bit)
  ├── biome_mask.png                     # Biome type mapping (8-bit)
  ├── playable_mask.png                  # Playable vs non-playable (8-bit)
  ├── visual_only_mask.png               # Visual-only elements (8-bit)
  ├── navigation_walkable_mask.png        # Walkable navigation (8-bit)
  ├── navigation_swimable_mask.png       # Swimmable navigation (8-bit)
  ├── navigation_flyable_mask.png         # Flyable navigation (8-bit)
  ├── navigation_combined_mask.png        # Combined navigation (8-bit)
  ├── collision_map.png                  # Collision map (8-bit)
  ├── boundary_mask.png                  # Boundary map (8-bit)
  ├── blocking_zones_mask.png            # Blocking zones (8-bit)
  ├── boundaries.json                    # Boundary definitions (JSON)
  └── metadata.json                      # Generation metadata
```

### Mask Descriptions

- **heightmap.png**: 16-bit heightmap for Landscape import
- **roads_mask.png**: Road areas for material blending and PCG exclusion
- **water_mask.png**: Water areas (rivers, lakes) for Water Body creation
- **underwater_mask.png**: Underwater areas for underwater volumes
- **cliffs_mask.png**: Cliff/rock areas for material blending and rock placement
- **level_mask.png**: Level ID mapping for altitude-based rules
- **biome_mask.png**: Biome type mapping for material and vegetation selection
- **playable_mask.png**: Playable vs non-playable areas for asset culling
- **visual_only_mask.png**: Visual-only elements (mountain peaks) for decoration
- **navigation_walkable_mask.png**: Walkable areas for NavMesh generation
- **navigation_swimable_mask.png**: Swimmable areas for water NavMesh
- **navigation_flyable_mask.png**: Flyable areas for 3D NavMesh
- **navigation_combined_mask.png**: Combined navigation map for pathfinding
- **collision_map.png**: Collision map for automatic collision volume generation
- **boundary_mask.png**: Boundary map (edge, interior, ocean boundaries) for collision and blocking
- **blocking_zones_mask.png**: Blocking zones for player movement restriction
- **boundaries.json**: Boundary definitions with shapes and teleport configurations

## Unreal Engine Integration

See [Unreal Engine Workflow](UNREAL_WORKFLOW.md) for complete integration guide.

### Quick Start

1. **Import Heightmap**
   - File → Import → Select `heightmap.png`
   - Import as Landscape
   - Set scale from metadata: `scale` Unreal units per pixel value

2. **Create Auto-Material**
   - Use masks for material blending
   - Apply slope and altitude calculations
   - Blend: roads, water, cliffs, biome materials

3. **Setup PCG/Foliage**
   - Use masks for spawn rules and filtering
   - Exclude roads and water from vegetation
   - Use biome_mask for vegetation selection

4. **Create Water System**
   - Use `water_mask` for Water Body placement
   - Use `underwater_mask` for underwater volumes
   - Configure rivers, lakes, and ocean

5. **Place Ambient Assets**
   - Use PCG with mask-based rules
   - Place assets based on biome and level
   - Configure fog system

### Recommended Unreal Settings

- **Landscape Component Size**: 63x63 quads (default)
- **Section Size**: 7x7 quads
- **LOD Distance**: Based on map size
- **Material**: Auto-material with slope/altitude/mask blending

