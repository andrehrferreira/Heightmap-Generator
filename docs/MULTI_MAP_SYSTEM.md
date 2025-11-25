# Multi-Map System

## Overview

The system supports working with multiple interconnected maps (zones) simultaneously. This allows creating large world maps divided into manageable zones (e.g., 20 zones) that can be edited independently while maintaining connectivity.

**Flexible Map Architecture**: The system supports both:
- **Single large map**: One continuous map with edge boundaries
- **Multiple connected maps**: Smaller maps connected via teleports or seamless transitions

**Harmonic Connections**: Maps can connect harmonically through seamless transitions or teleports, with boundaries defining playable areas. See [Boundaries and Blocking](BOUNDARIES_AND_BLOCKING.md) for detailed boundary system documentation.

## Zone Structure

### Zone Definition

```typescript
interface Zone {
  id: string;                    // Unique zone identifier
  name: string;                  // Display name
  position: { x: number; y: number };  // Position in world space
  size: { width: number; height: number };  // Zone dimensions
  visible: boolean;              // Visibility for performance
  locked: boolean;               // Prevent editing
  layers: LayerStack;           // Zone's layer stack
  connections: ZoneConnection[]; // Connections to other zones
  metadata: ZoneMetadata;
}

interface ZoneMetadata {
  biome: BiomeType;
  level: number;                 // Zone level (for organization)
  tags: string[];                // Tags for filtering/searching
  notes: string;                // User notes
}
```

### Zone Connection

Zones can be connected to create seamless transitions:

```typescript
interface ZoneConnection {
  id: string;
  zoneA: string;                // Zone ID
  zoneB: string;                // Zone ID
  edgeA: Edge;                  // Connection edge on zone A
  edgeB: Edge;                  // Connection edge on zone B
  type: ConnectionType;
  parameters: ConnectionParameters;
}

enum ConnectionType {
  SEAMLESS = 'seamless',        // Seamless height/terrain transition
  PORTAL = 'portal',            // Portal/teleporter connection
  TELEPORT = 'teleport',        // Teleport connection (for multiple maps)
  RAMP = 'ramp',                // Ramp connection between levels
  BRIDGE = 'bridge',            // Bridge connection
  BLOCKED = 'blocked',          // Blocked connection (boundary)
}

interface Edge {
  side: 'north' | 'south' | 'east' | 'west';
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

interface ConnectionParameters {
  transitionWidth: number;      // Transition width in cells
  heightOffset?: number;        // Height offset between zones
  roadConnection?: boolean;     // Whether roads connect
  waterConnection?: boolean;    // Whether water connects
}
```

## World Map

### World Structure

```typescript
interface WorldMap {
  id: string;
  name: string;
  zones: Zone[];
  worldSize: { width: number; height: number };
  cellSize: number;
  grid: WorldGrid;              // Combined grid for all zones
  metadata: WorldMetadata;
}

interface WorldGrid {
  width: number;
  height: number;
  zones: Map<string, ZoneGrid>;  // Per-zone grids
  connections: ZoneConnection[];
}

interface ZoneGrid {
  zoneId: string;
  offsetX: number;              // Offset in world space
  offsetY: number;
  data: GridData;
}
```

### Zone Layout

Zones are arranged in a grid or free-form layout:

```typescript
interface ZoneLayout {
  type: 'grid' | 'freeform';
  gridConfig?: {
    columns: number;
    rows: number;
    spacing: number;
  };
  zones: ZonePlacement[];
}

interface ZonePlacement {
  zoneId: string;
  gridX: number;               // Grid position (for grid layout)
  gridY: number;
  worldX: number;              // World position (for freeform)
  worldY: number;
}
```

## Zone Management

### Zone Operations

```typescript
interface ZoneOperations {
  createZone(name: string, size: { width: number; height: number }): Zone;
  deleteZone(zoneId: string): void;
  duplicateZone(zoneId: string): Zone;
  resizeZone(zoneId: string, newSize: { width: number; height: number }): void;
  moveZone(zoneId: string, newPosition: { x: number; y: number }): void;
  connectZones(zoneA: string, zoneB: string, edgeA: Edge, edgeB: Edge): ZoneConnection;
  disconnectZones(connectionId: string): void;
}
```

### Zone Visibility

For performance, zones can be hidden:

```typescript
interface ZoneVisibility {
  showZone(zoneId: string): void;
  hideZone(zoneId: string): void;
  showAllZones(): void;
  hideAllZones(): void;
  showOnlyVisible(zoneIds: string[]): void;  // Show only specified zones
  setVisibilityMode(mode: VisibilityMode): void;
}

enum VisibilityMode {
  ALL = 'all',                  // Show all zones
  SELECTED = 'selected',        // Show only selected zones
  NEARBY = 'nearby',            // Show zones within radius
  LEVEL = 'level',              // Show zones by level/tier
}
```

### Zone Loading

Zones are loaded on-demand for performance:

```typescript
interface ZoneLoading {
  loadZone(zoneId: string): Promise<Zone>;
  unloadZone(zoneId: string): void;
  preloadZones(zoneIds: string[]): Promise<void>;
  getLoadedZones(): string[];
  isZoneLoaded(zoneId: string): boolean;
}
```

## Zone Editing

### Active Zone

Only one zone can be actively edited at a time:

```typescript
interface ZoneEditing {
  setActiveZone(zoneId: string): void;
  getActiveZone(): Zone | null;
  editZone(zoneId: string, edits: ZoneEdits): void;
}
```

### Cross-Zone Editing

Some operations affect multiple zones:

```typescript
interface CrossZoneOperations {
  paintAcrossZones(zoneIds: string[], x: number, y: number, radius: number): void;
  connectRoadsAcrossZones(zoneIds: string[], path: Point[]): void;
  syncBiome(zoneIds: string[], biome: BiomeType): void;
}
```

## Zone Preview

### World View

- Overview of all zones
- Zone boundaries highlighted
- Connection lines between zones
- Zone names and metadata
- Selection and navigation

### Zone View

- Focused view of single zone
- Full editing capabilities
- Connection points visible
- Neighboring zones shown as outlines

### Multi-Zone View

- View multiple zones simultaneously
- Adjustable zoom and pan
- Zone visibility controls
- Cross-zone editing tools

## Zone Export

### Per-Zone Export

Each zone can be exported independently:

```typescript
interface ZoneExport {
  exportZone(zoneId: string): ExportData;
  exportZoneHeightmap(zoneId: string): ImageData;
  exportZoneMasks(zoneId: string): Record<string, ImageData>;
}
```

### Combined Export

Export all zones as a single combined map:

```typescript
interface CombinedExport {
  exportWorld(): ExportData;
  exportWorldHeightmap(): ImageData;
  exportWorldMasks(): Record<string, ImageData>;
  exportZonesSeparately(): Map<string, ExportData>;
}
```

### Export Options

```typescript
interface ExportOptions {
  includeHiddenZones: boolean;  // Include hidden zones in export
  zonePadding: number;          // Padding between zones
  seamless: boolean;            // Create seamless transitions
  resolution: number;           // Export resolution multiplier
}
```

## Performance Optimization

### Zone Culling

- Only render visible zones
- Unload zones outside viewport
- Use LOD (Level of Detail) for distant zones

### Lazy Loading

- Load zone data on-demand
- Cache frequently accessed zones
- Preload adjacent zones

### Memory Management

- Limit number of loaded zones
- Unload unused zones after timeout
- Compress zone data when not in use

## Zone Synchronization

### Connection Synchronization

When zones are connected, ensure seamless transitions:

```typescript
interface ConnectionSync {
  syncHeights(connection: ZoneConnection): void;
  syncRoads(connection: ZoneConnection): void;
  syncWater(connection: ZoneConnection): void;
  syncBiome(connection: ZoneConnection): void;
}
```

### Validation

Validate zone connections and consistency:

```typescript
interface ZoneValidation {
  validateConnection(connection: ZoneConnection): ValidationResult;
  validateZone(zone: Zone): ValidationResult;
  validateWorld(world: WorldMap): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
```

