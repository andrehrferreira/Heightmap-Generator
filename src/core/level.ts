/**
 * Level system for heightmap generation.
 * Handles base height calculation and height difference validation.
 */

/**
 * Default Unreal character height in Unreal units.
 * Typical humanoid character is ~1.8m = 180 Unreal units.
 */
export const DEFAULT_CHARACTER_HEIGHT = 180;

/**
 * Maximum height difference between adjacent levels.
 * Must not exceed 1.5x character height for harmonious ramps.
 */
export const MAX_HEIGHT_DIFFERENCE = DEFAULT_CHARACTER_HEIGHT * 1.5; // 270 units

/**
 * Calculates base height for a given level ID.
 * Height is calculated as: levelId * MAX_HEIGHT_DIFFERENCE
 *
 * @param levelId - Level identifier (can be negative for underwater)
 * @returns Base height in Unreal units
 *
 * @example
 * ```typescript
 * calculateBaseHeight(0);  // 0
 * calculateBaseHeight(1);  // 270
 * calculateBaseHeight(-1); // -270
 * ```
 */
export function calculateBaseHeight(levelId: number): number {
  return levelId * MAX_HEIGHT_DIFFERENCE;
}

/**
 * Validates that height difference between two levels does not exceed maximum.
 * This ensures ramps are visible and harmonious.
 *
 * @param levelA - First level ID
 * @param levelB - Second level ID
 * @returns true if height difference is valid (≤ MAX_HEIGHT_DIFFERENCE), false otherwise
 *
 * @example
 * ```typescript
 * validateHeightDifference(0, 1);  // true (270 units difference)
 * validateHeightDifference(0, 2);  // false (540 units difference > 270)
 * ```
 */
export function validateHeightDifference(levelA: number, levelB: number): boolean {
  const heightA = calculateBaseHeight(levelA);
  const heightB = calculateBaseHeight(levelB);
  const difference = Math.abs(heightB - heightA);

  return difference <= MAX_HEIGHT_DIFFERENCE;
}

/**
 * Checks if a level ID represents an underwater level.
 * Underwater levels have negative level IDs.
 *
 * @param levelId - Level identifier
 * @returns true if level is underwater (negative), false otherwise
 */
export function isUnderwaterLevel(levelId: number): boolean {
  return levelId < 0;
}

/**
 * Checks if a level ID represents a mountain peak above walkable level.
 * Mountain peaks are typically at level MAX+ and are visual-only.
 *
 * @param levelId - Level identifier
 * @param maxWalkableLevel - Maximum walkable level (default: 2)
 * @returns true if level is above walkable (visual-only), false otherwise
 */
export function isMountainPeakLevel(levelId: number, maxWalkableLevel: number = 2): boolean {
  return levelId > maxWalkableLevel;
}

