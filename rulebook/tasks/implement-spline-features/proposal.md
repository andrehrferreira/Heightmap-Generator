# Implement Spline-Based Features

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: MEDIUM**
>
> Splines that cross level boundaries MUST create proper ramps using the existing ramp system. Splines MUST NOT create uncontrolled level transitions.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Linear terrain features (roads, rivers, ridges) require precise path control. Splines provide:

- Smooth, controllable curves for natural-looking features
- Per-point width and height control
- Easy editing with tangent handles
- Export to Unreal Engine spline actors

## What Changes

1. **Spline editing**: Bezier, Catmull-Rom, B-spline support
2. **Feature types**: Roads, rivers, ridges, ~~valleys~~, walls
3. **Width/height profiles**: Variable width and depth along spline
4. **Rasterization**: Convert splines to grid modifications **with level awareness**
5. **Export**: Export spline data for Unreal Engine

## Critical Constraints

### Level-Crossing Splines

When a spline crosses between levels, it MUST:

1. **Detect level transition points** along the spline path
2. **Generate proper ramps** at transition points using existing ramp system
3. **Use road ramp generation** for road-type splines
4. **Validate height differences** (max 1.5x character height)

```typescript
interface LevelAwareSpline {
    points: SplinePoint[];
    featureType: SplineFeatureType;

    // Level crossing behavior
    levelCrossingMode: 'generate_ramp' | 'follow_terrain' | 'bridge';

    // For ramp generation
    rampConfig?: {
        width: number;
        slopeConfig: SlopeConfig;
    };
}
```

### MUST DO:
- Detect all level transitions along spline path
- For roads: Generate ramps at level crossings
- For rivers: Follow terrain, carve within current level only
- For walls: Stay within single level or stack on cliffs
- Validate that generated ramps don't exceed height constraints

### MUST NOT:
- Create arbitrary slopes between levels
- Carve rivers through ramp zones
- Generate terrain modifications that bypass level system
- Create valley features that carve across levels

## Feature Types and Level Behavior

| Feature | Level Crossing Behavior |
|---------|------------------------|
| Road | Generates proper ramp with slope config |
| River | Follows terrain, stays within level |
| Ridge | Raises terrain within single level |
| ~~Valley~~ | **REMOVED** - would carve across levels |
| Wall | Builds on terrain, respects level bounds |

### River Constraints

Rivers are especially sensitive:

```typescript
interface RiverSplineConstraints {
    // Rivers can only carve within their current level
    maxDepth: number; // Limited to level height variation

    // Rivers cannot cross to higher levels (water flows down)
    allowUphillFlow: false;

    // At level boundaries, rivers become waterfalls (visual only)
    levelDropBehavior: 'waterfall' | 'end';
}
```

## Implementation Requirements

### Level Transition Detection

```typescript
function detectLevelTransitions(spline: Spline, grid: Grid): LevelTransition[] {
    const transitions: LevelTransition[] = [];

    for (let t = 0; t < 1; t += 0.01) {
        const pos = spline.getPoint(t);
        const currentLevel = grid.getLevelAt(pos);
        const nextPos = spline.getPoint(t + 0.01);
        const nextLevel = grid.getLevelAt(nextPos);

        if (currentLevel !== nextLevel) {
            transitions.push({
                position: pos,
                fromLevel: currentLevel,
                toLevel: nextLevel,
                splineT: t,
            });
        }
    }

    return transitions;
}
```

### Ramp Generation for Roads

```typescript
function generateRoadSplineRamp(
    spline: Spline,
    transition: LevelTransition,
    config: RampConfig
): void {
    // Use existing road ramp generation
    const ramp = generateRoadRamp({
        startLevel: transition.fromLevel,
        endLevel: transition.toLevel,
        path: spline.getSegmentAround(transition.splineT, config.rampLength),
        width: config.width,
        slopeConfig: config.slopeConfig,
    });

    // Apply ramp to grid
    applyRampToGrid(ramp, grid);
}
```

## Impact

- **Road System**: Enhances existing road generation with spline control
- **Web Interface**: New spline editing tools
- **Export**: Additional spline data export
- **Grid**: Spline rasterization affects terrain **within level constraints**

## Dependencies

- Core grid system (implemented)
- Road network system (planned) - **especially ramp generation**
- Export system (planned)
- **Level system (implemented)**

## Deliverables

- `src/splines/` directory with spline implementations
- `web/src/tools/spline/` with UI components
- **Level-aware spline rasterization**
- **Road spline ramp generation integration**
- Unit tests with ≥95% coverage
- **Tests verifying level transitions create proper ramps**
- Documentation updates

## Validation Before Merge

- [ ] Road splines crossing levels generate proper ramps
- [ ] River splines stay within their level depth bounds
- [ ] No spline creates uncontrolled level transitions
- [ ] Generated ramps follow slope system constraints
- [ ] Spline modifications can be undone completely
