/**
 * Phase 1: Logical Level Grid
 * Defines the logical structure of levels without calculating final heights.
 */

import { Grid } from '../core/grid.js';
import { isUnderwaterLevel, isMountainPeakLevel } from '../core/level.js';

/**
 * Level distribution configuration.
 */
export interface LevelDistributionConfig {
  /** Minimum level ID (can be negative for underwater) */
  minLevel: number;
  /** Maximum level ID */
  maxLevel: number;
  /** Maximum walkable level (above this is visual-only) */
  maxWalkableLevel: number;
  /** Noise scale for level distribution (default: 0.05) */
  noiseScale: number;
  /** Seed for random generation (optional) */
  seed?: number;
}

/**
 * Default level distribution configuration.
 */
export const DEFAULT_LEVEL_CONFIG: LevelDistributionConfig = {
  minLevel: -1,
  maxLevel: 3,
  maxWalkableLevel: 2,
  noiseScale: 0.05,
};

/**
 * Region definition for level assignment.
 */
export interface LevelRegion {
  /** Region center X */
  centerX: number;
  /** Region center Y */
  centerY: number;
  /** Region radius */
  radius: number;
  /** Level ID for this region */
  levelId: number;
  /** Falloff factor (0 = hard edge, 1 = soft edge) */
  falloff: number;
}

/**
 * Simple seeded random number generator.
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * Simple 2D noise function (value noise).
 */
function valueNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Smoothed noise with interpolation.
 */
function smoothNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  // Smooth interpolation
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  // Corner values
  const n00 = valueNoise(x0, y0, seed);
  const n10 = valueNoise(x0 + 1, y0, seed);
  const n01 = valueNoise(x0, y0 + 1, seed);
  const n11 = valueNoise(x0 + 1, y0 + 1, seed);

  // Bilinear interpolation
  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sy * (nx1 - nx0);
}

/**
 * Fractal Brownian Motion noise.
 */
function fbmNoise(x: number, y: number, seed: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency, seed + i * 100);
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Distributes levels across the grid using noise.
 *
 * @param grid - Grid instance
 * @param config - Level distribution configuration
 */
export function distributeLevels(
  grid: Grid,
  config: LevelDistributionConfig = DEFAULT_LEVEL_CONFIG
): void {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const seed = config.seed ?? Date.now();
  const levelRange = config.maxLevel - config.minLevel;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Generate noise value
      const noiseValue = fbmNoise(x * config.noiseScale, y * config.noiseScale, seed);

      // Map noise to level ID
      const levelId = Math.round(config.minLevel + noiseValue * levelRange);
      const clampedLevel = Math.max(config.minLevel, Math.min(config.maxLevel, levelId));

      grid.setLevelId(x, y, clampedLevel);

      // Set flags based on level
      const cell = grid.getCell(x, y);
      cell.flags.underwater = isUnderwaterLevel(clampedLevel);
      cell.flags.visualOnly = isMountainPeakLevel(clampedLevel, config.maxWalkableLevel);
      cell.flags.playable = !cell.flags.underwater && !cell.flags.visualOnly && !cell.flags.blocked;
    }
  }
}

/**
 * Applies level regions to the grid (blob-like areas).
 *
 * @param grid - Grid instance
 * @param regions - Array of level regions
 */
export function applyLevelRegions(grid: Grid, regions: LevelRegion[]): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (const region of regions) {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const dx = x - region.centerX;
        const dy = y - region.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= region.radius) {
          // Calculate falloff
          const t = distance / region.radius;
          const falloffFactor = region.falloff > 0
            ? Math.pow(1 - t, region.falloff)
            : (t < 1 ? 1 : 0);

          if (falloffFactor > 0.5) {
            grid.setLevelId(x, y, region.levelId);
          }
        }
      }
    }
  }
}

/**
 * Generates random level regions.
 *
 * @param grid - Grid instance
 * @param count - Number of regions to generate
 * @param config - Level distribution configuration
 * @returns Array of level regions
 */
export function generateRandomRegions(
  grid: Grid,
  count: number,
  config: LevelDistributionConfig = DEFAULT_LEVEL_CONFIG
): LevelRegion[] {
  const regions: LevelRegion[] = [];
  const rng = new SeededRandom(config.seed);
  const cols = grid.getCols();
  const rows = grid.getRows();
  const margin = Math.floor(Math.min(cols, rows) * 0.1);
  const maxRadius = Math.floor(Math.min(cols, rows) * 0.3);
  const minRadius = Math.floor(Math.min(cols, rows) * 0.1);

  for (let i = 0; i < count; i++) {
    regions.push({
      centerX: rng.nextInt(margin, cols - margin),
      centerY: rng.nextInt(margin, rows - margin),
      radius: rng.nextInt(minRadius, maxRadius),
      levelId: rng.nextInt(config.minLevel, config.maxLevel),
      falloff: rng.next(),
    });
  }

  return regions;
}

/**
 * Marks inaccessible regions (not connected to roads).
 *
 * @param grid - Grid instance
 */
export function markInaccessibleRegions(grid: Grid): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      // If cell has no road and is not playable, mark as scenery only
      if (!cell.flags.road && !cell.flags.playable) {
        cell.flags.visualOnly = true;
      }
    }
  }
}

/**
 * Phase 1 result.
 */
export interface Phase1Result {
  /** Grid with levels assigned */
  grid: Grid;
  /** Level regions applied */
  regions: LevelRegion[];
  /** Level statistics */
  stats: {
    levelCounts: Map<number, number>;
    underwaterCells: number;
    playableCells: number;
    visualOnlyCells: number;
  };
}

/**
 * Executes Phase 1: Logical Level Grid.
 *
 * @param grid - Grid instance
 * @param config - Level distribution configuration
 * @param regionCount - Number of regions to generate (default: 5)
 * @returns Phase 1 result
 */
export function executePhase1(
  grid: Grid,
  config: LevelDistributionConfig = DEFAULT_LEVEL_CONFIG,
  regionCount: number = 5
): Phase1Result {
  // Step 1: Distribute base levels using noise
  distributeLevels(grid, config);

  // Step 2: Generate and apply random regions
  const regions = generateRandomRegions(grid, regionCount, config);
  applyLevelRegions(grid, regions);

  // Step 3: Calculate statistics
  const levelCounts = new Map<number, number>();
  let underwaterCells = 0;
  let playableCells = 0;
  let visualOnlyCells = 0;

  grid.forEachCell((cell) => {
    const count = levelCounts.get(cell.levelId) || 0;
    levelCounts.set(cell.levelId, count + 1);

    if (cell.flags.underwater) underwaterCells++;
    if (cell.flags.playable) playableCells++;
    if (cell.flags.visualOnly) visualOnlyCells++;
  });

  return {
    grid,
    regions,
    stats: {
      levelCounts,
      underwaterCells,
      playableCells,
      visualOnlyCells,
    },
  };
}

