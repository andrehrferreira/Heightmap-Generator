# Spline-Based Features

## Overview

Spline system for creating and editing linear features like roads, rivers, ridges, and valleys with precise control over path and width.

## Spline Types

### Feature Splines

| Type | Description | Affects Height | Affects Mask |
|------|-------------|----------------|--------------|
| Road | Flattened path | Yes (flatten) | roads_mask |
| River | Carved channel | Yes (lower) | water_mask |
| Ridge | Elevated line | Yes (raise) | level_mask |
| Valley | Depressed line | Yes (lower) | - |
| Wall | Vertical barrier | Yes (raise) | boundary_mask |
| Path | Minor trail | Minimal | roads_mask |

## Spline Structure

### Spline Definition

```typescript
interface Spline {
  id: string;
  name: string;
  type: SplineType;
  points: SplinePoint[];
  closed: boolean;          // Loop back to start
  
  // Display
  color: RGB;
  visible: boolean;
  locked: boolean;
  
  // Generation
  rasterized: boolean;
  rasterSettings: RasterSettings;
}

interface SplinePoint {
  position: Point2D;
  tangentIn: Vector2D;      // Incoming tangent
  tangentOut: Vector2D;     // Outgoing tangent
  
  // Per-point settings
  width?: number;           // Override width at point
  height?: number;          // Override height at point
  
  // Control
  tangentMode: TangentMode;
}

type TangentMode = 
  | 'auto'        // Smooth automatic tangents
  | 'aligned'     // In/out aligned but different lengths
  | 'free'        // Independent tangents
  | 'corner';     // Sharp corner (no curve)
```

### Spline Interpolation

```typescript
type SplineInterpolation = 
  | 'bezier'        // Cubic Bezier curves
  | 'catmull-rom'   // Catmull-Rom spline
  | 'b-spline'      // B-spline
  | 'linear';       // Straight segments
```

## Width Profile

Control width along the spline:

```typescript
interface WidthProfile {
  mode: 'constant' | 'variable' | 'curve';
  
  // Constant mode
  width?: number;
  
  // Variable mode (per-point)
  // Uses point.width values
  
  // Curve mode
  curve?: WidthCurve;
}

interface WidthCurve {
  points: CurvePoint[];     // Position along spline (0-1) -> width
  interpolation: 'linear' | 'smooth';
}

// Example: River that widens toward end
const riverWidth: WidthCurve = {
  points: [
    { t: 0.0, value: 5 },    // Start: 5 units wide
    { t: 0.5, value: 10 },   // Middle: 10 units
    { t: 1.0, value: 20 },   // End: 20 units (delta/outlet)
  ],
  interpolation: 'smooth',
};
```

## Height Profile

Control height/depth along the spline:

```typescript
interface HeightProfile {
  mode: 'terrain' | 'constant' | 'gradient' | 'curve';
  
  // Terrain mode: follow terrain with offset
  terrainOffset?: number;
  
  // Constant mode
  height?: number;
  
  // Gradient mode
  startHeight?: number;
  endHeight?: number;
  
  // Curve mode
  curve?: HeightCurve;
}
```

## Rasterization

### Raster Settings

```typescript
interface RasterSettings {
  // Resolution
  samplesPerUnit: number;   // Spline samples per cell
  
  // Cross-section
  crossSection: CrossSection;
  
  // Blending
  blendMode: 'replace' | 'add' | 'max' | 'min' | 'blend';
  blendStrength: number;
  
  // Falloff
  edgeFalloff: FalloffType;
  falloffWidth: number;     // Cells of falloff
}

interface CrossSection {
  type: 'flat' | 'rounded' | 'v-shape' | 'u-shape' | 'custom';
  
  // For custom profile
  customProfile?: ProfilePoint[];
}

interface ProfilePoint {
  offset: number;     // -1 to 1 (left edge to right edge)
  height: number;     // Height relative to center
}
```

### Road Cross-Section

```typescript
const roadCrossSection: CrossSection = {
  type: 'flat',
  // Flat top with slight camber
  customProfile: [
    { offset: -1.0, height: -0.1 },  // Left edge (shoulder)
    { offset: -0.8, height: 0 },     // Left road edge
    { offset: 0, height: 0.02 },     // Center (slight crown)
    { offset: 0.8, height: 0 },      // Right road edge
    { offset: 1.0, height: -0.1 },   // Right edge (shoulder)
  ],
};
```

### River Cross-Section

```typescript
const riverCrossSection: CrossSection = {
  type: 'u-shape',
  // Deep center, gradual banks
  customProfile: [
    { offset: -1.0, height: 0 },     // Left bank top
    { offset: -0.7, height: -0.3 },  // Left bank slope
    { offset: -0.3, height: -1.0 },  // Left deep area
    { offset: 0, height: -1.2 },     // Center (deepest)
    { offset: 0.3, height: -1.0 },   // Right deep area
    { offset: 0.7, height: -0.3 },   // Right bank slope
    { offset: 1.0, height: 0 },      // Right bank top
  ],
};
```

## Editing Operations

### Point Operations

```typescript
interface SplinePointOperations {
  addPoint(spline: Spline, position: Point2D, index?: number): void;
  removePoint(spline: Spline, index: number): void;
  movePoint(spline: Spline, index: number, position: Point2D): void;
  
  // Tangent editing
  setTangentIn(spline: Spline, index: number, tangent: Vector2D): void;
  setTangentOut(spline: Spline, index: number, tangent: Vector2D): void;
  setTangentMode(spline: Spline, index: number, mode: TangentMode): void;
}
```

### Spline Operations

```typescript
interface SplineOperations {
  // Creation
  createSpline(type: SplineType, points: Point2D[]): Spline;
  duplicateSpline(spline: Spline): Spline;
  
  // Modification
  reverseSpline(spline: Spline): void;
  closeSpline(spline: Spline): void;
  openSpline(spline: Spline): void;
  
  // Splitting and joining
  splitSpline(spline: Spline, t: number): [Spline, Spline];
  joinSplines(splineA: Spline, splineB: Spline): Spline;
  
  // Simplification
  simplifySpline(spline: Spline, tolerance: number): void;
  smoothSpline(spline: Spline, iterations: number): void;
  
  // Subdivision
  subdivideSpline(spline: Spline, segments: number): void;
}
```

## Spline Tools (UI)

### Draw Tool

- Click to add points
- Drag to set tangent
- Double-click to finish
- Escape to cancel

### Edit Tool

- Click point to select
- Drag point to move
- Drag tangent handle to adjust
- Double-click point to change mode

### Width Tool

- Drag perpendicular to spline
- Sets width at nearest point
- Shift+drag for uniform width

## Export Options

### For Unreal Engine

```typescript
interface SplineExport {
  // JSON format for Blueprint import
  json: {
    points: SplinePointData[];
    metadata: SplineMetadata;
  };
  
  // CSV format
  csv: {
    columns: ['x', 'y', 'width', 'height', 'tangentInX', 'tangentInY', 'tangentOutX', 'tangentOutY'];
  };
  
  // FBX format (as curve)
  fbx: {
    curveType: 'nurbs' | 'bezier';
  };
}

interface SplinePointData {
  position: { x: number; y: number; z: number };
  tangentIn: { x: number; y: number; z: number };
  tangentOut: { x: number; y: number; z: number };
  width: number;
  roll: number;   // For road banking
}
```

### Rasterized Output

Splines are rasterized to affect:
- Heightmap (terrain modification)
- Masks (road_mask, water_mask, etc.)
- Level IDs (for ramps)

## Integration

### With Road System

Roads from Phase 2 can be converted to editable splines:

```typescript
function roadToSpline(road: Road): Spline {
  return {
    type: 'road',
    points: road.path.map(p => createSplinePoint(p)),
    rasterSettings: {
      crossSection: { type: 'flat' },
      blendMode: 'replace',
    },
  };
}
```

### With Level System

Splines respect level transitions:

```typescript
interface SplineLevelIntegration {
  // Automatically create ramps between levels
  autoRamp: boolean;
  rampConfig: SlopeConfig;
  
  // Level at each point
  pointLevels: number[];    // Derived from terrain
}
```

## Performance

- Spline evaluation is cached
- Only re-rasterize on changes
- Use LOD for preview (fewer samples)
- Batch rasterization for multiple splines

