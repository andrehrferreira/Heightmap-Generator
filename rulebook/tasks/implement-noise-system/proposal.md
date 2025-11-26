# Implement Advanced Noise System

## Why

The current terrain generation lacks variety and natural-looking features. An advanced noise system with multiple algorithms and layering capabilities will enable:

- More realistic terrain variations
- Artist control over terrain style
- Reproducible results with seeds
- Natural-looking features like ridges, valleys, and varied landscapes

## What Changes

1. **New noise algorithms**: Perlin, Simplex, Worley, Ridged, Billow, Domain Warp, FBM
2. **Noise layering system**: Stack and blend multiple noise layers
3. **Mask-based application**: Apply noise to specific areas
4. **Preset system**: Built-in presets for common terrain types
5. **Integration with grid system**: Apply noise during heightmap generation

## Impact

- **Grid System**: Will call noise system during Phase 3 (heightmap generation)
- **Preview**: Real-time noise preview in web interface
- **Export**: Noise affects final heightmap output
- **Performance**: Optimized with caching and Web Workers

## Dependencies

- Core grid system (implemented)
- Level system (implemented)

## Deliverables

- `src/noise/` directory with all noise algorithms
- Unit tests with ≥95% coverage
- Integration with existing Phase 3 pipeline
- Documentation updates

