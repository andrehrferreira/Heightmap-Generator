# Proposal: Improve Heightmap Quality (MMORPG-Focused)

## Why

The current heightmap generator produces terrain optimized for MMORPG gameplay with **well-defined levels and controlled ramps**. However, the surfaces within each level appear too smooth and lack realistic micro-details that would enhance visual quality without compromising gameplay.

**Core Principle**: This project is NOT a generic procedural terrain generator. The key differentiator is:
- **Flat, well-defined gameplay levels** (platôs) - MANDATORY
- **Controlled access ramps** between levels - MANDATORY
- **Micro-details for visual quality** - SECONDARY (must not break structure)

### What We PRESERVE (Non-Negotiable)
1. **Discrete Level System** - Levels must remain distinct and well-defined
2. **Ramp System** - Controlled transitions between levels (SMOOTH_FRAG + 12-pass smoothing)
3. **Level Assignment** - LEVEL_FRAG with soft boundaries for gameplay logic
4. **Border Barriers** - Mountain/cliff/water barriers at map edges

### What We IMPROVE
1. **Surface Texture** - Add micro-variation within flat areas (0.1-0.5% height variation)
2. **Visual Detail** - Fine-scale noise that doesn't affect walkability
3. **Plateau Realism** - Subtle surface irregularities without creating unwanted slopes

## What Changes

### Phase 1: Level-Safe Micro-Detail System
- Add micro-noise ONLY within plateau areas (not at level boundaries)
- Detect ramp zones and EXCLUDE them from detail application
- Use very low amplitude noise (max 0.5% of level height difference)
- Preserve walkability on all surfaces

### Phase 2: Ramp-Aware Detail Masking
- Create a "detail mask" that identifies safe zones for micro-detail
- Ramp zones get ZERO detail (preserve smooth transitions)
- Plateau centers get FULL detail (safe for micro-variation)
- Boundary zones get REDUCED detail (gradual transition)

### Phase 3: Enhanced Surface Texturing (Optional)
- Multi-octave micro-noise for natural surface appearance
- Rock/terrain texture patterns within plateaus
- Subtle erosion marks that don't create slopes

### Phase 4: Quality Controls
- User slider: "Surface Detail Intensity" (0-100%)
- Preview mode showing detail mask (where details are applied)
- One-click toggle to disable all detail (restore clean levels)

## Critical Constraints

### DO NOT:
- Remove discrete level quantization
- Apply erosion that carves into ramps
- Create continuous gradients between levels
- Add detail that changes effective walkable surface angle
- Modify SMOOTH_FRAG ramp generation logic

### DO:
- Add detail AFTER ramp smoothing pass
- Use detail mask to protect ramp zones
- Keep detail amplitude very low (cosmetic only)
- Allow user to disable detail entirely

## Implementation Strategy

```
Pipeline Order (CORRECT):
1. Generate base heightmap (HEIGHTMAP_FRAG)
2. Assign levels (LEVEL_FRAG)
3. Apply borders (BORDER_FRAG)
4. Smooth ramps - 12 passes (SMOOTH_FRAG) ← CRITICAL, don't modify
5. Generate detail mask (NEW) ← Identifies safe zones
6. Apply micro-detail with mask (NEW) ← Only in safe zones
```

## Impact

- Affected specs: terrain-generation (detail only)
- Affected code: `GPUTerrainGenerator.ts` (add new pass at end)
- Breaking change: NO (additive, can be disabled)
- User benefit: Better visual quality while preserving MMORPG-optimized terrain structure
