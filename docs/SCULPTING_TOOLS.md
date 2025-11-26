# Terrain Sculpting Tools

## Overview

Real-time sculpting tools for manual terrain editing in the preview canvas. Allows precise control over terrain shape with various brush types and modes.

## Brush Types

### Height Modification

| Brush | Description | Hotkey |
|-------|-------------|--------|
| Raise | Increase terrain height | `B` |
| Lower | Decrease terrain height | `Shift+B` |
| Flatten | Level terrain to target height | `F` |
| Smooth | Average neighboring heights | `S` |
| Sharpen | Enhance height differences | `Shift+S` |

### Shape Modification

| Brush | Description | Hotkey |
|-------|-------------|--------|
| Pinch | Pull terrain toward brush center | `P` |
| Inflate | Push terrain outward | `I` |
| Twist | Rotate terrain around center | `T` |

### Detail Modification

| Brush | Description | Hotkey |
|-------|-------------|--------|
| Noise | Add random height variation | `N` |
| Erode | Simulate erosion effect | `E` |
| Clone | Copy terrain from source | `C` |

## Brush Configuration

### Basic Settings

```typescript
interface BrushSettings {
  size: number;           // Radius in cells (1-500)
  strength: number;       // Effect intensity (0.0-1.0)
  falloff: FalloffType;   // Edge softness
  spacing: number;        // Distance between samples (0.1-1.0)
}

type FalloffType = 
  | 'constant'  // Full strength everywhere
  | 'linear'    // Linear fade to edge
  | 'smooth'    // Smooth curve (default)
  | 'sharp'     // Quick falloff
  | 'gaussian'  // Bell curve
  | 'custom';   // Custom curve
```

### Custom Falloff Curve

```typescript
interface CustomFalloff {
  points: FalloffPoint[];   // Control points
  interpolation: 'linear' | 'cubic';
}

interface FalloffPoint {
  distance: number;   // 0.0 (center) to 1.0 (edge)
  strength: number;   // 0.0 to 1.0
}
```

## Brush Modes

### Additive Mode

Accumulates effect while holding mouse:

```typescript
interface AdditiveMode {
  type: 'additive';
  rate: number;         // Effect per second
  maxEffect: number;    // Maximum accumulated change
}
```

### Stamp Mode

Single application per click:

```typescript
interface StampMode {
  type: 'stamp';
  effect: number;       // Single application amount
}
```

### Stroke Mode

Continuous application along path:

```typescript
interface StrokeMode {
  type: 'stroke';
  spacing: number;      // Distance between applications
  jitter: number;       // Random position offset
}
```

## Constraints

### Height Constraints

```typescript
interface HeightConstraints {
  enabled: boolean;
  minHeight: number;        // Cannot go below
  maxHeight: number;        // Cannot go above
  clampMode: 'hard' | 'soft';  // Hard stops vs gradual
}
```

### Feature Protection

Protect certain features from modification:

```typescript
interface FeatureProtection {
  roads: boolean;           // Protect road cells
  water: boolean;           // Protect water areas
  ramps: boolean;           // Protect ramps
  boundaries: boolean;      // Protect boundary zones
  
  protectionStrength: number;  // 0.0-1.0 (1.0 = full protection)
  featherDistance: number;     // Cells to feather protection
}
```

### Level Constraints

```typescript
interface LevelConstraints {
  maintainLevels: boolean;     // Try to keep level boundaries
  snapToLevel: boolean;        // Snap heights to level bases
  allowLevelChange: boolean;   // Can change cell level
}
```

## Specific Brush Behaviors

### Smooth Brush

```typescript
interface SmoothBrush {
  type: 'smooth';
  algorithm: 'average' | 'gaussian' | 'bilateral';
  kernelSize: number;       // Sampling area (3-15)
  preserveEdges: boolean;   // Bilateral smoothing
}
```

### Flatten Brush

```typescript
interface FlattenBrush {
  type: 'flatten';
  targetMode: 'click' | 'average' | 'custom';
  targetHeight?: number;    // Custom target height
  bidirectional: boolean;   // Both raise and lower
}
```

### Noise Brush

```typescript
interface NoiseBrush {
  type: 'noise';
  noiseType: NoiseType;
  frequency: number;
  amplitude: number;
  animated: boolean;        // Change noise over time
}
```

### Clone Brush

```typescript
interface CloneBrush {
  type: 'clone';
  sourcePosition: { x: number; y: number } | null;
  offset: { x: number; y: number };
  mirrorX: boolean;
  mirrorY: boolean;
  blendMode: 'replace' | 'add' | 'blend';
}
```

### Erode Brush

```typescript
interface ErodeBrush {
  type: 'erode';
  erosionType: 'hydraulic' | 'thermal' | 'wind';
  iterations: number;
  strength: number;
  sedimentDeposition: boolean;
}
```

## Tablet Support

### Pressure Sensitivity

```typescript
interface TabletSupport {
  pressureEnabled: boolean;
  pressureAffects: {
    size: boolean;          // Pressure controls size
    strength: boolean;      // Pressure controls strength
    opacity: boolean;       // Pressure controls opacity
  };
  pressureCurve: CurvePoints;   // Custom pressure response
}
```

### Tilt Support

```typescript
interface TiltSupport {
  tiltEnabled: boolean;
  tiltAffects: {
    angle: boolean;         // Tilt controls brush angle
    shape: boolean;         // Tilt elongates brush
  };
}
```

## Undo Integration

Each brush stroke creates an undo state:

```typescript
interface BrushStrokeRecord {
  brushType: BrushType;
  settings: BrushSettings;
  affectedCells: AffectedCell[];
  timestamp: number;
}

interface AffectedCell {
  x: number;
  y: number;
  previousHeight: number;
  newHeight: number;
  previousFlags?: CellFlags;
  newFlags?: CellFlags;
}
```

## Performance

### Optimization Strategies

- Only update affected cells
- Use spatial indexing for large brushes
- Debounce preview updates
- Web Worker for heavy operations (erode)

### Real-time Preview

```typescript
interface BrushPreview {
  showOutline: boolean;       // Brush boundary
  showFalloff: boolean;       // Falloff visualization
  showAffectedArea: boolean;  // Highlight affected cells
  previewMode: 'outline' | 'heatmap' | 'wireframe';
}
```

## UI Components

### Brush Toolbar

- Brush type selector (icons)
- Size slider (1-500)
- Strength slider (0-100%)
- Falloff dropdown
- Quick presets

### Settings Panel

- Advanced brush settings
- Constraints configuration
- Tablet settings
- Pressure curve editor

### Context Menu (Right-click)

- Quick brush switch
- Recent brushes
- Reset to defaults
- Save as preset

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `[` | Decrease brush size |
| `]` | Increase brush size |
| `Shift+[` | Decrease strength |
| `Shift+]` | Increase strength |
| `X` | Toggle additive/stamp mode |
| `Alt+Click` | Sample height (flatten) |
| `Ctrl+Click` | Set clone source |

