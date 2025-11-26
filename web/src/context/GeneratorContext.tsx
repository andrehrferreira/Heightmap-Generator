import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { 
  saveToIndexedDB, 
  loadFromIndexedDB, 
  packFlags, 
  unpackFlags,
  clearAllData,
  KEYS 
} from '../lib/persistence';

// Biome types (must match src/core/biome.ts)
export type BiomeType = 
  | 'plains' | 'hills' | 'mountain' | 'desert' | 'canyon' 
  | 'island' | 'coastal' | 'volcanic' | 'tundra' | 'forest' | 'custom';

export interface BorderConfig {
  enabled: boolean;
  type: 'mountain' | 'cliff' | 'water' | 'none';
  height: number;
  width: number;
  smoothness: number;
  exitCount: number;
  exitWidth: number;
  noiseAmplitude: number;
  noiseScale: number;
}

export interface TerrainDensityConfig {
  mountainDensity: number;
  clusterSize: number;
  heightMultiplier: number;
  valleyDepth: number;
  plainsFlat: number;
  rangeCount: number;
}

export interface AdvancedRampConfig {
  enabled: boolean;
  maxAngle: number;
  minAngle: number;
  rampWidth: number;
  noiseAmplitude: number;
  noiseScale: number;
  enableInaccessible: boolean;
  inaccessibleMinLevel: number;
  inaccessiblePercentage: number;
}

// Types
export interface GenerationConfig {
  width: number;
  height: number;
  cellSize: number;
  levels: number;
  poiCount: number;
  roadWidth: number;
  // Biome settings
  biomeType: BiomeType;
  border: BorderConfig;
  density: TerrainDensityConfig;
  ramps: AdvancedRampConfig;
  seed: number;
  maxFPS: number; // Maximum FPS limit (default 30)
  useGPU: boolean; // Use GPU for terrain generation (default true)
}

export interface HeightStats {
  minHeight: number;
  maxHeight: number;
  avgHeight: number;
}

export interface GenerationResult {
  grid: any;
  roadNetwork?: any;
  heightStats?: HeightStats;
  stats: {
    gridSize: string;
    totalCells: number;
    roadCells: number;
    poiCount: number;
  };
}

export type ViewMode = '3d' | '2d' | 'layers';
export type StatusType = 'success' | 'warning' | 'error' | 'info';

interface GeneratorContextType {
  config: GenerationConfig;
  setConfig: (config: Partial<GenerationConfig>) => void;
  result: GenerationResult | null;
  setResult: (result: GenerationResult | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  status: { message: string; type: StatusType };
  setStatus: (message: string, type?: StatusType) => void;
  isGenerating: boolean;
  autoGenerateEnabled: boolean;
  setAutoGenerateEnabled: (enabled: boolean) => void;
  isRestored: boolean;
  generate: () => Promise<void>;
  onGenerate: (callback: (cols: number, rows: number) => void) => void;
  onRestore: (callback: () => void) => void;
}

const defaultBorder: BorderConfig = {
  enabled: true,
  type: 'mountain',
  height: 400,
  width: 60,
  smoothness: 0.8,
  exitCount: 4,
  exitWidth: 12,
  noiseAmplitude: 50,
  noiseScale: 0.05,
};

const defaultDensity: TerrainDensityConfig = {
  mountainDensity: 0.3,
  clusterSize: 3,
  heightMultiplier: 1.0,
  valleyDepth: 1.0,
  plainsFlat: 0.5,
  rangeCount: 2,
};

const defaultRamps: AdvancedRampConfig = {
  enabled: true,
  maxAngle: 60,
  minAngle: 40,
  rampWidth: 3,
  noiseAmplitude: 0.005,
  noiseScale: 0.005,
  enableInaccessible: false,
  inaccessibleMinLevel: 3,
  inaccessiblePercentage: 0.3,
  rampsPerTransition: 4, // Number of ramps between each level pair
};

const defaultConfig: GenerationConfig = {
  width: 1024,  // Default size for faster generation
  height: 1024,
  cellSize: 4,  // Grid cells = 256×256
  levels: 2,
  poiCount: 8,
  roadWidth: 5,
  // Biome settings
  biomeType: 'hills',
  border: defaultBorder,
  density: defaultDensity,
  ramps: defaultRamps,
  seed: 12345,
  maxFPS: 30,  // Default FPS limit
  useGPU: true, // Use GPU for faster terrain generation
};

// Grid data stored separately in IndexedDB (can be large)
interface GridDataCompact {
  width: number;
  height: number;
  cellSize: number;
  heights: number[];      // Float array
  levelIds: number[];     // Uint8 array
  flags: number[];        // Packed flags
}

interface RoadNetworkData {
  pois: Array<{ id: string; x: number; y: number; levelId: number; type: string }>;
  totalRoadCells: number;
}

const GeneratorContext = createContext<GeneratorContextType | null>(null);

export const useGenerator = () => {
  const context = useContext(GeneratorContext);
  if (!context) {
    throw new Error('useGenerator must be used within GeneratorProvider');
  }
  return context;
};

export const GeneratorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfigState] = useState<GenerationConfig>(defaultConfig);
  const [result, setResultState] = useState<GenerationResult | null>(null);
  const [viewMode, setViewModeState] = useState<ViewMode>('3d');
  const [status, setStatusState] = useState({ message: 'Ready', type: 'success' as StatusType });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isRestored, setIsRestored] = useState(false);
  
  const onGenerateCallbackRef = useRef<((cols: number, rows: number) => void) | null>(null);
  const onRestoreCallbackRef = useRef<(() => void) | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const autoGenerateTimeoutRef = useRef<number | null>(null);
  const previousConfigRef = useRef<GenerationConfig>(defaultConfig);
  const [autoGenerateEnabled, setAutoGenerateEnabled] = useState(true);

  // Save state to IndexedDB (debounced)
  const saveState = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        // Save config and viewMode (small data)
        await saveToIndexedDB(KEYS.CONFIG, config);
        await saveToIndexedDB(KEYS.VIEW_MODE, viewMode);

        if (result?.grid) {
          const grid = result.grid;
          const width = grid.getCols();
          const height = grid.getRows();
          const cellCount = width * height;
          
          // Use typed arrays for compact storage
          const heights: number[] = new Array(cellCount);
          const levelIds: number[] = new Array(cellCount);
          const flags: number[] = new Array(cellCount);
          
          let idx = 0;
          grid.forEachCell((cell: any) => {
            heights[idx] = cell.height;
            levelIds[idx] = cell.levelId;
            flags[idx] = packFlags(cell.flags);
            idx++;
          });

          const gridData: GridDataCompact = {
            width,
            height,
            cellSize: config.cellSize,
            heights,
            levelIds,
            flags,
          };
          
          await saveToIndexedDB(KEYS.GRID_DATA, gridData);
          
          if (result.heightStats) {
            await saveToIndexedDB(KEYS.HEIGHT_STATS, result.heightStats);
          }
        }

        if (result?.roadNetwork) {
          const roadData: RoadNetworkData = {
            pois: result.roadNetwork.pois?.map((p: any) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              levelId: p.levelId,
              type: p.type,
            })) || [],
            totalRoadCells: result.roadNetwork.totalRoadCells || 0,
          };
          await saveToIndexedDB(KEYS.ROAD_NETWORK, roadData);
        }

        console.log('[Persistence] State saved to IndexedDB');
      } catch (error) {
        console.error('[Persistence] Failed to save:', error);
      }
    }, 500);
  }, [config, result, viewMode]);

  // Restore state from IndexedDB
  const restoreState = useCallback(async () => {
    try {
      // Load config
      const savedConfig = await loadFromIndexedDB(KEYS.CONFIG);
      const savedViewMode = await loadFromIndexedDB(KEYS.VIEW_MODE);
      const savedGridData = await loadFromIndexedDB(KEYS.GRID_DATA) as GridDataCompact | null;
      const savedRoadNetwork = await loadFromIndexedDB(KEYS.ROAD_NETWORK) as RoadNetworkData | null;
      const savedHeightStats = await loadFromIndexedDB(KEYS.HEIGHT_STATS) as HeightStats | null;
      
      if (!savedConfig) {
        console.log('[Persistence] No saved state found');
        setIsRestoring(false);
        return false;
      }

      // Restore config and viewMode - merge with defaults for new fields
      setConfigState({
        ...defaultConfig,
        ...savedConfig,
        border: { ...defaultBorder, ...savedConfig.border },
        density: { ...defaultDensity, ...savedConfig.density },
        ramps: { ...defaultRamps, ...savedConfig.ramps },
      });
      if (savedViewMode) {
        setViewModeState(savedViewMode);
      }

      // Restore grid if available
      if (savedGridData && savedGridData.heights && savedGridData.heights.length > 0) {
        // Validate data consistency
        const expectedCells = savedGridData.width * savedGridData.height;
        if (savedGridData.heights.length !== expectedCells) {
          console.warn('[Persistence] Grid data corrupted (cell count mismatch), clearing...');
          await clearAllData();
          setIsRestoring(false);
          return false;
        }
        
        // Validate POIs are within grid bounds
        if (savedRoadNetwork?.pois) {
          const invalidPois = savedRoadNetwork.pois.filter(
            p => p.x >= savedGridData.width || p.y >= savedGridData.height
          );
          if (invalidPois.length > 0) {
            console.warn('[Persistence] POI data corrupted (out of bounds), clearing...');
            await clearAllData();
            setIsRestoring(false);
            return false;
          }
        }
        
        console.log('[Persistence] Restoring grid:', savedGridData.width, 'x', savedGridData.height);
        
        const { Grid } = await import('../../../src/core/grid.js');
        
        // Create grid with correct dimensions
        const grid = new Grid({
          width: savedGridData.width * savedGridData.cellSize,
          height: savedGridData.height * savedGridData.cellSize,
          cellSize: savedGridData.cellSize,
        });

        // Verify dimensions match
        const actualCols = grid.getCols();
        const actualRows = grid.getRows();
        
        if (actualCols !== savedGridData.width || actualRows !== savedGridData.height) {
          console.warn('[Persistence] Grid dimension mismatch, clearing...');
          await clearAllData();
          setIsRestoring(false);
          return false;
        }

        // Restore cell data from compact arrays
        let index = 0;
        grid.forEachCell((cell: any) => {
          if (index < savedGridData.heights.length) {
            cell.height = savedGridData.heights[index];
            cell.levelId = savedGridData.levelIds[index];
            const unpackedFlags = unpackFlags(savedGridData.flags[index]);
            Object.assign(cell.flags, unpackedFlags);
          }
          index++;
        });

        // Set result
        setResultState({
          grid,
          roadNetwork: savedRoadNetwork ? {
            pois: savedRoadNetwork.pois,
            totalRoadCells: savedRoadNetwork.totalRoadCells,
          } : undefined,
          heightStats: savedHeightStats || undefined,
          stats: {
            gridSize: `${grid.getCols()}×${grid.getRows()}`,
            totalCells: grid.getCols() * grid.getRows(),
            roadCells: savedRoadNetwork?.totalRoadCells || 0,
            poiCount: savedRoadNetwork?.pois?.length || 0,
          },
        });

        // Initialize layer stack
        if (onGenerateCallbackRef.current) {
          onGenerateCallbackRef.current(grid.getCols(), grid.getRows());
        }

        setStatusState({ message: 'Session restored from IndexedDB', type: 'success' });
        console.log('[Persistence] State restored from IndexedDB');
      }

      setIsRestoring(false);
      setIsRestored(true);
      
      // Call restore callback after a tick to ensure React has updated
      setTimeout(() => {
        if (onRestoreCallbackRef.current) {
          onRestoreCallbackRef.current();
        }
      }, 100);
      
      return true;
    } catch (error) {
      console.error('[Persistence] Failed to restore:', error);
      setIsRestoring(false);
      return false;
    }
  }, []);

  // Restore on mount
  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Save on state changes (but not during restore)
  useEffect(() => {
    if (!isRestoring) {
      saveState();
    }
  }, [config, result, viewMode, isRestoring, saveState]);

  // Note: beforeunload can't use async IndexedDB reliably
  // The debounced saveState already handles continuous saving

  const setConfig = useCallback((partial: Partial<GenerationConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }));
  }, []);

  const setResult = useCallback((newResult: GenerationResult | null) => {
    setResultState(newResult);
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const setStatus = useCallback((message: string, type: StatusType = 'info') => {
    setStatusState({ message, type });
  }, []);

  const onGenerate = useCallback((callback: (cols: number, rows: number) => void) => {
    onGenerateCallbackRef.current = callback;
  }, []);

  const onRestore = useCallback((callback: () => void) => {
    onRestoreCallbackRef.current = callback;
  }, []);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setIsRestored(false); // This is a new generation, not a restore
    
    try {
      // Clear old terrain data from IndexedDB to force fresh generation
      const { deleteFromIndexedDB, KEYS } = await import('../lib/persistence.js');
      await deleteFromIndexedDB(KEYS.GRID_DATA);
      await deleteFromIndexedDB(KEYS.HEIGHT_STATS);
      await deleteFromIndexedDB(KEYS.ROAD_NETWORK);
      console.log('[Generator] Cleared old terrain data');

      const { Grid } = await import('../../../src/core/grid.js');
      const { generateRoadNetwork, generateRandomPOIs, DEFAULT_ROAD_CONFIG } = await import('../../../src/phases/phase2-roads.js');

      const grid = new Grid({ 
        width: config.width, 
        height: config.height, 
        cellSize: config.cellSize 
      });

      let heightStats = { minHeight: 0, maxHeight: 500 };

      // Try GPU generation first, fallback to CPU
      if (config.useGPU) {
        try {
          setStatus(`Generating ${config.biomeType} terrain on GPU...`, 'warning');
          
          const { getGPUTerrainGenerator } = await import('../lib/gpu/GPUTerrainGenerator.js');
          const gpuGenerator = getGPUTerrainGenerator();
          
          const gpuConfig = {
            width: config.width,
            height: config.height,
            seed: config.seed,
            noiseScale: 0.008,
            octaves: config.density.rangeCount + 4,
            persistence: 0.5,
            lacunarity: 2.0,
            ridgeStrength: config.density.mountainDensity * 0.8,
            warpStrength: 0.35,
            seaLevel: 0.25,
            heightScale: config.density.heightMultiplier * 500,
            rampEnabled: config.ramps.enabled,
            rampWidth: config.ramps.rampWidth,
            rampNoiseAmplitude: config.ramps.noiseAmplitude / 100,
            borderEnabled: config.border.enabled,
            borderWidth: config.border.width,
            borderHeight: config.border.height,
            borderSmoothness: config.border.smoothness / 100,
          };
          
          const result = gpuGenerator.generateWithLevels(gpuConfig);
          
          // Apply heights and levels to grid
          for (let y = 0; y < config.height; y++) {
            for (let x = 0; x < config.width; x++) {
              const idx = y * config.width + x;
              grid.setHeight(x, y, result.heights[idx]);
              grid.setLevelId(x, y, result.levels[idx]);
              
              const cell = grid.getCell(x, y);
              const normalizedH = result.heights[idx] / (config.density.heightMultiplier * 500);
              cell.flags.water = normalizedH < 0.01;
              cell.flags.playable = normalizedH >= 0.01 && normalizedH < 0.85;
              cell.flags.visualOnly = normalizedH >= 0.85;
            }
          }
          
          heightStats = { minHeight: result.minHeight, maxHeight: result.maxHeight };
          console.log('[Generator] GPU terrain generated successfully');
          
        } catch (gpuError) {
          console.warn('[Generator] GPU generation failed, falling back to CPU:', gpuError);
          setStatus(`GPU failed, using CPU...`, 'warning');
          
          // Fallback to CPU generation
          const { applyRealisticTerrainToGrid } = await import('../../../src/generators/realistic-terrain.js');
          const { applyBorderBarriers } = await import('../../../src/generators/border-barrier.js');
          const { applyAdvancedRamps } = await import('../../../src/core/advanced-ramps.js');
          
          const terrainConfig = {
            seed: config.seed,
            ridgeStrength: config.density.mountainDensity * 0.8,
            warpStrength: 0.35,
            seaLevel: 0.25,
            mountainScale: config.density.heightMultiplier,
            smoothingPasses: 3,
            smoothingRadius: 2,
          };
          
          heightStats = applyRealisticTerrainToGrid(grid, terrainConfig);
          
          // Apply ramps FIRST (they need terrain levels to exist)
          if (config.ramps.enabled) {
            applyAdvancedRamps(grid, { ...config.ramps, seed: config.seed });
          }
          
          // Apply barriers LAST (they override everything including ramps)
          if (config.border.enabled) {
            applyBorderBarriers(grid, config.border);
          }
        }
      } else {
        // CPU generation
        setStatus(`Generating ${config.biomeType} terrain on CPU...`, 'warning');
        
        const { applyRealisticTerrainToGrid } = await import('../../../src/generators/realistic-terrain.js');
        const { applyBorderBarriers } = await import('../../../src/generators/border-barrier.js');
        const { applyAdvancedRamps } = await import('../../../src/core/advanced-ramps.js');
        
        const terrainConfig = {
          seed: config.seed,
          ridgeStrength: config.density.mountainDensity * 0.8,
          warpStrength: 0.35,
          seaLevel: 0.25,
          mountainScale: config.density.heightMultiplier,
          smoothingPasses: 3,
          smoothingRadius: 2,
        };
        
        heightStats = applyRealisticTerrainToGrid(grid, terrainConfig);

        // Apply ramps FIRST (they need terrain levels to exist)
        if (config.ramps.enabled) {
          setStatus('Creating ramps between levels...', 'warning');
          applyAdvancedRamps(grid, { ...config.ramps, seed: config.seed });
        }

        // Apply barriers LAST (they override everything including ramps)
        if (config.border.enabled) {
          setStatus('Applying border barriers...', 'warning');
          applyBorderBarriers(grid, config.border);
        }
      }

      setStatus('Generating roads...', 'warning');
      
      const pois = generateRandomPOIs(grid, config.poiCount);
      const roadConfig = {
        ...DEFAULT_ROAD_CONFIG,
        roadWidth: config.roadWidth,
      };
      const roadNetwork = generateRoadNetwork(grid, pois, roadConfig);

      // Recalculate height stats after all processing
      let minHeight = Infinity;
      let maxHeight = -Infinity;
      grid.forEachCell((cell: any) => {
        minHeight = Math.min(minHeight, cell.height);
        maxHeight = Math.max(maxHeight, cell.height);
      });

      setResultState({
        grid,
        roadNetwork,
        heightStats: {
          minHeight,
          maxHeight,
          avgHeight: (minHeight + maxHeight) / 2,
        },
        stats: {
          gridSize: `${grid.getCols()}×${grid.getRows()}`,
          totalCells: grid.getCols() * grid.getRows(),
          roadCells: roadNetwork.totalRoadCells,
          poiCount: pois.length,
        },
      });

      if (onGenerateCallbackRef.current) {
        onGenerateCallbackRef.current(grid.getCols(), grid.getRows());
      }

      const gpuLabel = config.useGPU ? ' (GPU)' : ' (CPU)';
      setStatus(`Generated ${grid.getCols()}×${grid.getRows()} ${config.biomeType} terrain${gpuLabel}`, 'success');
    } catch (error) {
      console.error('Generation error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [config, setStatus]);

  // Auto-generate on config changes (debounced, only after restore and if we have a previous result)
  useEffect(() => {
    if (isRestoring || !isRestored || !autoGenerateEnabled || !result) {
      previousConfigRef.current = config;
      return;
    }

    // Check if config actually changed (deep comparison of relevant fields)
    const prev = previousConfigRef.current;
    const configChanged = 
      prev.width !== config.width ||
      prev.height !== config.height ||
      prev.cellSize !== config.cellSize ||
      prev.biomeType !== config.biomeType ||
      prev.seed !== config.seed ||
      prev.border.enabled !== config.border.enabled ||
      prev.border.type !== config.border.type ||
      prev.border.height !== config.border.height ||
      prev.border.width !== config.border.width ||
      prev.border.smoothness !== config.border.smoothness ||
      prev.border.exitCount !== config.border.exitCount ||
      prev.density.mountainDensity !== config.density.mountainDensity ||
      prev.density.rangeCount !== config.density.rangeCount ||
      prev.density.heightMultiplier !== config.density.heightMultiplier ||
      prev.density.valleyDepth !== config.density.valleyDepth ||
      prev.density.plainsFlat !== config.density.plainsFlat ||
      prev.ramps.enabled !== config.ramps.enabled ||
      prev.ramps.maxAngle !== config.ramps.maxAngle ||
      prev.ramps.minAngle !== config.ramps.minAngle ||
      prev.ramps.rampWidth !== config.ramps.rampWidth ||
      prev.ramps.noiseAmplitude !== config.ramps.noiseAmplitude ||
      prev.ramps.noiseScale !== config.ramps.noiseScale ||
      prev.ramps.enableInaccessible !== config.ramps.enableInaccessible ||
      prev.ramps.inaccessibleMinLevel !== config.ramps.inaccessibleMinLevel ||
      prev.ramps.inaccessiblePercentage !== config.ramps.inaccessiblePercentage;

    if (!configChanged) {
      return;
    }

    // Clear previous timeout
    if (autoGenerateTimeoutRef.current) {
      clearTimeout(autoGenerateTimeoutRef.current);
    }

    // Debounce: wait 800ms after last change before generating
    autoGenerateTimeoutRef.current = window.setTimeout(() => {
      previousConfigRef.current = config;
      generate();
    }, 800);

    return () => {
      if (autoGenerateTimeoutRef.current) {
        clearTimeout(autoGenerateTimeoutRef.current);
      }
    };
  }, [config, isRestoring, isRestored, autoGenerateEnabled, result, generate]);

  return (
    <GeneratorContext.Provider value={{
      config,
      setConfig,
      result,
      setResult,
      viewMode,
      setViewMode,
      status,
      setStatus,
      isGenerating,
      isRestored,
      generate,
      onGenerate,
      onRestore,
      autoGenerateEnabled,
      setAutoGenerateEnabled,
    }}>
      {children}
    </GeneratorContext.Provider>
  );
};
