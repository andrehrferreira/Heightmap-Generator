# Proposal: Implement Navigation and Collision Maps

## Why

Navigation and collision maps are essential for Unreal Engine integration. They enable automatic NavMesh generation for walkable, swimmable, and flyable areas, and automatic collision volume generation. Without these maps, developers would need to manually create navigation and collision in Unreal Engine, which is time-consuming and error-prone. The system generates masks that can be used by Unreal plugins or manual setup.

## What Changes

This task implements navigation and collision map generation:

1. **Navigation Masks**:
   - Walkable mask (areas where players can walk)
   - Swimmable mask (water areas for swimming)
   - Flyable mask (3D areas for flying)
   - Combined navigation mask

2. **Collision Map**:
   - Collision map for automatic collision volume generation
   - Different collision types (blocking, trigger, overlap)
   - Water collision handling

3. **Export Integration**:
   - Export navigation masks as 8/16-bit PNG
   - Export collision map as 8/16-bit PNG
   - Include in Phase 4 export

## Impact

- Affected specs: `NAVIGATION_AND_COLLISION.md`, `EXPORT_FORMAT.md`, `GENERATION_PIPELINE.md` (Phase 4)
- Affected code:
  - `src/phases/phase4-export.ts` (update for navigation/collision)
  - `src/core/navigation.ts` (new)
  - `src/core/collision.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables automatic NavMesh and collision generation in Unreal Engine
