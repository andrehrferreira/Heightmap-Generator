/**
 * Realistic terrain generator based on real-world heightmap patterns.
 * Uses multi-octave noise with domain warping and erosion simulation.
 */

import { Grid } from '../core/grid.js';
import { gaussianSmooth } from '../filters/erosion.js';

/**
 * Configuration for realistic terrain generation.
 */
export interface RealisticTerrainConfig {
  /** Random seed */
  seed: number;
  /** Base noise frequency (lower = larger features) */
  frequency: number;
  /** Number of noise octaves */
  octaves: number;
  /** Amplitude reduction per octave */
  persistence: number;
  /** Frequency multiplier per octave */
  lacunarity: number;
  /** Ridge noise strength (0-1, creates mountain ridges) */
  ridgeStrength: number;
  /** Domain warp strength (0-1, creates organic shapes) */
  warpStrength: number;
  /** Sea level threshold (0-1) */
  seaLevel: number;
  /** Mountain height multiplier */
  mountainScale: number;
  /** Final smoothing passes */
  smoothingPasses: number;
  /** Smoothing radius */
  smoothingRadius: number;
}

export const DEFAULT_REALISTIC_CONFIG: RealisticTerrainConfig = {
  seed: 12345,
  frequency: 0.002,
  octaves: 8,
  persistence: 0.5,
  lacunarity: 2.1,
  ridgeStrength: 0.4,
  warpStrength: 0.35,
  seaLevel: 0.32,
  mountainScale: 1.0,
  smoothingPasses: 5,  // More smoothing for natural look
  smoothingRadius: 3,  // Larger radius
};

// ============ NOISE FUNCTIONS ============

/**
 * Permutation table for Perlin noise.
 */
function createPermutation(seed: number): Uint8Array {
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  
  // Initialize with values 0-255
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }
  
  // Shuffle using seed
  let s = seed;
  for (let i = 255; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  
  // Duplicate for wrapping
  for (let i = 0; i < 256; i++) {
    perm[i] = perm[i + 256] = p[i];
  }
  
  return perm;
}

/**
 * Fade curve for smooth interpolation.
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation.
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

/**
 * Gradient function for 2D Perlin noise.
 */
function grad2D(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -2 * v : 2 * v);
}

/**
 * 2D Perlin noise.
 */
function perlin2D(x: number, y: number, perm: Uint8Array): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  
  const u = fade(xf);
  const v = fade(yf);
  
  const aa = perm[perm[X] + Y];
  const ab = perm[perm[X] + Y + 1];
  const ba = perm[perm[X + 1] + Y];
  const bb = perm[perm[X + 1] + Y + 1];
  
  const x1 = lerp(grad2D(aa, xf, yf), grad2D(ba, xf - 1, yf), u);
  const x2 = lerp(grad2D(ab, xf, yf - 1), grad2D(bb, xf - 1, yf - 1), u);
  
  return lerp(x1, x2, v);
}

/**
 * Fractal Brownian Motion - layered noise.
 */
function fbm(
  x: number, 
  y: number, 
  perm: Uint8Array,
  octaves: number,
  persistence: number,
  lacunarity: number,
  frequency: number
): number {
  let value = 0;
  let amplitude = 1;
  let freq = frequency;
  let maxValue = 0;
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2D(x * freq, y * freq, perm);
    maxValue += amplitude;
    amplitude *= persistence;
    freq *= lacunarity;
  }
  
  return value / maxValue;
}

/**
 * Ridged multifractal - creates mountain ridges.
 */
function ridgedMultifractal(
  x: number,
  y: number,
  perm: Uint8Array,
  octaves: number,
  persistence: number,
  lacunarity: number,
  frequency: number
): number {
  let value = 0;
  let amplitude = 1;
  let freq = frequency;
  let weight = 1;
  
  for (let i = 0; i < octaves; i++) {
    let signal = perlin2D(x * freq, y * freq, perm);
    
    // Create ridges
    signal = 1 - Math.abs(signal);
    signal = signal * signal;
    signal *= weight;
    
    weight = Math.min(1, Math.max(0, signal * 2));
    value += signal * amplitude;
    
    amplitude *= persistence;
    freq *= lacunarity;
  }
  
  return value * 1.25 - 0.5;
}

/**
 * Domain warping for organic shapes.
 */
function warpedNoise(
  x: number,
  y: number,
  perm: Uint8Array,
  config: RealisticTerrainConfig
): number {
  // First warp layer
  const warp1x = fbm(x, y, perm, 4, 0.5, 2.0, config.frequency * 0.5);
  const warp1y = fbm(x + 5.2, y + 1.3, perm, 4, 0.5, 2.0, config.frequency * 0.5);
  
  const warpScale = config.warpStrength * 150;
  const wx = x + warp1x * warpScale;
  const wy = y + warp1y * warpScale;
  
  // Second warp layer (smaller scale)
  const warp2x = fbm(wx + 1.7, wy + 9.2, perm, 3, 0.5, 2.0, config.frequency);
  const warp2y = fbm(wx + 8.3, wy + 2.8, perm, 3, 0.5, 2.0, config.frequency);
  
  const wx2 = wx + warp2x * warpScale * 0.3;
  const wy2 = wy + warp2y * warpScale * 0.3;
  
  return fbm(wx2, wy2, perm, config.octaves, config.persistence, config.lacunarity, config.frequency);
}

/**
 * Generate realistic terrain heights.
 */
export function generateRealisticTerrain(
  width: number,
  height: number,
  config: Partial<RealisticTerrainConfig> = {}
): Float32Array {
  const cfg = { ...DEFAULT_REALISTIC_CONFIG, ...config };
  const heights = new Float32Array(width * height);
  
  // Create permutation table for this seed
  const perm = createPermutation(cfg.seed);
  const permRidge = createPermutation(cfg.seed + 1000);
  
  console.time('[RealisticTerrain] Generation');
  
  // Step 1: Generate base terrain with warping
  console.time('[RealisticTerrain] Base noise');
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      // Base continental noise with domain warping
      let h = warpedNoise(x, y, perm, cfg);
      
      // Add ridge mountains
      if (cfg.ridgeStrength > 0) {
        const ridge = ridgedMultifractal(
          x, y, permRidge,
          cfg.octaves - 2,
          cfg.persistence,
          cfg.lacunarity,
          cfg.frequency * 0.8
        );
        h = h * (1 - cfg.ridgeStrength) + ridge * cfg.ridgeStrength;
      }
      
      // Normalize to 0-1
      h = (h + 1) * 0.5;
      h = Math.max(0, Math.min(1, h));
      
      // Apply sea level
      if (h < cfg.seaLevel) {
        // Underwater - flatten but keep some depth variation
        h = h * 0.1;
      } else {
        // Land - rescale
        h = (h - cfg.seaLevel) / (1 - cfg.seaLevel);
        // Height curve for more dramatic mountains
        h = Math.pow(h, 1.4);
      }
      
      heights[idx] = h * cfg.mountainScale;
    }
  }
  console.timeEnd('[RealisticTerrain] Base noise');
  
  // Step 2: Apply smoothing for natural look
  if (cfg.smoothingPasses > 0) {
    console.time('[RealisticTerrain] Smoothing');
    gaussianSmooth(heights, width, height, cfg.smoothingRadius, cfg.smoothingPasses);
    console.timeEnd('[RealisticTerrain] Smoothing');
  }
  
  console.timeEnd('[RealisticTerrain] Generation');
  
  return heights;
}

/**
 * Apply realistic terrain to a Grid.
 */
export function applyRealisticTerrainToGrid(
  grid: Grid,
  config: Partial<RealisticTerrainConfig> = {}
): { minHeight: number; maxHeight: number } {
  const cols = grid.getCols();
  const rows = grid.getRows();
  
  // Generate heights
  const heights = generateRealisticTerrain(cols, rows, config);
  
  // Scale to Unreal-friendly height range
  const heightScale = 500;
  
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  
  // Apply to grid
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const h = heights[idx] * heightScale;
      
      grid.setHeight(x, y, h);
      
      // Set level based on height
      const normalizedH = heights[idx];
      let levelId: number;
      if (normalizedH < 0.01) {
        levelId = 0; // Water/Beach
      } else if (normalizedH < 0.3) {
        levelId = 1; // Lowlands
      } else if (normalizedH < 0.6) {
        levelId = 2; // Hills
      } else {
        levelId = 3; // Mountains
      }
      grid.setLevelId(x, y, levelId);
      
      // Mark water
      const cell = grid.getCell(x, y);
      cell.flags.water = normalizedH < 0.01;
      cell.flags.playable = normalizedH >= 0.01 && normalizedH < 0.85;
      cell.flags.visualOnly = normalizedH >= 0.85;
      
      minHeight = Math.min(minHeight, h);
      maxHeight = Math.max(maxHeight, h);
    }
  }
  
  return { minHeight, maxHeight };
}
