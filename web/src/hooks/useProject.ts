import { useCallback, useEffect, useRef } from 'react';
import { useGenerator, GenerationConfig } from '../context/GeneratorContext';
import { useLayerContext } from '../context/LayerContext';

/**
 * Project file structure.
 */
export interface ProjectFile {
  version: string;
  config: GenerationConfig;
  timestamp: string;
  gridData?: {
    width: number;
    height: number;
    heights: number[];
    levels: number[];
    flags: Array<{
      road: boolean;
      ramp: boolean;
      water: boolean;
      cliff: boolean;
      playable: boolean;
    }>;
  };
  pois?: Array<{
    id: string;
    x: number;
    y: number;
    levelId: number;
    type: string;
  }>;
  layers?: object;
}

const PROJECT_VERSION = '0.1.0';
const LOCALSTORAGE_KEY = 'heightmap-generator-project';
const LOCALSTORAGE_LAYERS_KEY = 'heightmap-generator-layers';
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

/**
 * Hook for project save/load functionality with auto-save.
 */
export function useProject() {
  const { config, result, setConfig, setStatus } = useGenerator();
  const { layerStack, exportLayers, importLayers } = useLayerContext();
  const autoSaveIntervalRef = useRef<number | null>(null);
  const lastSaveRef = useRef<number>(0);

  /**
   * Saves project to a JSON file.
   */
  const saveProject = useCallback(() => {
    try {
      const project: ProjectFile = {
        version: PROJECT_VERSION,
        config,
        timestamp: new Date().toISOString(),
      };

      // Add grid data if available
      if (result?.grid) {
        const grid = result.grid;
        const heights: number[] = [];
        const levels: number[] = [];
        const flags: ProjectFile['gridData']!['flags'] = [];

        grid.forEachCell((cell: any) => {
          heights.push(cell.height);
          levels.push(cell.levelId);
          flags.push({
            road: cell.flags.road,
            ramp: cell.flags.ramp,
            water: cell.flags.water,
            cliff: cell.flags.cliff,
            playable: cell.flags.playable,
          });
        });

        project.gridData = {
          width: grid.getCols(),
          height: grid.getRows(),
          heights,
          levels,
          flags,
        };
      }

      // Add POIs if available
      if (result?.roadNetwork?.pois) {
        project.pois = result.roadNetwork.pois.map((poi: any) => ({
          id: poi.id,
          x: poi.x,
          y: poi.y,
          levelId: poi.levelId,
          type: poi.type,
        }));
      }

      // Add layers if available
      const layersData = exportLayers();
      if (layersData) {
        project.layers = layersData;
      }

      // Create download
      const blob = new Blob([JSON.stringify(project, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heightmap-project-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('Project saved successfully', 'success');
    } catch (error) {
      console.error('Save error:', error);
      setStatus('Failed to save project', 'error');
    }
  }, [config, result, exportLayers, setStatus]);

  /**
   * Loads project from a JSON file.
   */
  const loadProject = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const project: ProjectFile = JSON.parse(text);

        // Validate version
        if (!project.version) {
          throw new Error('Invalid project file');
        }

        // Apply config
        setConfig(project.config);

        // Import layers if available
        if (project.layers) {
          importLayers(project.layers);
        }

        setStatus('Project loaded - click Generate to apply', 'success');
      } catch (error) {
        console.error('Load error:', error);
        setStatus('Failed to load project', 'error');
      }
    };
    input.click();
  }, [setConfig, importLayers, setStatus]);

  /**
   * Auto-saves to localStorage.
   */
  const autoSave = useCallback(() => {
    const now = Date.now();
    
    // Debounce - don't save more than once per second
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;

    try {
      // Save config
      const project: ProjectFile = {
        version: PROJECT_VERSION,
        config,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(project));

      // Save layers separately (can be large)
      const layersData = exportLayers();
      if (layersData) {
        localStorage.setItem(LOCALSTORAGE_LAYERS_KEY, JSON.stringify(layersData));
      }

      console.log('[AutoSave] Saved to localStorage');
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Auto-save error:', error);
    }
  }, [config, exportLayers]);

  /**
   * Restores from localStorage.
   */
  const autoRestore = useCallback(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      if (saved) {
        const project: ProjectFile = JSON.parse(saved);
        setConfig(project.config);

        // Restore layers if available
        const savedLayers = localStorage.getItem(LOCALSTORAGE_LAYERS_KEY);
        if (savedLayers) {
          importLayers(JSON.parse(savedLayers));
        }

        return true;
      }
    } catch (error) {
      console.error('Auto-restore error:', error);
    }
    return false;
  }, [setConfig, importLayers]);

  /**
   * Clears saved data from localStorage.
   */
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(LOCALSTORAGE_KEY);
      localStorage.removeItem(LOCALSTORAGE_LAYERS_KEY);
      setStatus('Saved data cleared', 'info');
    } catch (error) {
      console.error('Clear error:', error);
    }
  }, [setStatus]);

  // Setup auto-save interval
  useEffect(() => {
    autoSaveIntervalRef.current = window.setInterval(autoSave, AUTOSAVE_INTERVAL);
    
    // Also save on page unload
    const handleBeforeUnload = () => {
      autoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Save when visibility changes (tab/window switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        autoSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoSave]);

  // Restore on mount
  useEffect(() => {
    const restored = autoRestore();
    if (restored) {
      setStatus('Config restored from last session', 'info');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    saveProject,
    loadProject,
    autoSave,
    autoRestore,
    clearSavedData,
  };
}
