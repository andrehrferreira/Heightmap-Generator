# Implement Terrain Filters

## STRUCTURE PRESERVATION WARNING

> **RISK LEVEL: HIGH**
>
> This feature includes erosion filters that can **DESTROY** the level/ramp system. ALL terrain-modifying filters MUST use the **Ramp Mask System**.
>
> **READ FIRST:** [STRUCTURE_PRESERVATION.md](../../../docs/STRUCTURE_PRESERVATION.md)

---

## Why

Post-processing filters allow artists to refine generated terrain non-destructively. Filters enable:

- Natural surface details through **masked** erosion simulation
- Stylized terrain with terracing **within plateau areas only**
- Fine-tuning with blur, sharpen, levels adjustments **that respect structure**
- Non-destructive workflow with filter stacks

## What Changes

1. **Filter system**: Non-destructive filter stack with **mandatory ramp masking**
2. **Blur filters**: Gaussian, box, bilateral (edge-preserving) - **plateau-only**
3. **Detail filters**: Sharpen, high-pass, emboss - **plateau-only**
4. **Shape filters**: ~~Terrace~~, ~~quantize~~, clamp, normalize - **REMOVED: would break levels**
5. **Erosion filters**: Hydraulic, thermal, wind erosion - **ONLY in plateau centers**
6. **Adjustment filters**: Levels, curves, gamma - **with structure protection**

## Critical Constraints

### REMOVED FILTERS (Would Break Level System)

The following filters are **PROHIBITED** as they would destroy the level structure:

- ~~Terrace filter~~ - Creates new discrete levels, conflicts with existing level system
- ~~Quantize filter~~ - Would create steps within plateaus
- ~~Global blur~~ - Would smooth out ramp transitions
- ~~Unmasked erosion~~ - Would carve into ramps and barriers

### ALLOWED FILTERS (With Ramp Mask)

These filters are allowed ONLY with ramp mask protection:

| Filter | Application Zone | Max Amplitude |
|--------|-----------------|---------------|
| Gaussian blur | Plateau centers only | N/A |
| Sharpen | Plateau centers only | 0.5% |
| Hydraulic erosion | Plateau centers only | 0.3% |
| Thermal erosion | Plateau centers only | 0.3% |
| Micro-detail | Plateau centers only | 0.5% |

### MUST DO:
- Generate ramp mask BEFORE applying ANY filter
- Apply filters with formula: `filter_result * (1.0 - rampMask)`
- Limit ALL filter amplitudes to prevent walkability changes
- Run AFTER the 12-pass ramp smoothing

### MUST NOT:
- Apply erosion that carves valleys across ramps
- Use blur that smooths ramp transitions
- Create new terraces or level steps
- Apply filters to border barrier zones

## Implementation Requirements

### Ramp-Safe Filter Application

```glsl
// REQUIRED: All filters must use this pattern
float applyRampSafeFilter(float originalHeight, float filteredHeight, float rampMask) {
    // rampMask: 1.0 = protected (ramp/boundary), 0.0 = safe (plateau center)
    float protection = rampMask;

    // In protected zones, keep original height
    // In safe zones, apply filtered height
    return mix(filteredHeight, originalHeight, protection);
}
```

### Erosion Constraints

```glsl
// Erosion MUST be limited in safe zones too
float applyConstrainedErosion(float height, float erosionAmount, float rampMask) {
    float maxErosion = 0.003; // 0.3% maximum
    float safeErosion = clamp(erosionAmount, -maxErosion, maxErosion);
    float protection = rampMask;
    return height + safeErosion * (1.0 - protection);
}
```

## Impact

- **Heightmap Generation**: Filters applied after noise/features **and ramp smoothing**
- **Preview**: Real-time filter preview **with mask visualization**
- **Export**: Filters baked into final export
- **Performance**: Heavy filters use Web Workers

## Dependencies

- Core grid system (implemented)
- Noise system (planned)
- **Ramp mask system (REQUIRED - implement first)**

## Deliverables

- `src/filters/` directory with filter implementations
- **All filters must accept rampMask parameter**
- Unit tests with ≥95% coverage
- **Tests verifying ramp angles unchanged after each filter**
- Documentation updates

## Validation Before Merge

- [ ] Ramp angles unchanged (within 0.5°)
- [ ] Level boundaries unchanged (within 1 pixel)
- [ ] Each filter can be disabled to restore original output
- [ ] Erosion does NOT create new valleys across ramps
- [ ] No filter creates paths through barriers
- [ ] Visual comparison shows ramps identical before/after
