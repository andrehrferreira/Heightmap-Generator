# Heightmap Import Specification

## ADDED Requirements

### Requirement: PNG Import

The system SHALL import PNG heightmaps.

#### Scenario: 16-bit PNG Import
Given a 16-bit grayscale PNG file
When imported
Then pixel values MUST be converted to heights
And full 16-bit range MUST be preserved

### Requirement: RAW Import

The system SHALL import RAW/R16 heightmaps.

#### Scenario: R16 Import with Config
Given R16 file with width=1024, height=1024
When imported with correct dimensions
Then heightmap MUST be correctly parsed
And byte order MUST be respected

### Requirement: Height Mapping

The system SHALL map input values to height range.

#### Scenario: Auto Normalize
Given import with autoNormalize=true
When imported
Then min value MUST map to outputMin
And max value MUST map to outputMax

### Requirement: Placement Transform

The system SHALL support placement transforms.

#### Scenario: Scaled Placement
Given import with scale=2.0
When placed
Then imported area MUST be 2x original size
And interpolation MUST be applied

#### Scenario: Rotated Placement
Given import with rotation=90
When placed
Then heightmap MUST be rotated 90 degrees

### Requirement: Blend Modes

The system SHALL support multiple blend modes.

#### Scenario: Replace Blend
Given blendMode='replace'
When applied
Then terrain MUST be completely replaced in import area

#### Scenario: Add Blend
Given blendMode='add', opacity=0.5
When applied
Then terrain MUST have 50% of import heights added

#### Scenario: Lerp Blend
Given blendMode='lerp', factor=0.3
When applied
Then result MUST be 70% terrain + 30% import

### Requirement: Blend Masking

The system SHALL support masked blending.

#### Scenario: Gradient Mask
Given gradient mask from left to right
When applied
Then left side MUST have full import
And right side MUST have full terrain
And middle MUST blend smoothly

### Requirement: Edge Blending

The system SHALL blend import edges with terrain.

#### Scenario: Seamless Edges
Given blendWidth=20
When import is placed
Then 20-cell border MUST blend with terrain
And no visible seam MUST exist

### Requirement: Import Layers

The system SHALL support non-destructive import layers.

#### Scenario: Layer Stack
Given 3 import layers
When viewing result
Then all layers MUST be composited
And layer order MUST be respected

### Requirement: Reference Mode

The system SHALL support reference overlay mode.

#### Scenario: Reference Display
Given import in reference mode
When displayed
Then import MUST be visible as overlay
And terrain MUST NOT be modified

## Format Requirements

### Requirement: Format Detection

The system SHALL auto-detect import formats.

#### Scenario: Auto Detection
Given file with unknown extension
When imported with format='auto'
Then format MUST be detected from file header

### Requirement: RAW Configuration

The system SHALL allow RAW format configuration.

#### Scenario: Custom RAW Config
Given RAW file with custom dimensions
When rawConfig is provided
Then file MUST be parsed with provided settings

## Performance Requirements

### Requirement: Import Speed

The system SHALL import files efficiently.

#### Scenario: Large Import
Given 4096x4096 16-bit PNG
When imported
Then operation MUST complete in under 2 seconds

