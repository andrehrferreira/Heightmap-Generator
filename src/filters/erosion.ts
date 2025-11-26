/**
 * Terrain erosion filters for creating realistic landscapes.
 * Implements hydraulic erosion, thermal erosion, and smoothing.
 */

import { Grid } from '../core/grid.js';

/**
 * Erosion configuration.
 */
export interface ErosionConfig {
  /** Number of hydraulic erosion iterations */
  hydraulicIterations: number;
  /** Number of thermal erosion iterations */
  thermalIterations: number;
  /** Rain amount per cell per iteration */
  rainAmount: number;
  /** Sediment capacity factor */
  sedimentCapacity: number;
  /** Erosion strength */
  erosionStrength: number;
  /** Deposition rate */
  depositionRate: number;
  /** Evaporation rate */
  evaporationRate: number;
  /** Thermal erosion talus angle (max slope before material slides) */
  talusAngle: number;
  /** Final smoothing iterations */
  smoothingIterations: number;
  /** Smoothing radius */
  smoothingRadius: number;
}

export const DEFAULT_EROSION_CONFIG: ErosionConfig = {
  hydraulicIterations: 50,
  thermalIterations: 20,
  rainAmount: 0.01,
  sedimentCapacity: 0.5,
  erosionStrength: 0.3,
  depositionRate: 0.3,
  evaporationRate: 0.05,
  talusAngle: 0.6, // ~35 degrees
  smoothingIterations: 3,
  smoothingRadius: 2,
};

/**
 * Get height at position with boundary check.
 */
function getHeight(heights: Float32Array, x: number, y: number, width: number, height: number): number {
  if (x < 0 || x >= width || y < 0 || y >= height) {
    return 0;
  }
  return heights[y * width + x];
}


/**
 * Find lowest neighbor and return direction.
 */
function findLowestNeighbor(
  heights: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number
): { dx: number; dy: number; diff: number } | null {
  const currentHeight = getHeight(heights, x, y, width, height);
  let lowestDiff = 0;
  let lowestDx = 0;
  let lowestDy = 0;

  // Check 8 neighbors
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1]
  ];

  for (const [dx, dy] of neighbors) {
    const nx = x + dx;
    const ny = y + dy;
    const neighborHeight = getHeight(heights, nx, ny, width, height);
    const diff = currentHeight - neighborHeight;

    // Diagonal neighbors have longer distance
    const distance = (dx !== 0 && dy !== 0) ? 1.414 : 1;
    const slope = diff / distance;

    if (slope > lowestDiff) {
      lowestDiff = slope;
      lowestDx = dx;
      lowestDy = dy;
    }
  }

  if (lowestDiff > 0) {
    return { dx: lowestDx, dy: lowestDy, diff: lowestDiff };
  }
  return null;
}

/**
 * Hydraulic erosion - simulates water flow and sediment transport.
 * Creates valleys, river channels, and natural drainage patterns.
 */
export function hydraulicErosion(
  heights: Float32Array,
  width: number,
  height: number,
  config: Partial<ErosionConfig> = {}
): void {
  const cfg = { ...DEFAULT_EROSION_CONFIG, ...config };

  // Water and sediment maps
  const water = new Float32Array(width * height);
  const sediment = new Float32Array(width * height);

  for (let iter = 0; iter < cfg.hydraulicIterations; iter++) {
    // Rain - add water to random cells
    const rainDrops = Math.floor(width * height * 0.1);
    for (let i = 0; i < rainDrops; i++) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      water[y * width + x] += cfg.rainAmount;
    }

    // Water flow and erosion
    const newWater = new Float32Array(width * height);
    const newSediment = new Float32Array(width * height);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const currentWater = water[idx];

        if (currentWater < 0.001) continue;

        const lowest = findLowestNeighbor(heights, x, y, width, height);

        if (lowest) {
          const nx = x + lowest.dx;
          const ny = y + lowest.dy;
          const nidx = ny * width + nx;

          // Calculate flow amount
          const flowAmount = Math.min(currentWater, lowest.diff * 0.5);

          // Erosion - pick up sediment
          const erosionAmount = flowAmount * cfg.erosionStrength * lowest.diff;
          heights[idx] -= erosionAmount;

          // Transfer water and sediment
          newWater[nidx] += flowAmount;
          newSediment[nidx] += sediment[idx] * (flowAmount / currentWater) + erosionAmount;

          // Remaining water stays
          newWater[idx] += currentWater - flowAmount;
          newSediment[idx] += sediment[idx] * (1 - flowAmount / currentWater);
        } else {
          // No lower neighbor - deposit sediment
          heights[idx] += sediment[idx] * cfg.depositionRate;
          newWater[idx] += currentWater;
        }
      }
    }

    // Evaporation and deposition
    for (let i = 0; i < width * height; i++) {
      water[i] = newWater[i] * (1 - cfg.evaporationRate);

      // Deposit sediment when water evaporates
      const deposited = newSediment[i] * cfg.evaporationRate * cfg.depositionRate;
      heights[i] += deposited;
      sediment[i] = newSediment[i] - deposited;
    }
  }
}

/**
 * Thermal erosion - simulates material sliding down steep slopes.
 * Creates more natural, rounded mountain profiles.
 */
export function thermalErosion(
  heights: Float32Array,
  width: number,
  height: number,
  config: Partial<ErosionConfig> = {}
): void {
  const cfg = { ...DEFAULT_EROSION_CONFIG, ...config };

  for (let iter = 0; iter < cfg.thermalIterations; iter++) {
    const changes = new Float32Array(width * height);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const h = heights[idx];

        // Check 4 cardinal neighbors
        const neighbors = [
          { dx: -1, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: 0, dy: -1 },
          { dx: 0, dy: 1 },
        ];

        let totalDiff = 0;
        let maxDiff = 0;
        const diffs: number[] = [];

        for (const { dx, dy } of neighbors) {
          const nh = heights[(y + dy) * width + (x + dx)];
          const diff = h - nh;
          diffs.push(diff);

          if (diff > cfg.talusAngle) {
            totalDiff += diff - cfg.talusAngle;
            maxDiff = Math.max(maxDiff, diff);
          }
        }

        if (maxDiff > cfg.talusAngle) {
          // Material slides to lower neighbors
          const slideAmount = (maxDiff - cfg.talusAngle) * 0.5;
          changes[idx] -= slideAmount;

          for (let i = 0; i < neighbors.length; i++) {
            const diff = diffs[i];
            if (diff > cfg.talusAngle) {
              const { dx, dy } = neighbors[i];
              const nidx = (y + dy) * width + (x + dx);
              const proportion = (diff - cfg.talusAngle) / totalDiff;
              changes[nidx] += slideAmount * proportion;
            }
          }
        }
      }
    }

    // Apply changes
    for (let i = 0; i < width * height; i++) {
      heights[i] += changes[i];
    }
  }
}

/**
 * Gaussian blur for smoothing.
 */
export function gaussianSmooth(
  heights: Float32Array,
  width: number,
  height: number,
  radius: number,
  iterations: number = 1
): void {
  for (let iter = 0; iter < iterations; iter++) {
    const temp = new Float32Array(width * height);

    // Build kernel
    const kernelSize = radius * 2 + 1;
    const kernel: number[] = [];
    let kernelSum = 0;

    for (let i = 0; i < kernelSize; i++) {
      const x = i - radius;
      const val = Math.exp(-(x * x) / (2 * radius * radius));
      kernel.push(val);
      kernelSum += val;
    }

    for (let i = 0; i < kernelSize; i++) {
      kernel[i] /= kernelSum;
    }

    // Horizontal pass
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let i = 0; i < kernelSize; i++) {
          const sx = x + i - radius;
          if (sx >= 0 && sx < width) {
            sum += heights[y * width + sx] * kernel[i];
            weightSum += kernel[i];
          }
        }

        temp[y * width + x] = sum / weightSum;
      }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let sum = 0;
        let weightSum = 0;

        for (let i = 0; i < kernelSize; i++) {
          const sy = y + i - radius;
          if (sy >= 0 && sy < height) {
            sum += temp[sy * width + x] * kernel[i];
            weightSum += kernel[i];
          }
        }

        heights[y * width + x] = sum / weightSum;
      }
    }
  }
}

/**
 * Apply all erosion filters to create realistic terrain.
 */
export function applyErosion(
  heights: Float32Array,
  width: number,
  height: number,
  config: Partial<ErosionConfig> = {}
): void {
  const cfg = { ...DEFAULT_EROSION_CONFIG, ...config };

  console.time('[Erosion] Total');

  // Step 1: Initial smoothing to remove harsh edges
  console.time('[Erosion] Initial smooth');
  gaussianSmooth(heights, width, height, 1, 2);
  console.timeEnd('[Erosion] Initial smooth');

  // Step 2: Thermal erosion - round off peaks
  console.time('[Erosion] Thermal');
  thermalErosion(heights, width, height, cfg);
  console.timeEnd('[Erosion] Thermal');

  // Step 3: Hydraulic erosion - create valleys and channels
  console.time('[Erosion] Hydraulic');
  hydraulicErosion(heights, width, height, cfg);
  console.timeEnd('[Erosion] Hydraulic');

  // Step 4: Final smoothing
  console.time('[Erosion] Final smooth');
  gaussianSmooth(heights, width, height, cfg.smoothingRadius, cfg.smoothingIterations);
  console.timeEnd('[Erosion] Final smooth');

  console.timeEnd('[Erosion] Total');
}

/**
 * Apply erosion to a Grid object.
 */
export function applyErosionToGrid(grid: Grid, config: Partial<ErosionConfig> = {}): void {
  const cols = grid.getCols();
  const rows = grid.getRows();

  // Extract heights
  const heights = new Float32Array(cols * rows);
  grid.forEachCell((cell, x, y) => {
    heights[y * cols + x] = cell.height;
  });

  // Apply erosion
  applyErosion(heights, cols, rows, config);

  // Write back
  grid.forEachCell((_cell, x, y) => {
    grid.setHeight(x, y, heights[y * cols + x]);
  });
}

/**
 * Apply Gaussian smoothing directly to a Grid object.
 */
export function gaussianSmoothGrid(grid: Grid, radius: number, iterations: number = 1): void {
  const cols = grid.getCols();
  const rows = grid.getRows();

  // Extract heights
  const heights = new Float32Array(cols * rows);
  grid.forEachCell((cell, x, y) => {
    heights[y * cols + x] = cell.height;
  });

  // Apply smoothing
  gaussianSmooth(heights, cols, rows, radius, iterations);

  // Write back
  grid.forEachCell((_cell, x, y) => {
    grid.setHeight(x, y, heights[y * cols + x]);
  });
}

