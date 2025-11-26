# Implement Procedural Mask Generation

## Why

Automatic mask generation based on terrain analysis saves time and ensures consistency. Procedural masks enable:

- Automatic material blending in Unreal Engine
- Intelligent vegetation placement
- Gameplay area identification
- Reduced manual mask painting

## What Changes

1. **Analysis maps**: Slope, curvature, aspect, flow, exposure
2. **Derived masks**: Cliff, plateau, valley, ridge, wetland, erosion
3. **Custom expressions**: Combine masks with expressions
4. **Mask operations**: Union, intersection, blur, dilate, erode

## Impact

- **Export**: Additional mask outputs
- **Material System**: Better auto-material support
- **PCG**: Improved vegetation placement data

## Dependencies

- Core grid system (implemented)
- Export system (planned)

## Deliverables

- `src/masks/` directory with mask generators
- Unit tests with ≥95% coverage
- Documentation updates

