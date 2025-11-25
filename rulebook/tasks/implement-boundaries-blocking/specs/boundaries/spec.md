# Boundaries and Blocking Zones Specification

## ADDED Requirements

### Requirement: Boundary Types
The system SHALL support multiple boundary types (edge, interior, ocean, custom).

#### Scenario: Edge Boundary
Given map configuration
When generating edge boundary
Then the system SHALL create boundary at map edges
And the boundary SHALL prevent player movement beyond map limits

#### Scenario: Ocean Boundary
Given ocean area
When generating ocean boundary
Then the system SHALL create boundary in middle of ocean
And the boundary SHALL prevent player movement
And the boundary MAY be invisible

### Requirement: Blocking Zones
The system SHALL support blocking zone placement with various shapes.

#### Scenario: Blocking Zone Placement
Given blocking zone data
When placing blocking zone
Then the system SHALL mark cells as blocked
And the zone SHALL prevent player movement
And the zone SHALL support various shapes (rectangle, circle, polygon)

### Requirement: Boundary Generation
The system SHALL support both procedural and manual boundary generation.

#### Scenario: Procedural Boundary
Given boundary configuration
When generating procedurally
Then the system SHALL generate boundaries based on config
And boundaries SHALL be validated

### Requirement: Export Integration
The system SHALL export boundary and blocking zone masks as part of Phase 4 export.

#### Scenario: Boundary Export
Given generated boundaries and blocking zones
When exporting
Then the system SHALL include boundary mask in export
And the system SHALL include blocking zones mask in export
And the system SHALL include boundaries.json with definitions

