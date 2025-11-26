/**
 * A* pathfinding implementation for grid-based road generation.
 * Adapts A* algorithm to work with the Grid system and cost functions.
 */

import { Grid } from '../core/grid.js';
import { Point } from './douglas-peucker.js';

/**
 * Cost function result for pathfinding.
 */
export interface PathCost {
  /** Movement cost */
  cost: number;
  /** Whether this cell is traversable */
  traversable: boolean;
}

/**
 * Configuration for A* pathfinding.
 */
export interface AStarConfig {
  /** Cost multiplier for flat cells (default: 1.0) */
  flatCost: number;
  /** Cost multiplier for curves (default: 2.0) */
  curveCost: number;
  /** Cost multiplier for level changes without ramp (default: 1000.0) */
  levelChangeCost: number;
  /** Cost multiplier for cells with road flag (default: 0.5) */
  roadCost: number;
  /** Cost multiplier for cells with water flag (default: 5.0) */
  waterCost: number;
  /** Cost multiplier for cells with blocked flag (default: Infinity) */
  blockedCost: number;
  /** Whether to allow diagonal movement (default: true) */
  allowDiagonal: boolean;
}

/**
 * Default A* configuration.
 */
export const DEFAULT_ASTAR_CONFIG: AStarConfig = {
  flatCost: 1.0,
  curveCost: 2.0,
  levelChangeCost: 1000.0,
  roadCost: 0.5,
  waterCost: 5.0,
  blockedCost: Infinity,
  allowDiagonal: true,
};

/**
 * Node in A* search.
 */
interface AStarNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to goal
  f: number; // Total cost (g + h)
  parent: AStarNode | null;
  levelId: number;
}

/**
 * Calculates heuristic distance (Euclidean).
 *
 * @param x1 - First X coordinate
 * @param y1 - First Y coordinate
 * @param x2 - Second X coordinate
 * @param y2 - Second Y coordinate
 * @returns Heuristic distance
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates movement cost between two cells.
 *
 * @param grid - Grid instance
 * @param fromX - Source X coordinate
 * @param fromY - Source Y coordinate
 * @param toX - Target X coordinate
 * @param toY - Target Y coordinate
 * @param config - A* configuration
 * @returns Path cost result
 */
function calculateCellCost(
  grid: Grid,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  config: AStarConfig
): PathCost {
  try {
    const toCell = grid.getCell(toX, toY);
    const flags = toCell.flags;

    // Blocked cells are not traversable
    if (flags.blocked) {
      return { cost: config.blockedCost, traversable: false };
    }

    let cost = config.flatCost;

    // Check for level change
    const fromCell = grid.getCell(fromX, fromY);
    if (fromCell.levelId !== toCell.levelId) {
      // If there's a ramp, allow it (cost will be handled by ramp generation)
      if (!flags.ramp) {
        return { cost: config.levelChangeCost, traversable: false };
      }
      // Ramp is traversable but may have higher cost
      cost *= 1.5;
    }

    // Road cells have lower cost
    if (flags.road) {
      cost *= config.roadCost;
    }

    // Water cells have higher cost
    if (flags.water) {
      cost *= config.waterCost;
    }

    // Check for curves (direction change)
    // This is a simplified check - in practice, you'd track previous direction
    const isDiagonal = fromX !== toX && fromY !== toY;
    if (isDiagonal) {
      cost *= 1.2; // Slight penalty for diagonal
    }

    return { cost, traversable: true };
  } catch {
    // Out of bounds
    return { cost: config.blockedCost, traversable: false };
  }
}

/**
 * Gets neighbors of a cell for A* search.
 *
 * @param grid - Grid instance
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param allowDiagonal - Whether to allow diagonal movement
 * @returns Array of neighbor coordinates
 */
function getNeighbors(
  grid: Grid,
  x: number,
  y: number,
  allowDiagonal: boolean
): Array<{ x: number; y: number }> {
  const neighbors: Array<{ x: number; y: number }> = [];
  const directions = [
    { dx: 0, dy: -1 }, // North
    { dx: 1, dy: 0 }, // East
    { dx: 0, dy: 1 }, // South
    { dx: -1, dy: 0 }, // West
  ];

  if (allowDiagonal) {
    directions.push(
      { dx: 1, dy: -1 }, // Northeast
      { dx: 1, dy: 1 }, // Southeast
      { dx: -1, dy: 1 }, // Southwest
      { dx: -1, dy: -1 } // Northwest
    );
  }

  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    // Check bounds
    if (nx >= 0 && nx < grid.getCols() && ny >= 0 && ny < grid.getRows()) {
      neighbors.push({ x: nx, y: ny });
    }
  }

  return neighbors;
}

/**
 * Finds path between two points using A* algorithm.
 *
 * @param grid - Grid instance
 * @param startX - Start X coordinate
 * @param startY - Start Y coordinate
 * @param endX - End X coordinate
 * @param endY - End Y coordinate
 * @param config - A* configuration (optional)
 * @returns Array of points representing the path, or null if no path found
 */
export function findPath(
  grid: Grid,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  config: AStarConfig = DEFAULT_ASTAR_CONFIG
): Point[] | null {
  // Validate start and end
  try {
    grid.getCell(startX, startY);
    grid.getCell(endX, endY);
  } catch {
    return null; // Invalid coordinates
  }

  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();

  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, endX, endY),
    f: 0,
    parent: null,
    levelId: grid.getCell(startX, startY).levelId,
  };
  startNode.f = startNode.g + startNode.h;

  openSet.push(startNode);

  while (openSet.length > 0) {
    // Find node with lowest f score
    let currentIndex = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIndex].f) {
        currentIndex = i;
      }
    }

    const current = openSet.splice(currentIndex, 1)[0];
    const currentKey = `${current.x},${current.y}`;
    closedSet.add(currentKey);

    // Check if we reached the goal
    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: Point[] = [];
      let node: AStarNode | null = current;

      while (node !== null) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }

      return path;
    }

    // Explore neighbors
    const neighbors = getNeighbors(grid, current.x, current.y, config.allowDiagonal);

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.x},${neighbor.y}`;

      if (closedSet.has(neighborKey)) {
        continue;
      }

      const costResult = calculateCellCost(
        grid,
        current.x,
        current.y,
        neighbor.x,
        neighbor.y,
        config
      );

      if (!costResult.traversable) {
        continue;
      }

      const tentativeG = current.g + costResult.cost;
      const neighborLevelId = grid.getCell(neighbor.x, neighbor.y).levelId;

      // Check if neighbor is already in open set
      let neighborNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y);

      if (!neighborNode) {
        neighborNode = {
          x: neighbor.x,
          y: neighbor.y,
          g: tentativeG,
          h: heuristic(neighbor.x, neighbor.y, endX, endY),
          f: 0,
          parent: current,
          levelId: neighborLevelId,
        };
        neighborNode.f = neighborNode.g + neighborNode.h;
        openSet.push(neighborNode);
      } else if (tentativeG < neighborNode.g) {
        // Found better path
        neighborNode.g = tentativeG;
        neighborNode.f = neighborNode.g + neighborNode.h;
        neighborNode.parent = current;
      }
    }
  }

  // No path found
  return null;
}

