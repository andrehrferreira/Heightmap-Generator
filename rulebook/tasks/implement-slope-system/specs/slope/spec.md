# Progressive Slope System Specification

## ADDED Requirements

### Requirement: Slope Configuration
The system SHALL provide slope configuration with startAngle, endAngle, transitionLength, and curveType.

#### Scenario: Slope Config Creation
Given a slope configuration is created
When setting slope properties
Then the system SHALL store startAngle (degrees, e.g., 15-30°)
And the system SHALL store endAngle (degrees, e.g., 85-89°)
And the system SHALL store transitionLength (cells)
And the system SHALL store curveType (linear, ease-in, ease-out, ease-in-out, exponential)

### Requirement: Progressive Slope Calculation
The system SHALL calculate progressive slope factor based on normalized position and curve type.

#### Scenario: Progressive Slope Calculation
Given a normalized position t (0.0 to 1.0) and slope config
When calculating progressive slope
Then the system SHALL return slope factor based on curve type
And the slope factor SHALL increase from gentle (start) to steep (end)
And the slope factor SHALL respect the curve type progression

### Requirement: Ramp Height Interpolation
The system SHALL interpolate ramp heights using progressive slope system.

#### Scenario: Ramp Height Interpolation
Given a ramp path from startHeight to endHeight
When interpolating heights along the path
Then the system SHALL apply progressive slope (gentle start to near-vertical end)
And the height SHALL increase gradually at start
And the height SHALL increase rapidly at end
And the final height SHALL match endHeight

### Requirement: Cliff Detection
The system SHALL detect and mark cliffs (neighbors with different levelId without ramp).

#### Scenario: Cliff Detection
Given two adjacent cells with different levelId
When checking for cliff
Then the system SHALL return true if no ramp exists between them
And the system SHALL mark cells with cliff flag
And the system SHALL return false if ramp exists between them

