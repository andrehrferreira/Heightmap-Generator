# Albion Online Map Design Inspiration

## Overview

This document integrates insights from Albion Online's map design process with our heightmap generator system. Albion Online uses a phased approach to map creation that aligns well with our generation pipeline.

## Albion Online Map Design Process

### Phase 1: Requirement Sheet

**Albion Approach:**
- Design document with conceptual ground rules
- Outlines what the map should contain
- Defines balance and gameplay requirements

**Our Implementation:**
- Configuration parameters (biome, levels, roads, water, features)
- Project settings and constraints
- Generation rules and constraints

### Phase 2: Rough Layouting

**Albion Approach:**
- Done on paper or with graphics tablet
- General sketch of where map will contain hills or lakes
- Basic terrain layout

**Our Implementation:**
- Phase 1: Logical Level Grid - defines where levels exist
- Layer system for organizing features
- Manual stamp placement for specific areas

### Phase 3: Landscape Design (Unity)

**Albion Approach:**
- Map template (empty map filled with grass) in right size
- First "real" steps in terrain creation
- Several "passes" adding more details:
  - **First pass**: Detailed work with general form of hills and lakes
  - **Next phase**: Detailed height differences, road network, bridges, and ramps

**Our Implementation:**
- Phase 2: Road and Ramp Generation
- Phase 3: Convert LevelId + Roads to Heightmap
- Progressive slope system for ramps
- Layer-based feature organization

### Phase 4: Fleshing Out the Area

**Albion Approach:**
- Resource nodes added roughly where they should be
- NPC/mob placement (camp buildings, torches, campfires)
- Remaining decoration:
  - "Out of map areas" (visible but not reachable)
  - Small details like grass

**Our Implementation:**
- Stamps for manual feature placement
- Layer system for organizing different feature types
- Zone system for managing large worlds
- Export masks for PCG/Foliage placement in Unreal

### Phase 5: World Editor

**Albion Approach:**
- Export to "world editor"
- 2D display of the world
- Move maps around to determine their position
- Local testing before importing to development build

**Our Implementation:**
- Multi-map system with zone positioning
- World map with zone connections
- Export system for Unreal Engine
- Preview system for visualization

## Key Insights Applied

### 1. Phased Approach

**Albion:** Multiple passes adding detail incrementally

**Our System:**
- Phase 1: Logical structure (levels)
- Phase 2: Connectivity (roads/ramps)
- Phase 3: Height details
- Phase 4: Export

### 2. Road Network as Core

**Albion:** Road network is added early and is crucial for connectivity

**Our System:**
- Road generation connects POIs
- Ramps provide level transitions
- Roads enforce flat, walkable surfaces

### 3. Height Differences

**Albion:** Detailed height differences added in later phases

**Our System:**
- Base heights from levelId
- Progressive slopes for ramps
- Noise for terrain variation
- Cliffs for unclimbable areas

### 4. Resource Placement

**Albion:** Resource nodes added after terrain is laid out

**Our System:**
- Stamps for manual placement
- Layer system for organization
- Export masks for PCG placement

### 5. World-Level Organization

**Albion:** Maps positioned in world editor for overall world structure

**Our System:**
- Multi-map system with zones
- Zone connections for seamless transitions
- World map for overall structure

## Differences and Enhancements

### What We Add

1. **Layer System**: Photoshop-like layers for better organization
2. **Progressive Slopes**: Controlled ramps preventing climbing
3. **Auto-Generation**: Procedural generation with manual override
4. **Persistence**: Save/load projects with all layers and zones
5. **Multi-Zone Editing**: Work with multiple zones simultaneously

### What We Keep from Albion

1. **Phased Generation**: Incremental detail addition
2. **Road-First Approach**: Roads as connectivity backbone
3. **Height-Based Design**: Levels and height differences
4. **World Organization**: Multiple maps in a world structure

## Workflow Comparison

### Albion Online Workflow

```
Requirement Sheet
  ↓
Rough Layouting (paper/tablet)
  ↓
Landscape Design (Unity)
  ├─ First pass: Hills and lakes
  ├─ Next phase: Height differences, roads, bridges, ramps
  └─ Final details: Resource nodes, NPCs, decoration
  ↓
World Editor (2D positioning)
  ↓
Testing and Import
```

### Our Workflow

```
Configuration (Requirement Sheet)
  ↓
Phase 1: Logical Level Grid (Rough Layouting)
  ↓
Phase 2: Road and Ramp Generation (Landscape Design - Roads)
  ↓
Phase 3: Heightmap Generation (Landscape Design - Heights)
  ├─ Base heights from levels
  ├─ Progressive slopes for ramps
  └─ Noise and cliffs
  ↓
Layer System (Fleshing Out)
  ├─ Manual stamps
  ├─ Feature layers
  └─ Resource placement
  ↓
Multi-Map System (World Editor)
  ├─ Zone positioning
  ├─ Zone connections
  └─ World structure
  ↓
Export to Unreal Engine
```

## Best Practices from Albion

### 1. Start with Structure

- Define levels and basic layout first
- Don't add details until structure is solid

### 2. Roads are Critical

- Roads connect everything
- Ramps provide accessibility
- Road network determines playability

### 3. Height Matters

- Height differences create gameplay opportunities
- Ramps must be walkable
- Cliffs prevent unwanted access

### 4. Details Come Last

- Add resource nodes after terrain
- Decoration is final step
- Focus on gameplay first

### 5. Test Early

- Test locally before finalizing
- Validate connectivity
- Ensure balance

## Integration with Our System

### Configuration Phase (Requirement Sheet)

```typescript
interface GenerationConfig {
  map: MapConfig;           // Size and cell size
  biome: BiomeConfig;        // Terrain type
  levels: LevelConfig;       // Height levels
  roads: RoadConfig;         // Road network
  water: WaterConfig;        // Rivers and lakes
  features: TerrainFeatures; // Mountains, canyons
}
```

### Generation Phases

1. **Phase 1**: Create logical structure (levels)
2. **Phase 2**: Add connectivity (roads/ramps)
3. **Phase 3**: Add height details
4. **Layer System**: Manual refinement and stamps
5. **Multi-Map**: Organize zones in world

### Export and Integration

- Export heightmaps and masks
- Use masks for PCG/Foliage in Unreal
- Position zones in world editor
- Test connectivity and balance

## Key Differences: ToS vs Albion Online

### 1. Underwater Content (Negative Levels)

**Albion Online:**
- Top-down perspective
- No underwater gameplay
- Negative levels used only for underground/canyons

**ToS (Throne of Secrets):**
- **3D perspective** enables underwater gameplay
- **Negative levels (-1, -2, -3, etc.)** represent underwater areas
- Fully playable underwater zones
- Underwater roads/ramps for navigation
- Underwater POIs (ruins, caves, resources)
- Water volumes at appropriate depths

**Implementation:**
```typescript
// Underwater levels are playable
baseHeight[-2] = -1200;  // Deep underwater (playable)
baseHeight[-1] = -600;   // Shallow underwater (playable)
baseHeight[0] = 0;       // Sea level
```

### 2. Mountains Above Walkable Level

**Albion Online:**
- Top-down view limits verticality
- All terrain must be walkable/reachable
- Mountains are part of walkable terrain

**ToS:**
- **3D perspective** allows vertical elements beyond walkability
- **Mountain peaks can exceed maximum walkable level**
- Peaks are **visual/impassable** - create dramatic skyline
- Players can reach mountain base but not peak
- Natural boundaries and visual interest in 3D space

**Implementation:**
```typescript
interface MountainConfig {
  baseLevel: 1,           // Walkable base
  peakLevel: 3,          // Above max walkable (2)
  maxWalkableLevel: 2,   // Players can't go higher
  visualOnly: true        // Peak is visual/impassable
}
```

### 3. 3D vs Top-Down Implications

**Albion Online (Top-Down):**
- Flat terrain design
- Height differences are visual only
- All areas must be accessible from top view
- Limited vertical gameplay

**ToS (3D):**
- **True 3D movement** (up/down/depth)
- **Vertical gameplay** (underwater, elevated areas)
- **Visual elements** can exceed playable bounds
- **Skyline design** matters (mountain peaks visible but unreachable)
- **Depth perception** important for gameplay

## Conclusion

Albion Online's map design process validates our phased approach and emphasizes the importance of:

1. **Structure First**: Levels and basic layout
2. **Connectivity**: Roads and ramps as core
3. **Height Details**: Controlled height differences
4. **World Organization**: Multiple maps in a world
5. **Iterative Refinement**: Multiple passes adding detail

Our system enhances this with:
- Layer-based organization
- Progressive slope system
- Auto-save and persistence
- Multi-zone editing
- Procedural generation with manual control

**ToS-specific enhancements:**
- **Underwater gameplay** with negative levels
- **3D verticality** with mountains above walkable level
- **Visual-only elements** for skyline and boundaries
- **True 3D movement** support throughout the system

