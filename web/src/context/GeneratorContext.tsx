import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';

// Types
export interface GenerationConfig {
  width: number;
  height: number;
  cellSize: number;
  levels: number;
  poiCount: number;
  roadWidth: number;
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
  generate: () => Promise<void>;
  onGenerate: (callback: (cols: number, rows: number) => void) => void;
}

const defaultConfig: GenerationConfig = {
  width: 512,
  height: 512,
  cellSize: 2,
  levels: 2,
  poiCount: 5,
  roadWidth: 3,
};

const STORAGE_KEY = 'heightmap-generator-state';

interface SavedState {
  config: GenerationConfig;
  viewMode: ViewMode;
  gridData?: {
    width: number;
    height: number;
    cellSize: number;
    cells: Array<{
      levelId: number;
      height: number;
      flags: {
        road: boolean;
        ramp: boolean;
        water: boolean;
        cliff: boolean;
        playable: boolean;
        underwater: boolean;
        visualOnly: boolean;
        blocked: boolean;
        boundary: boolean;
      };
    }>;
  };
  roadNetwork?: {
    pois: Array<{ id: string; x: number; y: number; levelId: number; type: string }>;
    totalRoadCells: number;
  };
  heightStats?: HeightStats;
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
  const onGenerateCallbackRef = useRef<((cols: number, rows: number) => void) | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  // Save state to localStorage (debounced)
  const saveState = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      try {
        const state: SavedState = {
          config,
          viewMode,
        };

        // Serialize grid data if available
        if (result?.grid) {
          const grid = result.grid;
          const cells: Array<{
            levelId: number;
            height: number;
            flags: Record<string, boolean>;
          }> = [];
          
          grid.forEachCell((cell: any) => {
            cells.push({
              levelId: cell.levelId,
              height: cell.height,
              flags: {
                road: cell.flags.road || false,
                ramp: cell.flags.ramp || false,
                water: cell.flags.water || false,
                cliff: cell.flags.cliff || false,
                playable: cell.flags.playable || false,
                underwater: cell.flags.underwater || false,
                visualOnly: cell.flags.visualOnly || false,
                blocked: cell.flags.blocked || false,
                boundary: cell.flags.boundary || false,
              },
            });
          });

          state.gridData = {
            width: grid.getConfig().width,
            height: grid.getConfig().height,
            cellSize: grid.getConfig().cellSize,
            cells,
          };
          state.heightStats = result.heightStats;
        }

        // Serialize road network
        if (result?.roadNetwork) {
          state.roadNetwork = {
            pois: result.roadNetwork.pois?.map((p: any) => ({
              id: p.id,
              x: p.x,
              y: p.y,
              levelId: p.levelId,
              type: p.type,
            })) || [],
            totalRoadCells: result.roadNetwork.totalRoadCells || 0,
          };
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        console.log('[Persistence] State saved');
      } catch (error) {
        console.warn('[Persistence] Failed to save:', error);
      }
    }, 500); // Debounce 500ms
  }, [config, result, viewMode]);

  // Restore state from localStorage
  const restoreState = useCallback(async () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setIsRestoring(false);
        return false;
      }

      const state: SavedState = JSON.parse(saved);
      
      // Restore config
      setConfigState(state.config);
      setViewModeState(state.viewMode);

      // Restore grid if available
      if (state.gridData) {
        const { Grid } = await import('../../../src/core/grid.js');
        
        const grid = new Grid({
          width: state.gridData.width,
          height: state.gridData.height,
          cellSize: state.gridData.cellSize,
        });

        // Restore cell data
        const cols = grid.getCols();
        let index = 0;
        grid.forEachCell((cell: any, x: number, y: number) => {
          const saved = state.gridData!.cells[index];
          if (saved) {
            cell.levelId = saved.levelId;
            cell.height = saved.height;
            Object.assign(cell.flags, saved.flags);
          }
          index++;
        });

        // Restore result
        setResultState({
          grid,
          roadNetwork: state.roadNetwork ? {
            pois: state.roadNetwork.pois,
            totalRoadCells: state.roadNetwork.totalRoadCells,
          } : undefined,
          heightStats: state.heightStats,
          stats: {
            gridSize: `${grid.getCols()}×${grid.getRows()}`,
            totalCells: grid.getCols() * grid.getRows(),
            roadCells: state.roadNetwork?.totalRoadCells || 0,
            poiCount: state.roadNetwork?.pois?.length || 0,
          },
        });

        // Initialize layer stack
        if (onGenerateCallbackRef.current) {
          onGenerateCallbackRef.current(grid.getCols(), grid.getRows());
        }

        setStatusState({ message: 'Session restored', type: 'success' });
        console.log('[Persistence] State restored');
      }

      setIsRestoring(false);
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

  // Save on state changes
  useEffect(() => {
    if (!isRestoring) {
      saveState();
    }
  }, [config, result, viewMode, isRestoring, saveState]);

  // Save before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Synchronous save
      try {
        const state: SavedState = { config, viewMode };
        if (result?.grid) {
          const grid = result.grid;
          const cells: Array<{
            levelId: number;
            height: number;
            flags: Record<string, boolean>;
          }> = [];
          grid.forEachCell((cell: any) => {
            cells.push({
              levelId: cell.levelId,
              height: cell.height,
              flags: {
                road: cell.flags.road || false,
                ramp: cell.flags.ramp || false,
                water: cell.flags.water || false,
                cliff: cell.flags.cliff || false,
                playable: cell.flags.playable || false,
                underwater: cell.flags.underwater || false,
                visualOnly: cell.flags.visualOnly || false,
                blocked: cell.flags.blocked || false,
                boundary: cell.flags.boundary || false,
              },
            });
          });
          state.gridData = {
            width: grid.getConfig().width,
            height: grid.getConfig().height,
            cellSize: grid.getConfig().cellSize,
            cells,
          };
          state.heightStats = result.heightStats;
          if (result.roadNetwork) {
            state.roadNetwork = {
              pois: result.roadNetwork.pois?.map((p: any) => ({
                id: p.id, x: p.x, y: p.y, levelId: p.levelId, type: p.type,
              })) || [],
              totalRoadCells: result.roadNetwork.totalRoadCells || 0,
            };
          }
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('[Persistence] Failed to save on unload');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [config, result, viewMode]);

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

  const generate = useCallback(async () => {
    setIsGenerating(true);
    
    try {
      const { Grid } = await import('../../../src/core/grid.js');
      const { executePhase1, DEFAULT_LEVEL_CONFIG } = await import('../../../src/phases/phase1-levels.js');
      const { generateRoadNetwork, generateRandomPOIs, DEFAULT_ROAD_CONFIG } = await import('../../../src/phases/phase2-roads.js');
      const { executePhase3, DEFAULT_HEIGHTMAP_CONFIG } = await import('../../../src/phases/phase3-heightmap.js');

      const grid = new Grid({ 
        width: config.width, 
        height: config.height, 
        cellSize: config.cellSize 
      });

      setStatus('Phase 1: Distributing levels...', 'warning');
      
      const levelConfig = {
        ...DEFAULT_LEVEL_CONFIG,
        minLevel: 0,
        maxLevel: config.levels,
        seed: Date.now(),
      };
      executePhase1(grid, levelConfig, 3);

      setStatus('Phase 2: Generating roads...', 'warning');
      
      const pois = generateRandomPOIs(grid, config.poiCount);
      const roadConfig = {
        ...DEFAULT_ROAD_CONFIG,
        roadWidth: config.roadWidth,
      };
      const roadNetwork = generateRoadNetwork(grid, pois, roadConfig);

      setStatus('Phase 3: Calculating heights...', 'warning');
      
      const heightmapConfig = {
        ...DEFAULT_HEIGHTMAP_CONFIG,
        seed: Date.now(),
      };
      const phase3Result = executePhase3(grid, heightmapConfig);

      setResultState({
        grid,
        roadNetwork,
        heightStats: phase3Result.stats,
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

      setStatus(`Generated ${grid.getCols()}×${grid.getRows()} grid with ${pois.length} POIs`, 'success');
    } catch (error) {
      console.error('Generation error:', error);
      setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [config, setStatus]);

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
      generate,
      onGenerate,
    }}>
      {children}
    </GeneratorContext.Provider>
  );
};
