/**
 * Phase 3: Convert LevelId + Roads to Heightmap
 * Converts logical levels and road network into actual height values.
 */

import { Grid } from '../core/grid.js';
import { calculateBaseHeight, MAX_HEIGHT_DIFFERENCE } from '../core/level.js';
import { interpolateRampHeight, SlopeConfig, DEFAULT_SLOPE_CONFIG } from '../core/slope.js';

/**
 * Heightmap generation configuration.
 */
export interface HeightmapConfig {
  /** Noise amplitude for biome variation (default: 10) */
  noiseAmplitude: number;
  /** Noise scale for biome variation (default: 0.02) */
  noiseScale: number;
  /** Smoothing iterations for roads (default: 2) */
  roadSmoothingIterations: number;
  /** Smoothing radius around roads (default: 2) */
  roadSmoothingRadius: number;
  /** Slope configuration for ramps */
  slopeConfig: SlopeConfig;
  /** Seed for noise generation */
  seed?: number;
}

/**
 * Default heightmap configuration.
 */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  noiseAmplitude: 10,
  noiseScale: 0.02,
  roadSmoothingIterations: 2,
  roadSmoothingRadius: 2,
  slopeConfig: DEFAULT_SLOPE_CONFIG,
};

/**
 * Simple noise function for biome variation.
 */
function biomeNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // Range: -1 to 1
}

/**
 * Smoothed biome noise.
 */
function smoothBiomeNoise(x: number, y: number, seed: number, scale: number): number {
  const x0 = Math.floor(x * scale);
  const y0 = Math.floor(y * scale);
  const fx = x * scale - x0;
  const fy = y * scale - y0;

  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = biomeNoise(x0, y0, seed);
  const n10 = biomeNoise(x0 + 1, y0, seed);
  const n01 = biomeNoise(x0, y0 + 1, seed);
  const n11 = biomeNoise(x0 + 1, y0 + 1, seed);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sy * (nx1 - nx0);
}

/**
 * Applies base heights to grid based on level IDs.
 *
 * @param grid - Grid instance
 */
export function applyBaseHeights(grid: Grid): void {
  grid.forEachCell((cell, x, y) => {
    if (!cell.flags.ramp) {
      const baseHeight = calculateBaseHeight(cell.levelId);
      grid.setHeight(x, y, baseHeight);
    }
  });
}

/**
 * Applies biome noise to heights.
 *
 * @param grid - Grid instance
 * @param config - Heightmap configuration
 */
export function applyBiomeNoise(grid: Grid, config: HeightmapConfig): void {
  const seed = config.seed ?? Date.now();
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      // Skip roads and ramps - they need to stay flat/smooth
      if (cell.flags.road || cell.flags.ramp) {
        continue;
      }

      // Apply noise
      const noise = smoothBiomeNoise(x, y, seed, config.noiseScale);
      const currentHeight = cell.height;
      const newHeight = currentHeight + noise * config.noiseAmplitude;

      grid.setHeight(x, y, newHeight);
    }
  }
}

/**
 * Smooths road areas to ensure clean spell decals and movement.
 *
 * @param grid - Grid instance
 * @param config - Heightmap configuration
 */
export function smoothRoads(grid: Grid, config: HeightmapConfig): void {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const radius = config.roadSmoothingRadius;

  for (let iteration = 0; iteration < config.roadSmoothingIterations; iteration++) {
    // Create height buffer
    const heightBuffer = new Float32Array(rows * cols);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const index = y * cols + x;

        // Only smooth cells near roads
        if (!isNearRoad(grid, x, y, radius)) {
          heightBuffer[index] = cell.height;
          continue;
        }

        // Skip ramp cells - they have calculated heights
        if (cell.flags.ramp) {
          heightBuffer[index] = cell.height;
          continue;
        }

        // Average height of neighbors
        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const neighbor = grid.getCell(nx, ny);
              // Only average with same level
              if (neighbor.levelId === cell.levelId) {
                sum += neighbor.height;
                count++;
              }
            }
          }
        }

        heightBuffer[index] = count > 0 ? sum / count : cell.height;
      }
    }

    // Apply buffer
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        if (!cell.flags.ramp) {
          grid.setHeight(x, y, heightBuffer[y * cols + x]);
        }
      }
    }
  }
}

/**
 * Checks if a cell is near a road.
 */
function isNearRoad(grid: Grid, x: number, y: number, radius: number): boolean {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        if (grid.getCell(nx, ny).flags.road) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Detects and marks cliff cells.
 *
 * @param grid - Grid instance
 */
export function detectCliffs(grid: Grid): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      // Skip cells that are already ramps
      if (cell.flags.ramp) {
        continue;
      }

      // Check neighbors for large height differences
      let isCliff = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const neighbor = grid.getCell(nx, ny);

            // If level difference is > 0 and no ramp, it's a cliff
            if (Math.abs(neighbor.levelId - cell.levelId) > 0 && !neighbor.flags.ramp) {
              isCliff = true;
              break;
            }
          }
        }
        if (isCliff) break;
      }

      cell.flags.cliff = isCliff;
    }
  }
}

/**
 * Phase 3 result.
 */
export interface Phase3Result {
  /** Grid with heights calculated */
  grid: Grid;
  /** Height statistics */
  stats: {
    minHeight: number;
    maxHeight: number;
    avgHeight: number;
    cliffCells: number;
  };
}

/**
 * Executes Phase 3: Convert LevelId + Roads to Heightmap.
 *
 * @param grid - Grid instance (should have levels and roads from Phase 1 and 2)
 * @param config - Heightmap configuration
 * @returns Phase 3 result
 */
export function executePhase3(
  grid: Grid,
  config: HeightmapConfig = DEFAULT_HEIGHTMAP_CONFIG
): Phase3Result {
  // Step 1: Apply base heights
  applyBaseHeights(grid);

  // Step 2: Apply biome noise
  applyBiomeNoise(grid, config);

  // Step 3: Smooth roads
  smoothRoads(grid, config);

  // Step 4: Detect cliffs
  detectCliffs(grid);

  // Step 5: Calculate statistics
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  let sumHeight = 0;
  let cliffCells = 0;
  let cellCount = 0;

  grid.forEachCell((cell) => {
    minHeight = Math.min(minHeight, cell.height);
    maxHeight = Math.max(maxHeight, cell.height);
    sumHeight += cell.height;
    cellCount++;

    if (cell.flags.cliff) cliffCells++;
  });

  return {
    grid,
    stats: {
      minHeight,
      maxHeight,
      avgHeight: sumHeight / cellCount,
      cliffCells,
    },
  };
}

