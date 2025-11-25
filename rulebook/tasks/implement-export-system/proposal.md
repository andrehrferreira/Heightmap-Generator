# Proposal: Implement Export System

## Why

The export system generates the final heightmap and auxiliary masks in formats compatible with Unreal Engine. Without this system, the generated terrain data cannot be used in the game engine. The export system produces 16-bit heightmaps, 8/16-bit masks for roads, water, cliffs, levels, navigation, collision, and boundaries, plus JSON metadata. This is the final phase of the generation pipeline and is essential for Unreal Engine integration.

## What Changes

This task implements the export system:

1. **Heightmap Export**:
   - 16-bit PNG export
   - Raw 16-bit (.r16) export option
   - Height value mapping (Unreal units to 16-bit integers)

2. **Mask Export**:
   - Roads mask (8/16-bit)
   - Water mask (8/16-bit)
   - Cliffs mask (8/16-bit)
   - Level mask (8-bit)
   - Navigation masks (walkable, swimmable, flyable, combined)
   - Collision map (8/16-bit)
   - Boundary masks (boundary, blocking zones)
   - Biome mask (8-bit)
   - Playable mask (8-bit)
   - Underwater mask (8-bit)
   - Visual-only mask (8-bit)

3. **Metadata Export**:
   - JSON metadata with generation config, statistics, export info, Unreal integration data
   - Boundaries JSON for boundary definitions

4. **Export Directory Structure**:
   - Organized output directory with all exported files
   - Consistent naming conventions

## Impact

- Affected specs: `EXPORT_FORMAT.md`, `GENERATION_PIPELINE.md` (Phase 4), `UNREAL_WORKFLOW.md`
- Affected code:
  - `src/export/png.ts` (new)
  - `src/export/r16.ts` (new)
  - `src/export/metadata.ts` (new)
  - `src/phases/phase4-export.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables Unreal Engine integration with all required assets and metadata
