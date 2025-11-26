/**
 * Points of Interest (POI) system for road network generation.
 * POIs are nodes that roads connect to create the playable network.
 */

/**
 * Type of Point of Interest.
 */
export type POIType = 'town' | 'dungeon' | 'exit' | 'portal';

/**
 * Point of Interest node.
 * Represents a location that roads should connect to.
 */
export interface POINode {
  /** Unique identifier */
  id: string;
  /** X coordinate in grid cells */
  x: number;
  /** Y coordinate in grid cells */
  y: number;
  /** Level ID where POI is located */
  levelId: number;
  /** Type of POI */
  type: POIType;
  /** Optional name for identification */
  name?: string;
}

/**
 * Creates a new POI node.
 *
 * @param x - X coordinate in grid cells
 * @param y - Y coordinate in grid cells
 * @param levelId - Level ID
 * @param type - POI type
 * @param name - Optional name
 * @returns New POI node
 */
export function createPOI(
  x: number,
  y: number,
  levelId: number,
  type: POIType,
  name?: string
): POINode {
  return {
    id: `${type}-${x}-${y}-${levelId}`,
    x,
    y,
    levelId,
    type,
    name,
  };
}

/**
 * Calculates Euclidean distance between two POIs.
 *
 * @param a - First POI
 * @param b - Second POI
 * @returns Distance in grid cells
 */
export function distanceBetweenPOIs(a: POINode, b: POINode): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates distance considering level differences.
 * Adds penalty for level changes.
 *
 * @param a - First POI
 * @param b - Second POI
 * @param levelPenalty - Penalty multiplier for level differences (default: 10)
 * @returns Weighted distance
 */
export function weightedDistanceBetweenPOIs(
  a: POINode,
  b: POINode,
  levelPenalty: number = 10
): number {
  const baseDistance = distanceBetweenPOIs(a, b);
  const levelDiff = Math.abs(b.levelId - a.levelId);
  return baseDistance + levelDiff * levelPenalty;
}

