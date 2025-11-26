# Spline Features Specification

## ADDED Requirements

### Requirement: Spline Point

The system SHALL support spline points with tangent control.

#### Scenario: Create Spline Point
Given position (100, 200)
When creating a spline point
Then it MUST have position, tangentIn, and tangentOut
And tangent mode MUST default to 'auto'

### Requirement: Bezier Curves

The system SHALL implement cubic Bezier curve evaluation.

#### Scenario: Bezier Evaluation
Given a Bezier curve with 4 control points
When evaluated at t=0.5
Then result MUST be the midpoint of the curve
And result MUST be mathematically correct

### Requirement: Catmull-Rom Splines

The system SHALL implement Catmull-Rom spline interpolation.

#### Scenario: Catmull-Rom Smoothness
Given a Catmull-Rom spline with 5 points
When evaluated
Then the curve MUST pass through all points
And transitions MUST be smooth (C1 continuous)

### Requirement: Width Profile

The system SHALL support variable width along spline.

#### Scenario: Variable Width
Given a river spline with width profile [5, 10, 20]
When rasterized
Then width at start MUST be 5
And width MUST smoothly transition to 20 at end

### Requirement: Height Profile

The system SHALL support variable height/depth along spline.

#### Scenario: River Depth
Given a river spline with depth profile [1, 2, 1.5]
When rasterized
Then depth MUST follow profile along path
And terrain MUST be carved accordingly

### Requirement: Cross-Section

The system SHALL support custom cross-section shapes.

#### Scenario: River Cross-Section
Given a river with U-shape cross-section
When rasterized
Then center MUST be deepest
And banks MUST slope gradually upward

### Requirement: Spline Operations

The system SHALL support spline manipulation operations.

#### Scenario: Split Spline
Given a spline with 5 points
When split at t=0.5
Then result MUST be two splines
And combined length MUST equal original

#### Scenario: Join Splines
Given two splines that share an endpoint
When joined
Then result MUST be single continuous spline
And tangent MUST be smooth at join point

### Requirement: Rasterization

The system SHALL rasterize splines to grid.

#### Scenario: Road Rasterization
Given a road spline with width=10
When rasterized to grid
Then affected cells MUST be marked as road
And road height MUST be flattened

#### Scenario: River Rasterization
Given a river spline with depth=5
When rasterized to grid
Then affected cells MUST be marked as water
And terrain MUST be lowered by depth

### Requirement: Export Format

The system SHALL export splines for Unreal Engine.

#### Scenario: JSON Export
Given a spline with 10 points
When exported as JSON
Then output MUST include all points with positions
And output MUST include tangents and width data

## Performance Requirements

### Requirement: Evaluation Speed

The system SHALL evaluate splines efficiently.

#### Scenario: Long Spline Evaluation
Given a spline with 100 points
When sampled at 1000 points
Then evaluation MUST complete in under 10ms

### Requirement: Rasterization Speed

The system SHALL rasterize splines efficiently.

#### Scenario: Complex Spline Rasterization
Given a river spline spanning 500 cells
When rasterized
Then operation MUST complete in under 100ms

