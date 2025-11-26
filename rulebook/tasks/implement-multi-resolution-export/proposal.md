# Implement Multi-Resolution Export

## Why

Different use cases require different export resolutions:

- Preview at low resolution for quick iteration
- Final export at high resolution for production
- Unreal Engine requires specific Landscape sizes
- World Composition needs tiled exports

## What Changes

1. **Resolution presets**: Preview, low, medium, high, ultra
2. **Unreal presets**: Landscape-compatible sizes
3. **Scaling algorithms**: Bilinear, bicubic, Lanczos
4. **Tiled export**: World Composition support
5. **Batch export**: Multiple resolutions at once

## Impact

- **Export System**: Enhanced resolution options
- **Web Interface**: Resolution selector in export dialog
- **Performance**: Optimized for large exports

## Dependencies

- Core grid system (implemented)
- Export system (planned)

## Deliverables

- `src/export/resolution/` with resolution handling
- Unit tests with ≥95% coverage
- Documentation updates

