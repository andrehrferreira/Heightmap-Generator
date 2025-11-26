# Implement Spline-Based Features

## Why

Linear terrain features (roads, rivers, ridges) require precise path control. Splines provide:

- Smooth, controllable curves for natural-looking features
- Per-point width and height control
- Easy editing with tangent handles
- Export to Unreal Engine spline actors

## What Changes

1. **Spline editing**: Bezier, Catmull-Rom, B-spline support
2. **Feature types**: Roads, rivers, ridges, valleys, walls
3. **Width/height profiles**: Variable width and depth along spline
4. **Rasterization**: Convert splines to grid modifications
5. **Export**: Export spline data for Unreal Engine

## Impact

- **Road System**: Replaces/enhances existing road generation
- **Web Interface**: New spline editing tools
- **Export**: Additional spline data export
- **Grid**: Spline rasterization affects terrain

## Dependencies

- Core grid system (implemented)
- Road network system (planned)
- Export system (planned)

## Deliverables

- `src/splines/` directory with spline implementations
- `web/src/tools/spline/` with UI components
- Unit tests with ≥95% coverage
- Documentation updates

