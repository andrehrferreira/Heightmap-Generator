# Web Interface API Specification

## ADDED Requirements

### Requirement: REST API Server
The system SHALL provide a REST API server (Express.js or Fastify) with endpoints for generation, status, preview, layers, stamps, multi-map, persistence, AI commands, and camera controls.

#### Scenario: API Server Startup
Given the server is started
When accessing the API
Then the server SHALL respond to HTTP requests
And the server SHALL provide all required endpoints

### Requirement: Generation Endpoints
The system SHALL provide endpoints for starting generation, checking status, and retrieving results.

#### Scenario: Start Generation
Given a generation configuration
When POST /api/generate is called
Then the system SHALL start generation process
And the system SHALL return job ID
And the system SHALL return status endpoint

### Requirement: Preview Endpoints
The system SHALL provide endpoints for preview data and camera controls.

#### Scenario: Get Preview Data
Given a generated heightmap
When GET /api/preview is called
Then the system SHALL return preview data (heightmap, masks, layers)
And the data SHALL be in format suitable for Three.js rendering

### Requirement: Layer Management Endpoints
The system SHALL provide endpoints for creating, updating, deleting, and reordering layers.

#### Scenario: Create Layer
Given layer data
When POST /api/layers is called
Then the system SHALL create a new layer
And the system SHALL return layer ID
And the layer SHALL be added to layer stack

### Requirement: AI Assistant Endpoints
The system SHALL provide endpoints for AI assistant commands.

#### Scenario: AI Command
Given an AI command
When POST /api/ai/command is called
Then the system SHALL process the command
And the system SHALL return job ID
And the system SHALL execute the command using AI assistant

