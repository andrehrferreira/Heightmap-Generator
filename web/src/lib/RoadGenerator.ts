/**
 * Road Generator - Creates roads using NavMesh pathfinding
 * Ensures roads connect all exits and pass through ramps
 */

import { getNavMeshSystem, DEFAULT_NAVMESH_CONFIG } from './NavMeshGenerator';

export interface RoadConfig {
  roadWidth: number;
  noiseAmplitude: number;
  smoothingPasses: number;
  blurPasses: number;
  connectAllExits: boolean;
  preferRamps: boolean;
}

export const DEFAULT_ROAD_CONFIG: RoadConfig = {
  roadWidth: 5,
  noiseAmplitude: 2,
  smoothingPasses: 3,
  blurPasses: 2,
  connectAllExits: true,
  preferRamps: true,
};

interface POI {
  x: number;
  y: number;
  type: 'exit' | 'town' | 'dungeon' | 'ramp';
  id: string;
  levelId: number;
}

interface RoadSegment {
  id: string;
  from: POI;
  to: POI;
  path: Array<{ x: number; y: number }>;
}

/**
 * Simple noise function
 */
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/**
 * Find all exits on the map borders - creates POI at the actual exit location
 */
function findExits(grid: any): POI[] {
  const exits: POI[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  const scanDepth = 60; // How deep to scan from edge
  const exitInset = 20; // How far inside the map to place exit POI

  // Scan each edge and find passable areas
  const edges = [
    { name: 'north', dir: { x: 0, y: 1 }, scan: () => scanEdgeForExit(grid, 0, 0, cols, scanDepth, 'y') },
    { name: 'south', dir: { x: 0, y: -1 }, scan: () => scanEdgeForExit(grid, 0, rows - scanDepth, cols, rows, 'y') },
    { name: 'west', dir: { x: 1, y: 0 }, scan: () => scanEdgeForExit(grid, 0, 0, scanDepth, rows, 'x') },
    { name: 'east', dir: { x: -1, y: 0 }, scan: () => scanEdgeForExit(grid, cols - scanDepth, 0, cols, rows, 'x') },
  ];

  for (const edge of edges) {
    const exitCells = edge.scan();
    if (exitCells.length > 5) {
      // Find centroid of exit cells
      const avgX = Math.round(exitCells.reduce((s, c) => s + c.x, 0) / exitCells.length);
      const avgY = Math.round(exitCells.reduce((s, c) => s + c.y, 0) / exitCells.length);
      
      // Move POI inward from edge for better road connection
      let x = avgX + edge.dir.x * exitInset;
      let y = avgY + edge.dir.y * exitInset;
      
      // Clamp to valid range
      x = Math.max(exitInset, Math.min(cols - exitInset - 1, x));
      y = Math.max(exitInset, Math.min(rows - exitInset - 1, y));
      
      // Find nearest passable cell
      let found = false;
      for (let r = 0; r < 30 && !found; r++) {
        for (let dy = -r; dy <= r && !found; dy++) {
          for (let dx = -r; dx <= r && !found; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
            
            try {
              const cell = grid.getCell(nx, ny);
              if (!cell.flags.blocked && !cell.flags.visualOnly && !cell.flags.water) {
                exits.push({
                  x: nx, y: ny,
                  type: 'exit',
                  id: `exit-${edge.name}`,
                  levelId: cell.levelId,
                });
                found = true;
              }
            } catch {
              // Skip invalid
            }
          }
        }
      }
    }
  }

  console.log(`[Roads] Found ${exits.length} exits`);
  return exits;
}

function scanEdgeForExit(grid: any, startX: number, startY: number, endX: number, endY: number, axis: 'x' | 'y'): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = [];
  
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      try {
        const cell = grid.getCell(x, y);
        // Look for passable, low cells that could be exits
        if (!cell.flags.blocked && !cell.flags.visualOnly && !cell.flags.water && cell.height < 120) {
          cells.push({ x, y });
        }
      } catch {
        // Out of bounds
      }
    }
  }
  
  return cells;
}

// scanEdge removed - replaced by scanEdgeForExit

/**
 * Find ramp waypoints - creates 2 POIs per ramp (entry and exit) for better road alignment
 */
function findRamps(grid: any): POI[] {
  const ramps: POI[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  // Group ramp cells by cluster
  const clusterSize = 50;
  const clusters = new Map<string, { 
    cells: Array<{ x: number; y: number; height: number }>;
    minHeight: number;
    maxHeight: number;
  }>();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      try {
        const cell = grid.getCell(x, y);
        if (cell.flags.ramp) {
          const key = `${Math.floor(x / clusterSize)},${Math.floor(y / clusterSize)}`;
          const existing = clusters.get(key);
          if (existing) {
            existing.cells.push({ x, y, height: cell.height });
            existing.minHeight = Math.min(existing.minHeight, cell.height);
            existing.maxHeight = Math.max(existing.maxHeight, cell.height);
          } else {
            clusters.set(key, { 
              cells: [{ x, y, height: cell.height }],
              minHeight: cell.height,
              maxHeight: cell.height,
            });
          }
        }
      } catch {
        // Out of bounds
      }
    }
  }

  let id = 0;
  for (const cluster of clusters.values()) {
    if (cluster.cells.length > 15) {
      // Find the lowest and highest points in the ramp cluster
      let lowPoint = cluster.cells[0];
      let highPoint = cluster.cells[0];
      
      for (const cell of cluster.cells) {
        if (cell.height < lowPoint.height) lowPoint = cell;
        if (cell.height > highPoint.height) highPoint = cell;
      }
      
      // Calculate center and direction
      const centerX = Math.round(cluster.cells.reduce((s, c) => s + c.x, 0) / cluster.cells.length);
      const centerY = Math.round(cluster.cells.reduce((s, c) => s + c.y, 0) / cluster.cells.length);
      
      // Direction from low to high
      const dirX = highPoint.x - lowPoint.x;
      const dirY = highPoint.y - lowPoint.y;
      const dirLen = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      const normX = dirX / dirLen;
      const normY = dirY / dirLen;
      
      // Create entry POI (at low end, slightly outside)
      const entryDist = 15;
      const entryX = Math.round(lowPoint.x - normX * entryDist);
      const entryY = Math.round(lowPoint.y - normY * entryDist);
      
      // Create exit POI (at high end, slightly outside)
      const exitDist = 15;
      const exitX = Math.round(highPoint.x + normX * exitDist);
      const exitY = Math.round(highPoint.y + normY * exitDist);
      
      // Validate and add entry POI
      if (entryX >= 0 && entryX < cols && entryY >= 0 && entryY < rows) {
        try {
          const cell = grid.getCell(entryX, entryY);
          if (!cell.flags.blocked && !cell.flags.visualOnly) {
            ramps.push({
              x: entryX, y: entryY,
              type: 'ramp',
              id: `ramp-${id}-entry`,
              levelId: cell.levelId,
            });
          }
        } catch {
          // Use center as fallback
          ramps.push({
            x: lowPoint.x, y: lowPoint.y,
            type: 'ramp',
            id: `ramp-${id}-entry`,
            levelId: 0,
          });
        }
      }
      
      // Validate and add exit POI
      if (exitX >= 0 && exitX < cols && exitY >= 0 && exitY < rows) {
        try {
          const cell = grid.getCell(exitX, exitY);
          if (!cell.flags.blocked && !cell.flags.visualOnly) {
            ramps.push({
              x: exitX, y: exitY,
              type: 'ramp',
              id: `ramp-${id}-exit`,
              levelId: cell.levelId,
            });
          }
        } catch {
          // Use center as fallback
          ramps.push({
            x: highPoint.x, y: highPoint.y,
            type: 'ramp',
            id: `ramp-${id}-exit`,
            levelId: 1,
          });
        }
      }
      
      id++;
    }
  }

  console.log(`[Roads] Found ${id} ramps with ${ramps.length} waypoints`);
  return ramps;
}

/**
 * Find random POIs in playable areas (only layer 0 and 1)
 */
function findRandomPOIs(grid: any, count: number, existingPOIs: POI[]): POI[] {
  const pois: POI[] = [];
  const cols = grid.getCols();
  const rows = grid.getRows();
  const margin = Math.floor(Math.min(cols, rows) * 0.15);
  const minDist = 100;

  for (let i = 0; i < count && pois.length < count; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const x = margin + Math.floor(Math.random() * (cols - 2 * margin));
      const y = margin + Math.floor(Math.random() * (rows - 2 * margin));

      try {
        const cell = grid.getCell(x, y);
        
        // Must be playable and on layer 0 or 1
        if (cell.flags.blocked || cell.flags.water || cell.flags.visualOnly) {
          attempts++;
          continue;
        }
        
        // Only place POIs on layer 0, 1 and 2
        if (cell.levelId > 2) {
          attempts++;
          continue;
        }

        // Check distance from existing POIs
        const allPOIs = [...existingPOIs, ...pois];
        let tooClose = false;
        for (const poi of allPOIs) {
          const dist = Math.sqrt((x - poi.x) ** 2 + (y - poi.y) ** 2);
          if (dist < minDist) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose) {
          const types: Array<'town' | 'dungeon'> = ['town', 'dungeon'];
          pois.push({
            x, y,
            type: types[Math.floor(Math.random() * types.length)],
            id: `poi-${i}`,
            levelId: cell.levelId,
          });
          break;
        }
      } catch {
        // Out of bounds
      }
      attempts++;
    }
  }

  return pois;
}

/**
 * Find nearest ramp for a given level transition
 */
function findNearestRampForLevel(
  ramps: POI[],
  fromX: number, fromY: number,
  fromLevel: number, toLevel: number
): POI | null {
  let nearest: POI | null = null;
  let nearestDist = Infinity;

  for (const ramp of ramps) {
    // Ramp should connect the two levels
    const dist = Math.sqrt((fromX - ramp.x) ** 2 + (fromY - ramp.y) ** 2);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = ramp;
    }
  }

  return nearest;
}

/**
 * Generate roads connecting POIs using NavMesh pathfinding
 * Roads MUST pass through ramps when crossing levels
 */
export function generateRoadsWithNavMesh(
  grid: any,
  poiCount: number,
  config: RoadConfig = DEFAULT_ROAD_CONFIG
): { pois: POI[]; segments: RoadSegment[]; totalRoadCells: number } {
  console.time('[Roads] Generate with NavMesh');

  // Build NavMesh
  console.log('[Roads] Building NavMesh...');
  const navMesh = getNavMeshSystem();
  const geometry = navMesh.buildFromGrid(grid, DEFAULT_NAVMESH_CONFIG);
  console.log('[Roads] NavMesh built, vertices:', geometry?.getAttribute('position')?.count || 0);

  // Find all POIs
  const exits = findExits(grid);
  const ramps = findRamps(grid); // Always find ramps
  const randomPOIs = findRandomPOIs(grid, poiCount, [...exits, ...ramps]);
  
  // Add level info to all POIs
  for (const poi of [...exits, ...ramps, ...randomPOIs]) {
    try {
      const cell = grid.getCell(poi.x, poi.y);
      poi.levelId = cell.levelId;
    } catch {
      poi.levelId = 0;
    }
  }

  console.log(`[Roads] POIs: ${exits.length} exits, ${ramps.length} ramps, ${randomPOIs.length} random`);

  const segments: RoadSegment[] = [];
  let totalRoadCells = 0;
  const connectedPairs = new Set<string>();

  const addSegment = (from: POI, to: POI) => {
    const pairKey = [from.id, to.id].sort().join('-');
    if (connectedPairs.has(pairKey)) return;

    const segment = createRoadSegment(grid, navMesh, from, to, segments.length, config);
    if (segment) {
      segments.push(segment);
      totalRoadCells += segment.path.length * config.roadWidth;
      connectedPairs.add(pairKey);
    }
  };

  // Build road network using sparse connections (each POI connects to max 2-3 nearest neighbors)
  const allPOIsForNetwork = [...exits, ...ramps, ...randomPOIs];
  const maxConnectionsPerPOI = 3;
  const connectionCount = new Map<string, number>();
  
  // Initialize connection counts
  for (const poi of allPOIsForNetwork) {
    connectionCount.set(poi.id, 0);
  }

  // STEP 0: Connect ramp entry/exit pairs first (mandatory)
  console.log('[Roads] Step 0: Connecting ramp entry/exit pairs...');
  const rampPairs = new Map<string, { entry?: POI; exit?: POI }>();
  for (const ramp of ramps) {
    const baseId = ramp.id.replace('-entry', '').replace('-exit', '');
    if (!rampPairs.has(baseId)) {
      rampPairs.set(baseId, {});
    }
    const pair = rampPairs.get(baseId)!;
    if (ramp.id.endsWith('-entry')) {
      pair.entry = ramp;
    } else if (ramp.id.endsWith('-exit')) {
      pair.exit = ramp;
    }
  }
  
  for (const pair of rampPairs.values()) {
    if (pair.entry && pair.exit) {
      addSegment(pair.entry, pair.exit);
      connectionCount.set(pair.entry.id, (connectionCount.get(pair.entry.id) || 0) + 1);
      connectionCount.set(pair.exit.id, (connectionCount.get(pair.exit.id) || 0) + 1);
    }
  }

  // STEP 1: Build edges sorted by distance (for MST-like approach)
  console.log('[Roads] Step 1: Building minimal spanning network...');
  interface Edge {
    from: POI;
    to: POI;
    dist: number;
  }
  
  const edges: Edge[] = [];
  for (let i = 0; i < allPOIsForNetwork.length; i++) {
    for (let j = i + 1; j < allPOIsForNetwork.length; j++) {
      const a = allPOIsForNetwork[i];
      const b = allPOIsForNetwork[j];
      const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
      edges.push({ from: a, to: b, dist });
    }
  }
  
  // Sort by distance (shortest first)
  edges.sort((a, b) => a.dist - b.dist);
  
  // Add edges greedily, respecting max connections per POI
  for (const edge of edges) {
    const fromCount = connectionCount.get(edge.from.id) || 0;
    const toCount = connectionCount.get(edge.to.id) || 0;
    
    // Skip if either POI already has max connections
    if (fromCount >= maxConnectionsPerPOI && toCount >= maxConnectionsPerPOI) {
      continue;
    }
    
    // Skip if already connected
    const pairKey = [edge.from.id, edge.to.id].sort().join('-');
    if (connectedPairs.has(pairKey)) {
      continue;
    }
    
    // Prioritize: exits need at least 1 connection, ramps need 2
    const fromIsExit = edge.from.type === 'exit';
    const toIsExit = edge.to.type === 'exit';
    const fromIsRamp = edge.from.type === 'ramp';
    const toIsRamp = edge.to.type === 'ramp';
    
    const fromNeedsMore = (fromIsExit && fromCount < 1) || (fromIsRamp && fromCount < 2) || fromCount < 1;
    const toNeedsMore = (toIsExit && toCount < 1) || (toIsRamp && toCount < 2) || toCount < 1;
    
    // Add if either needs connection, or both have room
    if (fromNeedsMore || toNeedsMore || (fromCount < maxConnectionsPerPOI && toCount < maxConnectionsPerPOI)) {
      addSegment(edge.from, edge.to);
      connectionCount.set(edge.from.id, fromCount + 1);
      connectionCount.set(edge.to.id, toCount + 1);
    }
  }
  
  // STEP 2: Ensure ALL exits have at least 1 connection
  console.log('[Roads] Step 2: Ensuring exit connectivity...');
  for (const exit of exits) {
    const exitConnections = connectionCount.get(exit.id) || 0;
    if (exitConnections === 0) {
      console.log(`[Roads] Exit ${exit.id} has no connections, forcing connection...`);
      
      // Try to connect to nearest ramp first (for level transitions)
      let nearest: POI | null = null;
      let nearestDist = Infinity;
      
      // Priority 1: nearest ramp
      for (const ramp of ramps) {
        const dist = Math.sqrt((exit.x - ramp.x) ** 2 + (exit.y - ramp.y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = ramp;
        }
      }
      
      // Priority 2: any POI
      if (!nearest || nearestDist > 300) {
        for (const target of allPOIsForNetwork) {
          if (target.id === exit.id) continue;
          const dist = Math.sqrt((exit.x - target.x) ** 2 + (exit.y - target.y) ** 2);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = target;
          }
        }
      }
      
      if (nearest) {
        addSegment(exit, nearest);
        connectionCount.set(exit.id, (connectionCount.get(exit.id) || 0) + 1);
        connectionCount.set(nearest.id, (connectionCount.get(nearest.id) || 0) + 1);
        console.log(`[Roads] Connected ${exit.id} to ${nearest.id}`);
      }
    }
  }
  
  // STEP 3: Ensure all ramps are connected (critical for level access)
  console.log('[Roads] Step 3: Ensuring ramp connectivity...');
  for (const ramp of ramps) {
    const rampConnections = connectionCount.get(ramp.id) || 0;
    if (rampConnections < 2) {
      // Ramps need at least 2 connections (one from each level)
      let nearest: POI | null = null;
      let nearestDist = Infinity;
      
      for (const target of allPOIsForNetwork) {
        if (target.id === ramp.id) continue;
        const pairKey = [ramp.id, target.id].sort().join('-');
        if (connectedPairs.has(pairKey)) continue;
        
        const dist = Math.sqrt((ramp.x - target.x) ** 2 + (ramp.y - target.y) ** 2);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = target;
        }
      }
      
      if (nearest) {
        addSegment(ramp, nearest);
        connectionCount.set(ramp.id, (connectionCount.get(ramp.id) || 0) + 1);
        connectionCount.set(nearest.id, (connectionCount.get(nearest.id) || 0) + 1);
      }
    }
  }

  console.log(`[Roads] Created ${segments.length} road segments`);
  console.timeEnd('[Roads] Generate with NavMesh');

  const allPOIs = [...exits, ...ramps, ...randomPOIs];
  return { pois: allPOIs, segments, totalRoadCells };
}

/**
 * Create a road segment between two POIs
 */
function createRoadSegment(
  grid: any,
  navMesh: ReturnType<typeof getNavMeshSystem>,
  from: POI,
  to: POI,
  index: number,
  config: RoadConfig
): RoadSegment | null {
  // Try NavMesh path first
  let path = navMesh.findPath(from.x, from.y, to.x, to.y, grid);

  // Fallback to direct A* if NavMesh fails
  if (!path || path.length === 0) {
    path = fallbackAStar(grid, from.x, from.y, to.x, to.y);
  }

  if (!path || path.length < 2) {
    console.warn(`[Roads] No path from ${from.id} to ${to.id}`);
    return null;
  }

  // Simple processing: smooth the path
  let processedPath = [...path];
  
  // Apply smoothing
  if (config.smoothingPasses > 0) {
    processedPath = smoothPath(processedPath, config.smoothingPasses, grid);
  }
  
  // Apply blur
  if (config.blurPasses > 0) {
    processedPath = blurPath(processedPath, config.blurPasses, grid);
  }

  // Validate full path - reject if any point is blocked
  for (const point of processedPath) {
    try {
      const cell = grid.getCell(point.x, point.y);
      if (cell.flags.blocked || cell.flags.visualOnly) {
        console.warn(`[Roads] Path ${from.id} -> ${to.id} crosses blocked area at (${point.x},${point.y})`);
        // Use original path with smoothing only
        const fallbackPath = smoothPath(path, config.smoothingPasses, grid);
        markRoadOnGrid(grid, fallbackPath, config.roadWidth, index);
        return {
          id: `road-${index}`,
          from,
          to,
          path: fallbackPath,
        };
      }
    } catch {
      // Out of bounds
    }
  }

  // Mark road cells on grid
  markRoadOnGrid(grid, processedPath, config.roadWidth, index);

  return {
    id: `road-${index}`,
    from,
    to,
    path: processedPath,
  };
}

/**
 * Strict A* pathfinding - only allows walkable paths
 * Respects level transitions and requires ramps
 */
function fallbackAStar(
  grid: any,
  startX: number, startY: number,
  endX: number, endY: number
): Array<{ x: number; y: number }> | null {
  const cols = grid.getCols();
  const rows = grid.getRows();

  interface Node {
    x: number;
    y: number;
    g: number;
    h: number;
    f: number;
    parent: Node | null;
    levelId: number;
  }

  const openSet: Node[] = [];
  const closedSet = new Set<string>();

  const heuristic = (x1: number, y1: number, x2: number, y2: number) =>
    Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const startCell = grid.getCell(startX, startY);
  const startNode: Node = {
    x: startX, y: startY,
    g: 0, h: heuristic(startX, startY, endX, endY),
    f: 0, parent: null,
    levelId: startCell.levelId,
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);

  // Use larger step for performance on big maps
  const mapSize = Math.max(cols, rows);
  const stepSize = mapSize > 1000 ? 8 : mapSize > 500 ? 4 : 2;
  
  const directions = [
    { dx: 0, dy: -stepSize }, 
    { dx: stepSize, dy: 0 }, 
    { dx: 0, dy: stepSize }, 
    { dx: -stepSize, dy: 0 },
  ];

  let iterations = 0;
  const maxIterations = Math.min(50000, cols * rows / 4); // Limit iterations for performance

  while (openSet.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find lowest f
    let currentIdx = 0;
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[currentIdx].f) currentIdx = i;
    }

    const current = openSet.splice(currentIdx, 1)[0];
    const key = `${current.x},${current.y}`;
    closedSet.add(key);

    // Goal reached (with tolerance for step size)
    const distToGoal = Math.abs(current.x - endX) + Math.abs(current.y - endY);
    if (distToGoal <= stepSize * 2) {
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      // Add exact endpoint
      path.push({ x: endX, y: endY });
      return path;
    }

    // Explore neighbors
    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      if (closedSet.has(`${nx},${ny}`)) continue;

      try {
        const cell = grid.getCell(nx, ny);
        const currentCell = grid.getCell(current.x, current.y);
        
        // STRICT: Block impassable terrain
        if (cell.flags.blocked) continue;
        if (cell.flags.visualOnly) continue; // Barriers/cliffs
        if (cell.flags.water) continue; // No water crossing
        if (cell.flags.boundary) continue; // Map boundaries
        if (cell.levelId > 2) continue; // Roads only on layer 0, 1 and 2

        // Check height difference - BLOCK steep cliffs
        const heightDiff = Math.abs(cell.height - currentCell.height);
        const levelDiff = Math.abs(cell.levelId - currentCell.levelId);
        
        // STRICT: Block any steep height change without ramp
        if (heightDiff > 30) {
          const hasRamp = cell.flags.ramp || currentCell.flags.ramp;
          if (!hasRamp) {
            continue; // Cannot climb cliffs without ramp
          }
        }
        
        // STRICT: Level changes MUST go through ramps
        if (levelDiff > 0) {
          const hasRamp = cell.flags.ramp || currentCell.flags.ramp;
          if (!hasRamp) {
            continue; // Must use ramp for level change
          }
        }

        // Calculate cost
        let cost = 1;
        
        // Strongly prefer ramps for navigation
        if (cell.flags.ramp) {
          cost = 0.1; // Very low cost for ramps
        } else if (cell.flags.road) {
          cost = 0.2;
        } else if (cell.flags.playable) {
          cost = 0.5;
        }
        
        // Small penalty for any height change
        if (heightDiff > 5) {
          cost += heightDiff / 100;
        }
        
        // Slope/cliff margin - check multiple distances
        let cliffPenalty = 0;
        for (const dist of [1, 2, 3]) {
          for (const d of [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }]) {
            try {
              const checkX = nx + d.dx * dist * stepSize;
              const checkY = ny + d.dy * dist * stepSize;
              const n = grid.getCell(checkX, checkY);
              
              if (n.flags.visualOnly) {
                cliffPenalty = Math.max(cliffPenalty, 20 / dist);
              } else if (Math.abs(n.height - cell.height) > 35) {
                cliffPenalty = Math.max(cliffPenalty, 10 / dist);
              }
            } catch { /* edge */ }
          }
        }
        cost += cliffPenalty;

        const g = current.g + cost;
        
        let neighbor = openSet.find(n => n.x === nx && n.y === ny);
        if (!neighbor) {
          neighbor = {
            x: nx, y: ny,
            g, h: heuristic(nx, ny, endX, endY),
            f: 0, parent: current,
            levelId: cell.levelId,
          };
          neighbor.f = neighbor.g + neighbor.h;
          openSet.push(neighbor);
        } else if (g < neighbor.g) {
          neighbor.g = g;
          neighbor.f = g + neighbor.h;
          neighbor.parent = current;
        }
      } catch {
        // Out of bounds
      }
    }
  }

  console.warn(`[AStar] No path found from (${startX},${startY}) to (${endX},${endY})`);
  return null;
}

/**
 * Apply noise to path for organic look
 * Validates each point stays on walkable terrain
 */
function applyNoiseToPath(
  path: Array<{ x: number; y: number }>,
  amplitude: number,
  seed: number,
  grid?: any
): Array<{ x: number; y: number }> {
  return path.map((point, i) => {
    // Don't noise start/end points
    if (i === 0 || i === path.length - 1) return point;
    
    const nx = noise2D(point.x * 0.1, point.y * 0.1, seed) * amplitude;
    const ny = noise2D(point.x * 0.1 + 100, point.y * 0.1 + 100, seed) * amplitude;
    
    const newX = Math.round(point.x + nx);
    const newY = Math.round(point.y + ny);
    
    // Validate new position if grid provided
    if (grid) {
      try {
        const cell = grid.getCell(newX, newY);
        // If new position is blocked, keep original
        if (cell.flags.blocked || cell.flags.visualOnly || cell.flags.water) {
          return point;
        }
      } catch {
        return point; // Out of bounds, keep original
      }
    }
    
    return { x: newX, y: newY };
  });
}

/**
 * Simplify path using Douglas-Peucker algorithm to remove redundant points
 */
function simplifyPath(
  path: Array<{ x: number; y: number }>,
  tolerance: number = 3
): Array<{ x: number; y: number }> {
  if (path.length < 3) return path;

  // Find the point with the maximum distance from line between first and last
  const first = path[0];
  const last = path[path.length - 1];
  
  let maxDist = 0;
  let maxIdx = 0;
  
  for (let i = 1; i < path.length - 1; i++) {
    const dist = perpendicularDistance(path[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }
  
  // If max distance is greater than tolerance, recursively simplify
  if (maxDist > tolerance) {
    const left = simplifyPath(path.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(path.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  } else {
    return [first, last];
  }
}

function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  if (len === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }
  
  const t = Math.max(0, Math.min(1, 
    ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (len * len)
  ));
  
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;
  
  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

/**
 * Resample path to have evenly spaced points
 */
function resamplePath(
  path: Array<{ x: number; y: number }>,
  spacing: number = 10
): Array<{ x: number; y: number }> {
  if (path.length < 2) return path;
  
  const result: Array<{ x: number; y: number }> = [path[0]];
  let accumulated = 0;
  
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const curr = path[i];
    const segmentLen = Math.sqrt((curr.x - prev.x) ** 2 + (curr.y - prev.y) ** 2);
    
    accumulated += segmentLen;
    
    if (accumulated >= spacing) {
      result.push(curr);
      accumulated = 0;
    }
  }
  
  // Always include last point
  const last = path[path.length - 1];
  if (result[result.length - 1].x !== last.x || result[result.length - 1].y !== last.y) {
    result.push(last);
  }
  
  return result;
}

/**
 * Blur path points using moving average
 */
function blurPath(
  path: Array<{ x: number; y: number }>,
  passes: number,
  grid?: any
): Array<{ x: number; y: number }> {
  if (passes <= 0 || path.length < 3) return path;
  
  let blurred = [...path];
  
  for (let pass = 0; pass < passes; pass++) {
    const newPath: Array<{ x: number; y: number }> = [];
    
    // Keep first point
    newPath.push(blurred[0]);
    
    for (let i = 1; i < blurred.length - 1; i++) {
      const prev = blurred[i - 1];
      const curr = blurred[i];
      const next = blurred[i + 1];
      
      // Weighted average (Gaussian-like kernel)
      const avgX = Math.round(prev.x * 0.25 + curr.x * 0.5 + next.x * 0.25);
      const avgY = Math.round(prev.y * 0.25 + curr.y * 0.5 + next.y * 0.25);
      
      // Validate if grid provided
      if (grid) {
        try {
          const cell = grid.getCell(avgX, avgY);
          if (cell.flags.blocked || cell.flags.visualOnly || cell.flags.water) {
            newPath.push(curr); // Keep original if blurred is invalid
            continue;
          }
        } catch {
          newPath.push(curr);
          continue;
        }
      }
      
      newPath.push({ x: avgX, y: avgY });
    }
    
    // Keep last point
    newPath.push(blurred[blurred.length - 1]);
    
    blurred = newPath;
  }
  
  return blurred;
}

/**
 * Smooth path using Chaikin's corner cutting algorithm
 */
function smoothPath(
  path: Array<{ x: number; y: number }>,
  passes: number,
  grid?: any
): Array<{ x: number; y: number }> {
  if (passes <= 0 || path.length < 3) return path;
  
  let smoothed = [...path];
  
  for (let pass = 0; pass < passes; pass++) {
    const newPath: Array<{ x: number; y: number }> = [];
    
    // Keep first point
    newPath.push(smoothed[0]);
    
    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[i + 1];
      
      // Chaikin's algorithm: create two points at 25% and 75%
      const q = {
        x: Math.round(p0.x * 0.75 + p1.x * 0.25),
        y: Math.round(p0.y * 0.75 + p1.y * 0.25),
      };
      const r = {
        x: Math.round(p0.x * 0.25 + p1.x * 0.75),
        y: Math.round(p0.y * 0.25 + p1.y * 0.75),
      };
      
      // Validate points if grid provided
      const isValid = (p: { x: number; y: number }) => {
        if (!grid) return true;
        try {
          const cell = grid.getCell(p.x, p.y);
          return !cell.flags.blocked && !cell.flags.visualOnly && !cell.flags.water;
        } catch {
          return false;
        }
      };
      
      // Only add points that are valid
      if (isValid(q)) {
        newPath.push(q);
      }
      if (isValid(r)) {
        newPath.push(r);
      } else {
        // If r is blocked, just add the original endpoint
        newPath.push(p1);
      }
    }
    
    // Keep last point
    if (newPath[newPath.length - 1].x !== smoothed[smoothed.length - 1].x ||
        newPath[newPath.length - 1].y !== smoothed[smoothed.length - 1].y) {
      newPath.push(smoothed[smoothed.length - 1]);
    }
    
    smoothed = newPath;
  }
  
  // Remove duplicate consecutive points
  const final: Array<{ x: number; y: number }> = [smoothed[0]];
  for (let i = 1; i < smoothed.length; i++) {
    const prev = final[final.length - 1];
    if (smoothed[i].x !== prev.x || smoothed[i].y !== prev.y) {
      final.push(smoothed[i]);
    }
  }
  
  return final;
}

/**
 * Mark road cells on the grid (flags only, no height modification)
 */
function markRoadOnGrid(
  grid: any,
  path: Array<{ x: number; y: number }>,
  width: number,
  roadId: number
): void {
  const halfWidth = Math.floor(width / 2);
  const cols = grid.getCols();
  const rows = grid.getRows();

  // Mark cells - flags only, DO NOT modify height
  for (let i = 0; i < path.length; i++) {
    const point = path[i];

    for (let dy = -halfWidth; dy <= halfWidth; dy++) {
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        const x = point.x + dx;
        const y = point.y + dy;

        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

        try {
          const cell = grid.getCell(x, y);
          if (cell.flags.visualOnly || cell.flags.blocked) continue;

          // Only set flags, preserve original height
          cell.flags.road = true;
          cell.flags.playable = true;
          cell.roadId = roadId;
        } catch {
          // Out of bounds
        }
      }
    }
  }
}

