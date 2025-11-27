# Tasks: Improve Heightmap Quality (MMORPG-Safe)

## Progress: 0% (0/15 tasks complete)

## CRITICAL: Read Before Starting

This task is about adding **cosmetic detail** to heightmaps WITHOUT breaking:
- Level system (discrete platôs)
- Ramp system (smooth transitions between levels)
- Border barriers
- Walkability

**If any task would modify ramps or levels, STOP and reconsider.**

---

## Phase 1: Ramp Detection Mask (Required First)

- [ ] 1.1 Create RAMP_MASK_FRAG shader that detects level transition zones
- [ ] 1.2 Implement gradient-based ramp detection (high gradient = ramp)
- [ ] 1.3 Add level-boundary detection (different levels in neighborhood = boundary)
- [ ] 1.4 Create rampMaskFBO framebuffer for mask storage
- [ ] 1.5 Test mask generation - verify ramps are correctly identified

## Phase 2: Safe Detail Application

- [ ] 2.1 Create SAFE_DETAIL_FRAG shader that applies detail with mask
- [ ] 2.2 Implement mask-weighted detail: `detail * mask * intensity`
- [ ] 2.3 Add multi-scale noise (macro 0.1%, meso 0.2%, micro 0.2%)
- [ ] 2.4 Ensure detail amplitude never exceeds 0.5% of level height
- [ ] 2.5 Test: verify ramp areas receive ZERO detail

## Phase 3: Pipeline Integration

- [ ] 3.1 Add mask generation pass AFTER ramp smoothing
- [ ] 3.2 Add detail pass AFTER mask generation
- [ ] 3.3 Add `surfaceDetailEnabled` config option (default: true)
- [ ] 3.4 Add `surfaceDetailIntensity` config option (0-1, default: 0.5)

## Phase 4: Validation & Testing

- [ ] 4.1 Visual test: compare before/after - ramps must look identical
- [ ] 4.2 Numerical test: ramp angles within 0.5 degrees of original
- [ ] 4.3 Toggle test: detail OFF produces identical output to before this feature
- [ ] 4.4 Performance test: detail pass adds < 50ms to generation

---

## Tasks REMOVED (Would Break Level System)

The following tasks from the previous proposal are **REMOVED** because they would break the core level/ramp system:

~~1.1 Remove discrete level quantization~~ - REMOVED: Levels are essential
~~1.2 Implement smooth gradient blending~~ - REMOVED: Would destroy platôs
~~3.2 Create water flow accumulation map~~ - REMOVED: Would carve into ramps
~~3.5 Create valley carving effect~~ - REMOVED: Would destroy level structure
~~3.6 Implement river carving system~~ - REMOVED: Would create unwanted slopes
~~5.2 Implement coastal/beach erosion~~ - REMOVED: Would modify borders
~~5.3 Create river bed carving~~ - REMOVED: Would carve into terrain
~~6.2-6.4 Sediment accumulation~~ - REMOVED: Would modify terrain structure

## Notes for Implementation

1. **Start with Phase 1** - Without the ramp mask, you cannot safely add detail
2. **Test after each step** - Generate terrain and visually verify ramps unchanged
3. **Use VERY low amplitudes** - 0.1-0.2% is barely visible but adds realism
4. **When in doubt, reduce intensity** - It's better to have subtle detail than broken ramps
