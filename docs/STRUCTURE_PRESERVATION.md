# Structure Preservation Guidelines

## CRITICAL: Read Before Implementing Any Feature

This document defines the **NON-NEGOTIABLE** structural elements of the heightmap generator that **MUST BE PRESERVED** by all features and modifications.

## Project Purpose

This is a **specialized heightmap generator for MMORPGs**, NOT a generic procedural terrain tool. The key differentiator is:

- **Well-defined gameplay levels (platôs)** - Flat areas for combat, exploration, and level design
- **Controlled access ramps** - Smooth transitions between levels for player navigation
- **Predictable terrain structure** - Level designers can easily work with imported terrain

**Generic procedural generators already exist** (World Machine, Gaea, etc.) and produce beautiful but UNPREDICTABLE terrain. This project exists because MMORPGs need STRUCTURED terrain with clear levels and controlled access points.

---

## Non-Negotiable Elements

### 1. Discrete Level System

```
Level 3: ████████████████████████████████  (Mountain peaks)
Level 2: ████████████████████████████████  (Hills/highlands)
Level 1: ████████████████████████████████  (Plains/lowlands)
Level 0: ████████████████████████████████  (Water/beach)
```

**Rules:**
- Levels MUST remain as distinct, flat plateaus
- Each level has a BASE HEIGHT that defines gameplay elevation
- Height variation WITHIN a level must be minimal (< 0.5%)
- Level boundaries MUST be detectable for gameplay logic

**DO NOT:**
- Remove level quantization
- Create continuous gradients between levels
- Apply global smoothing that erases level boundaries

### 2. Ramp System

```
Level 2: ████████████
                    ╲
                     ╲  ← RAMP (controlled transition)
                      ╲
Level 1:               ████████████████
```

**Rules:**
- Ramps are the ONLY transitions between levels
- Ramp slopes MUST be walkable (< 45° at start, progressive to ~85°)
- Ramp paths are INTENTIONAL, not random
- Ramp width and length are calculated for gameplay

**DO NOT:**
- Apply erosion that carves into ramps
- Add detail that changes ramp surface angles
- Create uncontrolled height variations in ramp zones
- Allow features to create new level transitions

### 3. Border Barriers

```
┌────────────────────────────────────┐
│ ▲▲▲▲▲                        ▲▲▲▲▲ │  ← Mountain barriers
│ ▲▲▲▲▲    PLAYABLE AREA      ▲▲▲▲▲ │
│ ▲▲▲▲▲                        ▲▲▲▲▲ │
└────────────────────────────────────┘
```

**Rules:**
- Map edges MUST have impassable barriers
- Barriers can be mountains, cliffs, or water
- Barrier zones are player-inaccessible

**DO NOT:**
- Apply detail that creates paths through barriers
- Reduce barrier heights
- Create exploitable gaps in barriers

---

## Implementation Pipeline (Correct Order)

```
1. HEIGHTMAP_FRAG    → Base terrain generation
2. LEVEL_FRAG        → Level assignment (CRITICAL)
3. BORDER_FRAG       → Border barriers
4. SMOOTH_FRAG x12   → Ramp smoothing (CRITICAL - DO NOT MODIFY)
5. [Optional: Detail] → ONLY with ramp mask protection
```

**Any new feature MUST:**
- Run AFTER step 4 (ramp smoothing)
- Use a RAMP MASK to protect transition zones
- Limit amplitude to < 0.5% of level height difference

---

## Feature Classification

### Safe Features (No Special Care Needed)
- Export system
- Preview/navigation
- Multi-map system
- Persistence
- UI improvements
- Documentation

### Medium Risk Features (Require Ramp Mask)
- Stamp library → Stamps must respect level boundaries
- Sculpting tools → Must have level constraints
- Spline features → Must create proper ramps when crossing levels
- Heightmap import → Must blend without breaking structure
- Procedural masks → Read-only analysis, no terrain modification

### High Risk Features (Require Careful Implementation)
- Noise system → MUST NOT apply to ramp zones
- Terrain filters → Erosion MUST NOT carve into ramps
- Detail enhancement → MUST use ramp mask protection

---

## Required Protections for Risky Features

### Ramp Mask System

Every feature that modifies terrain height MUST:

1. **Generate a ramp mask** that identifies:
   - Ramp zones (protection = 1.0)
   - Level boundaries (protection = 0.5)
   - Plateau centers (protection = 0.0)

2. **Apply modifications with mask:**
   ```glsl
   float safeModification = modification * (1.0 - rampMask);
   newHeight = height + safeModification;
   ```

3. **Respect amplitude limits:**
   - Maximum detail: 0.5% of level height difference
   - This ensures walkability is not affected

### Level Boundary Detection

```glsl
// Check if pixel is near a level boundary
bool isNearLevelBoundary(sampler2D levelmap, vec2 uv, float radius) {
    float currentLevel = texture2D(levelmap, uv).r;
    for (/* neighbors within radius */) {
        float neighborLevel = texture2D(levelmap, neighborUV).r;
        if (abs(neighborLevel - currentLevel) > 0.01) {
            return true; // Near a level transition
        }
    }
    return false;
}
```

---

## Validation Checklist

Before merging ANY terrain-modifying feature:

- [ ] Ramp angles unchanged (within 0.5°)
- [ ] Level boundaries unchanged (within 1 pixel)
- [ ] Feature can be disabled to restore original output
- [ ] No new paths created through barriers
- [ ] No uncontrolled level transitions created
- [ ] Visual comparison shows ramps identical

---

## Why This Matters

| Generic Procedural | This Project |
|-------------------|--------------|
| Beautiful chaos | Controlled structure |
| Unpredictable gameplay | Predictable gameplay |
| Random slopes everywhere | Intentional ramps only |
| Level designers must sculpt everything | Level designers add details |
| Terrain IS the content | Terrain is the FOUNDATION |

**For an MMORPG:**
- Players need to know where they can go
- Level designers need predictable terrain
- Combat areas need flat ground
- Access points need controlled ramps
- Boundaries need to be impassable

This project provides that foundation. Any feature that breaks it defeats the entire purpose.
