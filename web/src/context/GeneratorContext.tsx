import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

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
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  status: { message: string; type: StatusType };
  setStatus: (message: string, type?: StatusType) => void;
  isGenerating: boolean;
  generate: () => Promise<void>;
  /** Callback to register layer initialization */
  onGenerate: (callback: (cols: number, rows: number) => void) => void;
}

const defaultConfig: GenerationConfig = {
  width: 512,
  height: 512,
  cellSize: 2,  // Smaller cells = more resolution
  levels: 2,    // Fewer levels = smoother terrain
  poiCount: 5,
  roadWidth: 3,
};

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
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [status, setStatusState] = useState({ message: 'Ready', type: 'success' as StatusType });
  const [isGenerating, setIsGenerating] = useState(false);
  const onGenerateCallbackRef = useRef<((cols: number, rows: number) => void) | null>(null);

  const setConfig = useCallback((partial: Partial<GenerationConfig>) => {
    setConfigState(prev => ({ ...prev, ...partial }));
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
      // Dynamic imports
      const { Grid } = await import('../../../src/core/grid.js');
      const { executePhase1, DEFAULT_LEVEL_CONFIG } = await import('../../../src/phases/phase1-levels.js');
      const { generateRoadNetwork, generateRandomPOIs, DEFAULT_ROAD_CONFIG } = await import('../../../src/phases/phase2-roads.js');
      const { executePhase3, DEFAULT_HEIGHTMAP_CONFIG } = await import('../../../src/phases/phase3-heightmap.js');

      // Create grid
      const grid = new Grid({ 
        width: config.width, 
        height: config.height, 
        cellSize: config.cellSize 
      });

      setStatus('Phase 1: Distributing levels...', 'warning');
      
      // Phase 1
      const levelConfig = {
        ...DEFAULT_LEVEL_CONFIG,
        minLevel: 0,
        maxLevel: config.levels,
        seed: Date.now(),
      };
      executePhase1(grid, levelConfig, 3);

      setStatus('Phase 2: Generating roads...', 'warning');
      
      // Phase 2
      const pois = generateRandomPOIs(grid, config.poiCount);
      const roadConfig = {
        ...DEFAULT_ROAD_CONFIG,
        roadWidth: config.roadWidth,
      };
      const roadNetwork = generateRoadNetwork(grid, pois, roadConfig);

      setStatus('Phase 3: Calculating heights...', 'warning');
      
      // Phase 3
      const heightmapConfig = {
        ...DEFAULT_HEIGHTMAP_CONFIG,
        seed: Date.now(),
      };
      const phase3Result = executePhase3(grid, heightmapConfig);

      // Store result
      setResult({
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

      // Initialize layer stack with grid dimensions
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

