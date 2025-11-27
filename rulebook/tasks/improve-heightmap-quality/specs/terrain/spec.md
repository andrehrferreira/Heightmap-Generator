# Terrain Detail Enhancement Specification (MMORPG-Safe)

This specification defines requirements for adding visual detail to heightmaps while PRESERVING the core level/ramp system essential for MMORPG gameplay.

## CRITICAL: Preservation Requirements

### Requirement: Level System Integrity
The system SHALL NOT modify the discrete level system or ramp transitions.

#### Scenario: Level boundaries remain intact
Given a generated heightmap with levels 0-3
When detail enhancement is applied
Then all level boundaries SHALL remain at their original positions
And ramp slopes SHALL remain unchanged within 0.1% tolerance

#### Scenario: Ramp walkability preserved
Given a ramp connecting level 1 to level 2
When detail enhancement is applied
Then the ramp surface angle SHALL NOT change by more than 0.5 degrees
And the ramp SHALL remain fully walkable

---

## NEW Requirements (Safe Enhancements)

### Requirement: Ramp Detection Mask
The system SHALL generate a mask identifying ramp/transition zones where detail is NOT allowed.

#### Scenario: Ramp zone detection
Given a heightmap with level assignments
When the ramp mask is generated
Then all pixels within ramp transition zones SHALL be marked as "protected"
And protection SHALL extend 5-10 pixels beyond visible ramp edges

#### Scenario: Plateau center identification
Given a pixel at least 20 pixels from any level boundary
When the ramp mask is computed
Then that pixel SHALL be marked as "safe for detail" with full intensity

---

### Requirement: Level-Safe Micro-Detail
The system SHALL add micro-detail ONLY in areas marked safe by the ramp mask.

#### Scenario: Detail application with mask
Given a detail pass with ramp mask
When micro-detail is applied
Then protected (ramp) zones SHALL receive ZERO detail
And safe (plateau) zones SHALL receive full detail intensity
And transition zones SHALL receive proportionally reduced detail

#### Scenario: Detail amplitude limits
Given detail enhancement is enabled
When detail is computed
Then maximum detail amplitude SHALL NOT exceed 0.5% of level height difference
And detail SHALL be purely cosmetic (no gameplay impact)

---

### Requirement: Multi-Scale Surface Detail
The system SHALL support multiple detail scales for natural surface appearance.

#### Scenario: Three-scale detail system
Given detail enhancement with default settings
When applied to safe zones
Then the system SHALL apply:
- Macro detail (10-20 pixel features) at 0.1% amplitude
- Meso detail (3-10 pixel features) at 0.2% amplitude
- Micro detail (1-3 pixel features) at 0.2% amplitude

#### Scenario: Scale-appropriate noise
Given different detail scales
When noise is generated
Then each scale SHALL use appropriate noise frequency
And all scales SHALL blend smoothly without artifacts

---

### Requirement: User Controls
The system SHALL provide user controls for detail intensity.

#### Scenario: Detail intensity slider
Given the terrain generation UI
When user adjusts "Surface Detail" slider (0-100%)
Then detail amplitude SHALL scale proportionally
And 0% SHALL result in no detail (original clean levels)

#### Scenario: Detail toggle
Given the terrain generation UI
When user toggles "Enable Surface Detail" off
Then ALL detail passes SHALL be skipped
And heightmap SHALL be identical to pre-detail state

---

### Requirement: Performance
Detail enhancement SHALL NOT significantly impact generation time.

#### Scenario: Performance target
Given a 1024x1024 heightmap
When detail enhancement is applied
Then the additional processing time SHALL NOT exceed 50ms
And total generation time SHALL remain under 500ms

---

## Implementation Notes

### Pipeline Position
Detail enhancement MUST run AFTER:
1. Base heightmap generation
2. Level assignment
3. Border application
4. **Ramp smoothing (12 passes)** ← Detail comes AFTER this

### Shader: RAMP_MASK_FRAG (New)
```glsl
// Detect ramp zones by checking height gradient and level transitions
// Output: 0.0 = protected (ramp), 1.0 = safe (plateau center)
float detectRampZone(sampler2D heightmap, sampler2D levelmap, vec2 uv) {
    // Check local height gradient
    // Check level transitions in neighborhood
    // Return protection factor
}
```

### Shader: SAFE_DETAIL_FRAG (New)
```glsl
// Apply detail only where mask allows
float applyMaskedDetail(float height, float mask, float detailNoise) {
    float safeDetail = detailNoise * mask * detailIntensity;
    return height + safeDetail;
}
```

## Validation Criteria

Before merging any detail enhancement:
1. Run existing terrain generation tests
2. Verify ramp angles unchanged (within 0.5 degrees)
3. Verify level boundaries unchanged (within 1 pixel)
4. Verify detail toggle OFF produces identical output to before
5. Visual comparison: details should be subtle, not obvious
