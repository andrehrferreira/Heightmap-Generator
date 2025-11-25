# Layer System Specification

## ADDED Requirements

### Requirement: Layer Data Structure
The system SHALL provide Layer interface with id, name, type, visible, opacity, locked, color, data, blendMode, and stamps.

#### Scenario: Layer Creation
Given a layer is created
When setting layer properties
Then the layer SHALL store id (unique identifier)
And the layer SHALL store name (display name)
And the layer SHALL store type (RIVERS, LAKES, MOUNTAINS, CANYONS, ROADS, CUSTOM)
And the layer SHALL store visible (boolean)
And the layer SHALL store opacity (0.0-1.0)
And the layer SHALL store locked (boolean)
And the layer SHALL store color (RGB for identification)
And the layer SHALL store data (LayerData grid)
And the layer SHALL store blendMode (normal, add, multiply, overlay, replace)
And the layer SHALL store stamps (array of Stamp objects)

### Requirement: Layer Stack Management
The system SHALL manage a stack of layers with ordering and active layer selection.

#### Scenario: Layer Stack Operations
Given a layer stack
When adding a layer
Then the layer SHALL be added to the stack
And the layer SHALL be ordered (bottom to top)
When reordering layers
Then the layer order SHALL be updated
And the composition SHALL reflect new order
When selecting active layer
Then the activeLayerId SHALL be set
And only active layer SHALL be editable

### Requirement: Stamp System
The system SHALL support manual stamp placement on layers for terrain features.

#### Scenario: Stamp Placement
Given a layer and stamp data
When placing a stamp
Then the stamp SHALL be added to the layer's stamps array
And the stamp SHALL affect the layer's data grid
And the stamp SHALL be visible in preview

### Requirement: Layer Blending
The system SHALL blend layers using specified blend modes for final composition.

#### Scenario: Layer Blending
Given multiple layers with different blend modes
When composing final heightmap
Then the system SHALL apply blend mode to each layer
And the final composition SHALL reflect all visible layers
And the bottom layer SHALL be base terrain
And top layers SHALL override bottom layers

