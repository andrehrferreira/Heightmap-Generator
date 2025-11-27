# Implement Stamp Library

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: MEDIUM**
>
> Stamps modify terrain heights. They MUST respect level boundaries and cannot create uncontrolled level transitions.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

A reusable stamp library speeds up terrain creation by providing:

- Pre-made terrain features (mountains, craters, plateaus)
- User-created stamps for project consistency
- Scatter placement for natural distribution
- Import/export for sharing stamps

## What Changes

1. **Stamp structure**: Height data, masks, metadata, **level constraints**
2. **Built-in library**: Mountains, hills, craters, ~~plateaus~~
3. **Stamp placement**: Position, rotation, scale, blend modes
4. **Scatter system**: Random distribution with variation **within level bounds**
5. **Library management**: Categories, search, favorites

## Critical Constraints

### Level-Aware Stamps

Every stamp MUST be placed with level awareness:

```typescript
interface LevelAwareStamp {
    id: string;
    heightData: Float32Array;
    mask: Uint8Array;

    // Level constraints
    constraints: {
        // Maximum height above level base
        maxHeightAboveLevel: number; // Default: 0.5% of level height

        // Whether stamp can cross level boundaries
        allowCrossLevel: boolean; // Default: false

        // How to handle level edges
        levelEdgeBehavior: 'clip' | 'fade' | 'block';

        // Ramp protection
        protectRamps: boolean; // Default: true
    };
}
```

### MUST DO:
- Detect target level at stamp center before placement
- Clip stamp effect at level boundaries (if not cross-level)
- Fade stamp strength near ramp zones
- Validate stamp won't exceed level height bounds
- Show preview with level boundary overlay

### MUST NOT:
- Place stamps that span multiple levels (unless explicitly designed for it)
- Allow stamps to modify ramp zones
- Create stamps that generate new level transitions
- Use scatter to place stamps across level boundaries randomly

### Removed/Modified Stamps

| Stamp Type | Status | Reason |
|------------|--------|--------|
| Mountain (small) | Allowed | Must fit within level bounds |
| Mountain (large) | Modified | Clip at level boundaries |
| Hill | Allowed | Low amplitude, safe |
| Crater | Allowed | Limited depth within level |
| ~~Plateau~~ | **REMOVED** | Would create new levels |
| ~~Valley~~ | **REMOVED** | Would carve across levels |
| Rock formation | Allowed | Local detail only |

## Implementation Requirements

### Level-Constrained Stamp Placement

```typescript
function placeStampWithLevelConstraints(
    stamp: Stamp,
    position: Vec2,
    grid: Grid
): void {
    const targetLevel = grid.getLevelAt(position);
    const levelConfig = getLevelConfig(targetLevel);

    // Get ramp mask for this area
    const rampMask = generateRampMaskForArea(position, stamp.bounds, grid);

    for (let y = 0; y < stamp.height; y++) {
        for (let x = 0; x < stamp.width; x++) {
            const worldPos = {
                x: position.x + x - stamp.width / 2,
                y: position.y + y - stamp.height / 2,
            };

            // Check if this pixel is in target level
            const pixelLevel = grid.getLevelAt(worldPos);
            if (pixelLevel !== targetLevel && !stamp.constraints.allowCrossLevel) {
                continue; // Skip pixels outside target level
            }

            // Check ramp protection
            const rampProtection = rampMask.get(x, y);
            if (rampProtection > 0.5 && stamp.constraints.protectRamps) {
                continue; // Skip ramp zones
            }

            // Apply stamp with constraints
            const stampHeight = stamp.heightData[y * stamp.width + x];
            const constrainedHeight = Math.min(
                stampHeight,
                levelConfig.maxVariation * (1.0 - rampProtection)
            );

            applyStampPixel(worldPos, constrainedHeight, stamp.blendMode);
        }
    }
}
```

### Scatter with Level Bounds

```typescript
function scatterStampsWithinLevel(
    stamp: Stamp,
    area: BoundingBox,
    count: number,
    grid: Grid
): void {
    const targetLevel = grid.getLevelAt(area.center);

    for (let i = 0; i < count; i++) {
        // Generate random position
        let position = randomPointInBounds(area);

        // Verify position is in target level
        if (grid.getLevelAt(position) !== targetLevel) {
            // Try to find valid position
            position = findNearestPointInLevel(position, targetLevel, grid);
            if (!position) continue; // Skip if no valid position
        }

        // Verify not in ramp zone
        if (isInRampZone(position, grid)) {
            continue; // Skip ramp zones
        }

        placeStampWithLevelConstraints(stamp, position, grid);
    }
}
```

## UI Requirements

### Level Overlay
- Show target level when placing stamp
- Highlight level boundaries in placement preview
- Warning if stamp would cross levels

### Constraint Controls
- "Level Lock" toggle (default: ON)
- "Protect Ramps" toggle (default: ON)
- Level edge behavior selector

## Impact

- **Web Interface**: Stamp library panel and placement tools
- **Preview**: Stamp preview and placement visualization **with level overlay**
- **Storage**: Local and optional cloud storage

## Dependencies

- Core grid system (implemented)
- Web interface (partial)
- **Level system (implemented)**

## Deliverables

- `src/stamps/` directory with stamp system
- Built-in stamp library **with level constraints**
- **Level-aware placement algorithm**
- Unit tests with ≥95% coverage
- **Tests verifying stamps don't modify ramp zones**
- Documentation updates

## Validation Before Merge

- [ ] Stamps respect level boundaries by default
- [ ] Stamps cannot modify ramp zones when protected
- [ ] Scatter placement stays within single level
- [ ] Large stamps are clipped at level edges
- [ ] No stamp creates new level transitions
