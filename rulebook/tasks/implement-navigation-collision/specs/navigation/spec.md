# Navigation and Collision Maps Specification

## ADDED Requirements

### Requirement: Navigation Masks
The system SHALL generate navigation masks (walkable, swimmable, flyable, combined) for NavMesh generation.

#### Scenario: Walkable Mask Generation
Given a generated heightmap
When generating walkable mask
Then the system SHALL mark playable areas with appropriate slope
And the mask SHALL exclude blocked and cliff areas
And the mask SHALL be suitable for NavMesh generation

#### Scenario: Swimmable Mask Generation
Given a generated heightmap
When generating swimmable mask
Then the system SHALL mark water areas
And the mask SHALL be suitable for water NavMesh generation

### Requirement: Collision Map
The system SHALL generate collision map for automatic collision volume generation.

#### Scenario: Collision Map Generation
Given a generated heightmap
When generating collision map
Then the system SHALL mark collision areas
And the map SHALL include collision types (blocking, trigger, overlap)
And the map SHALL handle water collision

### Requirement: Export Integration
The system SHALL export navigation and collision maps as part of Phase 4 export.

#### Scenario: Navigation/Collision Export
Given generated navigation and collision maps
When exporting
Then the system SHALL include navigation masks in export
And the system SHALL include collision map in export
And files SHALL be compatible with Unreal Engine

