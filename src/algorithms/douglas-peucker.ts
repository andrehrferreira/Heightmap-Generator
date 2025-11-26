/**
 * Douglas-Peucker line simplification algorithm.
 * Reduces the number of points in a path while maintaining its general shape.
 */

/**
 * Point in 2D space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Calculates perpendicular distance from a point to a line segment.
 *
 * @param point - Point to measure distance from
 * @param lineStart - Start of line segment
 * @param lineEnd - End of line segment
 * @returns Perpendicular distance
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  // If line segment is a point, return distance to that point
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    const dx2 = point.x - lineStart.x;
    const dy2 = point.y - lineStart.y;
    return Math.sqrt(dx2 * dx2 + dy2 * dy2);
  }

  // Calculate projection parameter
  const t = Math.max(
    0,
    Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared)
  );

  // Find closest point on line segment
  const closestX = lineStart.x + t * dx;
  const closestY = lineStart.y + t * dy;

  // Calculate distance
  const dx2 = point.x - closestX;
  const dy2 = point.y - closestY;
  return Math.sqrt(dx2 * dx2 + dy2 * dy2);
}

/**
 * Recursive Douglas-Peucker algorithm.
 *
 * @param points - Array of points to simplify
 * @param epsilon - Maximum distance threshold
 * @param start - Start index
 * @param end - End index
 * @param keepFlags - Array marking which points to keep
 */
function douglasPeuckerRecursive(
  points: Point[],
  epsilon: number,
  start: number,
  end: number,
  keepFlags: boolean[]
): void {
  if (end - start <= 1) {
    return;
  }

  let maxDistance = 0;
  let maxIndex = start;

  const lineStart = points[start];
  const lineEnd = points[end];

  // Find point with maximum distance
  for (let i = start + 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], lineStart, lineEnd);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    keepFlags[maxIndex] = true;

    // Recursively simplify both segments
    douglasPeuckerRecursive(points, epsilon, start, maxIndex, keepFlags);
    douglasPeuckerRecursive(points, epsilon, maxIndex, end, keepFlags);
  }
}

/**
 * Simplifies a path using Douglas-Peucker algorithm.
 *
 * @param points - Array of points to simplify
 * @param epsilon - Maximum distance threshold (default: 1.0)
 * @returns Simplified array of points
 *
 * @example
 * ```typescript
 * const path = [
 *   { x: 0, y: 0 },
 *   { x: 1, y: 0.1 },
 *   { x: 2, y: 0 },
 *   { x: 3, y: 0.1 },
 *   { x: 4, y: 0 }
 * ];
 * const simplified = simplifyPath(path, 0.5);
 * // Returns points that are more than 0.5 units away from the line
 * ```
 */
export function simplifyPath(points: Point[], epsilon: number = 1.0): Point[] {
  if (points.length <= 2) {
    return [...points];
  }

  // Always keep first and last points
  const keepFlags = new Array(points.length).fill(false);
  keepFlags[0] = true;
  keepFlags[points.length - 1] = true;

  // Recursively simplify
  douglasPeuckerRecursive(points, epsilon, 0, points.length - 1, keepFlags);

  // Return only kept points
  return points.filter((_point, index) => keepFlags[index]);
}

/**
 * Simplifies a path while preserving level information.
 * Useful for road paths that need to maintain level transitions.
 *
 * @param points - Array of points with optional levelId
 * @param epsilon - Maximum distance threshold
 * @returns Simplified array of points
 */
export interface PointWithLevel extends Point {
  levelId?: number;
}

export function simplifyPathWithLevels(
  points: PointWithLevel[],
  epsilon: number = 1.0
): PointWithLevel[] {
  if (points.length <= 2) {
    return [...points];
  }

  // Always keep first and last points
  const keepFlags = new Array(points.length).fill(false);
  keepFlags[0] = true;
  keepFlags[points.length - 1] = true;

  // Also keep points where level changes
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];

    if (
      (prev.levelId !== undefined && curr.levelId !== undefined && prev.levelId !== curr.levelId) ||
      (curr.levelId !== undefined && next.levelId !== undefined && curr.levelId !== next.levelId)
    ) {
      keepFlags[i] = true;
    }
  }

  // Recursively simplify
  douglasPeuckerRecursive(points, epsilon, 0, points.length - 1, keepFlags);

  // Return only kept points
  return points.filter((_point, index) => keepFlags[index]);
}

