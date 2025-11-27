# Implement Detail Stamps for Surface Quality

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: LOW**
>
> Detail stamps are LOW-AMPLITUDE surface texturing. They add visual quality WITHOUT affecting gameplay structure. This is the **SAFEST** way to improve heightmap quality.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Algorithmic terrain generation produces **structurally correct** terrain (levels, ramps, barriers) but lacks the **micro-detail** that makes terrain look realistic and professional. Instead of trying to generate this detail algorithmically (which risks breaking structure), we use **pre-made detail stamps** from professional tools.

### The Problem with Algorithmic Detail

| Approach | Quality | Risk to Structure |
|----------|---------|-------------------|
| Noise-based detail | Medium | HIGH - can affect ramps |
| Erosion simulation | High | VERY HIGH - carves terrain |
| **Detail stamps** | **Very High** | **VERY LOW** - controlled amplitude |

### Why Detail Stamps Are the Solution

1. **Professional quality** - Use stamps from Gaea, World Machine, Nano Banana, etc.
2. **Controlled amplitude** - Detail is purely cosmetic (0.1-1% of level height)
3. **Structure-safe** - Applied ONLY in plateau areas with ramp mask protection
4. **Predictable** - Same stamp = same result, no procedural surprises
5. **Fast iteration** - Swap stamps to change terrain style instantly

## What Changes

### 1. Detail Stamp System

A specialized stamp system for surface micro-detail:

```typescript
interface DetailStamp {
    id: string;
    name: string;
    category: DetailStampCategory;

    // Height data (normalized 0-1)
    heightData: Float32Array;
    width: number;
    height: number;

    // Detail-specific properties
    detail: {
        // Maximum amplitude as percentage of level height
        maxAmplitude: number; // Default: 0.5% (0.005)

        // Recommended tile size in world units
        recommendedTileSize: number;

        // Whether stamp tiles seamlessly
        tileable: boolean;

        // Blend mode for overlapping
        blendMode: 'add' | 'multiply' | 'overlay' | 'max';
    };

    // Source metadata
    source: {
        tool: 'nano_banana' | 'gaea' | 'world_machine' | 'custom' | 'hand_painted';
        author?: string;
        license?: string;
    };
}

enum DetailStampCategory {
    ROCK_SURFACE = 'rock_surface',      // Rocky terrain texture
    DIRT_GROUND = 'dirt_ground',        // Soft ground variation
    GRASS_TERRAIN = 'grass_terrain',    // Grassy area micro-detail
    SAND_DUNES = 'sand_dunes',          // Desert/beach texture
    SNOW_ICE = 'snow_ice',              // Snowy terrain
    MUD_WET = 'mud_wet',                // Wet/muddy areas
    EROSION_MARKS = 'erosion_marks',    // Erosion patterns (cosmetic)
    GENERIC = 'generic',                // Multi-purpose detail
}
```

### 2. Import from External Tools

Support importing heightmaps from professional tools as detail stamps:

```typescript
interface DetailStampImporter {
    // Import from image file (PNG, TIFF, EXR, RAW)
    importFromImage(file: File, options: ImportOptions): Promise<DetailStamp>;

    // Import from Nano Banana export
    importFromNanoBanana(file: File): Promise<DetailStamp>;

    // Import from Gaea export
    importFromGaea(file: File): Promise<DetailStamp>;

    // Batch import from folder
    importBatch(folder: FileList): Promise<DetailStamp[]>;
}

interface ImportOptions {
    // Normalize to 0-1 range
    normalize: boolean;

    // Target amplitude (will scale imported data)
    targetAmplitude: number; // Default: 0.005 (0.5%)

    // Make tileable (apply edge blending)
    makeTileable: boolean;

    // Category assignment
    category: DetailStampCategory;
}
```

### 3. Detail Application Modes

Multiple ways to apply detail stamps:

```typescript
enum DetailApplicationMode {
    // Single stamp placement
    SINGLE = 'single',

    // Tile across entire level
    TILE_LEVEL = 'tile_level',

    // Tile across entire map (all safe zones)
    TILE_MAP = 'tile_map',

    // Scatter with variation
    SCATTER = 'scatter',

    // Paint with brush
    PAINT = 'paint',
}
```

### 4. Automatic Detail Layer

Automatically apply detail stamps as a final pass:

```typescript
interface AutoDetailConfig {
    enabled: boolean;

    // Detail stamps per biome/level
    levelDetails: Map<number, DetailStamp[]>;

    // Global detail intensity
    intensity: number; // 0-1, default: 0.5

    // Blend multiple stamps
    blendMode: 'random' | 'noise_driven' | 'height_driven';

    // Tile size variation
    tileScaleVariation: number; // 0-1, default: 0.2
}
```

## Critical Constraints

### Amplitude Limits (NON-NEGOTIABLE)

Detail stamps MUST have strictly limited amplitude:

| Context | Max Amplitude | Purpose |
|---------|--------------|---------|
| Plateau detail | 0.5% | Surface texture |
| Near ramp | 0.1% | Fade to preserve ramp |
| Ramp zone | 0% | Protected |
| Border zone | 0% | Protected |

### MUST DO:
- Limit ALL detail stamp amplitude to ≤ 1% of level height
- Apply ramp mask protection (fade detail near ramps)
- Support toggling detail OFF completely
- Preserve original heightmap before detail (non-destructive)
- Show amplitude preview before application

### MUST NOT:
- Allow detail stamps with amplitude > 1%
- Apply detail in ramp zones
- Apply detail in border zones
- Stack detail to exceed amplitude limits
- Modify level structure in any way

## Implementation Requirements

### Safe Detail Application

```typescript
function applyDetailStamp(
    heightmap: Float32Array,
    stamp: DetailStamp,
    position: Vec2,
    rampMask: Float32Array,
    levelConfig: LevelConfig,
    intensity: number = 1.0
): void {
    const maxAmplitude = levelConfig.heightDifference * stamp.detail.maxAmplitude;

    for (let y = 0; y < stamp.height; y++) {
        for (let x = 0; x < stamp.width; x++) {
            const worldX = position.x + x;
            const worldY = position.y + y;
            const worldIdx = worldY * mapWidth + worldX;

            // Skip out of bounds
            if (worldX < 0 || worldX >= mapWidth || worldY < 0 || worldY >= mapHeight) {
                continue;
            }

            // Get ramp protection (0 = safe, 1 = protected)
            const protection = rampMask[worldIdx];

            // Skip fully protected zones
            if (protection > 0.95) continue;

            // Calculate safe amplitude with fade near ramps
            const safeAmplitude = maxAmplitude * (1.0 - protection) * intensity;

            // Get stamp value (normalized 0-1, centered at 0.5)
            const stampIdx = y * stamp.width + x;
            const stampValue = (stamp.heightData[stampIdx] - 0.5) * 2; // -1 to 1

            // Apply detail
            const detailOffset = stampValue * safeAmplitude;
            heightmap[worldIdx] += detailOffset;
        }
    }
}
```

### Tile Detail Across Level

```typescript
function tileDetailAcrossLevel(
    heightmap: Float32Array,
    levelMask: Uint8Array,
    targetLevel: number,
    stamp: DetailStamp,
    rampMask: Float32Array,
    config: TileConfig
): void {
    const tileSize = stamp.width * config.scale;

    // Calculate tile grid
    const tilesX = Math.ceil(mapWidth / tileSize);
    const tilesY = Math.ceil(mapHeight / tileSize);

    for (let ty = 0; ty < tilesY; ty++) {
        for (let tx = 0; tx < tilesX; tx++) {
            const position = {
                x: tx * tileSize + (config.randomOffset ? randomRange(-tileSize * 0.1, tileSize * 0.1) : 0),
                y: ty * tileSize + (config.randomOffset ? randomRange(-tileSize * 0.1, tileSize * 0.1) : 0),
            };

            // Check if tile center is in target level
            const centerIdx = Math.floor(position.y + tileSize / 2) * mapWidth + Math.floor(position.x + tileSize / 2);
            if (levelMask[centerIdx] !== targetLevel) continue;

            // Apply with optional rotation
            const rotation = config.randomRotation ? randomRange(0, 360) : 0;
            const scale = config.scaleVariation ? randomRange(1 - config.scaleVariation, 1 + config.scaleVariation) : 1;

            applyDetailStampTransformed(heightmap, stamp, position, rotation, scale, rampMask, levelConfig, config.intensity);
        }
    }
}
```

### Import from Nano Banana

```typescript
async function importFromNanoBanana(file: File): Promise<DetailStamp> {
    // Read heightmap image
    const imageData = await readHeightmapImage(file);

    // Nano Banana exports 16-bit or 32-bit heightmaps
    const normalized = normalizeHeightData(imageData);

    // Center around 0.5 (detail should be +/- around base height)
    const centered = centerHeightData(normalized);

    // Analyze amplitude
    const amplitude = analyzeAmplitude(centered);

    // Scale to safe amplitude if needed
    const safeData = amplitude > 0.01
        ? scaleToAmplitude(centered, 0.005) // Reduce to 0.5%
        : centered;

    // Check if tileable
    const tileable = checkTileable(safeData);

    return {
        id: generateId(),
        name: file.name.replace(/\.[^.]+$/, ''),
        category: DetailStampCategory.GENERIC,
        heightData: safeData,
        width: imageData.width,
        height: imageData.height,
        detail: {
            maxAmplitude: 0.005,
            recommendedTileSize: Math.max(imageData.width, imageData.height),
            tileable,
            blendMode: 'add',
        },
        source: {
            tool: 'nano_banana',
        },
    };
}
```

## UI Requirements

### Detail Stamp Library Panel

- Grid view of available detail stamps with thumbnails
- Category filtering (rock, dirt, grass, etc.)
- Search by name
- Import button for new stamps
- Preview on hover showing amplitude visualization

### Application Controls

- Mode selector (single, tile, scatter, paint)
- Intensity slider (0-100%)
- Scale slider (50-200%)
- Rotation options (fixed, random, noise-based)
- Level selector (which level to apply to)

### Safety Indicators

- Amplitude preview showing affected height range
- Ramp zone overlay showing protected areas
- Warning if stamp amplitude exceeds recommendations
- Before/after comparison toggle

## Pipeline Integration

```
Generation Pipeline:
1. Base heightmap (HEIGHTMAP_FRAG)
2. Level assignment (LEVEL_FRAG)
3. Border barriers (BORDER_FRAG)
4. Ramp smoothing - 12 passes (SMOOTH_FRAG) ← Structure complete
5. Generate ramp mask (RAMP_MASK_FRAG)
6. **Apply detail stamps** ← NEW (this feature)
7. Final output
```

## Built-in Detail Stamp Library

Include starter stamps for immediate use:

| Stamp | Category | Description | Tileable |
|-------|----------|-------------|----------|
| `rock_rough_01` | Rock | Rough rock surface | Yes |
| `rock_smooth_01` | Rock | Smooth rock surface | Yes |
| `dirt_cracked_01` | Dirt | Dry cracked ground | Yes |
| `dirt_soft_01` | Dirt | Soft dirt texture | Yes |
| `grass_bumpy_01` | Grass | Grass terrain bumps | Yes |
| `sand_ripples_01` | Sand | Wind-blown sand | Yes |
| `erosion_light_01` | Erosion | Light erosion marks | Yes |
| `erosion_heavy_01` | Erosion | Heavy erosion marks | Yes |

## Impact

- **Quality**: Professional-grade surface detail without algorithmic risk
- **Performance**: Stamp application is O(stamp_size), very fast
- **Flexibility**: Easy to swap styles by changing stamps
- **Safety**: Cannot break level/ramp structure by design

## Dependencies

- Core grid system (implemented)
- Level system (implemented)
- Ramp mask system (required)
- Export system (for stamp export)

## Deliverables

- `src/detail-stamps/` directory with detail stamp system
- `src/detail-stamps/importers/` with format importers
- Built-in detail stamp library
- UI components for stamp management and application
- Unit tests with ≥95% coverage
- Documentation with workflow examples

## Validation Before Merge

- [ ] Detail amplitude never exceeds 1% of level height
- [ ] Ramp zones receive zero detail
- [ ] Detail can be toggled OFF completely
- [ ] Original heightmap preserved (non-destructive)
- [ ] Import from PNG/TIFF/EXR works correctly
- [ ] Tiling produces seamless results
- [ ] Performance acceptable for 1024x1024 maps
