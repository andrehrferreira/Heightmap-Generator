# Proposal: Implement Layer System

## Why

The layer system provides Photoshop-like organization for terrain features, allowing independent editing of rivers, lakes, mountains, canyons, and roads. This enables manual stamp placement, visibility control, and solid color identification for easy visual distinction. Without this system, all terrain features would be mixed together, making editing and organization difficult. The layer system is essential for the manual override capability that complements procedural generation.

## What Changes

This task implements the layer system:

1. **Layer Data Structures**:
   - `Layer` interface with id, name, type, visible, opacity, locked, color, data, blendMode, stamps
   - `LayerType` enum (RIVERS, LAKES, MOUNTAINS, CANYONS, ROADS, CUSTOM)
   - `LayerStack` interface for managing multiple layers

2. **Layer Operations**:
   - Create, delete, reorder layers
   - Toggle visibility and lock
   - Set opacity and blend mode
   - Active layer selection

3. **Stamp System**:
   - `Stamp` interface for manual feature placement
   - Stamp placement on specific layers
   - Stamp editing and removal

4. **Layer Blending**:
   - Blend mode implementations (normal, add, multiply, overlay, replace)
   - Layer composition for final heightmap

5. **Color Identification**:
   - Default colors for each layer type
   - Solid color rendering for preview

## Impact

- Affected specs: `LAYER_SYSTEM.md`
- Affected code:
  - `src/core/layer.ts` (new)
  - `src/core/layer-stack.ts` (new)
  - `src/core/stamp.ts` (new)
- Breaking change: NO (new feature)
- User benefit: Enables organized terrain editing with manual stamp placement and visual identification
