# Proposal: Implement Boundaries and Blocking Zones

## Why

Boundaries and blocking zones prevent players from accessing unauthorized areas, even in the middle of the ocean. They support both procedural generation and manual placement. Boundaries can be edge boundaries (map limits), interior boundaries (within the map), ocean boundaries (in the middle of ocean), or custom boundaries. This is essential for map design and player movement restriction, ensuring players cannot exploit terrain to reach inaccessible areas.

## What Changes

This task implements boundaries and blocking zones:

1. **Boundary Types**:
   - Edge boundaries (map limits)
   - Interior boundaries (within map)
   - Ocean boundaries (in middle of ocean)
   - Custom boundaries (user-defined shapes)

2. **Blocking Zones**:
   - Blocking zone placement
   - Blocking zone shapes (rectangles, circles, polygons)
   - Blocking zone flags and properties

3. **Boundary Generation**:
   - Procedural boundary generation
   - Manual boundary placement
   - Boundary validation

4. **Export Integration**:
   - Boundary mask export
   - Blocking zones mask export
   - Boundaries JSON export

## Impact

- Affected specs: `BOUNDARIES_AND_BLOCKING.md`, `EXPORT_FORMAT.md`, `GENERATION_PIPELINE.md` (Phase 4)
- Affected code:
  - `src/core/boundary.ts` (new)
  - `src/core/blocking.ts` (new)
  - `src/phases/phase4-export.ts` (update for boundaries)
- Breaking change: NO (new feature)
- User benefit: Enables map boundaries and player movement restriction
