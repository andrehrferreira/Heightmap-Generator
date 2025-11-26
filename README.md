# Heightmap Generator

A procedural heightmap generator for MMO/PvP games, designed for Unreal Engine integration. Generates terrain with multi-level systems, road networks, water features, and terrain variations.

**Procedural Generation Focus**: The system prioritizes procedural generation with minimal manual intervention, while allowing manual overrides when needed. Supports both single large maps and multiple connected maps with harmonic transitions.

## Features

- **Multi-level terrain system**: Generate terrain with multiple height levels (underground, ground, plateaus, background)
- **Road network generation**: Automatic road generation connecting Points of Interest with ramps between levels
- **Water features**: Rivers and lakes with configurable parameters
- **Terrain features**: Mountains, canyons, and other terrain variations
- **Biome support**: Multiple biome types (desert, forest, tundra, canyon, mountain, plains)
- **Layer system**: Photoshop-like layers for organizing terrain features (rivers, lakes, mountains, canyons, roads)
- **Stamp system**: Manual placement of terrain features in specific areas
- **Multi-map support**: Work with multiple interconnected zones (e.g., 20 zones) in a single world
- **Zone visibility**: Hide/show zones for performance optimization
- **Color identification**: Solid color painting for easy visual identification of features
- **Progressive slope system**: Ramps with gentle start to near-vertical end to prevent climbing
- **Boundary system**: Configurable boundaries (edge, interior, ocean) for map limits and blocking zones
- **Harmonic map connections**: Support for single large maps or multiple connected maps via teleports
- **Procedural generation**: Minimal manual intervention with optional manual overrides
- **AI Assistant**: DeepSeek Chat-powered AI with full system access for natural language map editing
- **Project persistence**: Save/load projects as JSON files with all layers and zones
- **Auto-save**: Automatic localStorage persistence to prevent data loss
- **Web interface**: Configure and preview heightmaps in 2.5D
- **Unreal Engine export**: Export heightmaps and masks compatible with Unreal Landscape

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Documentation

### Core Systems
- [Architecture](docs/ARCHITECTURE.md) - System architecture and mental model
- [Generation Pipeline](docs/GENERATION_PIPELINE.md) - 4-phase generation process
- [Layer System](docs/LAYER_SYSTEM.md) - Photoshop-like layer system for terrain features
- [Multi-Map System](docs/MULTI_MAP_SYSTEM.md) - Multi-zone world management
- [Slope System](docs/SLOPE_SYSTEM.md) - Progressive slope system for level transitions

### Terrain Generation
- [Noise System](docs/NOISE_SYSTEM.md) - Advanced noise algorithms and layering
- [Terrain Filters](docs/TERRAIN_FILTERS.md) - Post-processing filters (erosion, blur, terrace)
- [Procedural Masks](docs/PROCEDURAL_MASKS.md) - Automatic mask generation from terrain analysis
- [Spline Features](docs/SPLINE_FEATURES.md) - Spline-based roads, rivers, and ridges

### Tools & Editing
- [Sculpting Tools](docs/SCULPTING_TOOLS.md) - Real-time terrain sculpting brushes
- [Stamp Library](docs/STAMP_LIBRARY.md) - Reusable terrain stamps and scatter placement
- [Heightmap Import](docs/HEIGHTMAP_IMPORT.md) - Import and blend external heightmaps

### Features
- [Underwater & Mountains](docs/UNDERWATER_AND_MOUNTAINS.md) - Underwater gameplay and mountain peaks
- [Boundaries & Blocking](docs/BOUNDARIES_AND_BLOCKING.md) - Boundary system and blocking zones
- [Navigation & Collision](docs/NAVIGATION_AND_COLLISION.md) - Navigation maps and collision generation

### Export & Integration
- [Export Format](docs/EXPORT_FORMAT.md) - Export format specifications
- [Multi-Resolution Export](docs/MULTI_RESOLUTION_EXPORT.md) - Multiple resolutions and tiled export
- [Unreal Engine Workflow](docs/UNREAL_WORKFLOW.md) - Complete integration workflow for Unreal Engine

### Interface & Tools
- [Preview Navigation](docs/PREVIEW_NAVIGATION.md) - Camera controls and navigation for map preview
- [AI Assistant](docs/AI_ASSISTANT.md) - AI-powered map editing with DeepSeek Chat integration
- [Persistence](docs/PERSISTENCE.md) - Project save/load and localStorage auto-save
- [API Reference](docs/API.md) - Web interface API documentation

### Reference
- [Technical Stack](docs/TECHNICAL_STACK.md) - Technology choices and project structure
- [Albion Inspiration](docs/ALBION_INSPIRATION.md) - Insights from Albion Online's map design
- [ARK Inspiration](docs/ARK_INSPIRATION.md) - Insights from ARK's procedural generation
- [Dependencies Update](docs/DEPENDENCIES_UPDATE.md) - Dependencies review and update log

## Project Status

🚧 **In Development** - Core architecture and documentation phase

## License

[License information]

