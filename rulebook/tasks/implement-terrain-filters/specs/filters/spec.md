# Terrain Filters Specification

## ADDED Requirements

### Requirement: Filter Stack

The system SHALL support a stack of non-destructive filters.

#### Scenario: Apply Filter Stack
Given a stack with 3 filters
When applied to heightmap
Then filters MUST be applied in order
And original heightmap MUST be preserved

### Requirement: Filter Masking

The system SHALL support applying filters with masks.

#### Scenario: Masked Filter
Given a blur filter with height mask (0.3-0.7)
When applied
Then only cells in height range MUST be affected
And mask edges MUST be feathered

### Requirement: Gaussian Blur

The system SHALL implement Gaussian blur filter.

#### Scenario: Gaussian Blur Application
Given radius=10, sigma=auto
When applied to heightmap
Then terrain MUST be smoothed
And blur MUST follow Gaussian distribution

### Requirement: Bilateral Filter

The system SHALL implement edge-preserving bilateral filter.

#### Scenario: Edge Preservation
Given bilateral filter with edge detection
When applied to terrain with cliffs
Then flat areas MUST be smoothed
And cliff edges MUST be preserved

### Requirement: Terrace Filter

The system SHALL implement terrace/step filter.

#### Scenario: Create Terraces
Given levels=10, sharpness=0.5
When applied
Then terrain MUST have 10 distinct levels
And transitions MUST respect sharpness setting

### Requirement: Hydraulic Erosion

The system SHALL implement hydraulic erosion simulation.

#### Scenario: Erosion Simulation
Given iterations=10000, erosion rate=0.5
When simulated
Then terrain MUST show erosion patterns
And valleys MUST form along water flow paths
And sediment MUST deposit in flat areas

### Requirement: Thermal Erosion

The system SHALL implement thermal erosion simulation.

#### Scenario: Talus Formation
Given talus angle=35 degrees
When simulated
Then steep slopes MUST erode
And debris MUST accumulate at slope base
And no slope MUST exceed talus angle

### Requirement: Levels Adjustment

The system SHALL implement levels adjustment.

#### Scenario: Levels Application
Given inputBlack=0.1, inputWhite=0.9, gamma=1.2
When applied
Then output range MUST be remapped
And gamma MUST affect midtones

### Requirement: Curves Adjustment

The system SHALL implement custom curve adjustment.

#### Scenario: Custom Curve
Given curve points [(0,0), (0.3, 0.2), (0.7, 0.8), (1,1)]
When applied
Then heights MUST be remapped following curve
And interpolation MUST be smooth

### Requirement: Clamp Filter

The system SHALL implement height clamping.

#### Scenario: Clamp Heights
Given min=-100, max=500
When applied
Then no height MUST be below -100
And no height MUST be above 500

### Requirement: Normalize Filter

The system SHALL implement height normalization.

#### Scenario: Normalize Range
Given targetMin=0, targetMax=1000
When applied
Then minimum height MUST become 0
And maximum height MUST become 1000
And distribution MUST be preserved

## Performance Requirements

### Requirement: Filter Speed

The system SHALL apply filters efficiently.

#### Scenario: Blur Performance
Given 1024x1024 grid with radius=20 blur
When applied
Then operation MUST complete in under 500ms

#### Scenario: Erosion Performance
Given 1024x1024 grid with 10000 iterations
When hydraulic erosion is applied
Then operation MUST complete in under 10 seconds
And progress MUST be reported

