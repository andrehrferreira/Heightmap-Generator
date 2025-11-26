/**
 * GPU-accelerated terrain generation using regl (WebGL)
 * 
 * This module uses the GPU to generate heightmaps, apply noise,
 * smooth ramps, and create border barriers - all in parallel.
 */

import createREGL, { Regl, Framebuffer2D, DrawCommand } from 'regl';

export interface GPUTerrainConfig {
  width: number;
  height: number;
  seed: number;
  // Noise settings
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  // Terrain settings
  ridgeStrength: number;
  warpStrength: number;
  seaLevel: number;
  heightScale: number;
  plainsFlat?: number; // How flat the plains should be (0-1)
  // Ramp settings
  rampEnabled: boolean;
  rampWidth: number;
  rampNoiseAmplitude: number;
  // Border settings
  borderEnabled: boolean;
  borderWidth: number;
  borderHeight: number;
  borderSmoothness: number;
  borderType: 'mountain' | 'cliff' | 'water'; // Type of border barrier
  // Erosion settings
  erosionEnabled?: boolean;
  erosionIterations?: number;        // Number of erosion passes
  hydraulicErosionRate?: number;     // How fast water erodes terrain
  depositionRate?: number;           // How fast sediment is deposited
  thermalErosionEnabled?: boolean;
  thermalTalusAngle?: number;        // Maximum stable slope
  thermalErosionStrength?: number;
  // Detail settings
  detailEnabled?: boolean;
  macroDetailStrength?: number;      // Large-scale detail
  mesoDetailStrength?: number;       // Medium-scale detail
  microDetailStrength?: number;      // Fine-scale detail
}

export const DEFAULT_GPU_TERRAIN_CONFIG: GPUTerrainConfig = {
  width: 1024,
  height: 1024,
  seed: 12345,
  noiseScale: 0.01,
  octaves: 6,
  persistence: 0.5,
  lacunarity: 2.0,
  ridgeStrength: 0.5,
  warpStrength: 0.3,
  seaLevel: 0.25,
  heightScale: 500,
  rampEnabled: true,
  rampWidth: 3,
  rampNoiseAmplitude: 0.005,
  borderEnabled: true,
  borderWidth: 50,
  borderHeight: 400,
  borderSmoothness: 0.8,
  borderType: 'mountain',
  // Erosion defaults
  erosionEnabled: true,
  erosionIterations: 3,
  hydraulicErosionRate: 0.3,
  depositionRate: 0.3,
  thermalErosionEnabled: true,
  thermalTalusAngle: 0.04,
  thermalErosionStrength: 0.5,
  // Detail defaults
  detailEnabled: true,
  macroDetailStrength: 0.02,
  mesoDetailStrength: 0.015,
  microDetailStrength: 0.008,
};

// Vertex shader for fullscreen quad
const FULLSCREEN_VERT = `
  precision highp float;
  attribute vec2 position;
  varying vec2 vUv;
  
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Advanced noise functions shared across shaders
const NOISE_FUNCTIONS = `
  // High-quality hash functions
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  float hash3(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453);
  }
  
  // Improved gradient noise (Perlin-like)
  float gradientNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    // Quintic interpolation for smoother results
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  
  // Simple value noise (for compatibility)
  float noise(vec2 p) {
    return gradientNoise(p);
  }
  
  // Voronoi/Worley noise for geological features
  float voronoi(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    
    float minDist = 1.0;
    float secondMinDist = 1.0;
    
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        
        if (d < minDist) {
          secondMinDist = minDist;
          minDist = d;
        } else if (d < secondMinDist) {
          secondMinDist = d;
        }
      }
    }
    
    return sqrt(minDist);
  }
  
  // Voronoi edges (F2 - F1) for cracks and ridges
  float voronoiEdges(vec2 p) {
    vec2 n = floor(p);
    vec2 f = fract(p);
    
    float minDist = 1.0;
    float secondMinDist = 1.0;
    
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        vec2 r = g + o - f;
        float d = dot(r, r);
        
        if (d < minDist) {
          secondMinDist = minDist;
          minDist = d;
        } else if (d < secondMinDist) {
          secondMinDist = d;
        }
      }
    }
    
    return sqrt(secondMinDist) - sqrt(minDist);
  }
  
  // Fractal Brownian Motion with better quality
  float fbm(vec2 p, float octaves, float persistence, float lacunarity) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (float i = 0.0; i < 12.0; i++) {
      if (i >= octaves) break;
      value += amplitude * gradientNoise(p * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return value / maxValue;
  }
  
  // Ridged multifractal noise - creates sharp ridges
  float ridgedMultifractal(vec2 p, float octaves, float lacunarity, float gain) {
    float sum = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float prev = 1.0;
    
    for (float i = 0.0; i < 12.0; i++) {
      if (i >= octaves) break;
      float n = gradientNoise(p * frequency);
      n = 1.0 - abs(n * 2.0 - 1.0); // Create ridge
      n = n * n; // Sharpen
      sum += n * amplitude * prev;
      prev = n;
      frequency *= lacunarity;
      amplitude *= gain;
    }
    
    return sum;
  }
  
  // Billow noise - creates rounded hills/clouds
  float billowNoise(vec2 p, float octaves, float persistence, float lacunarity) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (float i = 0.0; i < 12.0; i++) {
      if (i >= octaves) break;
      float n = gradientNoise(p * frequency);
      n = abs(n * 2.0 - 1.0); // Billow transform
      value += amplitude * n;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return value / maxValue;
  }
  
  // Swiss noise - better for terrain
  float swissNoise(vec2 p, float octaves, float lacunarity, float gain) {
    float sum = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    vec2 dsum = vec2(0.0);
    
    for (float i = 0.0; i < 12.0; i++) {
      if (i >= octaves) break;
      float n = gradientNoise(p * frequency + dsum);
      vec2 dn = vec2(
        gradientNoise(p * frequency + dsum + vec2(0.01, 0.0)) - n,
        gradientNoise(p * frequency + dsum + vec2(0.0, 0.01)) - n
      ) / 0.01;
      sum += amplitude * (1.0 - abs(n));
      dsum += amplitude * dn * -n;
      frequency *= lacunarity;
      amplitude *= gain * clamp(sum, 0.0, 1.0);
    }
    
    return sum;
  }
  
  // Multi-pass domain warping for organic shapes
  vec2 warp(vec2 p, float strength, float seed) {
    // First pass
    float nx = fbm(p + vec2(seed, 0.0), 4.0, 0.5, 2.0);
    float ny = fbm(p + vec2(0.0, seed + 100.0), 4.0, 0.5, 2.0);
    vec2 q = p + vec2(nx, ny) * strength * 0.5;
    
    // Second pass (cascade warping)
    float nx2 = fbm(q + vec2(seed + 50.0, seed + 30.0), 4.0, 0.5, 2.0);
    float ny2 = fbm(q + vec2(seed + 80.0, seed + 120.0), 4.0, 0.5, 2.0);
    
    return p + vec2(nx + nx2, ny + ny2) * strength;
  }
  
  // Turbulence - absolute value fbm
  float turbulence(vec2 p, float octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    for (float i = 0.0; i < 12.0; i++) {
      if (i >= octaves) break;
      value += amplitude * abs(gradientNoise(p * frequency) * 2.0 - 1.0);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value;
  }
`;

// Fragment shader for heightmap generation - Advanced terrain with multiple noise types
const HEIGHTMAP_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform float seed;
  uniform vec2 resolution;
  uniform float noiseScale;
  uniform float octaves;
  uniform float persistence;
  uniform float lacunarity;
  uniform float ridgeStrength;
  uniform float warpStrength;
  uniform float seaLevel;
  uniform float heightScale;
  uniform float plainsFlat; // 0 = more mountains, 1 = very flat
  
  ${NOISE_FUNCTIONS}
  
  void main() {
    vec2 p = vUv * resolution * noiseScale;
    
    // Multi-pass domain warping for organic continental shapes
    vec2 wp = warp(p, warpStrength * 40.0, seed);
    
    // === LAYER 1: Base continental shape ===
    // Low frequency fbm for large-scale landmasses
    float continentalBase = fbm(wp * 0.3 + seed, 4.0, 0.6, 2.0);
    continentalBase = smoothstep(0.35, 0.65, continentalBase); // Sharper land/sea boundary
    
    // === LAYER 2: Mountain ridges ===
    // Ridged multifractal for mountain chains
    float ridges = ridgedMultifractal(wp * 0.8 + seed * 1.1, 6.0, 2.2, 0.5);
    ridges = pow(ridges, 1.5); // Emphasize peaks
    
    // === LAYER 3: Hills and rolling terrain ===
    // Billow noise for softer hills
    float hills = billowNoise(wp * 1.5 + seed * 2.0, 5.0, 0.45, 2.0);
    hills = hills * 0.6; // Reduce amplitude
    
    // === LAYER 4: Swiss noise for detailed slopes ===
    float swissDetail = swissNoise(wp * 2.0 + seed * 0.5, 4.0, 2.0, 0.5);
    swissDetail = swissDetail * 0.3;
    
    // === LAYER 5: Voronoi for geological features ===
    float voronoiPlateaus = voronoi(wp * 0.5 + seed);
    voronoiPlateaus = smoothstep(0.1, 0.4, voronoiPlateaus) * 0.2;
    
    // Voronoi edges for cracks/valleys
    float cracks = voronoiEdges(wp * 1.2 + seed * 0.3);
    cracks = 1.0 - smoothstep(0.0, 0.15, cracks) * 0.15;
    
    // === LAYER 6: Micro detail ===
    float microDetail = turbulence(wp * 8.0 + seed * 3.0, 3.0) * 0.08;
    float mesoDetail = fbm(wp * 4.0 + seed * 4.0, 4.0, 0.5, 2.0) * 0.12;
    
    // === COMBINE LAYERS ===
    // Calculate effective ridge strength based on biome
    float effectiveRidgeStrength = ridgeStrength * (1.0 - plainsFlat * 0.85);
    float effectiveHillStrength = mix(0.4, 0.15, plainsFlat);
    
    // Start with continental base
    float height = continentalBase * 0.3;
    
    // Add mountain ridges where continental height is above threshold
    float mountainMask = smoothstep(0.15, 0.5, continentalBase);
    height += ridges * effectiveRidgeStrength * mountainMask;
    
    // Add hills everywhere but reduced in flat areas
    height += hills * effectiveHillStrength;
    
    // Add swiss detail for complex slopes
    height += swissDetail * (1.0 - plainsFlat * 0.5);
    
    // Add voronoi plateaus in highlands
    height += voronoiPlateaus * mountainMask;
    
    // Apply cracks (subtractive)
    height *= cracks;
    
    // Add micro and meso detail
    height += microDetail * (0.5 + height * 0.5); // More detail on slopes
    height += mesoDetail * (0.3 + height * 0.7);
    
    // === FINAL PROCESSING ===
    // Plains flattening - push values toward median
    if (plainsFlat > 0.0) {
      float median = 0.35;
      float flattenPower = 1.0 + plainsFlat * 2.0;
      float distFromMedian = height - median;
      height = median + sign(distFromMedian) * pow(abs(distFromMedian), flattenPower) * 0.8;
    }
    
    // Apply sea level with smooth transition
    float landHeight = max(height - seaLevel, 0.0) / (1.0 - seaLevel);
    float underwaterDepth = min(height, seaLevel) / seaLevel;
    
    // Underwater areas get compressed depth
    height = height > seaLevel ? landHeight : underwaterDepth * seaLevel * 0.5;
    
    // Final normalization with soft clamp
    height = clamp(height, 0.0, 1.0);
    
    // Add very subtle high-frequency detail (prevents banding)
    float antiBanding = (hash(vUv * resolution) - 0.5) * 0.002;
    height += antiBanding;
    
    gl_FragColor = vec4(height, height, height, 1.0);
  }
`;

// Fragment shader for edge smoothing (simple blur at boundaries)
const SMOOTH_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform sampler2D levelmap;
  uniform vec2 resolution;
  uniform float rampWidth;
  uniform float noiseAmplitude;
  uniform float seed;
  
  ${NOISE_FUNCTIONS}
  
  void main() {
    vec2 texel = 1.0 / resolution;
    float currentHeight = texture2D(heightmap, vUv).r;
    float currentLevel = texture2D(levelmap, vUv).r;
    
    // Check if at level boundary and find minimum neighbor height
    bool isBoundary = false;
    float minNeighborHeight = currentHeight;
    
    // Only check 4 direct neighbors
    vec2 offsets[4];
    offsets[0] = vec2(1.0, 0.0);
    offsets[1] = vec2(-1.0, 0.0);
    offsets[2] = vec2(0.0, 1.0);
    offsets[3] = vec2(0.0, -1.0);
    
    for (int i = 0; i < 4; i++) {
      vec2 sampleUV = vUv + offsets[i] * texel;
      if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) continue;
      
      float neighborLevel = texture2D(levelmap, sampleUV).r;
      float neighborHeight = texture2D(heightmap, sampleUV).r;
      
      // Check if this is a lower level neighbor
      if (neighborLevel < currentLevel - 0.01) {
        isBoundary = true;
        minNeighborHeight = min(minNeighborHeight, neighborHeight);
      }
    }
    
    // Only process if we're at a boundary with a LOWER neighbor
    if (!isBoundary) {
      gl_FragColor = vec4(currentHeight, currentHeight, currentHeight, 1.0);
      return;
    }
    
    // Strong blend to create short but effective ramps
    // ONLY lower the height, never raise it
    float targetHeight = minNeighborHeight * 0.4 + currentHeight * 0.6;
    
    // Only apply if it would LOWER the terrain
    float newHeight = min(currentHeight, targetHeight);
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

// Fragment shader for border barriers
// borderType: 0 = mountain (raises), 1 = cliff (lowers), 2 = water (lowers to sea level)
const BORDER_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform vec2 resolution;
  uniform float borderWidth;
  uniform float borderHeight;
  uniform float borderSmoothness;
  uniform float borderType; // 0 = mountain, 1 = cliff, 2 = water
  uniform float seaLevel;
  uniform float seed;
  
  ${NOISE_FUNCTIONS}
  
  void main() {
    float currentHeight = texture2D(heightmap, vUv).r;
    
    // Calculate distance to edges
    float distLeft = vUv.x * resolution.x;
    float distRight = (1.0 - vUv.x) * resolution.x;
    float distTop = (1.0 - vUv.y) * resolution.y;
    float distBottom = vUv.y * resolution.y;
    
    float minDist = min(min(distLeft, distRight), min(distTop, distBottom));
    
    if (minDist >= borderWidth) {
      gl_FragColor = vec4(currentHeight, currentHeight, currentHeight, 1.0);
      return;
    }
    
    // Calculate barrier factor with smooth transition
    float t = minDist / borderWidth;
    float smoothT = t * t * (3.0 - 2.0 * t); // Smoothstep
    float barrierFactor = 1.0 - smoothT;
    barrierFactor = pow(barrierFactor, 1.0 / (borderSmoothness + 0.1));
    
    // Add noise to barrier
    float n = fbm(vUv * resolution * 0.02 + seed, 4.0, 0.5, 2.0);
    float noiseOffset = (n - 0.5) * 0.15 * barrierFactor;
    
    float newHeight;
    
    if (borderType < 0.5) {
      // Mountain type: raises terrain upward
      float targetHeight = borderHeight / 500.0;
      newHeight = max(currentHeight, barrierFactor * targetHeight + noiseOffset);
    } else if (borderType < 1.5) {
      // Cliff type: lowers terrain to create a steep drop
      float targetHeight = -0.05; // Below ground level
      newHeight = mix(currentHeight, targetHeight + noiseOffset * 0.3, barrierFactor);
      // Ensure cliffs only go down, never up
      newHeight = min(currentHeight, newHeight);
    } else {
      // Water type: lowers terrain to below sea level
      float targetHeight = seaLevel * 0.3;
      newHeight = mix(currentHeight, targetHeight + noiseOffset * 0.2, barrierFactor);
      newHeight = min(currentHeight, newHeight);
    }
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

// Fragment shader for level assignment with soft boundaries
// Levels are for gameplay/logic only - terrain heights remain continuous
const LEVEL_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  
  void main() {
    float height = texture2D(heightmap, vUv).r;
    
    // Soft level assignment using smooth transitions
    // This prevents hard "stair step" appearance
    
    // Level thresholds with transition zones
    float waterThreshold = 0.02;
    float lowlandThreshold = 0.25;
    float hillThreshold = 0.5;
    float mountainThreshold = 0.75;
    
    // Transition zone width (soft boundaries)
    float transitionWidth = 0.08;
    
    // Calculate smooth level value
    float level = 0.0;
    
    // Water to lowlands transition
    float waterToLowland = smoothstep(waterThreshold - transitionWidth * 0.5, 
                                       waterThreshold + transitionWidth * 0.5, height);
    
    // Lowlands to hills transition
    float lowlandToHill = smoothstep(lowlandThreshold - transitionWidth, 
                                      lowlandThreshold + transitionWidth, height);
    
    // Hills to mountains transition
    float hillToMountain = smoothstep(hillThreshold - transitionWidth, 
                                       hillThreshold + transitionWidth, height);
    
    // Mountains to peaks transition
    float mountainToPeak = smoothstep(mountainThreshold - transitionWidth, 
                                       mountainThreshold + transitionWidth, height);
    
    // Blend levels smoothly
    level = mix(0.0, 0.2, waterToLowland);    // Water -> Lowlands
    level = mix(level, 0.4, lowlandToHill);    // Lowlands -> Hills
    level = mix(level, 0.6, hillToMountain);   // Hills -> Mountains
    level = mix(level, 0.8, mountainToPeak);   // Mountains -> Peaks
    
    gl_FragColor = vec4(level, level, level, 1.0);
  }
`;

// Fragment shader for hydraulic erosion simulation
// Simulates water flow and sediment transport
const EROSION_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform sampler2D sedimentMap;  // R = sediment amount
  uniform sampler2D waterMap;     // R = water amount, GBA = velocity
  uniform vec2 resolution;
  uniform float erosionRate;
  uniform float depositionRate;
  uniform float evaporationRate;
  uniform float sedimentCapacity;
  uniform float minSlope;
  uniform float gravity;
  uniform float deltaTime;
  
  void main() {
    vec2 texel = 1.0 / resolution;
    float height = texture2D(heightmap, vUv).r;
    vec4 water = texture2D(waterMap, vUv);
    float sediment = texture2D(sedimentMap, vUv).r;
    
    float waterAmount = water.r;
    vec2 velocity = water.gb * 2.0 - 1.0; // Decode from 0-1 to -1..1
    
    // Sample neighbors
    float hL = texture2D(heightmap, vUv + vec2(-texel.x, 0.0)).r;
    float hR = texture2D(heightmap, vUv + vec2(texel.x, 0.0)).r;
    float hD = texture2D(heightmap, vUv + vec2(0.0, -texel.y)).r;
    float hU = texture2D(heightmap, vUv + vec2(0.0, texel.y)).r;
    
    // Calculate gradient (slope direction)
    vec2 gradient = vec2(hL - hR, hD - hU) * 0.5;
    float slope = length(gradient);
    
    // Update velocity based on slope
    velocity = velocity * 0.95 + gradient * gravity * deltaTime;
    float speed = length(velocity);
    
    // Calculate sediment capacity based on slope and speed
    float capacity = max(slope, minSlope) * speed * sedimentCapacity * waterAmount;
    
    // Erosion or deposition
    float heightChange = 0.0;
    float sedimentChange = 0.0;
    
    if (sediment < capacity) {
      // Erode - pick up sediment
      float erodeAmount = min((capacity - sediment) * erosionRate * deltaTime, height * 0.1);
      heightChange = -erodeAmount;
      sedimentChange = erodeAmount;
    } else {
      // Deposit - drop sediment
      float depositAmount = (sediment - capacity) * depositionRate * deltaTime;
      heightChange = depositAmount;
      sedimentChange = -depositAmount;
    }
    
    // Apply changes
    float newHeight = height + heightChange;
    
    // Clamp height
    newHeight = max(newHeight, 0.0);
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

// Fragment shader for thermal erosion (talus)
// Simulates material slumping on steep slopes
const THERMAL_EROSION_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform vec2 resolution;
  uniform float talusAngle;      // Maximum stable slope angle (as height difference)
  uniform float erosionStrength;
  
  void main() {
    vec2 texel = 1.0 / resolution;
    float height = texture2D(heightmap, vUv).r;
    
    // Sample all 8 neighbors
    float sum = 0.0;
    float count = 0.0;
    float maxDiff = 0.0;
    
    for (int dy = -1; dy <= 1; dy++) {
      for (int dx = -1; dx <= 1; dx++) {
        if (dx == 0 && dy == 0) continue;
        
        vec2 offset = vec2(float(dx), float(dy)) * texel;
        vec2 sampleUV = vUv + offset;
        
        if (sampleUV.x < 0.0 || sampleUV.x > 1.0 || sampleUV.y < 0.0 || sampleUV.y > 1.0) continue;
        
        float neighborHeight = texture2D(heightmap, sampleUV).r;
        float diff = height - neighborHeight;
        
        // Only consider downhill neighbors
        if (diff > talusAngle) {
          // Material should flow to this neighbor
          float excess = diff - talusAngle;
          sum += excess;
          count += 1.0;
          maxDiff = max(maxDiff, excess);
        }
      }
    }
    
    // Calculate material to remove from this cell
    float materialToRemove = 0.0;
    if (count > 0.0) {
      materialToRemove = (sum / count) * erosionStrength * 0.5;
      materialToRemove = min(materialToRemove, maxDiff * 0.5);
    }
    
    float newHeight = height - materialToRemove;
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

// Fragment shader for detail overlay
// Adds multi-scale micro-detail to terrain
const DETAIL_OVERLAY_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform vec2 resolution;
  uniform float seed;
  uniform float macroStrength;   // Large features (>100m)
  uniform float mesoStrength;    // Medium features (10-100m)
  uniform float microStrength;   // Small features (<10m)
  
  ${NOISE_FUNCTIONS}
  
  void main() {
    float height = texture2D(heightmap, vUv).r;
    vec2 p = vUv * resolution;
    
    // Macro detail (large boulders, rock formations)
    float macro = fbm(p * 0.02 + seed, 3.0, 0.5, 2.0) - 0.5;
    
    // Meso detail (small rocks, terrain variation)
    float meso = fbm(p * 0.08 + seed * 2.0, 4.0, 0.5, 2.0) - 0.5;
    
    // Micro detail (surface roughness)
    float micro = turbulence(p * 0.3 + seed * 3.0, 3.0) - 0.5;
    
    // Scale detail strength based on terrain height
    // More detail on slopes, less on flat areas
    float slopeFactor = 0.5 + height * 0.5;
    
    // Combine details
    float detail = macro * macroStrength * slopeFactor
                 + meso * mesoStrength * slopeFactor
                 + micro * microStrength;
    
    float newHeight = height + detail;
    newHeight = clamp(newHeight, 0.0, 1.0);
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

export class GPUTerrainGenerator {
  private regl: Regl;
  private canvas: HTMLCanvasElement;
  private heightmapFBO: Framebuffer2D | null = null;
  private levelFBO: Framebuffer2D | null = null;
  private tempFBO: Framebuffer2D | null = null;

  private generateHeightmap: DrawCommand | null = null;
  private assignLevels: DrawCommand | null = null;
  private smoothRamps: DrawCommand | null = null;
  private applyBorders: DrawCommand | null = null;
  private applyThermalErosion: DrawCommand | null = null;
  private applyDetailOverlay: DrawCommand | null = null;

  private currentWidth = 0;
  private currentHeight = 0;
  private isInitialized = false;

  constructor() {
    // Create offscreen canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1;
    this.canvas.height = 1;

    // Initialize regl
    this.regl = createREGL({
      canvas: this.canvas,
      extensions: ['OES_texture_float', 'OES_texture_float_linear'],
      optionalExtensions: ['WEBGL_color_buffer_float'],
    });

    this.initShaders();
    this.isInitialized = true;

    console.log('[GPUTerrainGenerator] Initialized with regl');
  }

  private initShaders(): void {
    const fullscreenQuad = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];

    // Heightmap generation shader
    this.generateHeightmap = this.regl({
      frag: HEIGHTMAP_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        seed: this.regl.prop<any, 'seed'>('seed'),
        resolution: this.regl.prop<any, 'resolution'>('resolution'),
        noiseScale: this.regl.prop<any, 'noiseScale'>('noiseScale'),
        octaves: this.regl.prop<any, 'octaves'>('octaves'),
        persistence: this.regl.prop<any, 'persistence'>('persistence'),
        lacunarity: this.regl.prop<any, 'lacunarity'>('lacunarity'),
        ridgeStrength: this.regl.prop<any, 'ridgeStrength'>('ridgeStrength'),
        warpStrength: this.regl.prop<any, 'warpStrength'>('warpStrength'),
        seaLevel: this.regl.prop<any, 'seaLevel'>('seaLevel'),
        heightScale: this.regl.prop<any, 'heightScale'>('heightScale'),
        plainsFlat: this.regl.prop<any, 'plainsFlat'>('plainsFlat'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });

    // Level assignment shader
    this.assignLevels = this.regl({
      frag: LEVEL_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        heightmap: this.regl.prop<any, 'heightmap'>('heightmap'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });

    // Smoothing/ramps shader
    this.smoothRamps = this.regl({
      frag: SMOOTH_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        heightmap: this.regl.prop<any, 'heightmap'>('heightmap'),
        levelmap: this.regl.prop<any, 'levelmap'>('levelmap'),
        resolution: this.regl.prop<any, 'resolution'>('resolution'),
        rampWidth: this.regl.prop<any, 'rampWidth'>('rampWidth'),
        noiseAmplitude: this.regl.prop<any, 'noiseAmplitude'>('noiseAmplitude'),
        seed: this.regl.prop<any, 'seed'>('seed'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });

    // Border barriers shader
    this.applyBorders = this.regl({
      frag: BORDER_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        heightmap: this.regl.prop<any, 'heightmap'>('heightmap'),
        resolution: this.regl.prop<any, 'resolution'>('resolution'),
        borderWidth: this.regl.prop<any, 'borderWidth'>('borderWidth'),
        borderHeight: this.regl.prop<any, 'borderHeight'>('borderHeight'),
        borderSmoothness: this.regl.prop<any, 'borderSmoothness'>('borderSmoothness'),
        borderType: this.regl.prop<any, 'borderType'>('borderType'),
        seaLevel: this.regl.prop<any, 'seaLevel'>('seaLevel'),
        seed: this.regl.prop<any, 'seed'>('seed'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });

    // Thermal erosion shader
    this.applyThermalErosion = this.regl({
      frag: THERMAL_EROSION_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        heightmap: this.regl.prop<any, 'heightmap'>('heightmap'),
        resolution: this.regl.prop<any, 'resolution'>('resolution'),
        talusAngle: this.regl.prop<any, 'talusAngle'>('talusAngle'),
        erosionStrength: this.regl.prop<any, 'erosionStrength'>('erosionStrength'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });

    // Detail overlay shader
    this.applyDetailOverlay = this.regl({
      frag: DETAIL_OVERLAY_FRAG,
      vert: FULLSCREEN_VERT,
      attributes: { position: fullscreenQuad },
      uniforms: {
        heightmap: this.regl.prop<any, 'heightmap'>('heightmap'),
        resolution: this.regl.prop<any, 'resolution'>('resolution'),
        seed: this.regl.prop<any, 'seed'>('seed'),
        macroStrength: this.regl.prop<any, 'macroStrength'>('macroStrength'),
        mesoStrength: this.regl.prop<any, 'mesoStrength'>('mesoStrength'),
        microStrength: this.regl.prop<any, 'microStrength'>('microStrength'),
      },
      framebuffer: this.regl.prop<any, 'framebuffer'>('framebuffer'),
      count: 6,
    });
  }

  private ensureFramebuffers(width: number, height: number): void {
    if (this.currentWidth === width && this.currentHeight === height) {
      return;
    }

    // Resize canvas
    this.canvas.width = width;
    this.canvas.height = height;

    // Destroy old framebuffers
    if (this.heightmapFBO) this.heightmapFBO.destroy();
    if (this.levelFBO) this.levelFBO.destroy();
    if (this.tempFBO) this.tempFBO.destroy();

    // Create new framebuffers with float textures
    const fboConfig = {
      width,
      height,
      colorType: 'float' as const,
      colorFormat: 'rgba' as const,
    };

    this.heightmapFBO = this.regl.framebuffer(fboConfig);
    this.levelFBO = this.regl.framebuffer(fboConfig);
    this.tempFBO = this.regl.framebuffer(fboConfig);

    this.currentWidth = width;
    this.currentHeight = height;

    console.log(`[GPUTerrainGenerator] Created framebuffers: ${width}x${height}`);
  }

  /**
   * Generate terrain heightmap on GPU
   */
  generate(config: Partial<GPUTerrainConfig> = {}): Float32Array {
    const cfg = { ...DEFAULT_GPU_TERRAIN_CONFIG, ...config };
    const { width, height } = cfg;

    console.time('[GPUTerrain] Total generation');

    // Ensure framebuffers are ready
    this.ensureFramebuffers(width, height);

    // Step 1: Generate base heightmap
    console.time('[GPUTerrain] Heightmap');
    this.generateHeightmap!({
      seed: cfg.seed,
      resolution: [width, height],
      noiseScale: cfg.noiseScale,
      octaves: cfg.octaves,
      persistence: cfg.persistence,
      lacunarity: cfg.lacunarity,
      ridgeStrength: cfg.ridgeStrength,
      warpStrength: cfg.warpStrength,
      seaLevel: cfg.seaLevel,
      heightScale: cfg.heightScale,
      plainsFlat: cfg.plainsFlat ?? 0.4,
      framebuffer: this.heightmapFBO,
    });
    console.timeEnd('[GPUTerrain] Heightmap');

    // Step 2: Assign levels based on height
    console.time('[GPUTerrain] Levels');
    this.assignLevels!({
      heightmap: this.heightmapFBO!,
      framebuffer: this.levelFBO,
    });
    console.timeEnd('[GPUTerrain] Levels');

    // Step 3: Apply border barriers
    if (cfg.borderEnabled) {
      console.time('[GPUTerrain] Borders');
      // Convert border type to numeric: mountain=0, cliff=1, water=2
      const borderTypeNum = cfg.borderType === 'cliff' ? 1 : cfg.borderType === 'water' ? 2 : 0;
      this.applyBorders!({
        heightmap: this.heightmapFBO!,
        resolution: [width, height],
        borderWidth: cfg.borderWidth,
        borderHeight: cfg.borderHeight,
        borderSmoothness: cfg.borderSmoothness,
        borderType: borderTypeNum,
        seaLevel: cfg.seaLevel,
        seed: cfg.seed,
        framebuffer: this.tempFBO,
      });
      // Swap buffers
      [this.heightmapFBO, this.tempFBO] = [this.tempFBO, this.heightmapFBO];
      console.timeEnd('[GPUTerrain] Borders');
    }

    // Step 4: Smooth edges at level boundaries
    if (cfg.rampEnabled) {
      console.time('[GPUTerrain] Edge Smoothing');
      // Multiple passes to spread the smoothing (creates wider ramps)
      const passes = 12;
      for (let i = 0; i < passes; i++) {
        this.smoothRamps!({
          heightmap: this.heightmapFBO!,
          levelmap: this.levelFBO!,
          resolution: [width, height],
          rampWidth: cfg.rampWidth,
          noiseAmplitude: cfg.rampNoiseAmplitude,
          seed: cfg.seed + i * 100,
          framebuffer: this.tempFBO,
        });
        // Swap buffers
        [this.heightmapFBO, this.tempFBO] = [this.tempFBO, this.heightmapFBO];
      }
      console.timeEnd('[GPUTerrain] Edge Smoothing');
    }

    // Step 5: Thermal erosion (talus/slope collapse)
    if (cfg.thermalErosionEnabled !== false) {
      console.time('[GPUTerrain] Thermal Erosion');
      const erosionPasses = cfg.erosionIterations ?? 3;
      for (let i = 0; i < erosionPasses; i++) {
        this.applyThermalErosion!({
          heightmap: this.heightmapFBO!,
          resolution: [width, height],
          talusAngle: cfg.thermalTalusAngle ?? 0.04,
          erosionStrength: cfg.thermalErosionStrength ?? 0.5,
          framebuffer: this.tempFBO,
        });
        // Swap buffers
        [this.heightmapFBO, this.tempFBO] = [this.tempFBO, this.heightmapFBO];
      }
      console.timeEnd('[GPUTerrain] Thermal Erosion');
    }

    // Step 6: Detail overlay (multi-scale noise)
    if (cfg.detailEnabled !== false) {
      console.time('[GPUTerrain] Detail Overlay');
      this.applyDetailOverlay!({
        heightmap: this.heightmapFBO!,
        resolution: [width, height],
        seed: cfg.seed,
        macroStrength: cfg.macroDetailStrength ?? 0.02,
        mesoStrength: cfg.mesoDetailStrength ?? 0.015,
        microStrength: cfg.microDetailStrength ?? 0.008,
        framebuffer: this.tempFBO,
      });
      // Swap buffers
      [this.heightmapFBO, this.tempFBO] = [this.tempFBO, this.heightmapFBO];
      console.timeEnd('[GPUTerrain] Detail Overlay');
    }

    // Step 7: Read back pixels
    console.time('[GPUTerrain] Readback');
    const pixels = this.regl.read({
      framebuffer: this.heightmapFBO!,
    });
    console.timeEnd('[GPUTerrain] Readback');

    // Convert RGBA to single channel float array
    const heights = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      // Pixels are RGBA, we only need R channel (normalized 0-1)
      heights[i] = pixels[i * 4] * cfg.heightScale;
    }

    console.timeEnd('[GPUTerrain] Total generation');
    console.log(`[GPUTerrainGenerator] Generated ${width}x${height} heightmap`);

    return heights;
  }

  /**
   * Generate and return both heights and levels
   */
  generateWithLevels(config: Partial<GPUTerrainConfig> = {}): {
    heights: Float32Array;
    levels: Uint8Array;
    minHeight: number;
    maxHeight: number;
  } {
    const cfg = { ...DEFAULT_GPU_TERRAIN_CONFIG, ...config };
    const { width, height } = cfg;

    // Generate heights
    const heights = this.generate(config);

    // Read levels
    const levelPixels = this.regl.read({
      framebuffer: this.levelFBO!,
    });

    // Convert to level IDs
    const levels = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const levelValue = levelPixels[i * 4];
      if (levelValue < 0.1) levels[i] = 0;
      else if (levelValue < 0.4) levels[i] = 1;
      else if (levelValue < 0.6) levels[i] = 2;
      else levels[i] = 3;
    }

    // Calculate stats
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    for (let i = 0; i < heights.length; i++) {
      minHeight = Math.min(minHeight, heights[i]);
      maxHeight = Math.max(maxHeight, heights[i]);
    }

    return { heights, levels, minHeight, maxHeight };
  }

  /**
   * Cleanup GPU resources
   */
  destroy(): void {
    if (this.heightmapFBO) this.heightmapFBO.destroy();
    if (this.levelFBO) this.levelFBO.destroy();
    if (this.tempFBO) this.tempFBO.destroy();
    this.regl.destroy();
    this.isInitialized = false;
    console.log('[GPUTerrainGenerator] Destroyed');
  }
}

// Singleton instance
let gpuGenerator: GPUTerrainGenerator | null = null;

export function getGPUTerrainGenerator(): GPUTerrainGenerator {
  if (!gpuGenerator) {
    gpuGenerator = new GPUTerrainGenerator();
  }
  return gpuGenerator;
}

export function destroyGPUTerrainGenerator(): void {
  if (gpuGenerator) {
    gpuGenerator.destroy();
    gpuGenerator = null;
  }
}

