# Stamp Library Specification

## ADDED Requirements

### Requirement: Stamp Structure

The system SHALL define stamps with height data and metadata.

#### Scenario: Create Stamp
Given height data 128x128
When creating stamp
Then stamp MUST have heightData as Float32Array
And stamp MUST have metadata (name, category, tags)

### Requirement: Built-in Stamps

The system SHALL provide a library of built-in stamps.

#### Scenario: Built-in Categories
Given stamp library
When listing categories
Then MUST include: mountains, hills, craters, plateaus, cliffs

### Requirement: Stamp Placement

The system SHALL support stamp placement with transforms.

#### Scenario: Transformed Placement
Given stamp with rotation=45, scale=2.0
When placed at (500, 500)
Then stamp MUST be rotated 45 degrees
And stamp MUST be scaled 2x

### Requirement: Blend Modes

The system SHALL support multiple blend modes.

#### Scenario: Additive Blend
Given stamp with blendMode='add'
When applied to terrain
Then stamp heights MUST add to existing heights

#### Scenario: Max Blend
Given stamp with blendMode='max'
When applied to terrain
Then each cell MUST be max(terrain, stamp)

### Requirement: Scatter Placement

The system SHALL support scatter placement with variation.

#### Scenario: Random Scatter
Given count=20, minDistance=50
When scatter placement runs
Then 20 stamps MUST be placed
And no two stamps MUST be closer than 50 cells

#### Scenario: Scatter Variation
Given rotation variation [-45, 45]
When scatter placement runs
Then each stamp MUST have rotation between -45 and 45

### Requirement: Procedural Stamps

The system SHALL generate procedural stamps.

#### Scenario: Generate Cone
Given type='cone', radius=50, height=100
When generated
Then result MUST be conical shape
And peak MUST be at center

#### Scenario: Generate Crater
Given type='crater', rimHeight=20, floorDepth=50
When generated
Then result MUST have raised rim
And center MUST be depressed

### Requirement: Stamp Import

The system SHALL import stamps from images.

#### Scenario: Import PNG Stamp
Given 16-bit grayscale PNG
When imported
Then heightData MUST be extracted
And metadata MUST be initialized

### Requirement: Stamp Export

The system SHALL export stamps to files.

#### Scenario: Export HGS Format
Given stamp with metadata
When exported as .hgs
Then file MUST contain heightData
And file MUST contain all metadata

### Requirement: Library Organization

The system SHALL support library organization.

#### Scenario: Add to Favorites
Given stamp "Peak Sharp"
When added to favorites
Then stamp MUST appear in favorites list

#### Scenario: Search Stamps
Given search query "mountain"
When searching library
Then results MUST include stamps with "mountain" in name or tags

## Performance Requirements

### Requirement: Stamp Application Speed

The system SHALL apply stamps efficiently.

#### Scenario: Large Stamp Application
Given stamp 256x256
When applied with blend mode
Then operation MUST complete in under 50ms

### Requirement: Scatter Performance

The system SHALL scatter stamps efficiently.

#### Scenario: Mass Scatter
Given count=100, minDistance=20
When scatter placement runs
Then operation MUST complete in under 500ms

