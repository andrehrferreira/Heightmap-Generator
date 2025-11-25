# AI Assistant System

## Overview

The system includes an integrated AI assistant powered by DeepSeek Chat that can perform any operation a human could do manually. The AI has full access to all system tools and can modify maps procedurally based on natural language commands.

## AI Capabilities

### Full System Access

The AI assistant has access to **all system capabilities**:

1. **Layer Management**
   - Create, delete, modify layers
   - Change layer properties (visibility, opacity, blend mode)
   - Reorder layers

2. **Stamp Placement**
   - Place stamps of any type (mountains, rivers, lakes, canyons, roads)
   - Modify stamp parameters
   - Remove stamps
   - Adjust stamp position, rotation, scale

3. **Manual Painting**
   - Paint on any layer
   - Erase from layers
   - Adjust brush size and intensity

4. **Boundary Management**
   - Create boundaries (edge, interior, ocean)
   - Modify boundary shapes
   - Remove boundaries
   - Configure blocking zones

5. **Zone Management**
   - Create, delete, modify zones
   - Connect zones
   - Adjust zone visibility
   - Set active zone

6. **Road Network**
   - Generate roads
   - Modify road paths
   - Add/remove roads
   - Adjust road width

7. **Water Features**
   - Add rivers and lakes
   - Modify water areas
   - Adjust water depth
   - Create underwater areas

8. **Terrain Features**
   - Add mountains, canyons
   - Modify terrain height
   - Adjust noise and variation

9. **Level Management**
   - Adjust level heights
   - Modify level distribution
   - Create new levels

10. **Export Operations**
    - Export heightmaps
    - Export masks
    - Generate previews

## AI Interface

### Natural Language Commands

```typescript
interface AICommand {
  command: string;              // Natural language command
  context?: {
    zoneId?: string;            // Target zone
    layerId?: string;           // Target layer
    position?: Point2D;         // Target position
  };
  parameters?: Record<string, any>; // Command parameters
}
```

### Example Commands

```typescript
// Layer operations
"Create a new mountain layer"
"Add a river layer and paint a river from point A to point B"
"Make the roads layer 50% transparent"
"Delete the custom layer"

// Stamp operations
"Place a mountain at coordinates (512, 512) with height 600"
"Add 5 lakes randomly distributed in the forest biome"
"Remove the canyon stamp at (256, 256)"
"Scale up the mountain at (400, 400) by 1.5x"

// Boundary operations
"Add a boundary in the middle of the ocean"
"Create an interior boundary separating zone A and zone B"
"Remove the boundary at the north edge"
"Make the ocean boundary invisible"

// Road operations
"Connect town A to town B with a road"
"Add a ramp between level 0 and level 1"
"Widen the road between point A and B to 12 units"
"Remove the road connecting zone 1 and zone 2"

// Water operations
"Add a river flowing from (100, 100) to (900, 900)"
"Create a lake at (500, 500) with radius 100"
"Deepen the water in the northern ocean area"
"Add underwater caves near the coast"

// Terrain operations
"Add a mountain range along the eastern edge"
"Create a canyon from (200, 200) to (800, 800)"
"Lower the terrain in the desert area"
"Increase noise variation in the forest biome"

// Zone operations
"Create a new zone called 'Desert Zone' at position (1024, 0)"
"Connect zone 1 to zone 2 with a teleport"
"Hide zone 5 for performance"
"Set zone 3 as the active zone"

// Complex operations
"Generate a complete map with 3 zones, 10 roads, 5 rivers, and 2 lakes"
"Add a mountain pass connecting the two valleys"
"Create a coastal area with beaches and underwater reefs"
"Design a city layout with roads connecting all districts"
```

## AI System Architecture

### DeepSeek Chat Integration

```typescript
interface AISystem {
  model: 'deepseek-chat';
  apiKey: string;
  context: AIContext;
  tools: AITool[];
}

interface AIContext {
  project: ProjectFile;
  activeZone: Zone | null;
  activeLayer: Layer | null;
  history: AICommandHistory[];
}

interface AITool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: any) => Promise<any>;
}
```

### Tool Registry

```typescript
const AI_TOOLS: AITool[] = [
  {
    name: 'create_layer',
    description: 'Create a new layer',
    parameters: [
      { name: 'name', type: 'string', required: true },
      { name: 'type', type: 'LayerType', required: true },
      { name: 'color', type: 'RGB', required: false },
    ],
    execute: async (params) => {
      return await layerManager.createLayer(params);
    },
  },
  {
    name: 'place_stamp',
    description: 'Place a stamp on a layer',
    parameters: [
      { name: 'layerId', type: 'string', required: true },
      { name: 'type', type: 'StampType', required: true },
      { name: 'position', type: 'Point2D', required: true },
      { name: 'parameters', type: 'StampParameters', required: false },
    ],
    execute: async (params) => {
      return await stampManager.addStamp(params);
    },
  },
  {
    name: 'paint_layer',
    description: 'Paint on a layer',
    parameters: [
      { name: 'layerId', type: 'string', required: true },
      { name: 'position', type: 'Point2D', required: true },
      { name: 'radius', type: 'number', required: true },
      { name: 'intensity', type: 'number', required: true },
    ],
    execute: async (params) => {
      return await layerManager.paint(params);
    },
  },
  {
    name: 'create_boundary',
    description: 'Create a boundary',
    parameters: [
      { name: 'type', type: 'BoundaryType', required: true },
      { name: 'shape', type: 'BoundaryShape', required: true },
      { name: 'blocking', type: 'boolean', required: false },
    ],
    execute: async (params) => {
      return await boundaryManager.createBoundary(params);
    },
  },
  {
    name: 'generate_roads',
    description: 'Generate road network',
    parameters: [
      { name: 'pois', type: 'POINode[]', required: true },
      { name: 'count', type: 'number', required: false },
    ],
    execute: async (params) => {
      return await roadGenerator.generate(params);
    },
  },
  // ... all other tools
];
```

## AI Command Processing

### Command Parsing

```typescript
class AIAssistant {
  private deepseek: DeepSeekClient;
  private toolRegistry: ToolRegistry;
  private context: AIContext;
  
  async processCommand(command: string): Promise<AIResponse> {
    // Parse command using DeepSeek Chat
    const parsed = await this.deepseek.parseCommand(command, {
      tools: this.toolRegistry.getAll(),
      context: this.context,
    });
    
    // Execute tool calls
    const results = await this.executeTools(parsed.toolCalls);
    
    // Update context
    this.updateContext(results);
    
    // Generate response
    return {
      success: true,
      message: `Executed: ${command}`,
      results: results,
      preview: await this.generatePreview(),
    };
  }
  
  private async executeTools(toolCalls: ToolCall[]): Promise<any[]> {
    const results = [];
    
    for (const call of toolCalls) {
      const tool = this.toolRegistry.get(call.name);
      const result = await tool.execute(call.parameters);
      results.push(result);
    }
    
    return results;
  }
}
```

### Context Management

```typescript
class AIContextManager {
  private context: AIContext;
  
  updateContext(operation: AIOperation): void {
    // Update project state
    this.context.project = operation.result.project;
    
    // Update active zone/layer if changed
    if (operation.result.activeZone) {
      this.context.activeZone = operation.result.activeZone;
    }
    if (operation.result.activeLayer) {
      this.context.activeLayer = operation.result.activeLayer;
    }
    
    // Add to history
    this.context.history.push({
      command: operation.command,
      timestamp: Date.now(),
      result: operation.result,
    });
  }
  
  getContext(): AIContext {
    return {
      ...this.context,
      // Include relevant project state
      project: this.context.project,
      activeZone: this.context.activeZone,
      activeLayer: this.context.activeLayer,
      recentOperations: this.context.history.slice(-10),
    };
  }
}
```

## AI Workflow

### Step 1: User Command

User provides natural language command:
```
"Add a mountain range along the eastern edge of the map"
```

### Step 2: Command Parsing

AI parses command and identifies:
- Operation: Create stamps
- Type: Mountain
- Location: Eastern edge
- Pattern: Range (multiple mountains)

### Step 3: Tool Selection

AI selects appropriate tools:
- `get_map_bounds()` - Get map boundaries
- `place_stamp()` - Place mountain stamps
- `calculate_range_pattern()` - Calculate mountain range pattern

### Step 4: Execution

AI executes tools:
```typescript
const bounds = await getMapBounds();
const easternEdge = calculateEasternEdge(bounds);
const mountains = generateMountainRange(easternEdge, {
  count: 5,
  spacing: 200,
  height: 600,
});

for (const mountain of mountains) {
  await placeStamp({
    layerId: 'mountains-layer',
    type: 'mountain',
    position: mountain.position,
    parameters: {
      height: mountain.height,
      baseRadius: 50,
    },
  });
}
```

### Step 5: Response

AI generates response with:
- Success confirmation
- What was done
- Preview update
- Suggestions for next steps

## AI Features

### Context Awareness

The AI understands:
- Current project state
- Active zone and layer
- Recent operations
- Map structure and features
- Biome and level information

### Multi-Step Operations

AI can execute complex multi-step operations:

```
"Create a coastal zone with beaches, underwater reefs, and a port city"
```

This would:
1. Create a new zone
2. Generate coastal terrain
3. Add beaches
4. Create underwater areas
5. Place port city stamps
6. Connect with roads

### Learning from History

AI learns from:
- Previous commands
- User preferences
- Successful operations
- Common patterns

### Validation and Safety

```typescript
class AISafetyValidator {
  validateOperation(operation: AIOperation): ValidationResult {
    // Check for destructive operations
    if (operation.isDestructive) {
      return {
        valid: false,
        requiresConfirmation: true,
        message: 'This operation will modify existing data. Continue?',
      };
    }
    
    // Validate parameters
    if (!this.validateParameters(operation)) {
      return {
        valid: false,
        message: 'Invalid parameters',
      };
    }
    
    return { valid: true };
  }
}
```

## API Integration

### AI Endpoints

```typescript
// POST /api/ai/command
interface AICommandRequest {
  command: string;
  context?: {
    zoneId?: string;
    layerId?: string;
  };
}

interface AICommandResponse {
  success: boolean;
  message: string;
  operations: AIOperation[];
  preview: PreviewData;
  suggestions?: string[];
}
```

### WebSocket for Real-time Updates

```typescript
// WebSocket connection for real-time AI updates
ws://api/ai/stream

// Messages
{
  type: 'operation_start',
  operation: 'place_stamp',
  data: { ... }
}

{
  type: 'operation_progress',
  progress: 50,
  message: 'Placing mountain stamps...'
}

{
  type: 'operation_complete',
  result: { ... },
  preview: { ... }
}
```

## UI Integration

### AI Chat Interface

```typescript
interface AIChatUI {
  // Chat input
  input: string;
  
  // Command history
  history: ChatMessage[];
  
  // Suggestions
  suggestions: string[];
  
  // Preview updates
  preview: PreviewData;
}
```

### Chat Message Types

```typescript
interface ChatMessage {
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  operations?: AIOperation[];
  preview?: PreviewData;
}
```

## Example Interactions

### Simple Command

**User**: "Add a lake at the center of the map"

**AI**: 
- Parses command
- Finds map center
- Places lake stamp
- Updates preview
- Responds: "Added a lake at (512, 512) with radius 100"

### Complex Command

**User**: "Create a mountain pass connecting the two valleys, with roads on both sides and a small settlement at the top"

**AI**:
- Identifies valleys
- Calculates pass location
- Creates mountain stamps
- Generates roads
- Places settlement stamp
- Updates preview
- Responds: "Created mountain pass with roads and settlement. The pass connects valley A and valley B at elevation 400."

### Iterative Refinement

**User**: "Make the lake bigger"

**AI**:
- Finds last lake created
- Scales up stamp
- Updates preview
- Responds: "Increased lake radius from 100 to 150"

**User**: "Add some islands in the lake"

**AI**:
- Finds lake
- Places island stamps inside lake
- Updates preview
- Responds: "Added 3 islands in the lake"

## Benefits

1. **Rapid Iteration**: Make changes quickly with natural language
2. **No Manual Work**: AI handles all operations
3. **Complex Operations**: Execute multi-step operations easily
4. **Learning**: AI learns from usage patterns
5. **Accessibility**: Non-technical users can modify maps
6. **Efficiency**: Faster than manual editing
7. **Consistency**: AI follows system rules and constraints

## Future Enhancements

1. **Visual Selection**: "Select this area" + command
2. **Undo/Redo**: AI-managed operation history
3. **Batch Operations**: "Apply this to all zones"
4. **Template Commands**: Save and reuse command patterns
5. **AI Suggestions**: Proactive suggestions based on map state
6. **Multi-language Support**: Commands in different languages



