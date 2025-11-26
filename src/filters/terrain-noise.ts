/**
 * Advanced terrain noise generation for realistic landscapes.
 * Implements domain warping, ridged noise, and billowed noise.
 */

/**
 * Simple 2D noise function (value noise).
 */
function valueNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}


/**
 * 2D Gradient noise (Perlin-like).
 */
function gradientNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;

  // Fade curves
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10);
  const v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);

  // Hash corners
  const h00 = (valueNoise(x0, y0, seed) * 2 - 1) * fx + (valueNoise(x0 + 100, y0, seed) * 2 - 1) * fy;
  const h10 = (valueNoise(x0 + 1, y0, seed) * 2 - 1) * (fx - 1) + (valueNoise(x0 + 101, y0, seed) * 2 - 1) * fy;
  const h01 = (valueNoise(x0, y0 + 1, seed) * 2 - 1) * fx + (valueNoise(x0 + 100, y0 + 1, seed) * 2 - 1) * (fy - 1);
  const h11 = (valueNoise(x0 + 1, y0 + 1, seed) * 2 - 1) * (fx - 1) + (valueNoise(x0 + 101, y0 + 1, seed) * 2 - 1) * (fy - 1);

  const nx0 = h00 + u * (h10 - h00);
  const nx1 = h01 + u * (h11 - h01);
  return nx0 + v * (nx1 - nx0);
}

export interface TerrainNoiseConfig {
  /** Base frequency */
  frequency: number;
  /** Number of octaves */
  octaves: number;
  /** Amplitude reduction per octave */
  persistence: number;
  /** Frequency increase per octave */
  lacunarity: number;
  /** Random seed */
  seed: number;
  /** Domain warp strength (0 = off) */
  warpStrength: number;
  /** Domain warp iterations */
  warpIterations: number;
  /** Ridge power (0 = normal, 1 = full ridged) */
  ridgePower: number;
  /** Billowing power (0 = normal, 1 = full billowed) */
  billowPower: number;
  /** Terrace levels (0 = off) */
  terraceLevels: number;
  /** Height curve power (1 = linear, >1 = more contrast) */
  heightCurvePower: number;
}

export const DEFAULT_TERRAIN_NOISE_CONFIG: TerrainNoiseConfig = {
  frequency: 0.008,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  seed: 12345,
  warpStrength: 0.3,
  warpIterations: 2,
  ridgePower: 0.3,
  billowPower: 0.0,
  terraceLevels: 0,
  heightCurvePower: 1.2,
};

/**
 * Standard Fractal Brownian Motion.
 */
function fbm(x: number, y: number, config: TerrainNoiseConfig): number {
  let value = 0;
  let amplitude = 1;
  let frequency = config.frequency;
  let maxValue = 0;

  for (let i = 0; i < config.octaves; i++) {
    value += amplitude * gradientNoise(x * frequency, y * frequency, config.seed + i * 100);
    maxValue += amplitude;
    amplitude *= config.persistence;
    frequency *= config.lacunarity;
  }

  return value / maxValue;
}

/**
 * Ridged Multifractal - creates sharp ridges and valleys.
 */
function ridgedMultifractal(x: number, y: number, config: TerrainNoiseConfig): number {
  let value = 0;
  let amplitude = 1;
  let frequency = config.frequency;
  let weight = 1;

  for (let i = 0; i < config.octaves; i++) {
    let signal = gradientNoise(x * frequency, y * frequency, config.seed + i * 100);
    
    // Create ridges by inverting and squaring
    signal = 1 - Math.abs(signal);
    signal = signal * signal;
    
    // Weight successive octaves by previous signal
    signal *= weight;
    weight = Math.min(1, Math.max(0, signal * 2));
    
    value += signal * amplitude;
    amplitude *= config.persistence;
    frequency *= config.lacunarity;
  }

  return value * 1.25 - 1; // Normalize to roughly -1 to 1
}

/**
 * Billowed noise - creates rounded hills and valleys.
 */
function billowedNoise(x: number, y: number, config: TerrainNoiseConfig): number {
  let value = 0;
  let amplitude = 1;
  let frequency = config.frequency;
  let maxValue = 0;

  for (let i = 0; i < config.octaves; i++) {
    let signal = gradientNoise(x * frequency, y * frequency, config.seed + i * 100);
    
    // Create billows by taking absolute value
    signal = Math.abs(signal) * 2 - 1;
    
    value += amplitude * signal;
    maxValue += amplitude;
    amplitude *= config.persistence;
    frequency *= config.lacunarity;
  }

  return value / maxValue;
}

/**
 * Domain warping - distorts the input coordinates for more organic shapes.
 */
function warpedNoise(x: number, y: number, config: TerrainNoiseConfig): number {
  let wx = x;
  let wy = y;
  
  // Apply warping iterations
  for (let i = 0; i < config.warpIterations; i++) {
    const warpScale = config.warpStrength * (config.warpIterations - i) / config.warpIterations;
    
    const ox = fbm(wx + 5.2, wy + 1.3, { ...config, octaves: 4 }) * warpScale * 100;
    const oy = fbm(wx + 9.3, wy + 2.8, { ...config, octaves: 4 }) * warpScale * 100;
    
    wx = x + ox;
    wy = y + oy;
  }
  
  return fbm(wx, wy, config);
}

/**
 * Apply terracing effect.
 */
function terraceHeight(height: number, levels: number): number {
  if (levels <= 0) return height;
  return Math.round(height * levels) / levels;
}

/**
 * Combined terrain noise with all features.
 */
export function terrainNoise(x: number, y: number, config: Partial<TerrainNoiseConfig> = {}): number {
  const cfg = { ...DEFAULT_TERRAIN_NOISE_CONFIG, ...config };
  
  // Get base noise with optional warping
  let baseNoise: number;
  if (cfg.warpStrength > 0) {
    baseNoise = warpedNoise(x, y, cfg);
  } else {
    baseNoise = fbm(x, y, cfg);
  }
  
  // Blend with ridged noise
  let value = baseNoise;
  if (cfg.ridgePower > 0) {
    const ridged = ridgedMultifractal(x, y, cfg);
    value = value * (1 - cfg.ridgePower) + ridged * cfg.ridgePower;
  }
  
  // Blend with billowed noise
  if (cfg.billowPower > 0) {
    const billowed = billowedNoise(x, y, cfg);
    value = value * (1 - cfg.billowPower) + billowed * cfg.billowPower;
  }
  
  // Normalize to 0-1
  value = (value + 1) * 0.5;
  value = Math.max(0, Math.min(1, value));
  
  // Apply height curve
  value = Math.pow(value, cfg.heightCurvePower);
  
  // Apply terracing
  if (cfg.terraceLevels > 0) {
    value = terraceHeight(value, cfg.terraceLevels);
  }
  
  return value;
}

/**
 * Generate a complete heightmap using terrain noise.
 */
export function generateTerrainHeights(
  width: number,
  height: number,
  config: Partial<TerrainNoiseConfig> = {}
): Float32Array {
  const heights = new Float32Array(width * height);
  const cfg = { ...DEFAULT_TERRAIN_NOISE_CONFIG, ...config };
  
  console.time('[TerrainNoise] Generation');
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      heights[y * width + x] = terrainNoise(x, y, cfg);
    }
  }
  
  console.timeEnd('[TerrainNoise] Generation');
  
  return heights;
}

