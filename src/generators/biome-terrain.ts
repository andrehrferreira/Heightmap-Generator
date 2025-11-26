/**
 * Biome-Based Terrain Generator
 * Generates terrain based on biome configuration.
 */

import { Grid } from '../core/grid.js';
import { BiomeConfig, BiomeType, getBiomePreset, TerrainDensityConfig } from '../core/biome.js';
import { applyBorderBarriers, calculateExitPositions, smoothExitTransitions } from './border-barrier.js';
import { gaussianSmoothGrid } from '../filters/erosion.js';

/**
 * Simple seeded random number generator.
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/**
 * Perlin-like noise function.
 */
function noise2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Fractal Brownian Motion noise.
 */
function fbmNoise(
  x: number, 
  y: number, 
  seed: number, 
  octaves: number = 6,
  persistence: number = 0.5,
  lacunarity: number = 2.0
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * (noise2D(x * frequency, y * frequency, seed + i * 100) * 2 - 1);
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  
  return (value / maxValue + 1) / 2;
}

/**
 * Ridged noise for mountain ridges.
 */
function ridgedNoise(
  x: number,
  y: number,
  seed: number,
  octaves: number = 4
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise2D(x * frequency, y * frequency, seed + i * 100) * 2 - 1);
    value += amplitude * n * n;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2.2;
  }
  
  return value / maxValue;
}

/**
 * Generate mountain ranges based on density config.
 */
function generateMountainRanges(
  cols: number,
  rows: number,
  density: TerrainDensityConfig,
  seed: number
): Float32Array {
  const heights = new Float32Array(cols * rows);
  const rand = seededRandom(seed);
  
  if (density.rangeCount === 0 || density.mountainDensity === 0) {
    return heights;
  }
  
  // Generate mountain range centers and directions
  const ranges: Array<{
    startX: number;
    startY: number;
    angle: number;
    length: number;
    width: number;
    height: number;
  }> = [];
  
  for (let i = 0; i < density.rangeCount; i++) {
    ranges.push({
      startX: 0.1 + rand() * 0.8,
      startY: 0.1 + rand() * 0.8,
      angle: rand() * Math.PI * 2,
      length: 0.3 + rand() * 0.5,
      width: 0.05 + rand() * 0.1 * density.clusterSize / 5,
      height: 0.5 + rand() * 0.5,
    });
  }
  
  // Apply mountain ranges
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x / cols;
      const ny = y / rows;
      
      let maxRangeInfluence = 0;
      
      for (const range of ranges) {
        // Calculate distance to range line
        const dx = nx - range.startX;
        const dy = ny - range.startY;
        
        // Project onto range direction
        const cos = Math.cos(range.angle);
        const sin = Math.sin(range.angle);
        const along = dx * cos + dy * sin;
        const perp = Math.abs(-dx * sin + dy * cos);
        
        // Check if within range length
        if (along >= 0 && along <= range.length) {
          // Calculate influence based on perpendicular distance
          const normalizedPerp = perp / range.width;
          if (normalizedPerp < 1) {
            const influence = Math.pow(1 - normalizedPerp, 2) * range.height;
            maxRangeInfluence = Math.max(maxRangeInfluence, influence);
          }
        }
      }
      
      // Add ridged noise for detail
      const ridgeDetail = ridgedNoise(
        x * 0.01 * density.clusterSize,
        y * 0.01 * density.clusterSize,
        seed + 1000,
        4
      );
      
      const idx = y * cols + x;
      heights[idx] = maxRangeInfluence * (0.7 + 0.3 * ridgeDetail);
    }
  }
  
  return heights;
}

/**
 * Generate island mask.
 */
function generateIslandMask(
  cols: number,
  rows: number,
  _waterLevel: number,
  seed: number
): Float32Array {
  const mask = new Float32Array(cols * rows);
  const centerX = cols / 2;
  const centerY = rows / 2;
  const maxDist = Math.min(cols, rows) / 2 * 0.9;
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const dx = (x - centerX) / maxDist;
      const dy = (y - centerY) / maxDist;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Add noise to edge
      const edgeNoise = fbmNoise(x * 0.02, y * 0.02, seed + 500, 4) * 0.3;
      const adjustedDist = dist + edgeNoise;
      
      const idx = y * cols + x;
      if (adjustedDist > 1) {
        mask[idx] = 0; // Water
      } else if (adjustedDist > 0.8) {
        // Beach/transition
        mask[idx] = 1 - (adjustedDist - 0.8) / 0.2;
      } else {
        mask[idx] = 1; // Land
      }
    }
  }
  
  return mask;
}

/**
 * Generate terrain based on biome configuration.
 */
export function generateBiomeTerrain(
  grid: Grid,
  biomeConfig: BiomeConfig,
  seed: number = 12345
): { minHeight: number; maxHeight: number } {
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  console.log(`[Biome] Generating ${biomeConfig.name} terrain (${cols}x${rows})`);
  
  const { density, noiseScale, erosionStrength, baseElevation, waterLevel } = biomeConfig;
  
  // Step 1: Generate base terrain with FBM noise
  console.log('[Biome] Step 1: Base terrain');
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x * 0.005 * noiseScale;
      const ny = y * 0.005 * noiseScale;
      
      // Base terrain
      let height = fbmNoise(nx, ny, seed, 6, 0.5, 2.0);
      
      // Apply plains flatness
      height = height * (1 - density.plainsFlat * 0.5) + baseElevation * density.plainsFlat;
      
      grid.setHeight(x, y, height * 100);
    }
  }
  
  // Step 2: Add mountain ranges
  console.log('[Biome] Step 2: Mountain ranges');
  const mountainHeights = generateMountainRanges(cols, rows, density, seed);
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const cell = grid.getCell(x, y);
      const mountainContrib = mountainHeights[idx] * 200 * density.heightMultiplier * density.mountainDensity;
      cell.height += mountainContrib;
    }
  }
  
  // Step 3: Apply island mask if island type
  if (biomeConfig.type === 'island') {
    console.log('[Biome] Step 3: Island mask');
    const islandMask = generateIslandMask(cols, rows, waterLevel, seed);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = y * cols + x;
        const cell = grid.getCell(x, y);
        
        if (islandMask[idx] < 0.1) {
          cell.height = -50; // Water
          cell.flags.water = true;
          cell.flags.playable = false;
        } else {
          cell.height *= islandMask[idx];
        }
      }
    }
  }
  
  // Step 4: Add valleys
  console.log('[Biome] Step 4: Valleys');
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = x * 0.008;
      const ny = y * 0.008;
      
      const valleyNoise = fbmNoise(nx + 100, ny + 100, seed + 200, 4);
      if (valleyNoise < 0.35) {
        const cell = grid.getCell(x, y);
        const valleyDepth = (0.35 - valleyNoise) / 0.35 * 50 * density.valleyDepth;
        cell.height = Math.max(0, cell.height - valleyDepth);
      }
    }
  }
  
  // Step 5: Apply smoothing
  console.log('[Biome] Step 5: Smoothing');
  const smoothRadius = Math.ceil(3 * (1 - erosionStrength) + 1);
  gaussianSmoothGrid(grid, smoothRadius, 2);
  
  // Step 6: Apply border barriers
  console.log('[Biome] Step 6: Border barriers');
  applyBorderBarriers(grid, biomeConfig.border);
  
  // Step 7: Smooth exit transitions
  if (biomeConfig.border.enabled && biomeConfig.border.exitCount > 0) {
    const exits = calculateExitPositions(biomeConfig.border, cols, rows);
    smoothExitTransitions(grid, exits, biomeConfig.border.width, 15);
  }
  
  // Calculate final height stats
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid.getCell(x, y);
      
      // Set level based on height
      const normalizedH = cell.height / 300;
      let levelId: number;
      if (normalizedH < waterLevel) {
        levelId = 0;
        cell.flags.water = true;
      } else if (normalizedH < 0.3) {
        levelId = 1;
      } else if (normalizedH < 0.6) {
        levelId = 2;
      } else {
        levelId = 3;
      }
      grid.setLevelId(x, y, levelId);
      
      minHeight = Math.min(minHeight, cell.height);
      maxHeight = Math.max(maxHeight, cell.height);
    }
  }
  
  console.log(`[Biome] Generation complete. Height range: ${minHeight.toFixed(0)} - ${maxHeight.toFixed(0)}`);
  
  return { minHeight, maxHeight };
}

/**
 * Quick generate with biome type.
 */
export function generateFromBiomeType(
  grid: Grid,
  biomeType: BiomeType,
  seed: number = 12345
): { minHeight: number; maxHeight: number } {
  const config = getBiomePreset(biomeType);
  return generateBiomeTerrain(grid, config, seed);
}

