# Core Generator Specification

## ADDED Requirements

### Requirement: Grid Data Structure
The system SHALL provide a 2D grid data structure to represent the heightmap with cells containing levelId, height, and flags.

#### Scenario: Grid Initialization
Given a map size and cell size
When the grid is initialized
Then the grid SHALL have the correct dimensions (rows = mapSize.height / cellSize, cols = mapSize.width / cellSize)
And each cell SHALL have default values (levelId = 0, height = 0, flags = empty)

#### Scenario: Cell Access
Given an initialized grid
When accessing a cell at coordinates (x, y)
Then the system SHALL return the cell at that position
And the system SHALL validate coordinates are within grid bounds

### Requirement: Cell Interface
The system SHALL define a Cell interface with levelId, height, flags, and optional roadId.

#### Scenario: Cell Creation
Given a cell is created
When setting cell properties
Then the cell SHALL store levelId (number)
And the cell SHALL store height (number in Unreal units)
And the cell SHALL store flags (CellFlags object)
And the cell MAY store roadId (optional number)

### Requirement: Cell Flags
The system SHALL define CellFlags interface with all feature flags (road, ramp, water, underwater, blocked, cliff, playable, visualOnly, boundary).

#### Scenario: Flag Setting
Given a cell
When setting a flag (e.g., road = true)
Then the cell SHALL store the flag value
And other flags SHALL remain unchanged

### Requirement: Level System
The system SHALL calculate base heights from levelId with a maximum height difference constraint of 1.5x character height.

#### Scenario: Base Height Calculation
Given a levelId
When calculating base height
Then the system SHALL return levelId * MAX_HEIGHT_DIFFERENCE
And the result SHALL be in Unreal units

#### Scenario: Height Difference Validation
Given two levelIds (levelA and levelB)
When validating height difference
Then the system SHALL calculate abs(baseHeight[levelB] - baseHeight[levelA])
And the system SHALL return true if difference ≤ MAX_HEIGHT_DIFFERENCE
And the system SHALL return false if difference > MAX_HEIGHT_DIFFERENCE

### Requirement: Underwater Level Support
The system SHALL support negative levelIds for underwater gameplay areas.

#### Scenario: Underwater Level Creation
Given a negative levelId (e.g., -1, -2, -3)
When calculating base height
Then the system SHALL return a negative height value
And the cell SHALL have underwater flag set to true

### Requirement: Mountain Peak Support
The system SHALL support levels above maximum walkable level for visual-only mountain peaks.

#### Scenario: Mountain Peak Creation
Given a levelId above maximum walkable level
When creating a cell at that level
Then the cell SHALL have visualOnly flag set to true
And the cell SHALL have playable flag set to false

### Requirement: Grid Performance
The system SHALL use typed arrays (Float32Array, Uint16Array) for efficient memory usage in large grids.

#### Scenario: Large Grid Creation
Given a large map size (e.g., 2048x2048)
When initializing the grid
Then the system SHALL use typed arrays for height and levelId storage
And memory usage SHALL be optimized for large grids

