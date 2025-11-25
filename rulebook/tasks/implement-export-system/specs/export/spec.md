# Export System Specification

## ADDED Requirements

### Requirement: Heightmap Export
The system SHALL export heightmap as 16-bit PNG or raw 16-bit format.

#### Scenario: Heightmap Export
Given a generated heightmap
When exporting heightmap
Then the system SHALL create 16-bit PNG file
And the system SHALL map height values to 16-bit integers (0-65535)
And the file SHALL be compatible with Unreal Engine Landscape import

### Requirement: Mask Export
The system SHALL export all required masks (roads, water, cliffs, level, navigation, collision, boundaries) as 8/16-bit PNG.

#### Scenario: Mask Export
Given generated masks
When exporting masks
Then the system SHALL create mask PNG files
And each mask SHALL use appropriate bit depth (8 or 16-bit)
And masks SHALL be compatible with Unreal Engine material system

### Requirement: Metadata Export
The system SHALL export JSON metadata with generation config, statistics, export info, and Unreal integration data.

#### Scenario: Metadata Export
Given a generated heightmap
When exporting metadata
Then the system SHALL create metadata.json file
And the file SHALL contain version, timestamp, config, statistics, export info, and Unreal data
And the file SHALL be valid JSON

### Requirement: Export Directory Structure
The system SHALL organize exported files in a consistent directory structure.

#### Scenario: Export Directory Creation
Given export is initiated
When creating export directory
Then the system SHALL create output directory
And the system SHALL organize all exported files
And the system SHALL use consistent naming conventions

