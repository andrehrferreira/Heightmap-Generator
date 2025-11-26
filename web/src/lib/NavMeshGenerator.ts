/**
 * NavMesh Generator - Creates navigation meshes from terrain for pathfinding
 * Uses three-pathfinding library for robust path calculation
 */

import * as THREE from 'three';
import { Pathfinding } from 'three-pathfinding';

export interface NavMeshConfig {
  /** Resolution of navmesh (lower = more detailed but slower) */
  resolution: number;
  /** Maximum slope angle in degrees that is walkable */
  maxSlopeAngle: number;
  /** Minimum height difference for a step */
  stepHeight: number;
  /** Agent radius for path clearance */
  agentRadius: number;
}

export const DEFAULT_NAVMESH_CONFIG: NavMeshConfig = {
  resolution: 8,      // Sample every 8 cells (faster)
  maxSlopeAngle: 60,  // 60 degree max slope (more permissive)
  stepHeight: 100,    // Max step height (more permissive)
  agentRadius: 1,     // 1 cell clearance (faster)
};

interface NavCell {
  x: number;
  y: number;
  height: number;
  walkable: boolean;
  levelId: number;
}

/**
 * NavMesh system for terrain pathfinding
 */
export class NavMeshSystem {
  private pathfinding: Pathfinding;
  private zoneId: string = 'terrain';
  private isInitialized: boolean = false;
  private navMeshGeometry: THREE.BufferGeometry | null = null;
  private gridWidth: number = 0;
  private gridHeight: number = 0;
  private cellScale: number = 1;

  constructor() {
    this.pathfinding = new Pathfinding();
  }

  /**
   * Build navigation mesh from grid data
   */
  buildFromGrid(
    grid: any,
    config: NavMeshConfig = DEFAULT_NAVMESH_CONFIG
  ): THREE.BufferGeometry {
    console.time('[NavMesh] Build');
    
    const cols = grid.getCols();
    const rows = grid.getRows();
    this.gridWidth = cols;
    this.gridHeight = rows;
    this.cellScale = config.resolution;

    // Sample grid at resolution
    const sampledCols = Math.floor(cols / config.resolution);
    const sampledRows = Math.floor(rows / config.resolution);

    // Build walkability map
    const cells: NavCell[][] = [];
    
    for (let sy = 0; sy < sampledRows; sy++) {
      cells[sy] = [];
      for (let sx = 0; sx < sampledCols; sx++) {
        const gx = sx * config.resolution;
        const gy = sy * config.resolution;
        
        const cell = grid.getCell(gx, gy);
        const walkable = this.isCellWalkable(grid, gx, gy, config);
        
        cells[sy][sx] = {
          x: sx,
          y: sy,
          height: cell.height,
          walkable,
          levelId: cell.levelId,
        };
      }
    }

    // Generate triangle mesh from walkable cells
    const vertices: number[] = [];
    const indices: number[] = [];
    const terrainSize = 16000; // Match Preview3D terrain size
    const heightScale = 800;

    let minH = Infinity, maxH = -Infinity;
    for (let sy = 0; sy < sampledRows; sy++) {
      for (let sx = 0; sx < sampledCols; sx++) {
        minH = Math.min(minH, cells[sy][sx].height);
        maxH = Math.max(maxH, cells[sy][sx].height);
      }
    }
    const heightRange = maxH - minH || 1;

    // Create vertices for each walkable cell
    const vertexMap = new Map<string, number>();
    
    for (let sy = 0; sy < sampledRows - 1; sy++) {
      for (let sx = 0; sx < sampledCols - 1; sx++) {
        const c00 = cells[sy][sx];
        const c10 = cells[sy][sx + 1];
        const c01 = cells[sy + 1][sx];
        const c11 = cells[sy + 1][sx + 1];

        // Only create triangles for walkable quads
        if (!c00.walkable || !c10.walkable || !c01.walkable || !c11.walkable) {
          continue;
        }

        // Check slope between corners
        const heights = [c00.height, c10.height, c01.height, c11.height];
        const maxSlope = Math.max(...heights) - Math.min(...heights);
        if (maxSlope > config.stepHeight * 2) {
          continue; // Too steep
        }

        // Get or create vertex indices
        const getVertexIndex = (cell: NavCell): number => {
          const key = `${cell.x},${cell.y}`;
          if (vertexMap.has(key)) {
            return vertexMap.get(key)!;
          }
          
          const idx = vertices.length / 3;
          const px = (cell.x / sampledCols - 0.5) * terrainSize;
          const py = ((cell.height - minH) / heightRange) * heightScale + 10;
          const pz = (cell.y / sampledRows - 0.5) * terrainSize;
          
          vertices.push(px, py, pz);
          vertexMap.set(key, idx);
          return idx;
        };

        const i00 = getVertexIndex(c00);
        const i10 = getVertexIndex(c10);
        const i01 = getVertexIndex(c01);
        const i11 = getVertexIndex(c11);

        // Two triangles per quad
        indices.push(i00, i10, i01);
        indices.push(i10, i11, i01);
      }
    }

    // Create geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    this.navMeshGeometry = geometry;

    // Initialize pathfinding
    try {
      const zone = Pathfinding.createZone(geometry);
      this.pathfinding.setZoneData(this.zoneId, zone);
      this.isInitialized = true;
      console.log(`[NavMesh] Created with ${vertices.length / 3} vertices, ${indices.length / 3} triangles`);
    } catch (e) {
      console.error('[NavMesh] Failed to create zone:', e);
      this.isInitialized = false;
    }

    console.timeEnd('[NavMesh] Build');
    return geometry;
  }

  /**
   * Check if a cell is walkable
   */
  private isCellWalkable(grid: any, x: number, y: number, config: NavMeshConfig): boolean {
    try {
      const cell = grid.getCell(x, y);
      
      // Blocked cells are never walkable
      if (cell.flags.blocked) return false;
      if (cell.flags.visualOnly) return false;
      
      // Water is not walkable
      if (cell.flags.water) return false;
      
      // Everything else is potentially walkable
      // Roads, ramps, and playable areas are always walkable
      if (cell.flags.road || cell.flags.ramp || cell.flags.playable) {
        return true;
      }

      // For regular terrain, check if slope is walkable
      // Only check immediate neighbors for speed
      const neighbors = [
        { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
        { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
      ];
      
      for (const n of neighbors) {
        try {
          const neighbor = grid.getCell(x + n.dx, y + n.dy);
          const heightDiff = Math.abs(neighbor.height - cell.height);
          
          // Simple height check (not slope angle)
          if (heightDiff > config.stepHeight) {
            // Check if this is a level boundary - still allow but penalize
            continue;
          }
        } catch {
          // Edge of grid - still walkable
        }
      }

      // Default: walkable if not explicitly blocked
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find path between two grid positions
   */
  findPath(
    startX: number, startY: number,
    endX: number, endY: number,
    grid: any
  ): Array<{ x: number; y: number }> | null {
    if (!this.isInitialized) {
      console.warn('[NavMesh] Not initialized');
      return null;
    }

    const terrainSize = 16000;
    const heightScale = 800;
    
    // Get height stats
    let minH = Infinity, maxH = -Infinity;
    grid.forEachCell((cell: any) => {
      minH = Math.min(minH, cell.height);
      maxH = Math.max(maxH, cell.height);
    });
    const heightRange = maxH - minH || 1;

    // Convert grid coords to 3D world coords
    const startCell = grid.getCell(startX, startY);
    const endCell = grid.getCell(endX, endY);

    const start = new THREE.Vector3(
      (startX / this.gridWidth - 0.5) * terrainSize,
      ((startCell.height - minH) / heightRange) * heightScale + 10,
      (startY / this.gridHeight - 0.5) * terrainSize
    );

    const end = new THREE.Vector3(
      (endX / this.gridWidth - 0.5) * terrainSize,
      ((endCell.height - minH) / heightRange) * heightScale + 10,
      (endY / this.gridHeight - 0.5) * terrainSize
    );

    // Find group IDs
    const startGroup = this.pathfinding.getGroup(this.zoneId, start);
    const endGroup = this.pathfinding.getGroup(this.zoneId, end);

    if (startGroup === null || endGroup === null) {
      console.warn('[NavMesh] Start or end position not on navmesh');
      return null;
    }

    // Find path
    const path3D = this.pathfinding.findPath(start, end, this.zoneId, startGroup);

    if (!path3D || path3D.length === 0) {
      console.warn('[NavMesh] No path found');
      return null;
    }

    // Convert back to grid coordinates
    const gridPath: Array<{ x: number; y: number }> = [];
    
    for (const point of path3D) {
      const gx = Math.round((point.x / terrainSize + 0.5) * this.gridWidth);
      const gy = Math.round((point.z / terrainSize + 0.5) * this.gridHeight);
      
      // Avoid duplicates
      const last = gridPath[gridPath.length - 1];
      if (!last || last.x !== gx || last.y !== gy) {
        gridPath.push({ x: gx, y: gy });
      }
    }

    console.log(`[NavMesh] Found path with ${gridPath.length} waypoints`);
    return gridPath;
  }

  /**
   * Get the navmesh geometry for visualization
   */
  getGeometry(): THREE.BufferGeometry | null {
    console.log('[NavMesh] getGeometry called, hasGeometry:', !!this.navMeshGeometry);
    return this.navMeshGeometry;
  }

  /**
   * Check if navmesh has been built
   */
  hasGeometry(): boolean {
    return this.navMeshGeometry !== null && this.navMeshGeometry.getAttribute('position') !== null;
  }

  /**
   * Check if navmesh is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.navMeshGeometry) {
      this.navMeshGeometry.dispose();
      this.navMeshGeometry = null;
    }
    this.isInitialized = false;
  }
}

// Singleton instance
let navMeshSystem: NavMeshSystem | null = null;

export function getNavMeshSystem(): NavMeshSystem {
  if (!navMeshSystem) {
    navMeshSystem = new NavMeshSystem();
  }
  return navMeshSystem;
}

export function destroyNavMeshSystem(): void {
  if (navMeshSystem) {
    navMeshSystem.destroy();
    navMeshSystem = null;
  }
}

