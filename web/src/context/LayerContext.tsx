/**
 * Layer Context - Global state management for layers
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { 
  LayerStack, 
  Layer, 
  LayerType, 
  BlendMode,
  setLayerHeightAt,
  applyBrush,
  createLayerStyle,
} from '../../../src/core/index.js';

interface LayerContextType {
  /** Layer stack instance */
  layerStack: LayerStack | null;
  /** Initialize layer stack with dimensions */
  initializeStack: (width: number, height: number) => void;
  /** Create layers for terrain levels */
  createLayersForLevels: (levelIds: number[], maxLevel?: number) => void;
  /** All layers in order */
  layers: Layer[];
  /** Currently selected layer ID */
  selectedLayerId: string | null;
  /** Select a layer */
  selectLayer: (id: string) => void;
  /** Add a new layer */
  addLayer: (name: string, type: LayerType) => Layer | null;
  /** Remove a layer */
  removeLayer: (id: string) => boolean;
  /** Move layer up */
  moveLayerUp: (id: string) => void;
  /** Move layer down */
  moveLayerDown: (id: string) => void;
  /** Toggle layer visibility */
  toggleVisibility: (id: string) => void;
  /** Toggle layer lock */
  toggleLock: (id: string) => void;
  /** Set layer opacity */
  setOpacity: (id: string, opacity: number) => void;
  /** Set layer blend mode */
  setBlendMode: (id: string, mode: BlendMode) => void;
  /** Set layer color */
  setColor: (id: string, color: string) => void;
  /** Apply brush to selected layer */
  applyBrushToLayer: (x: number, y: number, radius: number, height: number) => void;
  /** Duplicate layer */
  duplicateLayer: (id: string) => Layer | null;
  /** Merge layer down */
  mergeDown: (id: string) => boolean;
  /** Flatten all layers */
  flattenLayers: () => void;
  /** Serialize stack to JSON */
  exportLayers: () => object | null;
  /** Load stack from JSON */
  importLayers: (json: object) => void;
}

const LayerContext = createContext<LayerContextType | null>(null);

export const useLayerContext = () => {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error('useLayerContext must be used within LayerProvider');
  }
  return context;
};

export const LayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layerStack, setLayerStack] = useState<LayerStack | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Force re-render when layers change
  const triggerUpdate = useCallback(() => {
    setUpdateTrigger(prev => prev + 1);
  }, []);

  const initializeStack = useCallback((width: number, height: number) => {
    const stack = new LayerStack({ width, height });
    setLayerStack(stack);
    setSelectedLayerId('base');
    triggerUpdate();
  }, [triggerUpdate]);

  // Level colors for visualization
  const levelColors: Record<number, string> = {
    0: '#4a9f4a', // Green - lowlands
    1: '#8b7355', // Brown - hills  
    2: '#a0a0a0', // Gray - highlands
    3: '#ffffff', // White - peaks
    4: '#d4a574', // Sandy - plateaus
  };

  const levelNames: Record<number, string> = {
    0: 'Lowlands',
    1: 'Hills',
    2: 'Highlands', 
    3: 'Peaks',
    4: 'Plateau',
  };

  const createLayersForLevels = useCallback((levelIds: number[], maxLevel: number = 4) => {
    if (!layerStack) return;

    // Find unique levels in the terrain
    const uniqueLevels = new Set<number>();
    for (const levelId of levelIds) {
      if (levelId >= 0 && levelId <= maxLevel) {
        uniqueLevels.add(levelId);
      }
    }

    // Sort levels
    const sortedLevels = Array.from(uniqueLevels).sort((a, b) => a - b);

    // Remove existing level layers (keep base)
    const existingLayers = layerStack.getLayers();
    for (const layer of existingLayers) {
      if (layer.id !== 'base' && layer.id.startsWith('level-')) {
        layerStack.removeLayer(layer.id);
      }
    }

    // Create layer for each level found in terrain
    for (const level of sortedLevels) {
      const layerId = `level-${level}`;
      const existing = layerStack.getLayer(layerId);
      
      if (!existing) {
        const name = levelNames[level] || `Level ${level}`;
        const color = levelColors[level] || '#808080';
        
        const newLayer = layerStack.addLayer(layerId, name, 'height');
        if (newLayer) {
          layerStack.setLayerColor(layerId, color);
        }
      }
    }

    console.log(`[Layers] Created ${sortedLevels.length} level layers:`, sortedLevels);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const layers = useMemo(() => {
    if (!layerStack) return [];
    return layerStack.getLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerStack, updateTrigger]);

  const selectLayer = useCallback((id: string) => {
    setSelectedLayerId(id);
  }, []);

  const addLayer = useCallback((name: string, type: LayerType): Layer | null => {
    if (!layerStack) return null;
    const layer = layerStack.addLayer(null, name, type);
    setSelectedLayerId(layer.id);
    triggerUpdate();
    return layer;
  }, [layerStack, triggerUpdate]);

  const removeLayer = useCallback((id: string): boolean => {
    if (!layerStack) return false;
    const result = layerStack.removeLayer(id);
    if (result && selectedLayerId === id) {
      setSelectedLayerId('base');
    }
    triggerUpdate();
    return result;
  }, [layerStack, selectedLayerId, triggerUpdate]);

  const moveLayerUp = useCallback((id: string) => {
    if (!layerStack) return;
    layerStack.moveLayerUp(id);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const moveLayerDown = useCallback((id: string) => {
    if (!layerStack) return;
    layerStack.moveLayerDown(id);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const toggleVisibility = useCallback((id: string) => {
    if (!layerStack) return;
    const layer = layerStack.getLayer(id);
    if (layer) {
      layerStack.setLayerVisibility(id, !layer.visibility.visible);
      triggerUpdate();
    }
  }, [layerStack, triggerUpdate]);

  const toggleLock = useCallback((id: string) => {
    if (!layerStack) return;
    const layer = layerStack.getLayer(id);
    if (layer) {
      layerStack.setLayerLocked(id, !layer.visibility.locked);
      triggerUpdate();
    }
  }, [layerStack, triggerUpdate]);

  const setOpacity = useCallback((id: string, opacity: number) => {
    if (!layerStack) return;
    layerStack.setLayerOpacity(id, opacity);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const setBlendMode = useCallback((id: string, mode: BlendMode) => {
    if (!layerStack) return;
    layerStack.setLayerBlendMode(id, mode);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const setColor = useCallback((id: string, color: string) => {
    if (!layerStack) return;
    layerStack.setLayerColor(id, color);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const applyBrushToLayer = useCallback((x: number, y: number, radius: number, height: number) => {
    if (!layerStack || !selectedLayerId) return;
    const layer = layerStack.getLayer(selectedLayerId);
    if (layer && layer.data && !layer.visibility.locked) {
      applyBrush(layer, x, y, radius, height);
      triggerUpdate();
    }
  }, [layerStack, selectedLayerId, triggerUpdate]);

  const duplicateLayer = useCallback((id: string): Layer | null => {
    if (!layerStack) return null;
    const newLayer = layerStack.duplicateLayer(id);
    if (newLayer) {
      setSelectedLayerId(newLayer.id);
      triggerUpdate();
    }
    return newLayer;
  }, [layerStack, triggerUpdate]);

  const mergeDown = useCallback((id: string): boolean => {
    if (!layerStack) return false;
    const result = layerStack.mergeDown(id);
    if (result) {
      triggerUpdate();
    }
    return result;
  }, [layerStack, triggerUpdate]);

  const flattenLayers = useCallback(() => {
    if (!layerStack) return;
    const flattened = layerStack.flatten();
    setSelectedLayerId(flattened.id);
    triggerUpdate();
  }, [layerStack, triggerUpdate]);

  const exportLayers = useCallback((): object | null => {
    if (!layerStack) return null;
    return layerStack.toJSON();
  }, [layerStack]);

  const importLayers = useCallback((json: object) => {
    try {
      const stack = LayerStack.fromJSON(json as ReturnType<LayerStack['toJSON']>);
      setLayerStack(stack);
      const layers = stack.getLayers();
      if (layers.length > 0) {
        setSelectedLayerId(layers[0].id);
      }
      triggerUpdate();
    } catch (error) {
      console.error('Failed to import layers:', error);
    }
  }, [triggerUpdate]);

  return (
    <LayerContext.Provider value={{
      layerStack,
      initializeStack,
      createLayersForLevels,
      layers,
      selectedLayerId,
      selectLayer,
      addLayer,
      removeLayer,
      moveLayerUp,
      moveLayerDown,
      toggleVisibility,
      toggleLock,
      setOpacity,
      setBlendMode,
      setColor,
      applyBrushToLayer,
      duplicateLayer,
      mergeDown,
      flattenLayers,
      exportLayers,
      importLayers,
    }}>
      {children}
    </LayerContext.Provider>
  );
};
