# Web Interface API

## Overview

The system provides a web interface for configuring heightmap generation parameters and previewing results in 2.5D.

## Configuration Parameters

### Map Configuration

```typescript
interface MapConfig {
  mapSize: {
    width: number;   // Map width in Unreal units
    height: number;  // Map height in Unreal units
  };
  cellSize: number;  // Size of each cell in Unreal units
}
```

### Biome Configuration

```typescript
interface BiomeConfig {
  type: BiomeType;
  // Biome-specific parameters
  foliage?: BiomeFoliageConfig; // ARK-inspired: biome-specific foliage
}

enum BiomeType {
  DESERT = 'desert',
  FOREST = 'forest',
  TUNDRA = 'tundra',
  CANYON = 'canyon',
  MOUNTAIN = 'mountain',
  PLAINS = 'plains',
  GRASSLANDS = 'grasslands',
  JUNGLE = 'jungle',
  SNOW = 'snow',
  REDWOOD = 'redwood',
}

interface BiomeFoliageConfig {
  grassDensity: number;          // 0.0-1.0
  treeDensity: number;           // 0.0-1.0
  slopeThreshold: number;        // Max slope for vegetation
  waterObjectsDensity?: number;  // Water objects density
  underwaterObjectsDensity?: number; // Underwater objects density
}
```

### Level Configuration

```typescript
interface LevelConfig {
  count: number;              // Number of height levels
  baseHeights: number[];      // Base height for each level (Unreal units)
  distribution: {
    [levelId: number]: number; // Percentage of map for each level
  };
}
```

### Road Configuration

```typescript
interface RoadConfig {
  enabled: boolean;
  count: number;              // Number of roads
  width: number;              // Road width in Unreal units
  minLength: number;          // Minimum road length
  maxLength: number;          // Maximum road length
  allowLoops: boolean;        // Allow road loops/shortcuts
}
```

### Water Configuration

```typescript
interface WaterConfig {
  rivers: {
    enabled: boolean;
    count: number;            // Number of rivers
    minLength: number;        // Minimum river length
    maxLength: number;        // Maximum river length
    width: number;            // River width
  };
  lakes: {
    enabled: boolean;
    count: number;            // Number of lakes
    minSize: number;          // Minimum lake size
    maxSize: number;          // Maximum lake size
  };
}
```

### Terrain Features

```typescript
interface TerrainFeatures {
  mountains: {
    enabled: boolean;
    count: number;            // Number of mountains
    minHeight: number;        // Minimum mountain height
    maxHeight: number;        // Maximum mountain height
  };
  canyons: {
    enabled: boolean;
    count: number;            // Number of canyons
    depth: number;            // Canyon depth
    width: number;            // Canyon width
  };
}
```

### Boundary Configuration

```typescript
interface BoundaryConfig {
  enabled: boolean;
  edgeBoundaries: {
    enabled: boolean;
    width: number;              // Boundary width in cells
    visible: boolean;           // Visible walls/barriers
    collision: boolean;         // Has collision
  };
  interiorBoundaries: {
    enabled: boolean;
    allowInOcean: boolean;      // Allow boundaries in ocean
    allowInLand: boolean;       // Allow boundaries on land
  };
  oceanBoundaries: {
    enabled: boolean;
    allowInOcean: boolean;      // Allow boundaries in middle of ocean
    invisible: boolean;         // Invisible boundaries
    collision: boolean;         // Has collision
  };
  customBoundaries: {
    enabled: boolean;
    boundaries: Boundary[];     // Manual boundary shapes
  };
}
```

### Enhanced Configuration (ARK-Inspired)

```typescript
interface EnhancedGenerationConfig extends GenerationConfig {
  seed?: number;                // Map seed for reproducibility
  erosion?: ErosionConfig;      // Erosion system
  turbulence?: TurbulenceConfig; // Turbulence for variation
  terrainScale?: TerrainScaleConfig; // Anisotropic terrain scaling
  slopeThresholds?: SlopeThresholds; // Slope-based thresholds
}

interface ErosionConfig {
  enabled: boolean;
  steps: number;              // Erosion iterations (e.g., 4)
  strength: number;           // Erosion strength (0.0-1.0, e.g., 0.75)
  depositionStrength: number; // Deposition strength (0.0-1.0, e.g., 0.5)
  turbulencePower: number;    // Additional variation (e.g., 0.0125)
}

interface TurbulenceConfig {
  enabled: boolean;
  power: number;              // Turbulence strength (e.g., 0.0125)
  frequency: number;          // Turbulence frequency
}

interface TerrainScaleConfig {
  x: number;                  // X-axis scale (e.g., 1.0)
  y: number;                  // Y-axis scale (e.g., 1.0)
  z: number;                  // Z-axis (height) scale (e.g., 1.0)
}

interface SlopeThresholds {
  trees: number;              // Max slope for trees (e.g., 0.5)
  shore: number;              // Shore slope (e.g., 1.0)
  vegetation: number;         // Max slope for vegetation
}

### Complete Configuration

```typescript
interface GenerationConfig {
  map: MapConfig;
  biome: BiomeConfig;
  levels: LevelConfig;
  roads: RoadConfig;
  water: WaterConfig;
  features: TerrainFeatures;
  boundaries: BoundaryConfig;   // Boundary and blocking configuration
}
```

## API Endpoints

### POST /api/generate

Generate heightmap based on configuration.

**Request:**
```json
{
  "config": {
    "map": { "width": 1024, "height": 1024, "cellSize": 1 },
    "biome": { "type": "desert" },
    "levels": { "count": 5, "baseHeights": [0, 600, 1200, 1800, 2400] },
    "roads": { "enabled": true, "count": 10, "width": 8 },
    "water": { "rivers": { "enabled": true, "count": 3 }, "lakes": { "enabled": false } },
    "features": { "mountains": { "enabled": true, "count": 5 }, "canyons": { "enabled": true, "count": 2 } }
  }
}
```

**Response:**
```json
{
  "jobId": "uuid",
  "status": "processing",
  "estimatedTime": 5000
}
```

### GET /api/status/:jobId

Get generation job status.

**Response:**
```json
{
  "jobId": "uuid",
  "status": "completed",
  "progress": 100,
  "result": {
    "heightmapUrl": "/output/heightmap.png",
    "masks": {
      "roads": "/output/roads_mask.png",
      "water": "/output/water_mask.png",
      "cliffs": "/output/cliffs_mask.png",
      "level": "/output/level_mask.png"
    },
    "metadata": { /* generation metadata */ }
  }
}
```

### GET /api/preview/:jobId

Get 2.5D preview data for visualization.

**Response:**
```json
{
  "heightmap": {
    "data": "base64-encoded-heightmap-data",
    "width": 1024,
    "height": 1024
  },
  "colors": {
    "data": "base64-encoded-color-data",
    "width": 1024,
    "height": 1024
  },
  "camera": {
    "position": [512, 512, 500],
    "target": [512, 512, 0]
  }
}
```

## Layer API Endpoints

### GET /api/layers/:mapId

Get all layers for a map/zone.

**Response:**
```json
{
  "layers": [
    {
      "id": "layer-1",
      "name": "Rivers",
      "type": "rivers",
      "visible": true,
      "opacity": 1.0,
      "locked": false,
      "color": { "r": 0, "g": 100, "b": 255 },
      "stamps": []
    }
  ],
  "activeLayerId": "layer-1",
  "order": ["layer-1", "layer-2"]
}
```

### POST /api/layers/:mapId

Create a new layer.

**Request:**
```json
{
  "name": "Custom Mountains",
  "type": "custom",
  "color": { "r": 139, "g": 69, "b": 19 }
}
```

### PUT /api/layers/:mapId/:layerId

Update layer properties.

**Request:**
```json
{
  "visible": false,
  "opacity": 0.5,
  "locked": true
}
```

### DELETE /api/layers/:mapId/:layerId

Delete a layer.

### POST /api/layers/:mapId/:layerId/stamps

Add a stamp to a layer.

**Request:**
```json
{
  "type": "mountain",
  "position": { "x": 512, "y": 512 },
  "rotation": 0,
  "scale": 1.0,
  "intensity": 1.0,
  "parameters": {
    "height": 600,
    "baseRadius": 50,
    "peakSharpness": 0.7
  }
}
```

### PUT /api/layers/:mapId/:layerId/stamps/:stampId

Update a stamp.

### DELETE /api/layers/:mapId/:layerId/stamps/:stampId

Remove a stamp.

### POST /api/layers/:mapId/:layerId/paint

Paint on a layer.

**Request:**
```json
{
  "x": 512,
  "y": 512,
  "radius": 10,
  "intensity": 0.8
}
```

## Multi-Map API Endpoints

### GET /api/worlds

Get all world maps.

**Response:**
```json
{
  "worlds": [
    {
      "id": "world-1",
      "name": "Main World",
      "zones": ["zone-1", "zone-2"],
      "worldSize": { "width": 10240, "height": 10240 }
    }
  ]
}
```

### POST /api/worlds

Create a new world map.

**Request:**
```json
{
  "name": "New World",
  "worldSize": { "width": 10240, "height": 10240 },
  "cellSize": 1
}
```

### GET /api/worlds/:worldId/zones

Get all zones in a world.

**Response:**
```json
{
  "zones": [
    {
      "id": "zone-1",
      "name": "Forest Zone",
      "position": { "x": 0, "y": 0 },
      "size": { "width": 1024, "height": 1024 },
      "visible": true,
      "locked": false
    }
  ]
}
```

### POST /api/worlds/:worldId/zones

Create a new zone.

**Request:**
```json
{
  "name": "Desert Zone",
  "size": { "width": 1024, "height": 1024 },
  "position": { "x": 1024, "y": 0 }
}
```

### PUT /api/worlds/:worldId/zones/:zoneId/visibility

Toggle zone visibility.

**Request:**
```json
{
  "visible": false
}
```

### POST /api/worlds/:worldId/zones/:zoneId/active

Set a zone as active for editing.

### POST /api/worlds/:worldId/connections

Create a connection between zones.

**Request:**
```json
{
  "zoneA": "zone-1",
  "zoneB": "zone-2",
  "edgeA": { "side": "east", "startPoint": { "x": 1024, "y": 0 }, "endPoint": { "x": 1024, "y": 1024 } },
  "edgeB": { "side": "west", "startPoint": { "x": 0, "y": 0 }, "endPoint": { "x": 0, "y": 1024 } },
  "type": "seamless"
}
```

## Web Interface Components

### Configuration Panel

- Biome selector (dropdown)
- Level count slider
- Road count slider
- River/lake toggles and counts
- Mountain/canyon toggles and counts
- Generate button

### Layer Panel

- List of all layers with visibility toggles
- Opacity sliders
- Lock/unlock buttons
- Reorder by drag-and-drop
- Color swatches for identification
- Active layer highlight
- Add/delete layer buttons

### Stamp Toolbar

- Stamp type selector
- Stamp size/scale controls
- Rotation control
- Intensity slider
- Apply button

### Zone Panel

- List of all zones in the world
- Zone visibility toggles
- Zone selection
- Active zone indicator
- Zone connection visualization
- Add/delete zone buttons

### Preview Panel

- **2.5D visualization** using Three.js
- **Camera controls**:
  - **Orbit (Rotation)**: Left mouse drag to rotate around map
  - **Pan**: Right mouse drag to move camera horizontally/vertically
  - **Zoom**: Mouse wheel to zoom in/out
  - **Touch controls**: Pinch to zoom, drag to pan, rotate gesture for orbit
- **Camera presets**: Top-down, isometric, side view, reset, fit to view
- **Navigation toolbar**: Quick access to camera controls and presets
- **Layer visibility toggles**: Heightmap, roads, water, cliffs, boundaries
- **Zone boundaries visualization**: See zone edges and connections
- **Stamp visualization**: Colored overlays with bounds
- **Paint tool**: Manual editing with brush
- **Focus on feature**: Click to focus camera on stamps/features
- **Export buttons**: PNG, R16, JSON

### Status Panel

- Generation progress bar
- Job status indicator
- Download links when complete
- Zone loading status

## Preview Visualization

The 2.5D preview uses:

- **Three.js** for rendering
- **Heightmap texture** mapped to a plane geometry
- **Color mapping** based on:
  - Height (altitude)
  - Slope (for cliffs)
  - Masks (roads, water)
  - **Layer colors** for solid color identification
- **Lighting** for depth perception
- **Full camera navigation**:
  - **Orbit**: Rotate around map to view from all angles
  - **Pan**: Move camera to navigate across map
  - **Zoom**: Zoom in/out to inspect details or see overview
  - **Smooth transitions**: Damped movement for smooth interaction
- **Camera presets**: Quick access to common views (top-down, isometric, side)
- **Focus on features**: Click stamps/features to focus camera
- **Layer overlays** showing each layer's color-coded data
- **Stamp visualization** with bounds and influence areas
- **Zone boundaries** visualization for multi-map editing
- **Performance optimization**: LOD based on zoom level

This approach is lighter than full 3D rendering while providing sufficient visual feedback and full navigation capabilities.

See [Preview Navigation](PREVIEW_NAVIGATION.md) for detailed camera controls documentation.

### Color Identification

Each layer type is painted with a solid color for easy identification:

- **Rivers**: Blue (#0064FF)
- **Lakes**: Cyan (#0096C8)
- **Mountains**: Brown (#8B4513)
- **Canyons**: Dark Brown (#654321)
- **Roads**: Gray (#808080)
- **Custom layers**: Magenta (#FF00FF)

Layers can be toggled on/off to show/hide specific features in the preview.

## Persistence API Endpoints

### POST /api/project/save

Save project to file (downloads JSON).

**Request:**
```json
{
  "project": { /* ProjectFile - see PERSISTENCE.md */ }
}
```

**Response:** Downloads JSON file

### POST /api/project/load

Load project from uploaded file.

**Request:** FormData with file

**Response:**
```json
{
  "project": { /* ProjectFile */ },
  "valid": true,
  "version": "1.0.0"
}
```

### GET /api/project/localstorage

Get project from localStorage (for recovery).

**Response:**
```json
{
  "project": { /* ProjectFile */ },
  "lastSaved": "2025-01-15T15:30:00Z",
  "exists": true
}
```

### POST /api/project/localstorage

Save project to localStorage.

**Request:**
```json
{
  "project": { /* ProjectFile */ }
}
```

**Response:**
```json
{
  "success": true,
  "lastSaved": "2025-01-15T15:30:00Z"
}
```

### GET /api/project/localstorage/backup

Get backup project from localStorage.

**Response:**
```json
{
  "project": { /* ProjectFile */ },
  "lastSaved": "2025-01-15T14:00:00Z",
  "exists": true
}
```

## AI Assistant API Endpoints

### POST /api/ai/command

Execute an AI command using natural language.

**Request:**
```json
{
  "command": "Add a mountain range along the eastern edge",
  "context": {
    "zoneId": "zone-1",
    "layerId": "layer-mountains"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Added mountain range with 5 mountains along eastern edge",
  "operations": [
    {
      "type": "place_stamp",
      "stampId": "stamp-1",
      "result": "success"
    }
  ],
  "preview": {
    "url": "/preview/latest",
    "updated": true
  },
  "suggestions": [
    "Add roads connecting the mountains",
    "Place a settlement near the mountains"
  ]
}
```

### GET /api/ai/context

Get current AI context (project state, active zone/layer, history).

**Response:**
```json
{
  "project": { /* ProjectFile */ },
  "activeZone": { /* Zone */ },
  "activeLayer": { /* Layer */ },
  "history": [
    {
      "command": "Add a lake",
      "timestamp": "2025-01-15T10:00:00Z",
      "result": "success"
    }
  ],
  "availableTools": [ /* List of available tools */ ]
}
```

### WebSocket /api/ai/stream

Real-time AI operation updates via WebSocket.

**Message Types:**
```json
{
  "type": "operation_start",
  "operation": "place_stamp",
  "data": { /* operation data */ }
}

{
  "type": "operation_progress",
  "progress": 50,
  "message": "Placing stamps..."
}

{
  "type": "operation_complete",
  "result": { /* operation result */ },
  "preview": { /* preview data */ }
}
```

### POST /api/ai/undo

Undo last AI operation.

**Response:**
```json
{
  "success": true,
  "undone": {
    "command": "Add a lake",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

### POST /api/ai/redo

Redo last undone operation.

**Response:**
```json
{
  "success": true,
  "redone": {
    "command": "Add a lake",
    "timestamp": "2025-01-15T10:00:00Z"
  }
}
```

