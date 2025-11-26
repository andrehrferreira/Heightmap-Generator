# Procedural Masks Specification

## ADDED Requirements

### Requirement: Slope Map

The system SHALL generate slope maps from heightmap.

#### Scenario: Slope Calculation
Given a heightmap with varying terrain
When slope map is generated
Then each cell MUST contain slope angle (0-90 degrees)
And steep cliffs MUST have values near 90

### Requirement: Curvature Map

The system SHALL generate curvature maps.

#### Scenario: Curvature Detection
Given terrain with ridges and valleys
When curvature map is generated
Then ridges MUST have positive values
And valleys MUST have negative values
And flat areas MUST be near zero

### Requirement: Aspect Map

The system SHALL generate aspect (direction) maps.

#### Scenario: Aspect Calculation
Given terrain facing various directions
When aspect map is generated
Then values MUST indicate facing direction (0-360)
And north-facing slopes MUST have values near 0/360

### Requirement: Flow Accumulation

The system SHALL calculate water flow accumulation.

#### Scenario: Flow Simulation
Given terrain with valleys
When flow accumulation is calculated
Then valley bottoms MUST have highest values
And ridges MUST have lowest values
And rivers MUST be identifiable

### Requirement: Cliff Mask

The system SHALL generate cliff masks from slope.

#### Scenario: Cliff Detection
Given minSlope=45, maxSlope=70
When cliff mask is generated
Then slopes between 45-70 MUST be partially included
And slopes above 70 MUST be fully included
And slopes below 45 MUST be excluded

### Requirement: Plateau Mask

The system SHALL identify flat elevated areas.

#### Scenario: Plateau Detection
Given maxSlope=5, minElevation=0.6
When plateau mask is generated
Then only flat areas above 60% height MUST be included
And minimum size filter MUST be applied

### Requirement: Valley Mask

The system SHALL identify valley areas.

#### Scenario: Valley Detection
Given curvature threshold=-0.3
When valley mask is generated
Then concave areas MUST be included
And valley floors MUST have highest values

### Requirement: Wetland Mask

The system SHALL identify potential wetland areas.

#### Scenario: Wetland Detection
Given flow threshold=100, maxSlope=5
When wetland mask is generated
Then flat areas with high flow MUST be included
And existing water MUST be excluded

### Requirement: Mask Operations

The system SHALL support mask combination operations.

#### Scenario: Union Operation
Given maskA and maskB
When union is calculated
Then result MUST be max(maskA, maskB)

#### Scenario: Intersection Operation
Given maskA and maskB
When intersection is calculated
Then result MUST be min(maskA, maskB)

### Requirement: Custom Expressions

The system SHALL support custom mask expressions.

#### Scenario: Expression Evaluation
Given expression "slope > 0.5 && height > 0.3"
When evaluated
Then result MUST be 255 where both conditions true
And result MUST be 0 otherwise

## Performance Requirements

### Requirement: Generation Speed

The system SHALL generate masks efficiently.

#### Scenario: Full Mask Generation
Given 1024x1024 grid
When all analysis maps are generated
Then total time MUST be under 2 seconds

#### Scenario: Flow Accumulation Speed
Given 1024x1024 grid
When flow accumulation is calculated
Then operation MUST complete in under 1 second

