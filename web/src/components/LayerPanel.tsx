import React from 'react';
import { Eye, EyeOff, Lock, Unlock, Trash2, Plus } from 'lucide-react';
import { Button } from './ui/button';

export interface Layer {
  id: string;
  name: string;
  type: 'levels' | 'roads' | 'water' | 'mountains' | 'custom';
  visible: boolean;
  locked: boolean;
  color: string;
}

interface LayerPanelProps {
  layers: Layer[];
  activeLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerToggleVisibility: (id: string) => void;
  onLayerToggleLock: (id: string) => void;
  onLayerDelete: (id: string) => void;
  onLayerAdd: () => void;
}

const DEFAULT_COLORS: Record<Layer['type'], string> = {
  levels: '#4ade80',
  roads: '#a1a1aa',
  water: '#38bdf8',
  mountains: '#a78bfa',
  custom: '#fb923c',
};

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  activeLayerId,
  onLayerSelect,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerDelete,
  onLayerAdd,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Layers
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onLayerAdd}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {layers.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No layers. Generate a heightmap first.
          </div>
        ) : (
          <div className="p-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  activeLayerId === layer.id
                    ? 'bg-secondary'
                    : 'hover:bg-secondary/50'
                }`}
                onClick={() => onLayerSelect(layer.id)}
              >
                {/* Color indicator */}
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: layer.color }}
                />
                
                {/* Layer name */}
                <span className={`flex-1 text-sm truncate ${
                  !layer.visible ? 'text-muted-foreground' : ''
                }`}>
                  {layer.name}
                </span>
                
                {/* Actions */}
                <div className="flex items-center gap-0.5">
                  <button
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggleVisibility(layer.id);
                    }}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <button
                    className="p-1 rounded hover:bg-muted transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggleLock(layer.id);
                    }}
                  >
                    {layer.locked ? (
                      <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {layer.type === 'custom' && (
                    <button
                      className="p-1 rounded hover:bg-destructive/20 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerDelete(layer.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const createDefaultLayers = (): Layer[] => [
  { id: 'levels', name: 'Levels', type: 'levels', visible: true, locked: false, color: DEFAULT_COLORS.levels },
  { id: 'roads', name: 'Roads', type: 'roads', visible: true, locked: false, color: DEFAULT_COLORS.roads },
  { id: 'water', name: 'Water', type: 'water', visible: true, locked: false, color: DEFAULT_COLORS.water },
  { id: 'mountains', name: 'Mountains', type: 'mountains', visible: true, locked: false, color: DEFAULT_COLORS.mountains },
];

export { DEFAULT_COLORS };

