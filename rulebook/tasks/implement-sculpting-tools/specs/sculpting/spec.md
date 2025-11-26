# Sculpting Tools Specification

## ADDED Requirements

### Requirement: Brush Interface

The system SHALL provide a common interface for all brushes.

#### Scenario: Apply Brush
Given a brush with size=50 and strength=0.5
When applied at position (100, 100)
Then it MUST modify cells within radius 50
And modification strength MUST follow falloff curve

### Requirement: Raise Brush

The system SHALL implement a brush that raises terrain.

#### Scenario: Raise Operation
Given a raise brush with strength=0.5
When applied to terrain
Then affected cells MUST increase in height
And increase MUST be proportional to strength and falloff

### Requirement: Lower Brush

The system SHALL implement a brush that lowers terrain.

#### Scenario: Lower Operation
Given a lower brush with strength=0.5
When applied to terrain
Then affected cells MUST decrease in height
And decrease MUST be proportional to strength and falloff

### Requirement: Smooth Brush

The system SHALL implement a brush that smooths terrain.

#### Scenario: Smooth Operation
Given a smooth brush with kernel size=5
When applied to terrain
Then affected cells MUST average with neighbors
And edges MUST be preserved based on settings

### Requirement: Flatten Brush

The system SHALL implement a brush that flattens terrain to a target height.

#### Scenario: Flatten Operation
Given a flatten brush with target height from click position
When applied to terrain
Then affected cells MUST move toward target height
And cells above and below MUST be affected equally

### Requirement: Falloff System

The system SHALL support multiple falloff curves.

#### Scenario: Falloff Application
Given falloff type='smooth' with size=50
When calculating effect at distance=25
Then effect MUST be 50% based on smooth curve
And effect at center MUST be 100%
And effect at edge MUST be 0%

### Requirement: Height Constraints

The system SHALL enforce height constraints.

#### Scenario: Minimum Height Constraint
Given minHeight=-100 constraint
When brush would lower terrain below -100
Then terrain MUST stop at -100
And no cell MUST have height below constraint

### Requirement: Feature Protection

The system SHALL protect specified features from modification.

#### Scenario: Road Protection
Given road protection enabled
When brush is applied over road cells
Then road cells MUST not be modified
And protection MUST feather at edges

### Requirement: Stroke Recording

The system SHALL record brush strokes for undo.

#### Scenario: Stroke Undo
Given a brush stroke that modified 100 cells
When undo is triggered
Then all 100 cells MUST return to previous values
And undo MUST be atomic (all or nothing)

### Requirement: Continuous Stroke

The system SHALL support continuous brush strokes.

#### Scenario: Drag Stroke
Given brush spacing=0.25
When mouse is dragged across canvas
Then brush MUST be applied every 25% of brush size
And overlapping applications MUST accumulate

## Performance Requirements

### Requirement: Real-time Application

The system SHALL apply brushes in real-time.

#### Scenario: Large Brush Performance
Given brush size=200
When applied continuously
Then frame rate MUST stay above 30fps
And visual feedback MUST be immediate

