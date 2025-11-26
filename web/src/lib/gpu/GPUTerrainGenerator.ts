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
  // Ramp settings
  rampEnabled: boolean;
  rampWidth: number;
  rampNoiseAmplitude: number;
  // Border settings
  borderEnabled: boolean;
  borderWidth: number;
  borderHeight: number;
  borderSmoothness: number;
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

// Noise functions shared across shaders
const NOISE_FUNCTIONS = `
  // Hash function for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  
  float hash3(vec3 p) {
    return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
  }
  
  // Smooth noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  // Fractal Brownian Motion
  float fbm(vec2 p, float octaves, float persistence, float lacunarity) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (float i = 0.0; i < 8.0; i++) {
      if (i >= octaves) break;
      value += amplitude * noise(p * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    return value / maxValue;
  }
  
  // Ridged noise for mountains
  float ridgedNoise(vec2 p, float octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    float maxValue = 0.0;
    
    for (float i = 0.0; i < 8.0; i++) {
      if (i >= octaves) break;
      float n = noise(p * frequency);
      n = 1.0 - abs(n * 2.0 - 1.0); // Ridge
      n = n * n; // Sharpen
      value += amplitude * n;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    
    return value / maxValue;
  }
  
  // Domain warping for organic shapes
  vec2 warp(vec2 p, float strength, float seed) {
    float nx = fbm(p + vec2(seed, 0.0), 4.0, 0.5, 2.0);
    float ny = fbm(p + vec2(0.0, seed + 100.0), 4.0, 0.5, 2.0);
    return p + vec2(nx, ny) * strength;
  }
`;

// Fragment shader for heightmap generation
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
  
  ${NOISE_FUNCTIONS}
  
  void main() {
    vec2 p = vUv * resolution * noiseScale;
    
    // Apply domain warping for organic shapes
    vec2 wp = warp(p, warpStrength * 50.0, seed);
    
    // Base terrain with FBM
    float base = fbm(wp + seed, octaves, persistence, lacunarity);
    
    // Add ridged noise for mountains
    float ridge = ridgedNoise(wp * 0.5 + seed * 0.1, 4.0);
    
    // Combine
    float height = mix(base, ridge, ridgeStrength);
    
    // Apply sea level
    height = max(height, seaLevel) - seaLevel;
    height = height / (1.0 - seaLevel);
    
    // Clamp
    height = clamp(height, 0.0, 1.0);
    
    // Output normalized height (0-1)
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
const BORDER_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  uniform vec2 resolution;
  uniform float borderWidth;
  uniform float borderHeight;
  uniform float borderSmoothness;
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
    
    // Calculate barrier height with smooth transition
    float t = minDist / borderWidth;
    float smoothT = t * t * (3.0 - 2.0 * t); // Smoothstep
    float barrierFactor = 1.0 - smoothT;
    barrierFactor = pow(barrierFactor, 1.0 / (borderSmoothness + 0.1));
    
    // Add noise to barrier
    float n = fbm(vUv * resolution * 0.02 + seed, 4.0, 0.5, 2.0);
    float noiseOffset = (n - 0.5) * 0.2 * barrierFactor;
    
    // Calculate final height
    float barrierHeight = borderHeight / 500.0; // Normalize
    float newHeight = max(currentHeight, barrierFactor * barrierHeight + noiseOffset);
    
    gl_FragColor = vec4(newHeight, newHeight, newHeight, 1.0);
  }
`;

// Fragment shader for level assignment
const LEVEL_FRAG = `
  precision highp float;
  
  varying vec2 vUv;
  
  uniform sampler2D heightmap;
  
  void main() {
    float height = texture2D(heightmap, vUv).r;
    
    // Assign level based on height
    float level = 0.0;
    if (height < 0.01) {
      level = 0.0; // Water
    } else if (height < 0.3) {
      level = 0.25; // Lowlands
    } else if (height < 0.6) {
      level = 0.5; // Hills
    } else {
      level = 0.75; // Mountains
    }
    
    gl_FragColor = vec4(level, level, level, 1.0);
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
        seed: this.regl.prop<any, 'seed'>('seed'),
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
      this.applyBorders!({
        heightmap: this.heightmapFBO!,
        resolution: [width, height],
        borderWidth: cfg.borderWidth,
        borderHeight: cfg.borderHeight,
        borderSmoothness: cfg.borderSmoothness,
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

    // Step 5: Read back pixels
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

