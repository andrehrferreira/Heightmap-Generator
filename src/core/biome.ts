/**
 * Biome/Map Type System
 * Defines different terrain types with their characteristics.
 */

/**
 * Available biome/map types.
 */
export type BiomeType = 
  | 'plains'      // Flat terrain with gentle hills
  | 'hills'       // Rolling hills
  | 'mountain'    // Mountainous terrain
  | 'desert'      // Desert with dunes
  | 'canyon'      // Deep canyons and valleys
  | 'island'      // Island surrounded by water
  | 'coastal'     // Coastal terrain with beaches
  | 'volcanic'    // Volcanic terrain with craters
  | 'tundra'      // Frozen tundra
  | 'forest'      // Forested terrain with clearings
  | 'custom';     // User-defined

/**
 * Border barrier configuration.
 */
export interface BorderConfig {
  /** Enable border barriers */
  enabled: boolean;
  /** Barrier type */
  type: 'mountain' | 'cliff' | 'water' | 'none';
  /** Barrier height (0-500) */
  height: number;
  /** Barrier width in cells */
  width: number;
  /** Smoothness of barrier transition (0-1) */
  smoothness: number;
  /** Number of exits/openings in the barrier */
  exitCount: number;
  /** Width of each exit in cells */
  exitWidth: number;
  /** Positions of exits (0-1 along each edge, auto if empty) */
  exitPositions: number[];
  /** Noise amplitude for barriers (0-100) */
  noiseAmplitude: number;
  /** Noise scale for barriers (0.01-0.2) */
  noiseScale: number;
}

/**
 * Mountain/terrain density configuration.
 */
export interface TerrainDensityConfig {
  /** Overall mountain density (0-1) */
  mountainDensity: number;
  /** Mountain cluster size (1-10) */
  clusterSize: number;
  /** Maximum mountain height multiplier (0.5-3) */
  heightMultiplier: number;
  /** Valley depth multiplier (0.5-2) */
  valleyDepth: number;
  /** Flatness of plains areas (0-1) */
  plainsFlat: number;
  /** Number of distinct mountain ranges */
  rangeCount: number;
}

/**
 * Complete biome configuration.
 */
export interface BiomeConfig {
  /** Biome type */
  type: BiomeType;
  /** Display name */
  name: string;
  /** Border/barrier configuration */
  border: BorderConfig;
  /** Terrain density settings */
  density: TerrainDensityConfig;
  /** Base terrain elevation (0-1) */
  baseElevation: number;
  /** Water level (0-1, for islands/coastal) */
  waterLevel: number;
  /** Noise frequency multiplier */
  noiseScale: number;
  /** Erosion strength (0-1) */
  erosionStrength: number;
}

/**
 * Default border configuration.
 */
export const DEFAULT_BORDER_CONFIG: BorderConfig = {
  enabled: true,
  type: 'mountain',
  height: 300,
  width: 50,
  smoothness: 0.7,
  exitCount: 4,
  exitWidth: 10,
  exitPositions: [],
  noiseAmplitude: 50, // Noise strength
  noiseScale: 0.05,   // Noise frequency
};

/**
 * Default terrain density configuration.
 */
export const DEFAULT_DENSITY_CONFIG: TerrainDensityConfig = {
  mountainDensity: 0.3,
  clusterSize: 3,
  heightMultiplier: 1.0,
  valleyDepth: 1.0,
  plainsFlat: 0.5,
  rangeCount: 2,
};

/**
 * Biome presets with their default configurations.
 */
export const BIOME_PRESETS: Record<BiomeType, BiomeConfig> = {
  plains: {
    type: 'plains',
    name: 'Plains',
    border: { ...DEFAULT_BORDER_CONFIG, height: 200, exitCount: 4 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.1, 
      plainsFlat: 0.8,
      heightMultiplier: 0.5,
      rangeCount: 0,
    },
    baseElevation: 0.3,
    waterLevel: 0.05,
    noiseScale: 0.5,
    erosionStrength: 0.3,
  },
  
  hills: {
    type: 'hills',
    name: 'Rolling Hills',
    border: { ...DEFAULT_BORDER_CONFIG, height: 250, exitCount: 4 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.3, 
      plainsFlat: 0.4,
      heightMultiplier: 0.7,
      rangeCount: 1,
    },
    baseElevation: 0.35,
    waterLevel: 0.08,
    noiseScale: 0.8,
    erosionStrength: 0.4,
  },
  
  mountain: {
    type: 'mountain',
    name: 'Mountain Range',
    border: { ...DEFAULT_BORDER_CONFIG, height: 400, exitCount: 2 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.7, 
      plainsFlat: 0.2,
      heightMultiplier: 1.5,
      valleyDepth: 1.3,
      rangeCount: 3,
      clusterSize: 5,
    },
    baseElevation: 0.4,
    waterLevel: 0.1,
    noiseScale: 1.2,
    erosionStrength: 0.6,
  },
  
  desert: {
    type: 'desert',
    name: 'Desert',
    border: { ...DEFAULT_BORDER_CONFIG, type: 'cliff', height: 150, exitCount: 2 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.15, 
      plainsFlat: 0.6,
      heightMultiplier: 0.6,
      rangeCount: 1,
    },
    baseElevation: 0.25,
    waterLevel: 0.0,
    noiseScale: 0.6,
    erosionStrength: 0.2,
  },
  
  canyon: {
    type: 'canyon',
    name: 'Canyon Lands',
    border: { ...DEFAULT_BORDER_CONFIG, type: 'cliff', height: 350, exitCount: 2 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.4, 
      valleyDepth: 2.0,
      plainsFlat: 0.3,
      heightMultiplier: 1.2,
      rangeCount: 2,
    },
    baseElevation: 0.5,
    waterLevel: 0.05,
    noiseScale: 1.0,
    erosionStrength: 0.8,
  },
  
  island: {
    type: 'island',
    name: 'Island',
    border: { ...DEFAULT_BORDER_CONFIG, type: 'water', height: 0, exitCount: 0, enabled: false },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.4, 
      plainsFlat: 0.5,
      heightMultiplier: 1.0,
      rangeCount: 1,
    },
    baseElevation: 0.3,
    waterLevel: 0.35,
    noiseScale: 0.9,
    erosionStrength: 0.5,
  },
  
  coastal: {
    type: 'coastal',
    name: 'Coastal',
    border: { 
      ...DEFAULT_BORDER_CONFIG, 
      type: 'mountain', 
      height: 250, 
      exitCount: 3,
      // One side is water
    },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.25, 
      plainsFlat: 0.6,
      heightMultiplier: 0.8,
      rangeCount: 1,
    },
    baseElevation: 0.2,
    waterLevel: 0.2,
    noiseScale: 0.7,
    erosionStrength: 0.4,
  },
  
  volcanic: {
    type: 'volcanic',
    name: 'Volcanic',
    border: { ...DEFAULT_BORDER_CONFIG, height: 300, exitCount: 2 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.5, 
      plainsFlat: 0.3,
      heightMultiplier: 1.3,
      valleyDepth: 0.8,
      rangeCount: 2,
      clusterSize: 4,
    },
    baseElevation: 0.35,
    waterLevel: 0.05,
    noiseScale: 1.1,
    erosionStrength: 0.3,
  },
  
  tundra: {
    type: 'tundra',
    name: 'Tundra',
    border: { ...DEFAULT_BORDER_CONFIG, height: 180, exitCount: 3 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.2, 
      plainsFlat: 0.7,
      heightMultiplier: 0.6,
      rangeCount: 1,
    },
    baseElevation: 0.28,
    waterLevel: 0.1,
    noiseScale: 0.5,
    erosionStrength: 0.2,
  },
  
  forest: {
    type: 'forest',
    name: 'Forest',
    border: { ...DEFAULT_BORDER_CONFIG, height: 220, exitCount: 4 },
    density: { 
      ...DEFAULT_DENSITY_CONFIG, 
      mountainDensity: 0.25, 
      plainsFlat: 0.5,
      heightMultiplier: 0.8,
      rangeCount: 1,
    },
    baseElevation: 0.32,
    waterLevel: 0.12,
    noiseScale: 0.7,
    erosionStrength: 0.4,
  },
  
  custom: {
    type: 'custom',
    name: 'Custom',
    border: { ...DEFAULT_BORDER_CONFIG },
    density: { ...DEFAULT_DENSITY_CONFIG },
    baseElevation: 0.3,
    waterLevel: 0.1,
    noiseScale: 1.0,
    erosionStrength: 0.5,
  },
};

/**
 * Get biome preset by type.
 */
export function getBiomePreset(type: BiomeType): BiomeConfig {
  return { ...BIOME_PRESETS[type] };
}

/**
 * Create a custom biome configuration.
 */
export function createCustomBiome(
  base: BiomeType,
  overrides: Partial<BiomeConfig>
): BiomeConfig {
  const preset = getBiomePreset(base);
  return {
    ...preset,
    ...overrides,
    type: 'custom',
    border: { ...preset.border, ...overrides.border },
    density: { ...preset.density, ...overrides.density },
  };
}

