# Implement Advanced Noise System

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: HIGH**
>
> This feature modifies terrain heights. It MUST use the **Ramp Mask System** to protect level boundaries and ramps.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

The current terrain generation lacks variety and natural-looking features. An advanced noise system with multiple algorithms and layering capabilities will enable:

- More realistic terrain variations **within plateau areas**
- Artist control over terrain style
- Reproducible results with seeds
- Natural-looking surface details **that don't break level structure**

## What Changes

1. **New noise algorithms**: Perlin, Simplex, Worley, Ridged, Billow, Domain Warp, FBM
2. **Noise layering system**: Stack and blend multiple noise layers
3. **Mask-based application**: Apply noise to specific areas **with ramp protection**
4. **Preset system**: Built-in presets for common terrain types
5. **Integration with grid system**: Apply noise **AFTER ramp smoothing pass**

## Critical Constraints

### MUST DO:
- Generate ramp mask BEFORE applying noise
- Apply noise with formula: `noise * (1.0 - rampMask) * intensity`
- Limit noise amplitude to < 0.5% of level height difference
- Run AFTER the 12-pass ramp smoothing

### MUST NOT:
- Apply noise globally without ramp protection
- Create noise that affects ramp walkability
- Use noise to create level transitions
- Apply noise in border barrier zones

## Implementation Requirements

### Ramp-Safe Noise Application

```glsl
// CORRECT: Apply noise only in safe zones
float applyRampSafeNoise(float height, float noise, float rampMask, float intensity) {
    float safeIntensity = intensity * (1.0 - rampMask);
    float maxAmplitude = 0.005; // 0.5% of height range
    float clampedNoise = clamp(noise, -maxAmplitude, maxAmplitude);
    return height + clampedNoise * safeIntensity;
}
```

### Pipeline Position

```
1. Base heightmap
2. Level assignment
3. Border barriers
4. Ramp smoothing (12 passes) ← CRITICAL
5. Generate ramp mask          ← NEW (required for noise)
6. Apply noise with mask       ← NEW (this feature)
```

## Impact

- **Grid System**: Will call noise system during Phase 3 (heightmap generation)
- **Preview**: Real-time noise preview in web interface
- **Export**: Noise affects final heightmap output
- **Performance**: Optimized with caching and Web Workers

## Dependencies

- Core grid system (implemented)
- Level system (implemented)
- **Ramp mask system (required - implement first)**

## Deliverables

- `src/noise/` directory with all noise algorithms
- **Ramp mask integration in all noise functions**
- Unit tests with ≥95% coverage
- **Tests verifying ramp angles unchanged**
- Integration with existing Phase 3 pipeline
- Documentation updates

## Validation Before Merge

- [ ] Ramp angles unchanged (within 0.5°)
- [ ] Level boundaries unchanged (within 1 pixel)
- [ ] Noise can be disabled to restore original output
- [ ] Visual comparison shows ramps identical before/after
