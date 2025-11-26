import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mountain, Waves, Flame, TreePine, Sparkles, Loader2 } from 'lucide-react';
import { loadAllStamps, loadStampHeightData, LoadedStamp, getStampCategories, applyLoadedStampToGrid } from '../lib/stampLoader';
import { useGenerator } from '../context/GeneratorContext';
import { Accordion, AccordionItem } from './ui/accordion';

// Category icons
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'crater': <Sparkles size={14} />,
  'canyon': <Mountain size={14} />,
  'volcano': <Flame size={14} />,
  'mountain': <Mountain size={14} />,
  'valley': <TreePine size={14} />,
  'desert': <Waves size={14} />,
  'island': <Waves size={14} />,
  'alien': <Sparkles size={14} />,
  'terrace': <Mountain size={14} />,
  'tundra': <Waves size={14} />,
  'terrain': <Mountain size={14} />,
};

// Category colors
const CATEGORY_COLORS: Record<string, string> = {
  'crater': 'bg-red-500/20 text-red-400 border-red-500/30',
  'canyon': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  'volcano': 'bg-red-600/20 text-red-500 border-red-600/30',
  'mountain': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  'valley': 'bg-green-500/20 text-green-400 border-green-500/30',
  'desert': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'island': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'alien': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'terrace': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'tundra': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  'terrain': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface StampPanelProps {
  onApplyStamp?: (stamp: LoadedStamp, x: number, y: number, options: any) => void;
}

export const StampPanel: React.FC<StampPanelProps> = ({ onApplyStamp }) => {
  const { result, setResult, setStatus } = useGenerator();
  const [stamps, setStamps] = useState<LoadedStamp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStamp, setSelectedStamp] = useState<LoadedStamp | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  // Stamp options
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [strength, setStrength] = useState(100);
  const [blendMode, setBlendMode] = useState<'add' | 'subtract' | 'replace' | 'max'>('add');

  // Position for random placement
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(50);

  const loadedRef = useRef(false);
  const [loadingStamp, setLoadingStamp] = useState(false);

  // Load stamps on mount (only once)
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      setLoading(true);
      try {
        const loadedStamps = await loadAllStamps();
        setStamps(loadedStamps);
        setCategories(getStampCategories(loadedStamps));
      } catch (error) {
        console.error('[Stamps] Failed to load:', error);
      }
      setLoading(false);
    };
    load();
  }, []);


  // Handle stamp selection - load full data on demand
  const handleSelectStamp = useCallback(async (stamp: LoadedStamp) => {
    if (stamp.loaded) {
      setSelectedStamp(stamp);
      return;
    }

    setLoadingStamp(true);
    try {
      const loadedStamp = await loadStampHeightData(stamp);
      // Update in stamps array
      setStamps(prev => prev.map(s => s.id === loadedStamp.id ? loadedStamp : s));
      setSelectedStamp(loadedStamp);
    } catch (error) {
      console.error('[Stamps] Failed to load stamp data:', error);
      setStatus('Failed to load stamp', 'error');
    }
    setLoadingStamp(false);
  }, [setStatus]);

  // Apply stamp to terrain
  const handleApplyStamp = useCallback(async () => {
    if (!selectedStamp || !result?.grid) {
      setStatus('No stamp selected or no terrain generated', 'warning');
      return;
    }

    let stampToApply = selectedStamp;

    // Make sure stamp data is loaded
    if (!selectedStamp.loaded || !selectedStamp.heightData) {
      setLoadingStamp(true);
      try {
        stampToApply = await loadStampHeightData(selectedStamp);
        setSelectedStamp(stampToApply);
        setStamps(prev => prev.map(s => s.id === stampToApply.id ? stampToApply : s));
      } catch (error) {
        setStatus('Failed to load stamp data', 'error');
        setLoadingStamp(false);
        return;
      }
      setLoadingStamp(false);
    }

    const grid = result.grid;
    const cols = grid.getCols();
    const rows = grid.getRows();

    // Convert percentage to grid coordinates
    const x = Math.floor((posX / 100) * cols);
    const y = Math.floor((posY / 100) * rows);

    console.log(`[Stamps] Applying "${stampToApply.name}" at (${x}, ${y}), size: ${stampToApply.width}x${stampToApply.height}`);

    applyLoadedStampToGrid(grid, stampToApply, x, y, {
      scale,
      rotation,
      strength,
      blendMode,
    });

    // Recalculate height stats
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    let totalHeight = 0;
    let count = 0;

    grid.forEachCell((cell: any) => {
      minHeight = Math.min(minHeight, cell.height);
      maxHeight = Math.max(maxHeight, cell.height);
      totalHeight += cell.height;
      count++;
    });

    // Update result to trigger re-render
    setResult({
      ...result,
      heightStats: {
        minHeight,
        maxHeight,
        avgHeight: totalHeight / count,
      },
    });

    setStatus(`Applied stamp: ${selectedStamp.name}`, 'success');
  }, [selectedStamp, result, posX, posY, scale, rotation, strength, blendMode, setResult, setStatus]);

  // Apply stamp at random position
  const handleApplyRandom = useCallback(() => {
    setPosX(20 + Math.random() * 60);
    setPosY(20 + Math.random() * 60);
    setTimeout(handleApplyStamp, 50);
  }, [handleApplyStamp]);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center gap-2 text-gray-400">
        <Loader2 className="animate-spin" size={20} />
        <span>Loading stamps...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stamp Grid with Accordion by Category */}
      <div className="flex-1 overflow-y-auto p-2">
        <Accordion storageKey="stamp-panel-accordion-state" defaultOpen={categories.slice(0, 3)}>
          {categories.map(cat => {
            const categoryStamps = stamps.filter(s => s.category === cat);
            if (categoryStamps.length === 0) return null;

            return (
              <AccordionItem
                key={cat}
                id={cat}
                title={`${cat} (${categoryStamps.length})`}
                icon={CATEGORY_ICONS[cat]}
              >
                <div className="grid grid-cols-4 gap-2">
                  {categoryStamps.map(stamp => (
                    <button
                      key={stamp.id}
                      onClick={() => handleSelectStamp(stamp)}
                      className={`relative aspect-square rounded overflow-hidden border-2 transition-all hover:scale-105 ${selectedStamp?.id === stamp.id
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-gray-600 hover:border-gray-500'
                        }`}
                      title={stamp.name}
                    >
                      <img
                        src={stamp.thumbnail}
                        alt={stamp.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {selectedStamp?.id === stamp.id && (
                        <div className="absolute inset-0 bg-blue-500/20" />
                      )}
                      {loadingStamp && selectedStamp?.id === stamp.id && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={20} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Selected Stamp Info & Controls */}
      {selectedStamp && (
        <div className="border-t border-gray-700 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <img
              src={selectedStamp.thumbnail}
              alt={selectedStamp.name}
              className="w-12 h-12 rounded border border-gray-600"
            />
            <div>
              <div className="font-medium text-white text-sm">{selectedStamp.name}</div>
              <div className="text-xs text-gray-400">
                {selectedStamp.width}×{selectedStamp.height}px • {selectedStamp.category}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-gray-400">Scale</label>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={scale}
                onChange={e => setScale(parseFloat(e.target.value))}
                className="w-full"
              />
              <span className="text-gray-300">{scale.toFixed(1)}x</span>
            </div>
            <div>
              <label className="text-gray-400">Rotation</label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={rotation}
                onChange={e => setRotation(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-gray-300">{rotation}°</span>
            </div>
            <div>
              <label className="text-gray-400">Strength</label>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={strength}
                onChange={e => setStrength(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-gray-300">{strength}</span>
            </div>
            <div>
              <label className="text-gray-400">Blend</label>
              <select
                value={blendMode}
                onChange={e => setBlendMode(e.target.value as any)}
                className="w-full bg-gray-700 rounded px-2 py-1 text-white"
              >
                <option value="add">Add</option>
                <option value="subtract">Subtract</option>
                <option value="replace">Replace</option>
                <option value="max">Max</option>
              </select>
            </div>
          </div>

          {/* Position */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-gray-400">Position X</label>
              <input
                type="range"
                min="0"
                max="100"
                value={posX}
                onChange={e => setPosX(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-gray-300">{posX}%</span>
            </div>
            <div>
              <label className="text-gray-400">Position Y</label>
              <input
                type="range"
                min="0"
                max="100"
                value={posY}
                onChange={e => setPosY(parseInt(e.target.value))}
                className="w-full"
              />
              <span className="text-gray-300">{posY}%</span>
            </div>
          </div>

          {/* Apply Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleApplyStamp}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
            >
              Apply Stamp
            </button>
            <button
              onClick={handleApplyRandom}
              className="bg-purple-600 hover:bg-purple-500 text-white py-2 px-3 rounded text-sm font-medium transition-colors"
            >
              Random
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StampPanel;

