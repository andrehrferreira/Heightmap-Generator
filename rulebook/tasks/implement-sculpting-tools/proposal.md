# Implement Terrain Sculpting Tools

## Why

Manual terrain editing is essential for fine-tuning procedurally generated terrain. Artists need to:

- Make precise adjustments to specific areas
- Fix issues that procedural generation can't handle
- Add artistic touches and unique features
- Iterate quickly on terrain design

## What Changes

1. **Brush system**: Multiple brush types (raise, lower, smooth, flatten, etc.)
2. **Brush settings**: Size, strength, falloff, spacing controls
3. **Constraints**: Height limits, feature protection, level constraints
4. **Tablet support**: Pressure and tilt sensitivity
5. **Undo integration**: Each stroke creates undo state

## Impact

- **Web Interface**: New sculpting toolbar and canvas interaction
- **Preview**: Real-time brush preview and application
- **Undo System**: Integration with undo/redo system
- **Grid**: Direct modification of grid cells

## Dependencies

- Core grid system (implemented)
- Web interface (partial)
- Preview renderer (partial)

## Deliverables

- `src/sculpting/` directory with brush implementations
- `web/src/tools/sculpting/` with UI components
- Unit tests with ≥95% coverage
- Documentation updates

