# Proposal: Implement Core Generator

## Why

The core generator is the foundation of the entire heightmap generation system. It provides the essential data structures (grid, cells, levels) and the mental model that all other components depend on. Without this core implementation, no other features can be built. The core generator establishes the 2D grid system with levelId, height, and flags that drives the entire procedural generation pipeline. This is the first and most critical component that must be implemented before any other features.

## What Changes

This task implements the core generator infrastructure:

1. **Grid Data Structures**:
   - `Cell` interface with `levelId`, `height`, `flags`, and optional `roadId`
   - `CellFlags` interface with all feature flags (road, ramp, water, underwater, blocked, cliff, playable, visualOnly, boundary)
   - `Grid` class to manage 2D cell arrays

2. **Level System**:
   - Base height calculation based on levelId
   - Height difference validation (max 1.5x character height)
   - Level distribution logic (negative for underwater, positive for above ground)
   - Support for underwater levels and mountain peaks above walkable level

3. **Grid Operations**:
   - Grid initialization with dimensions
   - Cell access and modification
   - Grid iteration utilities
   - Memory-efficient storage using typed arrays

4. **Core Constants**:
   - `DEFAULT_CHARACTER_HEIGHT` (180 Unreal units)
   - `MAX_HEIGHT_DIFFERENCE` (270 Unreal units)
   - Base height mappings for each level

## Impact

- Affected specs: `ARCHITECTURE.md` (core mental model)
- Affected code: 
  - `src/core/grid.ts` (new)
  - `src/core/cell.ts` (new)
  - `src/core/level.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Provides the foundation for all heightmap generation features
