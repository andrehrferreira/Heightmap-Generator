/**
 * GPU-optimized terrain renderer using displacement mapping.
 * Instead of modifying vertex positions on CPU, we use a heightmap texture
 * and vertex shader displacement for much better performance.
 */

import * as THREE from 'three';
import { terrainVertexShader, terrainFragmentShader } from './shaders';
import { getGPUGenerator } from './GPUHeightmapGenerator';

export interface TerrainRendererConfig {
  terrainSize: number;
  segments: number;
  heightScale: number;
}

const DEFAULT_CONFIG: TerrainRendererConfig = {
  terrainSize: 16000,  // Epic open world (16km x 16km)
  segments: 1024,      // High resolution for detailed terrain
  heightScale: 800,    // Epic height for mountains
};

// Level colors matching the original
const LEVEL_COLORS = [
  new THREE.Color(0.25, 0.73, 0.31), // Green - Level 0
  new THREE.Color(0.35, 0.65, 1.0),  // Blue - Level 1
  new THREE.Color(0.64, 0.44, 0.97), // Purple - Level 2
  new THREE.Color(0.97, 0.32, 0.29), // Red - Level 3
  new THREE.Color(0.95, 0.77, 0.06), // Yellow - Level 4
  new THREE.Color(0.06, 0.95, 0.95), // Cyan - Level 5
  new THREE.Color(0.95, 0.06, 0.77), // Magenta - Level 6
  new THREE.Color(0.5, 0.5, 0.5),    // Gray - Level 7+
];

/**
 * GPU-optimized terrain renderer.
 */
export class GPUTerrainRenderer {
  private mesh: THREE.Mesh | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  
  private heightMapTexture: THREE.DataTexture | null = null;
  private levelMapTexture: THREE.DataTexture | null = null;
  private flagsMapTexture: THREE.DataTexture | null = null;
  
  private config: TerrainRendererConfig;
  
  constructor(config: Partial<TerrainRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  /**
   * Create or update terrain mesh from grid data.
   */
  createFromGrid(
    grid: any,
    heightStats: { minHeight: number; maxHeight: number }
  ): THREE.Mesh {
    console.time('[GPU] Terrain mesh creation');
    
    const cols = grid.getCols();
    const rows = grid.getRows();
    const gpuGen = getGPUGenerator();
    
    // Create textures from grid data
    this.heightMapTexture?.dispose();
    this.levelMapTexture?.dispose();
    this.flagsMapTexture?.dispose();
    
    this.heightMapTexture = gpuGen.createHeightmapTextureFromGrid(
      grid,
      heightStats.minHeight,
      heightStats.maxHeight
    );
    this.levelMapTexture = gpuGen.createLevelMapTextureFromGrid(grid);
    this.flagsMapTexture = gpuGen.createFlagsMapTextureFromGrid(grid);
    
    // Determine segments (limit for performance)
    const maxDim = Math.max(cols, rows);
    const segments = Math.min(maxDim, this.config.segments);
    
    // Create geometry if needed or if size changed
    if (!this.geometry || this.geometry.parameters.widthSegments !== segments) {
      this.geometry?.dispose();
      this.geometry = new THREE.PlaneGeometry(
        this.config.terrainSize,
        this.config.terrainSize,
        segments,
        segments
      );
      this.geometry.rotateX(-Math.PI / 2);
    }
    
    // Create shader material
    if (!this.material) {
      this.material = new THREE.ShaderMaterial({
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        uniforms: {
          heightMap: { value: null },
          levelMap: { value: null },
          flagsMap: { value: null },
          heightScale: { value: this.config.heightScale },
          heightOffset: { value: 0 },
          levelColors: { value: LEVEL_COLORS },
          roadColor: { value: new THREE.Color(0.85, 0.6, 0.15) },
          waterColor: { value: new THREE.Color(0.2, 0.6, 0.9) },
          ambientColor: { value: new THREE.Color(0.3, 0.3, 0.35) },
          lightColor: { value: new THREE.Color(0.9, 0.9, 0.85) },
          lightDirection: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
        },
        side: THREE.DoubleSide,
      });
    }
    
    // Update uniforms
    this.material.uniforms.heightMap.value = this.heightMapTexture;
    this.material.uniforms.levelMap.value = this.levelMapTexture;
    this.material.uniforms.flagsMap.value = this.flagsMapTexture;
    this.material.uniforms.heightScale.value = this.config.heightScale;
    
    // Create mesh
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    } else {
      this.mesh.geometry = this.geometry;
      this.mesh.material = this.material;
    }
    
    console.timeEnd('[GPU] Terrain mesh creation');
    
    return this.mesh;
  }
  
  /**
   * Update height scale.
   */
  setHeightScale(scale: number): void {
    this.config.heightScale = scale;
    if (this.material) {
      this.material.uniforms.heightScale.value = scale;
    }
  }
  
  /**
   * Get current mesh.
   */
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }
  
  /**
   * Dispose of resources.
   */
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    this.heightMapTexture?.dispose();
    this.levelMapTexture?.dispose();
    this.flagsMapTexture?.dispose();
    this.mesh = null;
    this.geometry = null;
    this.material = null;
  }
}

/**
 * Fallback renderer using standard Three.js (for simpler cases).
 * Uses vertex colors instead of shader-based rendering.
 */
export class StandardTerrainRenderer {
  private mesh: THREE.Mesh | null = null;
  private geometry: THREE.PlaneGeometry | null = null;
  private material: THREE.MeshLambertMaterial | null = null;
  
  private config: TerrainRendererConfig;
  
  constructor(config: Partial<TerrainRendererConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
  
  createFromGrid(
    grid: any,
    heightStats: { minHeight: number; maxHeight: number }
  ): THREE.Mesh {
    console.time('[CPU] Terrain mesh creation');
    
    const cols = grid.getCols();
    const rows = grid.getRows();
    
    // Limit segments for performance
    const maxSegments = Math.min(Math.max(cols, rows), this.config.segments);
    const segmentsX = Math.min(cols - 1, maxSegments);
    const segmentsY = Math.min(rows - 1, maxSegments);
    
    // Create geometry
    this.geometry?.dispose();
    this.geometry = new THREE.PlaneGeometry(
      this.config.terrainSize,
      this.config.terrainSize,
      segmentsX,
      segmentsY
    );
    this.geometry.rotateX(-Math.PI / 2);
    
    const positions = this.geometry.attributes.position.array as Float32Array;
    const vertexCount = (segmentsX + 1) * (segmentsY + 1);
    const colors = new Float32Array(vertexCount * 3);
    
    const { minHeight, maxHeight } = heightStats;
    const heightRange = maxHeight - minHeight || 1;
    
    // Map vertices - using height-based coloring for realistic terrain
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const vertexIndex = j * (segmentsX + 1) + i;
        
        const gx = Math.min(Math.floor((i / segmentsX) * (cols - 1)), cols - 1);
        const gy = Math.min(Math.floor((j / segmentsY) * (rows - 1)), rows - 1);
        const cell = grid.getCell(gx, gy);
        
        if (!cell) continue;
        
        // Height
        const normalizedHeight = (cell.height - minHeight) / heightRange;
        positions[vertexIndex * 3 + 1] = normalizedHeight * this.config.heightScale;
        
        // Height-based coloring (topographic style)
        let r: number, g: number, b: number;
        
        if (cell.flags?.road) {
          // Roads - brownish
          r = 0.6; g = 0.5; b = 0.3;
        } else if (cell.flags?.water || normalizedHeight < 0.02) {
          // Water/Sea - deep blue
          r = 0.1; g = 0.25; b = 0.5;
        } else if (normalizedHeight < 0.15) {
          // Coastal lowlands - sandy/beach
          r = 0.76; g = 0.7; b = 0.5;
        } else if (normalizedHeight < 0.35) {
          // Low terrain - green grassland
          const t = (normalizedHeight - 0.15) / 0.2;
          r = 0.3 - t * 0.1;
          g = 0.6 - t * 0.15;
          b = 0.2;
        } else if (normalizedHeight < 0.55) {
          // Mid terrain - forest green to brown
          const t = (normalizedHeight - 0.35) / 0.2;
          r = 0.2 + t * 0.25;
          g = 0.45 - t * 0.15;
          b = 0.15;
        } else if (normalizedHeight < 0.75) {
          // High terrain - rocky brown/gray
          const t = (normalizedHeight - 0.55) / 0.2;
          r = 0.45 + t * 0.15;
          g = 0.35 + t * 0.1;
          b = 0.25 + t * 0.1;
        } else if (normalizedHeight < 0.9) {
          // Mountain - gray rock
          const t = (normalizedHeight - 0.75) / 0.15;
          r = 0.55 + t * 0.15;
          g = 0.45 + t * 0.2;
          b = 0.4 + t * 0.2;
        } else {
          // Snow peaks - white
          const t = (normalizedHeight - 0.9) / 0.1;
          r = 0.7 + t * 0.3;
          g = 0.75 + t * 0.25;
          b = 0.8 + t * 0.2;
        }
        
        colors[vertexIndex * 3] = r;
        colors[vertexIndex * 3 + 1] = g;
        colors[vertexIndex * 3 + 2] = b;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.computeVertexNormals();
    
    // Material
    if (!this.material) {
      this.material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      });
    }
    
    // Mesh
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(this.geometry, this.material);
    } else {
      this.mesh.geometry = this.geometry;
    }
    
    console.timeEnd('[CPU] Terrain mesh creation');
    
    return this.mesh;
  }
  
  getMesh(): THREE.Mesh | null {
    return this.mesh;
  }
  
  dispose(): void {
    this.geometry?.dispose();
    this.material?.dispose();
    this.mesh = null;
  }
}

