import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Layer, createDefaultLayers, DEFAULT_COLORS } from '../components/LayerPanel';

interface LayerContextType {
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayer: (id: string) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  deleteLayer: (id: string) => void;
  addLayer: (name?: string) => void;
  resetLayers: () => void;
  getVisibleLayers: () => Layer[];
}

const LayerContext = createContext<LayerContextType | null>(null);

export const useLayer = () => {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error('useLayer must be used within LayerProvider');
  }
  return context;
};

export const LayerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [layers, setLayers] = useState<Layer[]>(createDefaultLayers());
  const [activeLayerId, setActiveLayerId] = useState<string | null>('levels');

  const setActiveLayer = useCallback((id: string) => {
    setActiveLayerId(id);
  }, []);

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  }, []);

  const toggleLock = useCallback((id: string) => {
    setLayers(prev => prev.map(layer =>
      layer.id === id ? { ...layer, locked: !layer.locked } : layer
    ));
  }, []);

  const deleteLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (activeLayerId === id) {
      setActiveLayerId(null);
    }
  }, [activeLayerId]);

  const addLayer = useCallback((name?: string) => {
    const newId = `custom-${Date.now()}`;
    const newLayer: Layer = {
      id: newId,
      name: name || `Custom Layer ${layers.filter(l => l.type === 'custom').length + 1}`,
      type: 'custom',
      visible: true,
      locked: false,
      color: DEFAULT_COLORS.custom,
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newId);
  }, [layers]);

  const resetLayers = useCallback(() => {
    setLayers(createDefaultLayers());
    setActiveLayerId('levels');
  }, []);

  const getVisibleLayers = useCallback(() => {
    return layers.filter(layer => layer.visible);
  }, [layers]);

  return (
    <LayerContext.Provider value={{
      layers,
      activeLayerId,
      setActiveLayer,
      toggleVisibility,
      toggleLock,
      deleteLayer,
      addLayer,
      resetLayers,
      getVisibleLayers,
    }}>
      {children}
    </LayerContext.Provider>
  );
};

