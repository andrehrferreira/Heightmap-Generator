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
 * Simple noise function for road variation
 */
function roadNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // -1 to 1
}

/**
 * FBM noise for smoother road variation
 */
function roadFbmNoise(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * roadNoise(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value / maxValue;
}

/**
 * Marks road cells on the grid with noise for natural look.
 * NOTE: Only marks flags, does NOT modify heightmap - roads are rendered as overlay
 */
function markRoadCells(grid: Grid, path: Point[], roadId: number, roadWidth: number): void {
  const halfWidth = Math.floor(roadWidth / 2);
  const noiseSeed = roadId * 12345;
  const noiseScale = 0.1;
  const noiseAmplitude = 2; // Pixels of offset

  // Mark cells with noise offset - flags only, preserve heightmap
  for (let i = 0; i < path.length; i++) {
    const point = path[i];

    // Add noise to the path position for organic look
    const offsetX = roadFbmNoise(point.x * noiseScale, point.y * noiseScale, 3, noiseSeed) * noiseAmplitude;
    const offsetY = roadFbmNoise(point.x * noiseScale + 100, point.y * noiseScale + 100, 3, noiseSeed) * noiseAmplitude;

    // Expand road width with noise
    const localWidth = halfWidth + Math.round(roadFbmNoise(i * 0.1, roadId, 2, noiseSeed) * 1);

    for (let dy = -localWidth; dy <= localWidth; dy++) {
      for (let dx = -localWidth; dx <= localWidth; dx++) {
        const x = point.x + dx + Math.round(offsetX);
        const y = point.y + dy + Math.round(offsetY);

        try {
          const cell = grid.getCell(x, y);
          
          // Skip barrier/blocked cells
          if (cell.flags.visualOnly || cell.flags.blocked) continue;
          
          // Only set flags - DO NOT modify height
          cell.flags.road = true;
          cell.flags.playable = true;
          cell.roadId = roadId;
        } catch {
          // Out of bounds, skip
        }
      }
    }
  }
}

// smoothPathHeights removed - roads no longer modify heightmap

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
 * Finds all exit points on the map borders.
 */
export function findExitPoints(grid: Grid): POINode[] {
  const exits: POINode[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  const borderWidth = 80; // Approximate border width
  
  // Scan borders for exit cells (cells marked as road near edges)
  const edges = [
    { startX: 0, startY: 0, endX: cols, endY: borderWidth, name: 'north' },
    { startX: 0, startY: rows - borderWidth, endX: cols, endY: rows, name: 'south' },
    { startX: 0, startY: 0, endX: borderWidth, endY: rows, name: 'west' },
    { startX: cols - borderWidth, startY: 0, endX: cols, endY: rows, name: 'east' },
  ];

  for (const edge of edges) {
    let exitCells: { x: number; y: number; height: number }[] = [];
    
    for (let y = edge.startY; y < edge.endY; y++) {
      for (let x = edge.startX; x < edge.endX; x++) {
        try {
          const cell = grid.getCell(x, y);
          // Exit cells are passable/road cells near borders with low height
          if ((cell.flags.road || cell.flags.playable) && cell.height < 100) {
            exitCells.push({ x, y, height: cell.height });
          }
        } catch {
          // Out of bounds
        }
      }
    }

    // If we found exit cells, create a POI at the center of the cluster
    if (exitCells.length > 0) {
      // Find centroid
      const avgX = Math.round(exitCells.reduce((s, c) => s + c.x, 0) / exitCells.length);
      const avgY = Math.round(exitCells.reduce((s, c) => s + c.y, 0) / exitCells.length);
      
      // Clamp to valid coordinates
      const x = Math.max(1, Math.min(cols - 2, avgX));
      const y = Math.max(1, Math.min(rows - 2, avgY));
      
      const levelId = grid.getCell(x, y).levelId;
      exits.push(createPOI(x, y, levelId, 'exit', `exit-${edge.name}`));
    }
  }

  return exits;
}

/**
 * Finds ramp waypoints - points on ramps that roads should pass through.
 */
export function findRampWaypoints(grid: Grid): POINode[] {
  const waypoints: POINode[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  // Group ramp cells by approximate location
  const rampClusters: Map<string, { x: number; y: number; count: number }> = new Map();
  const clusterSize = 50;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      try {
        const cell = grid.getCell(x, y);
        if (cell.flags.ramp) {
          const clusterKey = `${Math.floor(x / clusterSize)},${Math.floor(y / clusterSize)}`;
          const existing = rampClusters.get(clusterKey);
          if (existing) {
            existing.x += x;
            existing.y += y;
            existing.count++;
          } else {
            rampClusters.set(clusterKey, { x, y, count: 1 });
          }
        }
      } catch {
        // Out of bounds
      }
    }
  }

  // Create waypoints at cluster centers
  let waypointId = 0;
  for (const cluster of rampClusters.values()) {
    if (cluster.count > 10) { // Only significant ramp clusters
      const x = Math.round(cluster.x / cluster.count);
      const y = Math.round(cluster.y / cluster.count);
      
      try {
        const levelId = grid.getCell(x, y).levelId;
        waypoints.push(createPOI(x, y, levelId, 'portal', `ramp-waypoint-${waypointId++}`));
      } catch {
        // Out of bounds
      }
    }
  }

  return waypoints;
}

/**
 * Generates POIs including mandatory exits and ramp waypoints.
 */
export function generateRandomPOIs(
  grid: Grid,
  count: number,
  types: POIType[] = ['town', 'dungeon', 'portal']
): POINode[] {
  const pois: POINode[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  const margin = Math.floor(Math.min(cols, rows) * 0.15);

  // 1. Add mandatory exit POIs first
  const exits = findExitPoints(grid);
  pois.push(...exits);
  console.log(`[Roads] Found ${exits.length} exit points`);

  // 2. Add ramp waypoints
  const rampWaypoints = findRampWaypoints(grid);
  pois.push(...rampWaypoints);
  console.log(`[Roads] Found ${rampWaypoints.length} ramp waypoints`);

  // 3. Add random POIs
  const remainingCount = Math.max(0, count - exits.length);
  
  for (let i = 0; i < remainingCount; i++) {
    // Try to place POI in valid location
    let attempts = 0;
    while (attempts < 20) {
      const x = margin + Math.floor(Math.random() * (cols - 2 * margin));
      const y = margin + Math.floor(Math.random() * (rows - 2 * margin));
      
      try {
        const cell = grid.getCell(x, y);
        
        // Skip blocked/water/barrier cells
        if (cell.flags.blocked || cell.flags.water || cell.flags.visualOnly) {
          attempts++;
          continue;
        }
        
        // Check minimum distance from existing POIs
        const minDist = 50;
        let tooClose = false;
        for (const existing of pois) {
          const dist = Math.sqrt((x - existing.x) ** 2 + (y - existing.y) ** 2);
          if (dist < minDist) {
            tooClose = true;
            break;
          }
        }
        
        if (!tooClose) {
          const levelId = cell.levelId;
          const type = types[Math.floor(Math.random() * types.length)];
          pois.push(createPOI(x, y, levelId, type, `POI-${i}`));
          break;
        }
      } catch {
        // Out of bounds
      }
      
      attempts++;
    }
  }

  console.log(`[Roads] Total POIs: ${pois.length} (${exits.length} exits, ${rampWaypoints.length} ramps, ${pois.length - exits.length - rampWaypoints.length} random)`);
  return pois;
}

