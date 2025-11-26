/**
 * Phase 3: Convert LevelId + Roads to Heightmap
 * Converts logical levels and road network into actual height values.
 */

import { Grid } from '../core/grid.js';
import { calculateBaseHeight, MAX_HEIGHT_DIFFERENCE } from '../core/level.js';
import { SlopeConfig, DEFAULT_SLOPE_CONFIG } from '../core/slope.js';
import { applyErosionToGrid, ErosionConfig } from '../filters/erosion.js';
import { applyAdvancedRamps, AdvancedRampConfig, DEFAULT_ADVANCED_RAMP_CONFIG } from '../core/advanced-ramps.js';

/**
 * Heightmap generation configuration.
 */
export interface HeightmapConfig {
  /** Noise amplitude for biome variation (default: 15) */
  noiseAmplitude: number;
  /** Noise scale for biome variation (default: 0.03) */
  noiseScale: number;
  /** Smoothing iterations for roads (default: 2) */
  roadSmoothingIterations: number;
  /** Smoothing radius around roads (default: 2) */
  roadSmoothingRadius: number;
  /** Slope configuration for ramps */
  slopeConfig: SlopeConfig;
  /** Seed for noise generation */
  seed?: number;
  /** Level transition smoothing iterations (default: 8) */
  levelSmoothingIterations: number;
  /** Level transition blend radius (default: 4) */
  levelBlendRadius: number;
  /** Height variation within same level (default: 20) */
  intraLevelVariation: number;
  /** Enable erosion simulation for realistic terrain */
  enableErosion: boolean;
  /** Erosion configuration */
  erosionConfig: Partial<ErosionConfig>;
  /** Advanced ramp configuration */
  advancedRampConfig: AdvancedRampConfig;
}

/**
 * Default heightmap configuration.
 */
export const DEFAULT_HEIGHTMAP_CONFIG: HeightmapConfig = {
  noiseAmplitude: 15,
  noiseScale: 0.03,
  roadSmoothingIterations: 2,
  roadSmoothingRadius: 2,
  slopeConfig: DEFAULT_SLOPE_CONFIG,
  levelSmoothingIterations: 8,
  levelBlendRadius: 4,
  intraLevelVariation: 20,
  enableErosion: true,
  erosionConfig: {
    hydraulicIterations: 30,
    thermalIterations: 15,
    smoothingIterations: 3,
    smoothingRadius: 2,
  },
  advancedRampConfig: DEFAULT_ADVANCED_RAMP_CONFIG,
};

/**
 * Simple noise function for biome variation.
 */
function biomeNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1; // Range: -1 to 1
}

/**
 * Smoothed biome noise with multiple octaves.
 */
function smoothBiomeNoise(x: number, y: number, seed: number, scale: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const x0 = Math.floor(x * scale * frequency);
    const y0 = Math.floor(y * scale * frequency);
    const fx = x * scale * frequency - x0;
    const fy = y * scale * frequency - y0;

    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = biomeNoise(x0, y0, seed + i * 100);
    const n10 = biomeNoise(x0 + 1, y0, seed + i * 100);
    const n01 = biomeNoise(x0, y0 + 1, seed + i * 100);
    const n11 = biomeNoise(x0 + 1, y0 + 1, seed + i * 100);

    const nx0 = n00 + sx * (n10 - n00);
    const nx1 = n01 + sx * (n11 - n01);
    const noise = nx0 + sy * (nx1 - nx0);

    value += amplitude * noise;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Applies base heights to grid based on level IDs.
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
 * Smooths height transitions between different levels.
 * Creates gradual slopes instead of sharp cliffs.
 */
export function smoothLevelTransitions(grid: Grid, config: HeightmapConfig): void {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const radius = config.levelBlendRadius;

  for (let iteration = 0; iteration < config.levelSmoothingIterations; iteration++) {
    const heightBuffer = new Float32Array(rows * cols);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const index = y * cols + x;

        // Skip ramps and roads - they have specific heights
        if (cell.flags.ramp || cell.flags.road) {
          heightBuffer[index] = cell.height;
          continue;
        }

        // Check if near level boundary
        const isNearBoundary = isNearLevelBoundary(grid, x, y, radius);

        if (!isNearBoundary) {
          heightBuffer[index] = cell.height;
          continue;
        }

        // Gaussian-weighted average for smooth blending
        let weightedSum = 0;
        let totalWeight = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const neighbor = grid.getCell(nx, ny);
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Gaussian weight - closer neighbors have more influence
              const sigma = radius / 2;
              const weight = Math.exp(-(distance * distance) / (2 * sigma * sigma));

              weightedSum += neighbor.height * weight;
              totalWeight += weight;
            }
          }
        }

        heightBuffer[index] = totalWeight > 0 ? weightedSum / totalWeight : cell.height;
      }
    }

    // Apply smoothed heights
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        if (!cell.flags.ramp && !cell.flags.road) {
          grid.setHeight(x, y, heightBuffer[y * cols + x]);
        }
      }
    }
  }
}

/**
 * Checks if a cell is near a level boundary.
 */
function isNearLevelBoundary(grid: Grid, x: number, y: number, radius: number): boolean {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const centerLevel = grid.getCell(x, y).levelId;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        if (grid.getCell(nx, ny).levelId !== centerLevel) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Applies biome noise to heights for natural variation.
 */
export function applyBiomeNoise(grid: Grid, config: HeightmapConfig): void {
  const seed = config.seed ?? Date.now();
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      // Skip roads - they need to stay flat
      if (cell.flags.road) {
        continue;
      }

      // Apply multi-octave noise
      const noise = smoothBiomeNoise(x, y, seed, config.noiseScale, 4);
      
      // Reduce noise amplitude near ramps
      const amplitude = cell.flags.ramp 
        ? config.noiseAmplitude * 0.3 
        : config.noiseAmplitude;
      
      const currentHeight = cell.height;
      const newHeight = currentHeight + noise * amplitude;

      grid.setHeight(x, y, newHeight);
    }
  }
}

/**
 * Adds subtle variation within the same level for natural terrain.
 */
export function addIntraLevelVariation(grid: Grid, config: HeightmapConfig): void {
  const seed = (config.seed ?? Date.now()) + 12345;
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      // Skip roads and ramps
      if (cell.flags.road || cell.flags.ramp) {
        continue;
      }

      // Low-frequency variation for gentle rolling terrain
      const variation = smoothBiomeNoise(x, y, seed, 0.01, 2) * config.intraLevelVariation;
      grid.setHeight(x, y, cell.height + variation);
    }
  }
}

/**
 * Smooths road areas to ensure clean spell decals and movement.
 */
export function smoothRoads(grid: Grid, config: HeightmapConfig): void {
  const rows = grid.getRows();
  const cols = grid.getCols();
  const radius = config.roadSmoothingRadius;

  for (let iteration = 0; iteration < config.roadSmoothingIterations; iteration++) {
    const heightBuffer = new Float32Array(rows * cols);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const index = y * cols + x;

        if (!isNearRoad(grid, x, y, radius)) {
          heightBuffer[index] = cell.height;
          continue;
        }

        if (cell.flags.ramp) {
          heightBuffer[index] = cell.height;
          continue;
        }

        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const neighbor = grid.getCell(nx, ny);
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
 */
export function detectCliffs(grid: Grid): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);

      if (cell.flags.ramp) {
        continue;
      }

      let isCliff = false;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;

          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
            const neighbor = grid.getCell(nx, ny);

            // Use height difference instead of level difference
            const heightDiff = Math.abs(neighbor.height - cell.height);
            if (heightDiff > MAX_HEIGHT_DIFFERENCE * 0.3 && !neighbor.flags.ramp) {
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
 * Final smoothing pass for overall terrain cohesion.
 */
export function finalSmoothing(grid: Grid, iterations: number = 2): void {
  const rows = grid.getRows();
  const cols = grid.getCols();

  for (let i = 0; i < iterations; i++) {
    const heightBuffer = new Float32Array(rows * cols);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const index = y * cols + x;

        // Keep roads flat
        if (cell.flags.road) {
          heightBuffer[index] = cell.height;
          continue;
        }

        // Simple 3x3 blur
        let sum = 0;
        let count = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              sum += grid.getCell(nx, ny).height;
              count++;
            }
          }
        }

        // Blend: 70% smoothed, 30% original for preserving some detail
        const smoothed = sum / count;
        heightBuffer[index] = cell.height * 0.3 + smoothed * 0.7;
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        if (!cell.flags.road) {
          grid.setHeight(x, y, heightBuffer[y * cols + x]);
        }
      }
    }
  }
}

/**
 * Phase 3 result.
 */
export interface Phase3Result {
  grid: Grid;
  stats: {
    minHeight: number;
    maxHeight: number;
    avgHeight: number;
    cliffCells: number;
  };
}

/**
 * Executes Phase 3: Convert LevelId + Roads to Heightmap.
 */
export function executePhase3(
  grid: Grid,
  config: HeightmapConfig = DEFAULT_HEIGHTMAP_CONFIG
): Phase3Result {
  console.time('[Phase3] Total');

  // Step 1: Apply base heights from levels
  console.time('[Phase3] Base heights');
  applyBaseHeights(grid);
  console.timeEnd('[Phase3] Base heights');

  // Step 2: Smooth transitions between different levels
  console.time('[Phase3] Level transitions');
  smoothLevelTransitions(grid, config);
  console.timeEnd('[Phase3] Level transitions');

  // Step 2.5: Apply advanced ramps with noise and inaccessible areas
  if (config.advancedRampConfig.enabled) {
    console.time('[Phase3] Advanced ramps');
    applyAdvancedRamps(grid, config.advancedRampConfig);
    console.timeEnd('[Phase3] Advanced ramps');
  }

  // Step 3: Add intra-level variation for natural terrain
  console.time('[Phase3] Intra-level variation');
  addIntraLevelVariation(grid, config);
  console.timeEnd('[Phase3] Intra-level variation');

  // Step 4: Apply biome noise for fine detail
  console.time('[Phase3] Biome noise');
  applyBiomeNoise(grid, config);
  console.timeEnd('[Phase3] Biome noise');

  // Step 5: Apply erosion for realistic terrain
  if (config.enableErosion) {
    console.time('[Phase3] Erosion');
    applyErosionToGrid(grid, config.erosionConfig);
    console.timeEnd('[Phase3] Erosion');
  }

  // Step 6: Smooth roads
  console.time('[Phase3] Road smoothing');
  smoothRoads(grid, config);
  console.timeEnd('[Phase3] Road smoothing');

  // Step 7: Final smoothing pass
  console.time('[Phase3] Final smoothing');
  finalSmoothing(grid, 3);
  console.timeEnd('[Phase3] Final smoothing');

  // Step 8: Detect cliffs
  console.time('[Phase3] Cliff detection');
  detectCliffs(grid);
  console.timeEnd('[Phase3] Cliff detection');

  console.timeEnd('[Phase3] Total');

  // Step 9: Calculate statistics
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
