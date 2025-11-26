import { useCallback } from 'react';
import { useGenerator, GenerationConfig } from '../context/GeneratorContext';
import { useLayerContext } from '../context/LayerContext';

/**
 * Project file structure for export/import.
 */
export interface ProjectFile {
  version: string;
  timestamp: string;
  config: GenerationConfig;
  gridData?: {
    width: number;
    height: number;
    cellSize: number;
    cells: Array<{
      levelId: number;
      height: number;
      flags: Record<string, boolean>;
    }>;
  };
  roadNetwork?: {
    pois: Array<{ id: string; x: number; y: number; levelId: number; type: string }>;
    totalRoadCells: number;
  };
  layers?: object;
}

const PROJECT_VERSION = '0.1.0';

/**
 * Hook for project save/load functionality.
 * Note: Auto-save is handled by GeneratorContext.
 */
export function useProject() {
  const { config, result, setConfig, setStatus } = useGenerator();
  const { exportLayers, importLayers, initializeStack } = useLayerContext();

  /**
   * Saves project to a JSON file download.
   */
  const saveProject = useCallback(() => {
    try {
      const project: ProjectFile = {
        version: PROJECT_VERSION,
        timestamp: new Date().toISOString(),
        config,
      };

      // Add grid data if available
      if (result?.grid) {
        const grid = result.grid;
        const cells: ProjectFile['gridData']!['cells'] = [];

        grid.forEachCell((cell: any) => {
          cells.push({
            levelId: cell.levelId,
            height: cell.height,
            flags: { ...cell.flags },
          });
        });

        project.gridData = {
          width: grid.getConfig().width,
          height: grid.getConfig().height,
          cellSize: grid.getConfig().cellSize,
          cells,
        };
      }

      // Add road network
      if (result?.roadNetwork) {
        project.roadNetwork = {
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

      // Add layers
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

      setStatus('Project saved to file', 'success');
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

        if (!project.version) {
          throw new Error('Invalid project file');
        }

        // Apply config
        setConfig(project.config);

        // Import layers if available
        if (project.layers) {
          importLayers(project.layers);
        } else if (project.gridData) {
          // Initialize layer stack with grid dimensions
          const cols = Math.floor(project.gridData.width / project.gridData.cellSize);
          const rows = Math.floor(project.gridData.height / project.gridData.cellSize);
          initializeStack(cols, rows);
        }

        setStatus('Project loaded - click Generate to rebuild terrain', 'success');
      } catch (error) {
        console.error('Load error:', error);
        setStatus('Failed to load project file', 'error');
      }
    };
    input.click();
  }, [setConfig, importLayers, initializeStack, setStatus]);

  /**
   * Clears all saved data.
   */
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem('heightmap-generator-state');
      localStorage.removeItem('heightmap-generator-layers');
      setStatus('All saved data cleared', 'info');
    } catch (error) {
      console.error('Clear error:', error);
    }
  }, [setStatus]);

  return {
    saveProject,
    loadProject,
    clearSavedData,
  };
}
