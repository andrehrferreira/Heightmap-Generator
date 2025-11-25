# Proposal: Implement Road Network Generation

## Why

The road network is essential for connecting Points of Interest (POIs) and creating playable paths through the terrain. Without roads, players cannot navigate between different areas and levels. The road network uses A* pathfinding to find optimal routes, MST for connectivity, and Douglas-Peucker for smooth curves. It also generates ramps between levels with progressive slopes to prevent climbing. This is a critical component of Phase 2 in the generation pipeline and must be implemented after the core generator.

## What Changes

This task implements the road network generation system:

1. **POI System**:
   - `POINode` interface with position, levelId, and type
   - POI placement logic (towns, dungeons, exits, portals)

2. **Road Graph Generation**:
   - Minimum Spanning Tree (MST) algorithm for basic connectivity
   - Optional extra edges for loops and alternate routes
   - Graph data structure for road network

3. **A* Pathfinding**:
   - Grid-based A* implementation
   - Cost function: low for flat cells, high for curves, very high for level changes
   - Pathfinding between POIs on same and different levels

4. **Ramp Generation**:
   - Height difference validation (max 1.5x character height)
   - Minimum transition length calculation
   - Progressive slope application (gentle start to near-vertical end)
   - Ramp cell marking and height interpolation

5. **Road Simplification**:
   - Douglas-Peucker algorithm for line simplification
   - Road width expansion (morphological dilation)
   - Road smoothing for better visual appearance

## Impact

- Affected specs: `GENERATION_PIPELINE.md` (Phase 2), `SLOPE_SYSTEM.md`
- Affected code:
  - `src/phases/phase2-roads.ts` (new)
  - `src/algorithms/astar.ts` (new)
  - `src/algorithms/mst.ts` (new)
  - `src/algorithms/douglas-peucker.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables automatic road network generation connecting all POIs with proper ramps
