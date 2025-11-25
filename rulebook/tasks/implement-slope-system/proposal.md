# Proposal: Implement Progressive Slope System

## Why

The progressive slope system is critical for preventing players from climbing cliffs and walls since the game has no climbing mechanics. Ramps must start with gentle slopes for walkability and progress to near-vertical slopes to prevent unauthorized climbing. This system also enforces the height difference constraint (1.5x character height) to ensure ramps are visible and harmonious. Without this system, players could exploit terrain to reach inaccessible areas.

## What Changes

This task implements the progressive slope system:

1. **Slope Configuration**:
   - `SlopeConfig` interface with startAngle, endAngle, transitionLength, curveType
   - `SlopeCurve` enum (linear, ease-in, ease-out, ease-in-out, exponential)

2. **Progressive Slope Calculation**:
   - Function to calculate slope factor based on normalized position (0.0 to 1.0)
   - Support for different curve types
   - Angle to height factor conversion

3. **Ramp Height Interpolation**:
   - Progressive height interpolation along ramp path
   - Gentle start (~15-30°) to near-vertical end (~85-89°)
   - Height difference validation

4. **Cliff Generation**:
   - Identify cliffs (neighbors with different levelId without ramp)
   - Mark cliff cells with cliff flag

## Impact

- Affected specs: `SLOPE_SYSTEM.md`, `GENERATION_PIPELINE.md` (Phase 2, Phase 3)
- Affected code:
  - `src/core/slope.ts` (new)
  - `src/phases/phase2-roads.ts` (update for ramp generation)
  - `src/phases/phase3-heightmap.ts` (update for ramp height interpolation)
- Breaking change: NO (new feature)
- User benefit: Prevents player climbing exploits and ensures harmonious ramp transitions
