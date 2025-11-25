# Road Network Generation Specification

## ADDED Requirements

### Requirement: POI System
The system SHALL define Points of Interest (POIs) with position, levelId, and type for road network generation.

#### Scenario: POI Creation
Given a POI is created
When setting POI properties
Then the POI SHALL store x and y coordinates
And the POI SHALL store levelId
And the POI SHALL store type (town, dungeon, exit, portal)

### Requirement: Road Graph Generation
The system SHALL generate a road graph connecting POIs using Minimum Spanning Tree (MST) algorithm.

#### Scenario: MST Road Graph
Given a set of POI nodes
When generating road graph
Then the system SHALL use MST algorithm for basic connectivity
And the system MAY add extra edges for loops and alternate routes
And the graph SHALL connect all POIs

### Requirement: A* Pathfinding
The system SHALL use A* pathfinding algorithm to find optimal road paths on the grid.

#### Scenario: A* Pathfinding
Given two POI nodes on the grid
When finding path between them
Then the system SHALL use A* algorithm
And the path SHALL have low cost on flat cells
And the path SHALL have high cost for tight curves
And the path SHALL have very high cost for changing levelId (except ramps)

### Requirement: Ramp Generation
The system SHALL generate ramps between levels with progressive slopes and height difference validation.

#### Scenario: Ramp Creation
Given two POI nodes on different levels
When generating ramp between them
Then the system SHALL validate height difference does not exceed 1.5x character height
And the system SHALL calculate minimum transition length
And the system SHALL mark cells with ramp and road flags
And the system SHALL apply progressive slope (gentle start to near-vertical end)

#### Scenario: Height Difference Validation
Given two levels with height difference
When validating ramp creation
Then the system SHALL return false if difference > MAX_HEIGHT_DIFFERENCE
And the system SHALL return true if difference ≤ MAX_HEIGHT_DIFFERENCE

### Requirement: Road Simplification
The system SHALL simplify road paths using Douglas-Peucker algorithm and expand road width.

#### Scenario: Road Simplification
Given a road path from A* pathfinding
When simplifying the road
Then the system SHALL apply Douglas-Peucker algorithm
And the system SHALL expand road width using morphological dilation
And the road SHALL be smoother and cleaner

