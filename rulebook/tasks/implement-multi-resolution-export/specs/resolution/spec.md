# Multi-Resolution Export Specification

## ADDED Requirements

### Requirement: Resolution Presets

The system SHALL provide standard resolution presets.

#### Scenario: Preset Sizes
Given preset 'medium'
When getting resolution
Then size MUST be 1024x1024

### Requirement: Unreal Landscape Presets

The system SHALL provide Unreal-compatible sizes.

#### Scenario: Landscape Size 8x8
Given unrealPreset '8x8_127'
When getting resolution
Then size MUST be 1009x1009
And MUST be compatible with 8x8 components

### Requirement: Bilinear Scaling

The system SHALL implement bilinear scaling.

#### Scenario: Bilinear Downscale
Given 2048x2048 heightmap
When scaled to 1024x1024 with bilinear
Then result MUST use bilinear interpolation
And quality MUST be acceptable for preview

### Requirement: Bicubic Scaling

The system SHALL implement bicubic scaling.

#### Scenario: Bicubic Quality
Given heightmap with fine detail
When scaled with bicubic
Then detail MUST be better preserved than bilinear
And edges MUST be smooth

### Requirement: Lanczos Scaling

The system SHALL implement Lanczos scaling.

#### Scenario: Lanczos Quality
Given heightmap with sharp features
When scaled with Lanczos
Then sharpness MUST be best preserved
And ringing MUST be minimal

### Requirement: Detail Preservation

The system SHALL optionally preserve important details.

#### Scenario: Road Preservation
Given heightmap with roads and preserveRoads=true
When downscaled
Then road visibility MUST be maintained
And road edges MUST not be blurred away

### Requirement: Tiled Export

The system SHALL export as tiles for World Composition.

#### Scenario: Grid Export
Given grid 4x4 with tileSize=512
When exported
Then 16 tiles MUST be created
And each tile MUST be 512x512

### Requirement: Seamless Tiles

The system SHALL blend tile edges for seamless joining.

#### Scenario: Tile Seams
Given adjacent tiles
When blendWidth=10
Then 10-pixel overlap MUST be blended
And no visible seam MUST exist

### Requirement: World Composition Metadata

The system SHALL generate World Composition metadata.

#### Scenario: WC Bounds
Given tiled export
When generateBounds=true
Then bounds file MUST be created
And bounds MUST match tile positions

### Requirement: Batch Export

The system SHALL export multiple resolutions.

#### Scenario: Multi-Resolution Batch
Given resolutions [256, 1024, 2048]
When batch exported
Then 3 sets of files MUST be created
And each MUST be at correct resolution

## Performance Requirements

### Requirement: Scaling Speed

The system SHALL scale efficiently.

#### Scenario: Large Scale
Given 4096x4096 to 2048x2048
When Lanczos scaling
Then operation MUST complete in under 5 seconds

### Requirement: Tiled Export Speed

The system SHALL export tiles efficiently.

#### Scenario: Many Tiles
Given 8x8 grid = 64 tiles
When exporting all tiles
Then operation MUST complete in under 30 seconds
And progress MUST be reported

