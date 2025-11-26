# Proposal: Improve Heightmap Quality

## Why

The current heightmap generator produces terrain with visible quality issues when compared to professional tools like Nano Banana. The main problems include:

1. **Discrete/Flat Levels** - Terrain appears as "stair steps" instead of smooth gradients
2. **Lack of Micro-Details** - Surfaces are too smooth without fine-scale variation
3. **Artificial Boundaries** - Transitions between levels look unnatural
4. **No Erosion Simulation** - Missing water and thermal erosion effects that create realistic valleys and ridges
5. **Simple Noise** - Only basic FBM noise is used, lacking advanced noise techniques

These issues make the generated heightmaps unsuitable for professional game development and realistic terrain visualization. Implementing erosion simulation and advanced noise techniques will significantly improve visual quality and realism.

## What Changes

### Phase 1: Continuous Height Base
- Remove discrete level quantization
- Implement smooth gradient blending between regions
- Use continuous height values without stepping

### Phase 2: Advanced Noise System
- Add ridged multifractal noise
- Implement billow noise
- Add multi-pass domain warping
- Integrate Voronoi noise for geological features

### Phase 3: Erosion Simulation
- Implement hydraulic erosion (rain/river simulation)
- Add thermal erosion (talus/slope collapse)
- Create sediment transport and deposition system

### Phase 4: Detail Enhancement
- Add micro-noise overlay at multiple scales
- Implement coastal weathering effects
- Create river bed carving system

## Impact

- Affected specs: terrain-generation, gpu-terrain
- Affected code: `GPUTerrainGenerator.ts`, `GeneratorContext.tsx`, shader files
- Breaking change: NO (additive feature)
- User benefit: Professional-quality heightmaps comparable to industry tools
