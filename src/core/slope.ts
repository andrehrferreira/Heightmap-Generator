/**
 * Progressive slope system for heightmap generation.
 * Controls ramp angles to prevent player climbing while maintaining walkability.
 */

import { validateHeightDifference } from './level.js';

/**
 * Slope curve types for progressive slope calculation.
 */
export enum SlopeCurve {
  /** Linear progression from start to end */
  LINEAR = 'linear',
  /** Gentle start, steep end (recommended for ramps) */
  EASE_IN = 'ease-in',
  /** Steep start, gentle end */
  EASE_OUT = 'ease-out',
  /** Gentle start/end, steep middle (S-curve) */
  EASE_IN_OUT = 'ease-in-out',
  /** Exponential increase */
  EXPONENTIAL = 'exponential',
}

/**
 * Configuration for progressive slope generation.
 */
export interface SlopeConfig {
  /** Starting angle in degrees (e.g., 15-30°) */
  startAngle: number;
  /** Ending angle in degrees (e.g., 85-89°) */
  endAngle: number;
  /** Length of transition in cells */
  transitionLength: number;
  /** Progression curve type */
  curveType: SlopeCurve;
}

/**
 * Default slope configuration for ramps.
 * Gentle start (20°) progressing to near-vertical end (87°).
 */
export const DEFAULT_SLOPE_CONFIG: SlopeConfig = {
  startAngle: 20,
  endAngle: 87,
  transitionLength: 30,
  curveType: SlopeCurve.EASE_IN,
};

/**
 * Linear interpolation between two values.
 *
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0.0 to 1.0)
 * @returns Interpolated value
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Calculates slope factor based on angle and curve type.
 * Converts angle to normalized height factor (0.0 to 1.0).
 *
 * @param angle - Angle in degrees (0° = flat, 90° = vertical)
 * @param curveType - Curve type for progression
 * @returns Normalized height factor (0.0 to 1.0)
 */
export function calculateSlopeFactor(angle: number, curveType: SlopeCurve): number {
  // Clamp angle to valid range
  const clampedAngle = Math.max(0, Math.min(90, angle));
  const normalizedAngle = clampedAngle / 90.0;

  switch (curveType) {
    case SlopeCurve.LINEAR:
      return normalizedAngle;

    case SlopeCurve.EASE_IN:
      // Gentle start, steep end (quadratic)
      return normalizedAngle * normalizedAngle;

    case SlopeCurve.EASE_OUT:
      // Steep start, gentle end (inverse quadratic)
      return 1 - (1 - normalizedAngle) * (1 - normalizedAngle);

    case SlopeCurve.EASE_IN_OUT:
      // Smooth S-curve
      return normalizedAngle < 0.5
        ? 2 * normalizedAngle * normalizedAngle
        : 1 - 2 * (1 - normalizedAngle) * (1 - normalizedAngle);

    case SlopeCurve.EXPONENTIAL:
      // Exponential increase
      return Math.pow(normalizedAngle, 2.5);

    default:
      return normalizedAngle;
  }
}

/**
 * Calculates progressive slope factor at a normalized position.
 * The slope progresses from gentle (start) to steep (end) based on curve type.
 *
 * @param t - Normalized position along ramp (0.0 = start, 1.0 = end)
 * @param config - Slope configuration
 * @returns Slope factor for height interpolation (0.0 to 1.0)
 *
 * @example
 * ```typescript
 * const factor = calculateProgressiveSlope(0.0, config);  // Start: gentle
 * const factor = calculateProgressiveSlope(0.5, config); // Middle: moderate
 * const factor = calculateProgressiveSlope(1.0, config); // End: steep
 * ```
 */
export function calculateProgressiveSlope(t: number, config: SlopeConfig): number {
  // Clamp t to valid range
  const clampedT = Math.max(0, Math.min(1, t));

  // Calculate angle at this position
  const angle = lerp(config.startAngle, config.endAngle, clampedT);

  // Convert angle to slope factor using curve type
  return calculateSlopeFactor(angle, config.curveType);
}

/**
 * Calculates the minimum ramp length required for a given height difference.
 * Ensures the ramp is visible and harmonious.
 *
 * @param heightDifference - Height difference in Unreal units
 * @param maxAngle - Maximum allowed angle in degrees (default: 30° for harmonious slope)
 * @returns Minimum ramp length in cells
 */
export function calculateMinRampLength(
  heightDifference: number,
  maxAngle: number = 30
): number {
  if (heightDifference <= 0) {
    return 0;
  }

  // Convert angle to radians
  const angleRad = (maxAngle * Math.PI) / 180;

  // Calculate minimum length: height / tan(angle)
  // For a harmonious 30° slope: length = height / tan(30°)
  const minLength = heightDifference / Math.tan(angleRad);

  // Convert to cells (assuming 1 Unreal unit per cell)
  // In practice, this would be divided by cellSize
  return Math.ceil(minLength);
}

/**
 * Interpolates height along a ramp path using progressive slope.
 *
 * @param startHeight - Starting height in Unreal units
 * @param endHeight - Ending height in Unreal units
 * @param t - Normalized position along ramp (0.0 to 1.0)
 * @param config - Slope configuration
 * @returns Interpolated height at position t
 */
export function interpolateRampHeight(
  startHeight: number,
  endHeight: number,
  t: number,
  config: SlopeConfig = DEFAULT_SLOPE_CONFIG
): number {
  const slopeFactor = calculateProgressiveSlope(t, config);
  return lerp(startHeight, endHeight, slopeFactor);
}

/**
 * Validates that a ramp transition is valid (height difference constraint).
 *
 * @param startLevel - Starting level ID
 * @param endLevel - Ending level ID
 * @returns true if transition is valid, false otherwise
 */
export function validateRampTransition(startLevel: number, endLevel: number): boolean {
  return validateHeightDifference(startLevel, endLevel);
}

/**
 * Calculates the current slope angle at a position along a ramp.
 *
 * @param t - Normalized position along ramp (0.0 to 1.0)
 * @param config - Slope configuration
 * @returns Current slope angle in degrees
 */
export function getSlopeAngleAt(t: number, config: SlopeConfig): number {
  const clampedT = Math.max(0, Math.min(1, t));
  return lerp(config.startAngle, config.endAngle, clampedT);
}

/**
 * Checks if a slope angle is walkable by players.
 * Angles above ~45° become difficult to walk, above ~60° are unclimbable.
 *
 * @param angle - Slope angle in degrees
 * @param maxWalkableAngle - Maximum walkable angle (default: 45°)
 * @returns true if angle is walkable, false otherwise
 */
export function isWalkableSlope(angle: number, maxWalkableAngle: number = 45): boolean {
  return angle <= maxWalkableAngle;
}

