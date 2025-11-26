# Implement Terrain Filters

## Why

Post-processing filters allow artists to refine generated terrain non-destructively. Filters enable:

- Natural terrain features through erosion simulation
- Stylized terrain with terracing and quantization
- Fine-tuning with blur, sharpen, levels adjustments
- Non-destructive workflow with filter stacks

## What Changes

1. **Filter system**: Non-destructive filter stack with masking
2. **Blur filters**: Gaussian, box, bilateral (edge-preserving)
3. **Detail filters**: Sharpen, high-pass, emboss
4. **Shape filters**: Terrace, quantize, clamp, normalize
5. **Erosion filters**: Hydraulic, thermal, wind erosion
6. **Adjustment filters**: Levels, curves, gamma

## Impact

- **Heightmap Generation**: Filters applied after noise/features
- **Preview**: Real-time filter preview
- **Export**: Filters baked into final export
- **Performance**: Heavy filters use Web Workers

## Dependencies

- Core grid system (implemented)
- Noise system (planned)

## Deliverables

- `src/filters/` directory with filter implementations
- Unit tests with ≥95% coverage
- Documentation updates

