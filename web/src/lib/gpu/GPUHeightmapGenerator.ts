/**
 * GPU-accelerated heightmap generation using WebGL.
 * Generates noise-based heightmaps directly on the GPU for massive performance gains.
 */

import * as THREE from 'three';
import {
  heightmapGenVertexShader,
  heightmapGenFragmentShader,
  gaussianBlurFragmentShader,
} from './shaders';

export interface GPUHeightmapConfig {
  width: number;
  height: number;
  seed: number;
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  minLevel: number;
  maxLevel: number;
  smoothingIterations: number;
  smoothingRadius: number;
}

export const DEFAULT_GPU_CONFIG: GPUHeightmapConfig = {
  width: 512,
  height: 512,
  seed: Date.now(),
  noiseScale: 0.01,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
  minLevel: 0,
  maxLevel: 3,
  smoothingIterations: 2,
  smoothingRadius: 2,
};

/**
 * GPU-based heightmap generator using WebGL compute via render-to-texture.
 */
export class GPUHeightmapGenerator {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  
  // Render targets for ping-pong rendering
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  
  // Materials
  private noiseMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  
  private isInitialized = false;
  private currentWidth = 0;
  private currentHeight = 0;

  constructor() {
    // Create offscreen renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(1, 1); // Will be resized
    
    // Orthographic camera for fullscreen quad
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // Scene with fullscreen quad
    this.scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    
    // Noise generation material
    this.noiseMaterial = new THREE.ShaderMaterial({
      vertexShader: heightmapGenVertexShader,
      fragmentShader: heightmapGenFragmentShader,
      uniforms: {
        seed: { value: 0 },
        noiseScale: { value: 0.01 },
        octaves: { value: 4 },
        persistence: { value: 0.5 },
        lacunarity: { value: 2.0 },
        minLevel: { value: 0 },
        maxLevel: { value: 3 },
        resolution: { value: new THREE.Vector2(512, 512) },
      },
    });
    
    // Blur material
    this.blurMaterial = new THREE.ShaderMaterial({
      vertexShader: heightmapGenVertexShader,
      fragmentShader: gaussianBlurFragmentShader,
      uniforms: {
        inputTexture: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        radius: { value: 2.0 },
        resolution: { value: new THREE.Vector2(512, 512) },
      },
    });
    
    this.quad = new THREE.Mesh(geometry, this.noiseMaterial);
    this.scene.add(this.quad);
    
    // Create initial render targets
    this.renderTargetA = this.createRenderTarget(512, 512);
    this.renderTargetB = this.createRenderTarget(512, 512);
    
    this.isInitialized = true;
  }
  
  private createRenderTarget(width: number, height: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType, // High precision for heightmap data
      depthBuffer: false,
      stencilBuffer: false,
    });
  }
  
  private ensureSize(width: number, height: number): void {
    if (this.currentWidth !== width || this.currentHeight !== height) {
      this.renderTargetA.dispose();
      this.renderTargetB.dispose();
      this.renderTargetA = this.createRenderTarget(width, height);
      this.renderTargetB = this.createRenderTarget(width, height);
      this.renderer.setSize(width, height);
      this.currentWidth = width;
      this.currentHeight = height;
    }
  }
  
  /**
   * Generate a heightmap on the GPU.
   * @returns Float32Array of height values (0-1 range)
   */
  generate(config: Partial<GPUHeightmapConfig> = {}): {
    heights: Float32Array;
    levels: Uint8Array;
    width: number;
    height: number;
  } {
    const cfg = { ...DEFAULT_GPU_CONFIG, ...config };
    
    console.time('[GPU] Heightmap generation');
    
    this.ensureSize(cfg.width, cfg.height);
    
    // Update noise uniforms
    this.noiseMaterial.uniforms.seed.value = cfg.seed;
    this.noiseMaterial.uniforms.noiseScale.value = cfg.noiseScale;
    this.noiseMaterial.uniforms.octaves.value = cfg.octaves;
    this.noiseMaterial.uniforms.persistence.value = cfg.persistence;
    this.noiseMaterial.uniforms.lacunarity.value = cfg.lacunarity;
    this.noiseMaterial.uniforms.minLevel.value = cfg.minLevel;
    this.noiseMaterial.uniforms.maxLevel.value = cfg.maxLevel;
    this.noiseMaterial.uniforms.resolution.value.set(cfg.width, cfg.height);
    
    // Step 1: Generate noise
    this.quad.material = this.noiseMaterial;
    this.renderer.setRenderTarget(this.renderTargetA);
    this.renderer.render(this.scene, this.camera);
    
    // Step 2: Apply smoothing (ping-pong blur)
    let source = this.renderTargetA;
    let target = this.renderTargetB;
    
    this.blurMaterial.uniforms.radius.value = cfg.smoothingRadius;
    this.blurMaterial.uniforms.resolution.value.set(cfg.width, cfg.height);
    
    for (let i = 0; i < cfg.smoothingIterations; i++) {
      // Horizontal blur
      this.blurMaterial.uniforms.inputTexture.value = source.texture;
      this.blurMaterial.uniforms.direction.value.set(1, 0);
      this.quad.material = this.blurMaterial;
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
      
      [source, target] = [target, source];
      
      // Vertical blur
      this.blurMaterial.uniforms.inputTexture.value = source.texture;
      this.blurMaterial.uniforms.direction.value.set(0, 1);
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
      
      [source, target] = [target, source];
    }
    
    // Step 3: Read back result
    const pixels = new Float32Array(cfg.width * cfg.height * 4);
    this.renderer.readRenderTargetPixels(source, 0, 0, cfg.width, cfg.height, pixels);
    
    // Extract height and level data
    const heights = new Float32Array(cfg.width * cfg.height);
    const levels = new Uint8Array(cfg.width * cfg.height);
    
    for (let i = 0; i < cfg.width * cfg.height; i++) {
      heights[i] = pixels[i * 4]; // R channel = height
      levels[i] = Math.round(pixels[i * 4 + 1] * 255); // G channel = level
    }
    
    this.renderer.setRenderTarget(null);
    
    console.timeEnd('[GPU] Heightmap generation');
    
    return {
      heights,
      levels,
      width: cfg.width,
      height: cfg.height,
    };
  }
  
  /**
   * Generate a heightmap texture directly (for use with displacement maps).
   */
  generateTexture(config: Partial<GPUHeightmapConfig> = {}): THREE.DataTexture {
    const { heights, width, height } = this.generate(config);
    
    // Convert to Uint8 for texture (or keep as Float for more precision)
    const data = new Uint8Array(width * height);
    for (let i = 0; i < heights.length; i++) {
      data[i] = Math.floor(heights[i] * 255);
    }
    
    const texture = new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    return texture;
  }
  
  /**
   * Create a heightmap texture from existing grid data.
   */
  createHeightmapTextureFromGrid(
    grid: any,
    minHeight: number,
    maxHeight: number
  ): THREE.DataTexture {
    const cols = grid.getCols();
    const rows = grid.getRows();
    const heightRange = maxHeight - minHeight || 1;
    
    // Use Float32 for precision
    const data = new Float32Array(cols * rows);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const normalized = (cell.height - minHeight) / heightRange;
        data[y * cols + x] = normalized;
      }
    }
    
    const texture = new THREE.DataTexture(
      data,
      cols,
      rows,
      THREE.RedFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    return texture;
  }
  
  /**
   * Create a level map texture from grid data.
   */
  createLevelMapTextureFromGrid(grid: any): THREE.DataTexture {
    const cols = grid.getCols();
    const rows = grid.getRows();
    const data = new Uint8Array(cols * rows);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        data[y * cols + x] = cell.levelId;
      }
    }
    
    const texture = new THREE.DataTexture(
      data,
      cols,
      rows,
      THREE.RedFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    return texture;
  }
  
  /**
   * Create a flags map texture from grid data.
   * R = road, G = water, B = cliff, A = ramp
   */
  createFlagsMapTextureFromGrid(grid: any): THREE.DataTexture {
    const cols = grid.getCols();
    const rows = grid.getRows();
    const data = new Uint8Array(cols * rows * 4);
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = grid.getCell(x, y);
        const idx = (y * cols + x) * 4;
        data[idx] = cell.flags.road ? 255 : 0;
        data[idx + 1] = cell.flags.water ? 255 : 0;
        data[idx + 2] = cell.flags.cliff ? 255 : 0;
        data[idx + 3] = cell.flags.ramp ? 255 : 0;
      }
    }
    
    const texture = new THREE.DataTexture(
      data,
      cols,
      rows,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    texture.needsUpdate = true;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    
    return texture;
  }
  
  /**
   * Dispose of GPU resources.
   */
  dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.noiseMaterial.dispose();
    this.blurMaterial.dispose();
    this.quad.geometry.dispose();
    this.renderer.dispose();
    this.isInitialized = false;
  }
}

// Singleton instance
let instance: GPUHeightmapGenerator | null = null;

export function getGPUGenerator(): GPUHeightmapGenerator {
  if (!instance) {
    instance = new GPUHeightmapGenerator();
  }
  return instance;
}

