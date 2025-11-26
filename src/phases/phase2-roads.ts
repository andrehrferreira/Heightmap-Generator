/**
 * Phase 2: Road and Ramp Generation
 * Generates the road network connecting Points of Interest (POIs) with proper ramps.
 */

import { Grid } from '../core/grid.js';
import { calculateBaseHeight } from '../core/level.js';
import {
  interpolateRampHeight,
  SlopeConfig,
  DEFAULT_SLOPE_CONFIG,
  // calculateMinRampLength, // unused
} from '../core/slope.js';
import { POINode, createPOI, POIType } from '../algorithms/poi.js';
import { generateMSTRoadGraph, addExtraEdgesForLoops, createGraphFromPOIs } from '../algorithms/mst.js';
import { findPath, AStarConfig, DEFAULT_ASTAR_CONFIG } from '../algorithms/astar-grid.js';
import { simplifyPath, Point } from '../algorithms/douglas-peucker.js';

/**
 * Road segment connecting two POIs.
 */
export interface RoadSegment {
  /** Unique identifier */
  id: string;
  /** Source POI */
  from: POINode;
  /** Target POI */
  to: POINode;
  /** Path cells */
  path: Point[];
  /** Has ramp (level change) */
  hasRamp: boolean;
  /** Ramp start index in path */
  rampStartIndex?: number;
  /** Ramp end index in path */
  rampEndIndex?: number;
}

/**
 * Road network result.
 */
export interface RoadNetwork {
  /** All POIs */
  pois: POINode[];
  /** Road segments */
  segments: RoadSegment[];
  /** Total road cells count */
  totalRoadCells: number;
  /** Total ramp cells count */
  totalRampCells: number;
}

/**
 * Road generation configuration.
 */
export interface RoadGenerationConfig {
  /** Road width in cells (default: 3) */
  roadWidth: number;
  /** Path simplification epsilon (default: 2.0) */
  simplificationEpsilon: number;
  /** Maximum extra edges for loops (default: 2) */
  maxExtraEdges: number;
  /** A* pathfinding configuration */
  astarConfig: AStarConfig;
  /** Slope configuration for ramps */
  slopeConfig: SlopeConfig;
}

/**
 * Default road generation configuration.
 */
export const DEFAULT_ROAD_CONFIG: RoadGenerationConfig = {
  roadWidth: 3,
  simplificationEpsilon: 2.0,
  maxExtraEdges: 2,
  astarConfig: DEFAULT_ASTAR_CONFIG,
  slopeConfig: DEFAULT_SLOPE_CONFIG,
};

/**
 * Generates road network on grid.
 *
 * @param grid - Grid instance
 * @param pois - Array of POI nodes
 * @param config - Road generation configuration
 * @returns Road network result
 */
export function generateRoadNetwork(
  grid: Grid,
  pois: POINode[],
  config: RoadGenerationConfig = DEFAULT_ROAD_CONFIG
): RoadNetwork {
  if (pois.length < 2) {
    return {
      pois,
      segments: [],
      totalRoadCells: 0,
      totalRampCells: 0,
    };
  }

  // Generate MST road graph
  const graph = createGraphFromPOIs(pois, true);
  const mstEdges = generateMSTRoadGraph(pois, true);
  const extraEdges = addExtraEdgesForLoops(graph, mstEdges, config.maxExtraEdges);
  const allEdges = [...mstEdges, ...extraEdges];

  const segments: RoadSegment[] = [];
  let totalRoadCells = 0;
  let totalRampCells = 0;

  // Generate road segments
  for (const edge of allEdges) {
    const fromPOI = pois[edge.from];
    const toPOI = pois[edge.to];

    const segment = generateRoadSegment(grid, fromPOI, toPOI, segments.length, config);
    if (segment) {
      segments.push(segment);
      totalRoadCells += segment.path.length;
      if (segment.hasRamp && segment.rampStartIndex !== undefined && segment.rampEndIndex !== undefined) {
        totalRampCells += segment.rampEndIndex - segment.rampStartIndex + 1;
      }
    }
  }

  return {
    pois,
    segments,
    totalRoadCells,
    totalRampCells,
  };
}

/**
 * Generates a single road segment between two POIs.
 */
function generateRoadSegment(
  grid: Grid,
  from: POINode,
  to: POINode,
  index: number,
  config: RoadGenerationConfig
): RoadSegment | null {
  // Find path using A*
  const rawPath = findPath(grid, from.x, from.y, to.x, to.y, config.astarConfig);
  if (!rawPath || rawPath.length === 0) {
    return null;
  }

  // Simplify path
  const simplifiedPath = simplifyPath(rawPath, config.simplificationEpsilon);

  // Check for level change
  const hasRamp = from.levelId !== to.levelId;
  let rampStartIndex: number | undefined;
  let rampEndIndex: number | undefined;

  if (hasRamp) {
    // Find ramp boundaries
    const rampInfo = findRampBoundaries(grid, simplifiedPath, from.levelId, to.levelId);
    rampStartIndex = rampInfo.startIndex;
    rampEndIndex = rampInfo.endIndex;
  }

  // Mark road cells on grid
  markRoadCells(grid, simplifiedPath, index, config.roadWidth);

  // If there's a ramp, mark ramp cells and apply heights
  if (hasRamp && rampStartIndex !== undefined && rampEndIndex !== undefined) {
    markRampCells(grid, simplifiedPath, rampStartIndex, rampEndIndex, from.levelId, to.levelId, config);
  }

  return {
    id: `road-${index}`,
    from,
    to,
    path: simplifiedPath,
    hasRamp,
    rampStartIndex,
    rampEndIndex,
  };
}

/**
 * Finds ramp boundaries in a path.
 */
function findRampBoundaries(
  grid: Grid,
  path: Point[],
  startLevelId: number,
  endLevelId: number
): { startIndex: number; endIndex: number } {
  let startIndex = 0;
  let endIndex = path.length - 1;

  // Find first cell where level changes
  for (let i = 0; i < path.length; i++) {
    const cell = grid.getCell(path[i].x, path[i].y);
    if (cell.levelId !== startLevelId) {
      startIndex = Math.max(0, i - 1);
      break;
    }
  }

  // Find last cell before end level
  for (let i = path.length - 1; i >= 0; i--) {
    const cell = grid.getCell(path[i].x, path[i].y);
    if (cell.levelId !== endLevelId) {
      endIndex = Math.min(path.length - 1, i + 1);
      break;
    }
  }

  return { startIndex, endIndex };
}

/**
 * Marks road cells on the grid.
 */
function markRoadCells(grid: Grid, path: Point[], roadId: number, roadWidth: number): void {
  const halfWidth = Math.floor(roadWidth / 2);

  for (const point of path) {
    // Expand road width
    for (let dy = -halfWidth; dy <= halfWidth; dy++) {
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const x = point.x + dx;
        const y = point.y + dy;

        try {
          const cell = grid.getCell(x, y);
          cell.flags.road = true;
          cell.roadId = roadId;
        } catch {
          // Out of bounds, skip
        }
      }
    }
  }
}

/**
 * Marks ramp cells and applies progressive height interpolation.
 */
function markRampCells(
  grid: Grid,
  path: Point[],
  startIndex: number,
  endIndex: number,
  startLevelId: number,
  endLevelId: number,
  config: RoadGenerationConfig
): void {
  const startHeight = calculateBaseHeight(startLevelId);
  const endHeight = calculateBaseHeight(endLevelId);
  const rampLength = endIndex - startIndex + 1;

  for (let i = startIndex; i <= endIndex; i++) {
    const point = path[i];
    const t = (i - startIndex) / (rampLength - 1);
    const height = interpolateRampHeight(startHeight, endHeight, t, config.slopeConfig);

    try {
      const cell = grid.getCell(point.x, point.y);
      cell.flags.ramp = true;
      cell.height = height;
    } catch {
      // Out of bounds, skip
    }
  }
}

/**
 * Generates random POIs for testing.
 */
export function generateRandomPOIs(
  grid: Grid,
  count: number,
  types: POIType[] = ['town', 'dungeon', 'exit', 'portal']
): POINode[] {
  const pois: POINode[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  const margin = Math.floor(Math.min(cols, rows) * 0.1);

  for (let i = 0; i < count; i++) {
    const x = margin + Math.floor(Math.random() * (cols - 2 * margin));
    const y = margin + Math.floor(Math.random() * (rows - 2 * margin));
    const levelId = grid.getCell(x, y).levelId;
    const type = types[Math.floor(Math.random() * types.length)];

    pois.push(createPOI(x, y, levelId, type, `POI-${i}`));
  }

  return pois;
}

