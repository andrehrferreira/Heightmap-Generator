# Implement Terrain Sculpting Tools

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: MEDIUM**
>
> Sculpting tools directly modify terrain heights. They MUST include **level constraints** and **ramp protection** to prevent accidental structure damage.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Manual terrain editing is essential for fine-tuning procedurally generated terrain. Artists need to:

- Make precise adjustments to specific areas **within plateau bounds**
- Fix issues that procedural generation can't handle
- Add artistic touches and unique features **that respect level structure**
- Iterate quickly on terrain design

## What Changes

1. **Brush system**: Multiple brush types (raise, lower, smooth, flatten, etc.)
2. **Brush settings**: Size, strength, falloff, spacing controls
3. **Constraints**: Height limits, **ramp protection**, level constraints
4. **Tablet support**: Pressure and tilt sensitivity
5. **Undo integration**: Each stroke creates undo state

## Critical Constraints

### Level-Constrained Brushes

All sculpting brushes MUST respect level boundaries:

```typescript
interface LevelConstrainedBrush {
    // The level this brush operates within
    targetLevel: number | null; // null = detect from cursor position

    // Maximum height change allowed
    maxHeightDelta: number; // Default: 0.5% of level height

    // Whether brush can cross level boundaries
    allowCrossLevel: boolean; // Default: false

    // Ramp protection
    protectRamps: boolean; // Default: true
}
```

### MUST DO:
- Detect current level at brush center
- Constrain brush effects to current level plateau
- Show visual warning when brush approaches ramp zone
- Reduce brush strength near level boundaries (fade out)
- Allow "Level Lock" mode to prevent accidental level changes

### MUST NOT:
- Allow brushes to create new level transitions
- Let raise/lower tools modify ramp zones
- Apply smoothing across ramp transitions
- Create heights that exceed adjacent level boundaries

## Brush Behavior by Type

| Brush | Level-Safe Behavior |
|-------|---------------------|
| Raise | Limited to 0.5% within current level |
| Lower | Limited to 0.5% within current level |
| Smooth | Only smooths within plateau, stops at ramps |
| Flatten | Flattens to level base height only |
| Noise | Applies micro-detail within plateau |

### Prohibited Operations

- ~~Creating new ramps~~ - Use Road/Ramp tool instead
- ~~Smoothing ramp transitions~~ - Would break access control
- ~~Raising terrain to next level~~ - Use level assignment tool instead

## Implementation Requirements

### Level Detection

```typescript
function getBrushLevelConstraints(brushCenter: Vec2, grid: Grid): BrushConstraints {
    const cell = grid.getCell(brushCenter.x, brushCenter.y);
    const levelId = cell.levelId;
    const levelConfig = getLevelConfig(levelId);

    return {
        minHeight: levelConfig.baseHeight - levelConfig.maxVariation,
        maxHeight: levelConfig.baseHeight + levelConfig.maxVariation,
        rampMask: generateRampMaskAroundPoint(brushCenter, grid),
    };
}
```

### Brush Application with Constraints

```typescript
function applyConstrainedBrush(
    height: number,
    brushEffect: number,
    constraints: BrushConstraints,
    rampMask: number
): number {
    // Don't modify ramp zones
    if (rampMask > 0.5) return height;

    // Fade effect near ramps
    const fadedEffect = brushEffect * (1.0 - rampMask);

    // Apply effect
    let newHeight = height + fadedEffect;

    // Clamp to level bounds
    newHeight = Math.max(constraints.minHeight, newHeight);
    newHeight = Math.min(constraints.maxHeight, newHeight);

    return newHeight;
}
```

## UI Requirements

### Level Indicator
- Show current level under cursor
- Show level boundaries on canvas (optional overlay)
- Warning icon when brush overlaps ramp zone

### Constraint Controls
- "Level Lock" toggle (default: ON)
- "Protect Ramps" toggle (default: ON)
- Max height delta slider (default: 0.5%)

## Impact

- **Web Interface**: New sculpting toolbar and canvas interaction
- **Preview**: Real-time brush preview and application **with level overlay**
- **Undo System**: Integration with undo/redo system
- **Grid**: Direct modification of grid cells **within constraints**

## Dependencies

- Core grid system (implemented)
- Web interface (partial)
- Preview renderer (partial)
- **Level system (implemented)**

## Deliverables

- `src/sculpting/` directory with brush implementations
- `web/src/tools/sculpting/` with UI components
- **Level constraint system for all brushes**
- Unit tests with ≥95% coverage
- **Tests verifying ramp zones unchanged after sculpting**
- Documentation updates

## Validation Before Merge

- [ ] No brush can modify ramp zones when "Protect Ramps" is ON
- [ ] No brush can exceed level height bounds when "Level Lock" is ON
- [ ] Visual warning shown when brush approaches ramp
- [ ] Undo correctly restores all modified cells
