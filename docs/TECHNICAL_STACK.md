# Technical Stack

## Core Generator

### Language: TypeScript (Node.js)

**Rationale:**
- Fast iteration and development
- Easy PNG/JSON generation
- Easy integration with web UI (Three.js)
- Strong type safety for complex data structures
- Rich ecosystem for image processing and pathfinding

### Key Dependencies

#### Image Processing
- `sharp`: High-performance image processing (PNG generation, resizing)
- `pngjs`: PNG encoding/decoding for custom formats

#### Pathfinding & Graph Algorithms
- `astar-typescript`: A* pathfinding implementation
- Custom MST (Minimum Spanning Tree) implementation
- Custom Douglas-Peucker line simplification

#### Noise Generation
- `simplex-noise`: Simplex noise for terrain variation
- `fastnoisejs`: Fast noise generation (Perlin, Value, etc.)

#### AI Integration
- `deepseek-chat`: DeepSeek Chat API client for AI assistant
- Custom tool registry for AI operations
- WebSocket support for real-time AI updates

#### Data Structures
- Native TypeScript/JavaScript arrays for grid storage
- Typed arrays (Float32Array, Uint16Array) for performance

## Web Interface

### Frontend Framework
- **Three.js**: 3D/2.5D visualization
- **React** (optional): UI component framework
- **TypeScript**: Type-safe frontend code

### Backend API
- **Express.js** or **Fastify**: REST API server
- **WebSocket** (optional): Real-time progress updates

### Preview Rendering
- **Three.js** with:
  - Plane geometry for heightmap
  - Shader materials for color mapping
  - OrbitControls for camera manipulation
  - Light sources for depth perception

## Project Structure

```
heightmap-generator/
├── src/
│   ├── core/
│   │   ├── grid.ts              # Grid data structures
│   │   ├── cell.ts              # Cell types and flags
│   │   └── level.ts             # Level system
│   ├── phases/
│   │   ├── phase1-levels.ts    # Phase 1: Level grid
│   │   ├── phase2-roads.ts     # Phase 2: Road generation
│   │   ├── phase3-heightmap.ts  # Phase 3: Height calculation
│   │   └── phase4-export.ts     # Phase 4: Export
│   ├── algorithms/
│   │   ├── astar.ts             # A* pathfinding
│   │   ├── mst.ts               # Minimum Spanning Tree
│   │   ├── douglas-peucker.ts  # Line simplification
│   │   └── noise.ts             # Noise generation
│   ├── ai/
│   │   ├── assistant.ts         # AI Assistant main class
│   │   ├── deepseek-client.ts   # DeepSeek Chat client
│   │   ├── tool-registry.ts     # AI tool registry
│   │   ├── command-parser.ts    # Command parsing
│   │   ├── context-manager.ts   # AI context management
│   │   └── safety-validator.ts # Operation validation
│   ├── export/
│   │   ├── png.ts               # PNG export
│   │   ├── r16.ts               # Raw 16-bit export
│   │   └── metadata.ts          # Metadata generation
│   └── api/
│       ├── server.ts            # Express/Fastify server
│       ├── routes.ts            # API routes
│       ├── ai-routes.ts         # AI API routes
│       └── websocket.ts         # WebSocket handlers (AI streaming)
├── web/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ConfigPanel.tsx
│   │   │   ├── PreviewPanel.tsx
│   │   │   └── StatusPanel.tsx
│   │   ├── preview/
│   │   │   ├── renderer.ts      # Three.js setup
│   │   │   └── controls.ts      # Camera controls
│   │   └── api/
│   │       └── client.ts        # API client
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                        # Documentation
└── package.json
```

## Development Tools

### Build & Bundling
- **TypeScript Compiler**: Type checking and compilation
- **ts-node**: Direct TypeScript execution
- **esbuild** or **tsup**: Fast bundling for production

### Testing
- **Jest**: Unit and integration tests
- **Playwright**: E2E tests for web interface
- Target: 95%+ code coverage

### Code Quality
- **ESLint**: Linting
- **Prettier**: Code formatting
- **TypeScript strict mode**: Maximum type safety

### Package Management
- **npm** or **pnpm**: Dependency management

## Performance Considerations

### Grid Operations
- Use typed arrays (Float32Array, Uint16Array) for large grids
- Batch operations where possible
- Minimize memory allocations in hot paths

### Pathfinding
- Optimize A* with efficient heuristics
- Cache pathfinding results when possible
- Limit search radius for large maps

### Export
- Stream large files instead of loading into memory
- Use worker threads for heavy computations
- Progressive export for web interface

## Deployment

### Development
- Local Node.js server
- Hot reload for web interface
- Direct file system access for exports

### Production
- Node.js server (Express/Fastify)
- Static file serving for web interface
- Cloud storage for generated files (optional)
- Job queue for long-running generations (optional)

