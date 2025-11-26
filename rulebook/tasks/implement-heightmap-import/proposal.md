# Implement Heightmap Import and Blend

## Why

Importing external heightmaps enables hybrid workflows:

- Use real-world terrain data (DEM)
- Import hand-painted heightmaps from external tools
- Combine multiple heightmap sources
- Blend procedural with imported terrain

## What Changes

1. **Import formats**: PNG, TIFF, EXR, RAW, R16
2. **Blend system**: Multiple blend modes with masking
3. **Edge blending**: Seamless integration with terrain
4. **Import layers**: Non-destructive stacking
5. **Reference mode**: Visual reference without terrain modification

## Impact

- **Web Interface**: Import dialog and layer management
- **Grid System**: Height blending operations
- **Export**: Option to export original imports separately

## Dependencies

- Core grid system (implemented)
- Layer system (planned)

## Deliverables

- `src/import/` directory with import system
- Unit tests with ≥95% coverage
- Documentation updates

