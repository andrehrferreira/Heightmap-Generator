/**
 * LayerPanel - UI for managing layers
 */

import React, { useState } from 'react';
import { 
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, 
  ChevronUp, ChevronDown, Copy, Layers, 
  Mountain, Waves, Trees, Route, Palette,
  MoreVertical
} from 'lucide-react';
import { useLayerContext } from '../context/LayerContext';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import type { Layer, LayerType, BlendMode } from '../../../src/core/layer.js';

const LAYER_TYPE_ICONS: Record<LayerType, React.ReactNode> = {
  base: <Layers className="w-3.5 h-3.5" />,
  roads: <Route className="w-3.5 h-3.5" />,
  rivers: <Waves className="w-3.5 h-3.5" />,
  lakes: <Waves className="w-3.5 h-3.5" />,
  mountains: <Mountain className="w-3.5 h-3.5" />,
  canyons: <Mountain className="w-3.5 h-3.5 rotate-180" />,
  custom: <Palette className="w-3.5 h-3.5" />,
};

const LAYER_TYPES: { type: LayerType; label: string }[] = [
  { type: 'mountains', label: 'Mountains' },
  { type: 'canyons', label: 'Canyons' },
  { type: 'rivers', label: 'Rivers' },
  { type: 'lakes', label: 'Lakes' },
  { type: 'roads', label: 'Roads' },
  { type: 'custom', label: 'Custom' },
];

const BLEND_MODES: { mode: BlendMode; label: string }[] = [
  { mode: 'normal', label: 'Normal' },
  { mode: 'add', label: 'Add' },
  { mode: 'multiply', label: 'Multiply' },
  { mode: 'overlay', label: 'Overlay' },
  { mode: 'max', label: 'Max' },
  { mode: 'min', label: 'Min' },
];

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  canMoveUp,
  canMoveDown,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
        isSelected
          ? 'bg-primary/20 border border-primary/50'
          : 'hover:bg-secondary/80 border border-transparent'
      }`}
      onClick={onSelect}
    >
      {/* Layer color indicator */}
      <div
        className="w-3 h-3 rounded-sm shrink-0"
        style={{ backgroundColor: layer.style.color }}
      />
      
      {/* Layer icon */}
      <div className="text-muted-foreground shrink-0">
        {LAYER_TYPE_ICONS[layer.type]}
      </div>
      
      {/* Layer name */}
      <span className={`flex-1 text-xs truncate ${
        layer.visibility.visible ? 'text-foreground' : 'text-muted-foreground'
      }`}>
        {layer.name}
      </span>
      
      {/* Visibility toggle */}
      <button
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
        title={layer.visibility.visible ? 'Hide layer' : 'Show layer'}
      >
        {layer.visibility.visible ? (
          <Eye className="w-3.5 h-3.5" />
        ) : (
          <EyeOff className="w-3.5 h-3.5" />
        )}
      </button>
      
      {/* Lock toggle */}
      <button
        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
        onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
        title={layer.visibility.locked ? 'Unlock layer' : 'Lock layer'}
      >
        {layer.visibility.locked ? (
          <Lock className="w-3.5 h-3.5 text-destructive" />
        ) : (
          <Unlock className="w-3.5 h-3.5" />
        )}
      </button>
      
      {/* More menu */}
      <div className="relative">
        <button
          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
        
        {showMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowMenu(false)} 
            />
            <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1 min-w-[120px]">
              <button
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); onMoveUp(); setShowMenu(false); }}
                disabled={!canMoveUp}
              >
                <ChevronUp className="w-3.5 h-3.5" /> Move Up
              </button>
              <button
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); onMoveDown(); setShowMenu(false); }}
                disabled={!canMoveDown}
              >
                <ChevronDown className="w-3.5 h-3.5" /> Move Down
              </button>
              <button
                className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary flex items-center gap-2"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); setShowMenu(false); }}
              >
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </button>
              {layer.type !== 'base' && (
                <button
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary flex items-center gap-2 text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const LayerPanel: React.FC = () => {
  const {
    layerStack,
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
    duplicateLayer,
  } = useLayerContext();

  const [showAddMenu, setShowAddMenu] = useState(false);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const selectedIndex = layers.findIndex(l => l.id === selectedLayerId);

  // Debug: log layers count
  React.useEffect(() => {
    if (layers.length > 0) {
      console.log('[LayerPanel] Layers count:', layers.length, 'IDs:', layers.map(l => l.id));
    }
  }, [layers]);

  const handleAddLayer = (type: LayerType) => {
    const names: Record<LayerType, string> = {
      base: 'Base',
      mountains: 'Mountains',
      canyons: 'Canyons',
      rivers: 'Rivers',
      lakes: 'Lakes',
      roads: 'Roads',
      custom: 'Custom Layer',
    };
    addLayer(names[type], type);
    setShowAddMenu(false);
  };

  if (!layerStack) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Generate a heightmap to<br />enable layer editing
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Layer list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {[...layers].reverse().map((layer, idx) => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={layer.id === selectedLayerId}
            onSelect={() => selectLayer(layer.id)}
            onToggleVisibility={() => toggleVisibility(layer.id)}
            onToggleLock={() => toggleLock(layer.id)}
            onMoveUp={() => moveLayerUp(layer.id)}
            onMoveDown={() => moveLayerDown(layer.id)}
            onDuplicate={() => duplicateLayer(layer.id)}
            onDelete={() => removeLayer(layer.id)}
            canMoveUp={idx > 0}
            canMoveDown={idx < layers.length - 1}
          />
        ))}
      </div>

      {/* Layer properties (when selected) */}
      {selectedLayer && (
        <div className="border-t border-border p-3 space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Layer Properties
          </div>
          
          {/* Opacity slider */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-muted-foreground">Opacity</span>
              <span className="font-mono">{Math.round((selectedLayer.style.opacity || 1) * 100)}%</span>
            </div>
            <Slider
              value={[(selectedLayer.style.opacity || 1) * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => setOpacity(selectedLayer.id, v / 100)}
            />
          </div>
          
          {/* Blend mode */}
          <div>
            <div className="text-[11px] text-muted-foreground mb-1">Blend Mode</div>
            <select
              className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs"
              value={selectedLayer.blendMode}
              onChange={(e) => setBlendMode(selectedLayer.id, e.target.value as BlendMode)}
            >
              {BLEND_MODES.map(({ mode, label }) => (
                <option key={mode} value={mode}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Add layer button */}
      <div className="border-t border-border p-2 relative">
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => setShowAddMenu(!showAddMenu)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Layer
        </Button>
        
        {showAddMenu && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowAddMenu(false)} 
            />
            <div className="absolute bottom-full left-2 right-2 mb-1 z-50 bg-popover border border-border rounded-md shadow-lg py-1">
              {LAYER_TYPES.map(({ type, label }) => (
                <button
                  key={type}
                  className="w-full px-3 py-1.5 text-xs text-left hover:bg-secondary flex items-center gap-2"
                  onClick={() => handleAddLayer(type)}
                >
                  {LAYER_TYPE_ICONS[type]}
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
