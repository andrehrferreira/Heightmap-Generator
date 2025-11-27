# Implement Heightmap Import and Blend

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: MEDIUM**
>
> Importing external heightmaps can override the level/ramp structure. Imported data MUST be adapted to respect existing level system or explicitly replace it.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Importing external heightmaps enables hybrid workflows:

- Use real-world terrain data (DEM)
- Import hand-painted heightmaps from external tools
- Combine multiple heightmap sources
- Blend procedural with imported terrain

## What Changes

1. **Import formats**: PNG, TIFF, EXR, RAW, R16
2. **Blend system**: Multiple blend modes with masking **and level protection**
3. **Edge blending**: Seamless integration with terrain
4. **Import layers**: Non-destructive stacking
5. **Reference mode**: Visual reference without terrain modification

## Critical Constraints

### Import Modes

External heightmaps can be imported in different modes:

```typescript
enum ImportMode {
    // Completely replace terrain (user takes responsibility for structure)
    REPLACE_ALL = 'replace_all',

    // Blend with existing terrain using ramp mask protection
    BLEND_SAFE = 'blend_safe',

    // Use as detail layer only (micro-variation)
    DETAIL_ONLY = 'detail_only',

    // Use as reference (no terrain modification)
    REFERENCE = 'reference',

    // Analyze and convert to level system
    CONVERT_TO_LEVELS = 'convert_to_levels',
}
```

### MUST DO:
- Show clear warning when using REPLACE_ALL mode
- Default to BLEND_SAFE mode which protects ramps
- Provide CONVERT_TO_LEVELS to analyze imported heightmap and suggest level assignments
- Protect ramp zones in all blend modes except REPLACE_ALL
- Limit detail import amplitude to 0.5%

### MUST NOT:
- Silently replace level structure without user confirmation
- Blend imported data into ramp zones without protection
- Import heightmaps larger than current resolution without warning
- Allow detail imports with excessive amplitude

### Import Mode Behavior

| Mode | Level System | Ramp Protection | Use Case |
|------|-------------|-----------------|----------|
| REPLACE_ALL | Destroyed | None | Starting from external data |
| BLEND_SAFE | Preserved | Full | Adding features to generated terrain |
| DETAIL_ONLY | Preserved | Full | Surface texture from external source |
| REFERENCE | Preserved | N/A | Visual guide only |
| CONVERT_TO_LEVELS | Recreated | Regenerated | Adapting external terrain to project |

## Implementation Requirements

### Safe Blend with Ramp Protection

```typescript
function blendImportSafe(
    currentHeight: number,
    importedHeight: number,
    blendFactor: number,
    rampMask: number,
    levelConfig: LevelConfig
): number {
    // Full protection in ramp zones
    if (rampMask > 0.5) {
        return currentHeight; // No modification
    }

    // Reduced blend near ramps
    const safeBlendFactor = blendFactor * (1.0 - rampMask);

    // Calculate blended height
    let blendedHeight = lerp(currentHeight, importedHeight, safeBlendFactor);

    // Constrain to level bounds
    blendedHeight = Math.max(levelConfig.minHeight, blendedHeight);
    blendedHeight = Math.min(levelConfig.maxHeight, blendedHeight);

    return blendedHeight;
}
```

### Detail-Only Import

```typescript
function importAsDetail(
    currentHeight: number,
    importedHeight: number,
    intensity: number,
    rampMask: number
): number {
    // Convert imported height to detail offset
    const avgImportHeight = calculateAverageHeight(importedData);
    const detailOffset = (importedHeight - avgImportHeight) * intensity;

    // Limit amplitude
    const maxAmplitude = 0.005; // 0.5%
    const clampedOffset = Math.max(-maxAmplitude, Math.min(maxAmplitude, detailOffset));

    // Apply with ramp protection
    const safeOffset = clampedOffset * (1.0 - rampMask);

    return currentHeight + safeOffset;
}
```

### Convert to Level System

```typescript
function convertToLevelSystem(
    importedData: Float32Array,
    levelCount: number
): ConversionResult {
    // Analyze height distribution
    const histogram = analyzeHeightDistribution(importedData);

    // Find natural level breaks (valleys, plateaus)
    const suggestedLevels = findNaturalBreaks(histogram, levelCount);

    // Generate level assignment map
    const levelMap = new Uint8Array(importedData.length);
    for (let i = 0; i < importedData.length; i++) {
        levelMap[i] = assignToNearestLevel(importedData[i], suggestedLevels);
    }

    // Identify where ramps need to be generated
    const rampLocations = detectLevelTransitions(levelMap);

    return {
        levelMap,
        suggestedLevels,
        rampLocations,
        requiresRampGeneration: rampLocations.length > 0,
    };
}
```

## UI Requirements

### Import Dialog
- Import mode selector with clear descriptions
- Warning for REPLACE_ALL mode
- Preview of imported data
- Level detection preview for CONVERT_TO_LEVELS

### Blend Controls
- Blend factor slider
- Ramp protection toggle (default: ON)
- Level constraint toggle (default: ON)
- Detail amplitude limit slider

## Impact

- **Web Interface**: Import dialog and layer management
- **Grid System**: Height blending operations **with protection**
- **Export**: Option to export original imports separately

## Dependencies

- Core grid system (implemented)
- Layer system (planned)
- **Level system (implemented)**
- **Ramp mask system (required for safe blend)**

## Deliverables

- `src/import/` directory with import system
- **Level-aware import modes**
- **Convert-to-levels analysis tool**
- Unit tests with ≥95% coverage
- **Tests verifying safe blend preserves ramps**
- Documentation updates

## Validation Before Merge

- [ ] BLEND_SAFE mode preserves all ramps
- [ ] DETAIL_ONLY mode limits amplitude correctly
- [ ] REPLACE_ALL shows clear warning
- [ ] CONVERT_TO_LEVELS suggests valid level assignments
- [ ] Ramp zones are protected in all safe modes
- [ ] Level boundaries maintained in blend operations
