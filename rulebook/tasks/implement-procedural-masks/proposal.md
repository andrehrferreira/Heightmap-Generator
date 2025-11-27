# Implement Procedural Mask Generation

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: LOW**
>
> This feature is READ-ONLY terrain analysis. It does NOT modify terrain heights. However, generated masks should correctly identify and expose level/ramp information.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Automatic mask generation based on terrain analysis saves time and ensures consistency. Procedural masks enable:

- Automatic material blending in Unreal Engine
- Intelligent vegetation placement
- Gameplay area identification
- Reduced manual mask painting

## What Changes

1. **Analysis maps**: Slope, curvature, aspect, flow, exposure
2. **Derived masks**: Cliff, plateau, ~~valley~~, ridge, wetland, erosion, **level, ramp**
3. **Custom expressions**: Combine masks with expressions
4. **Mask operations**: Union, intersection, blur, dilate, erode

## Critical Constraints

### Structure-Aware Masks

This feature should EXPOSE the level/ramp structure, not hide it:

```typescript
interface StructureAwareMasks {
    // Level-based masks (NEW - important for this project)
    levelMask: (levelId: number) => Uint8Array;     // Mask for specific level
    rampMask: () => Uint8Array;                      // All ramp zones
    plateauMask: () => Uint8Array;                   // Flat areas within levels
    levelBoundaryMask: () => Uint8Array;             // Level transitions

    // Standard terrain analysis (existing)
    slopeMask: (minAngle: number, maxAngle: number) => Uint8Array;
    curvatureMask: (type: 'convex' | 'concave') => Uint8Array;
    heightMask: (minHeight: number, maxHeight: number) => Uint8Array;
}
```

### MUST DO:
- Expose level boundaries clearly in masks
- Generate ramp mask that matches ramp smoothing output
- Create plateau mask identifying safe detail zones
- Export masks compatible with Unreal material system

### MUST NOT:
- Generate masks that encourage breaking level structure
- Hide ramp zones in slope analysis
- Misrepresent level transitions in analysis

### Special Masks for This Project

| Mask | Purpose | Export Format |
|------|---------|---------------|
| Level ID | Each level as separate mask | Per-level grayscale |
| Ramp Zone | Identifies all ramp areas | Grayscale (0=plateau, 1=ramp) |
| Plateau Center | Safe zones for detail/spawning | Grayscale (0=edge, 1=center) |
| Walkable Area | Player-accessible terrain | Binary |
| Level Boundary | Edges between levels | Thin line mask |

## Implementation Requirements

### Level-Based Masks

```typescript
function generateLevelMask(levelId: number, grid: Grid): Uint8Array {
    const mask = new Uint8Array(grid.width * grid.height);

    for (let i = 0; i < mask.length; i++) {
        const cell = grid.cells[i];
        mask[i] = cell.levelId === levelId ? 255 : 0;
    }

    return mask;
}

function generateRampMask(grid: Grid): Uint8Array {
    const mask = new Uint8Array(grid.width * grid.height);

    for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
            const idx = y * grid.width + x;

            // Check if this cell is in a ramp zone
            // (has neighbors with different levels)
            const isRamp = hasNeighborsWithDifferentLevel(x, y, grid);

            // Also check slope angle
            const slope = calculateSlopeAngle(x, y, grid);
            const isSloped = slope > 5; // degrees

            mask[idx] = (isRamp || isSloped) ? 255 : 0;
        }
    }

    return mask;
}

function generatePlateauCenterMask(grid: Grid): Uint8Array {
    const rampMask = generateRampMask(grid);
    const plateauMask = new Uint8Array(grid.width * grid.height);

    // Distance from ramp zones
    const distanceField = computeDistanceField(rampMask);

    for (let i = 0; i < plateauMask.length; i++) {
        // Further from ramps = safer for detail
        const distance = distanceField[i];
        const safety = Math.min(distance / 20, 1.0); // 20 pixel fade
        plateauMask[i] = Math.floor(safety * 255);
    }

    return plateauMask;
}
```

### Export for Unreal

```typescript
interface UnrealMaskExport {
    // Individual level masks for material layers
    levels: Record<number, Uint8Array>;

    // Combined mask for landscape material
    combinedLevelMask: Uint8Array; // R=level0, G=level1, B=level2, A=level3

    // Ramp mask for special material handling
    rampMask: Uint8Array;

    // Plateau mask for foliage/detail spawning
    plateauMask: Uint8Array;
}
```

## Impact

- **Export**: Additional mask outputs **including level-aware masks**
- **Material System**: Better auto-material support in Unreal
- **PCG**: Improved vegetation placement data **aware of level structure**

## Dependencies

- Core grid system (implemented)
- Export system (planned)
- **Level system (implemented)**

## Deliverables

- `src/masks/` directory with mask generators
- **Level-aware mask generators**
- **Ramp mask that matches actual ramp zones**
- **Plateau center mask for safe operations**
- Unit tests with ≥95% coverage
- Documentation updates

## Validation Before Merge

- [ ] Level masks correctly identify each level
- [ ] Ramp mask matches actual ramp zones from smoothing
- [ ] Plateau mask identifies safe zones accurately
- [ ] Masks export correctly for Unreal material system
- [ ] No mask generation modifies terrain heights
