# Generation Pipeline

The heightmap generation process is divided into 4 sequential phases, inspired by Albion Online's map design workflow. See [Albion Inspiration](ALBION_INSPIRATION.md) for details on how this aligns with professional game map design practices.

**Procedural Generation Focus**: The system prioritizes procedural generation with minimal manual intervention, while allowing manual overrides when needed. Boundaries and blocking zones can be generated procedurally or placed manually.

**ARK-Inspired Features**: The system can optionally use erosion, turbulence, and biome-specific foliage density controls inspired by ARK: Survival Evolved's procedural generation. See [ARK Inspiration](ARK_INSPIRATION.md) for details.

## Phase 1: Logical Level Grid (No Height Yet)

### Purpose

Define the logical structure of levels without calculating final heights.

### Steps

1. **Define Grid**
   ```typescript
   cols = mapSize.width / cellSize
   rows = mapSize.height / cellSize
   ```

2. **Initialize Matrices**
   - `levelId[rows][cols]`: Level ID for each cell
   - `flags[rows][cols]`: Feature flags (road, ramp, water, blocked, etc.)

3. **Distribute Base Levels**
   - Start with all cells at level 0 (sea level)
   - Select regions for:
     - **Level -N to -1**: Underwater / subaquatic content (playable underwater areas)
     - Level 0: Sea level / ground level
     - Level 1: Playable plateaus
     - Level 2: Background unreachable
     - **Level MAX+**: Mountain peaks above walkable level (visual/impassable in 3D)

4. **Region Selection Methods**
   - **Blobs**: Flood fill + noise
   - **Shapes**: Controlled shapes (ellipses, rectangles, simple splines)

5. **Mark Inaccessible Regions**
   - Background levels not connected to roads → scenery only
   - `flags[y][x].playable = false`

### Output

- Grid with `levelId` assigned
- Initial `flags` set
- No height calculations yet

## Phase 2: Road and Ramp Generation (Playable Topology)

### Purpose

Generate the road network connecting Points of Interest (POIs) with proper ramps between levels.

### Steps

1. **Define POI Nodes**
   ```typescript
   interface POINode {
     x: number;
     y: number;
     levelId: number;
     type: 'town' | 'dungeon' | 'exit' | 'portal';
   }
   ```

2. **Generate Road Graph**
   - Create abstract graph: nodes = POIs, edges = roads
   - Use **MST (Minimum Spanning Tree)** for basic connectivity
   - Optionally add extra edges for loops (shortcuts, alternate routes)

3. **Rasterize Roads on Grid**
   For each graph edge:
   - Use **A* pathfinding** on the grid:
     - Low cost on "flat" cells
     - High cost for tight curves
     - Very high cost for changing `levelId` (except ramps)
   - Result: cells marked with:
     - `flags.road = true`
     - `roadId` (to identify each road)

4. **Generate Ramps Between Levels**
   When A* needs to connect nodes on different levels:
   - **Validate height difference**: Must not exceed 1.5x character height (~270 Unreal units)
   - Calculate minimum transition length L based on height difference and harmonious slope (30°)
   - Ensure ramp length is sufficient for visibility (minimum 2x character height)
   - Mark cells as:
     - `flags.ramp = true`
     - `flags.road = true`
   - Store `rampStartHeight` and `rampEndHeight` for interpolation
   - **Progressive slope**: Ramps start with gentle slope and progress to near-vertical (up to ~85-89 degrees) to prevent player climbing without ladders
   - **Harmonious transition**: Height differences limited to ensure ramps are visible and smooth

5. **Ensure Road Linearity**
   - Post-A* simplification pass:
     - **Douglas-Peucker** algorithm on each road to remove jagged edges
   - When rasterizing, "correct" to cleaner lines/curves
   - Expand road laterally according to `roads.width` (morphological dilation on grid)

### Output

- Flat road graph respecting levels
- Controlled ramps
- Road cells marked in grid

## Phase 3: Convert LevelId + Roads to Heightmap

### Purpose

Convert logical levels and road network into actual height values.

### Steps

1. **Base Height by Level**
   ```typescript
   for (y = 0; y < rows; y++) {
     for (x = 0; x < cols; x++) {
       let lvl = levelId[y][x];
       height[y][x] = baseHeight[lvl];
     }
   }
   ```

2. **Process Ramps**
   For each ramp:
   - Get ordered path of cells `c0..cN`
   - Calculate progressive slope ramp from `hStart` → `hEnd`:
     ```typescript
     for (i = 0; i <= N; i++) {
       const t = i / N;  // Normalized position 0.0 to 1.0
       
       // Progressive slope: gentle start → steep end
       // Slope angle increases from ~15° to ~85-89°
       const slopeFactor = calculateProgressiveSlope(t);
       const height = lerp(hStart, hEnd, slopeFactor);
       
       height[cy][cx] = height;
     }
     ```
   - Expand to road width (to avoid lateral steps)
   - **Slope progression**: Prevents player climbing by creating unclimbable angles at the end

3. **Smooth Roads Locally**
   - Apply smoothing filter only on road band + 1-2 cells around:
     - Ensures spell decals look good
     - Prevents "jagged" movement
   - Outside roads: minimal smoothing (preserve cliffs and noise)

4. **Generate Cliffs Between Levels**
   - Where neighbors have large `baseHeight` difference and no ramp:
     - Mark `flags.cliff = true`
   - Heightmap shows step:
     - Height jumps from one level to another
   - Unreal auto-material will paint rock based on slope

5. **Apply Biome Noise**
   - Apply noise (Perlin/Simplex/Value) with control:
     - **Inside roads**: Very low amplification (±5-10 cm)
     - **Outside roads, away from cliffs**: ±1-3m depending on level
   - For canyons:
     - Select "canyon axes" (like roads, but for water/valleys)
     - Define height function based on distance to axis:
       - Center: Low height (level -1 or underwater level)
       - Sides: Rise to plateau (level 0/1)
     - Creates "U" canyon shape
   - For mountains:
     - Base at walkable level (players can reach base)
     - Peak extends above maximum walkable level
     - Peak marked as `visualOnly = true` (impassable, visual only)
     - Creates dramatic skyline in 3D space

### Output

- Heightmap with stepped levels
- Flat roads
- Marked cliffs
- Controlled noise

## Phase 4: Export to Unreal

### Purpose

Export generated data in formats compatible with Unreal Engine.

### Export Formats

1. **Heightmap**
   - Format: `.png` (16-bit) or `.r16`
   - Mapping: Unreal height → [0, 65535] via fixed scale
   - Usage: Import as Landscape in Unreal

2. **Masks (16-bit or 8-bit)**
   - `roads_mask`: 255 where road, 0 elsewhere
   - `water_mask`: Rivers, lakes
   - `cliffs_mask`: High slope / level transition areas
   - `level_mask`: Optional, each `levelId` mapped to value band (e.g., 0, 64, 128, 192)
   - `navigation_walkable_mask`: Walkable areas for NavMesh
   - `navigation_swimable_mask`: Swimmable areas for water NavMesh
   - `navigation_flyable_mask`: Flyable areas for 3D NavMesh
   - `navigation_combined_mask`: Combined navigation map
   - `collision_map`: Collision map for automatic collision volumes

### Unreal Integration

1. **Landscape Import**
   - Import height as Landscape
   - Apply auto-material using:
     - Slope (for rock/grass/sand)
     - Altitude
     - Masks (roads = road material blend, etc.)

2. **PCG/Foliage**
   - Use `level_mask` + `cliffs_mask` for:
     - Rock mesh spawns
     - Cliff meshes
     - Vegetation placement
   - Use `roads_mask` for:
     - Spline mesh spawns
     - Road decals (if desired)

3. **Navigation and Collision**
   - Use `navigation_combined_mask` for automatic NavMesh generation
   - Use `navigation_swimable_mask` for water NavMesh
   - Use `collision_map` for automatic collision volume generation
   - Support runtime navigation updates

4. **Boundaries and Blocking**
   - Generate `boundary_mask` (edge, interior, ocean boundaries)
   - Generate `blocking_zones_mask` for player movement restriction
   - Export `boundaries.json` with boundary definitions
   - Support procedural generation with manual override
   - Allow boundaries in ocean and interior areas

### Export Structure

```
output/
  ├── heightmap.png                      # 16-bit heightmap
  ├── roads_mask.png                     # Road mask
  ├── water_mask.png                     # Water mask
  ├── cliffs_mask.png                    # Cliffs mask
  ├── level_mask.png                     # Level ID mask
  ├── navigation_walkable_mask.png       # Walkable navigation
  ├── navigation_swimable_mask.png      # Swimmable navigation
  ├── navigation_flyable_mask.png       # Flyable navigation
  ├── navigation_combined_mask.png      # Combined navigation
  ├── collision_map.png                  # Collision map
  ├── boundary_mask.png                  # Boundary map (edge, interior, ocean)
  ├── blocking_zones_mask.png            # Blocking zones
  ├── boundaries.json                    # Boundary definitions
  └── metadata.json                      # Generation parameters and metadata
```

