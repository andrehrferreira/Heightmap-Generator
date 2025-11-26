import React, { useState } from 'react';
import { Grid3X3, Mountain, Monitor, MapPin, Fence, ChevronDown, ChevronRight, Leaf, Shield, Stamp, PanelLeftClose, PanelLeft, Settings, Layers, Route, Gauge, Droplets, Brush, Waves } from 'lucide-react';
import { useGenerator, BiomeType } from '../context/GeneratorContext';
import { Slider } from './ui/slider';
import { Accordion, AccordionItem } from './ui/accordion';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface ConfigSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

const ConfigSlider: React.FC<ConfigSliderProps> = ({ label, value, min, max, step, onChange }) => (
  <div className="mb-3">
    <div className="flex justify-between mb-1.5 text-xs text-muted-foreground">
      <span>{label}</span>
      <span className="font-mono text-primary font-medium">{value}</span>
    </div>
    <Slider
      value={[value]}
      min={min}
      max={max}
      step={step}
      onValueChange={([v]) => onChange(v)}
    />
  </div>
);

interface ConfigSectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ icon, title, children }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <span className="text-sm font-semibold">{title}</span>
    </div>
    {children}
  </div>
);

// Resolution presets - Unreal Engine recommended sizes
// Format: (N * 63) + 1 for optimal Landscape component alignment
const RESOLUTION_PRESETS = [
  { label: '127', value: 127, desc: '2×2' },      // 127 = 2*63+1
  { label: '253', value: 253, desc: '4×4' },      // 253 = 4*63+1
  { label: '505', value: 505, desc: '8×8' },      // 505 = 8*63+1
  { label: '1009', value: 1009, desc: '16×16' },  // 1009 = 16*63+1
  { label: '2017', value: 2017, desc: '32×32' },  // 2017 = 32*63+1 - Your standard
  { label: '4033', value: 4033, desc: '64×64' },  // 4033 = 64*63+1
  { label: '8129', value: 8129, desc: '128×128' }, // 8129 = 128*63+1
];

// Biome presets
const BIOME_PRESETS: Array<{ type: BiomeType; label: string; icon: string }> = [
  { type: 'plains', label: 'Plains', icon: '🌾' },
  { type: 'hills', label: 'Hills', icon: '⛰️' },
  { type: 'mountain', label: 'Mountain', icon: '🏔️' },
  { type: 'desert', label: 'Desert', icon: '🏜️' },
  { type: 'canyon', label: 'Canyon', icon: '🏞️' },
  { type: 'island', label: 'Island', icon: '🏝️' },
  { type: 'coastal', label: 'Coastal', icon: '🌊' },
  { type: 'volcanic', label: 'Volcanic', icon: '🌋' },
  { type: 'tundra', label: 'Tundra', icon: '❄️' },
  { type: 'forest', label: 'Forest', icon: '🌲' },
];

// Border type options
const BORDER_TYPES = [
  { value: 'mountain', label: 'Mountain' },
  { value: 'cliff', label: 'Cliff' },
  { value: 'water', label: 'Water' },
  { value: 'none', label: 'None' },
];

interface ResolutionButtonProps {
  preset: typeof RESOLUTION_PRESETS[0];
  isSelected: boolean;
  onClick: () => void;
}

const ResolutionButton: React.FC<ResolutionButtonProps> = ({ preset, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center py-1.5 px-2 rounded-md text-xs transition-colors ${
      isSelected 
        ? 'bg-primary text-primary-foreground' 
        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
    }`}
  >
    <span className="font-semibold">{preset.label}</span>
    <span className="text-[10px] opacity-70">{preset.desc}</span>
  </button>
);

// Collapsed sidebar icons with tooltips
const CollapsedSidebarItem: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
  <div className="relative group">
    <button
      onClick={onClick}
      className="w-full p-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
      title={label}
    >
      {icon}
    </button>
    <div className="fixed left-14 ml-1 px-2 py-1 bg-zinc-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[9999] transition-opacity duration-150"
      style={{ top: 'auto', transform: 'translateY(-50%)' }}
    >
      {label}
      <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-zinc-800" />
    </div>
  </div>
);

export const Sidebar: React.FC<SidebarProps> = ({ collapsed = false, onToggle }) => {
  const { config, setConfig } = useGenerator();
  const [showDensitySettings, setShowDensitySettings] = useState(false);

  const handleResolutionPreset = (value: number) => {
    setConfig({ width: value, height: value });
  };

  const handleBiomeChange = (biomeType: BiomeType) => {
    // When changing biome, we could apply preset values
    // For now just change the type
    setConfig({ biomeType });
  };

  const currentResolutionPreset = RESOLUTION_PRESETS.find(
    p => p.value === config.width && p.value === config.height
  );

  return (
    <aside 
      className={`flex flex-col bg-card border-r border-border shrink-0 transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-12' : 'w-[280px]'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center border-b border-border shrink-0 ${collapsed ? 'justify-center py-3' : 'justify-between px-4 py-3'}`}>
        {!collapsed && (
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </span>
        )}
        <button
          onClick={onToggle}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed icons */}
      {collapsed && (
        <div className="flex-1 overflow-y-auto">
          <CollapsedSidebarItem icon={<Monitor className="w-4 h-4" />} label="Resolution" />
          <CollapsedSidebarItem icon={<Grid3X3 className="w-4 h-4" />} label="Grid Settings" />
          <CollapsedSidebarItem icon={<Leaf className="w-4 h-4" />} label="Biome" />
          <CollapsedSidebarItem icon={<Mountain className="w-4 h-4" />} label="Terrain Density" />
          <CollapsedSidebarItem icon={<Fence className="w-4 h-4" />} label="Border Barriers" />
          <CollapsedSidebarItem icon={<MapPin className="w-4 h-4" />} label="POI & Roads" />
          <CollapsedSidebarItem icon={<Gauge className="w-4 h-4" />} label="Performance" />
          <CollapsedSidebarItem icon={<Route className="w-4 h-4" />} label="Ramps" />
          <CollapsedSidebarItem icon={<Droplets className="w-4 h-4" />} label="Erosion" />
          <CollapsedSidebarItem icon={<Brush className="w-4 h-4" />} label="Detail" />
          <CollapsedSidebarItem icon={<Stamp className="w-4 h-4" />} label="Stamps" />
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
      
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4">
          <Accordion storageKey="sidebar-accordion-state" defaultOpen={['resolution']}>
            <AccordionItem 
              id="resolution"
              title="Resolution" 
              icon={<Monitor className="w-4 h-4" />}
            >
              <div className="grid grid-cols-4 gap-1 mb-3">
                {RESOLUTION_PRESETS.slice(0, 4).map(preset => (
                  <ResolutionButton
                    key={preset.value}
                    preset={preset}
                    isSelected={currentResolutionPreset?.value === preset.value}
                    onClick={() => handleResolutionPreset(preset.value)}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-1 mb-3">
                {RESOLUTION_PRESETS.slice(4).map(preset => (
                  <ResolutionButton
                    key={preset.value}
                    preset={preset}
                    isSelected={currentResolutionPreset?.value === preset.value}
                    onClick={() => handleResolutionPreset(preset.value)}
                  />
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground text-center mb-2">
                {config.width}×{config.height} = {((config.width * config.height) / 1000000).toFixed(2)}M pixels
              </div>
            </AccordionItem>

            <AccordionItem 
              id="grid-settings"
              title="Grid Settings" 
              icon={<Grid3X3 className="w-4 h-4" />}
            >
              <ConfigSlider
                label="Width"
                value={config.width}
                min={256}
                max={8192}
                step={256}
                onChange={(v) => setConfig({ width: v })}
              />
              <ConfigSlider
                label="Height"
                value={config.height}
                min={256}
                max={8192}
                step={256}
                onChange={(v) => setConfig({ height: v })}
              />
              <ConfigSlider
                label="Cell Size"
                value={config.cellSize}
                min={1}
                max={8}
                step={1}
                onChange={(v) => setConfig({ cellSize: v })}
              />
              <div className="text-[10px] text-muted-foreground text-center -mt-1">
                Grid: {Math.floor(config.width / config.cellSize)}×{Math.floor(config.height / config.cellSize)} cells
              </div>
            </AccordionItem>

            <AccordionItem 
              id="biome"
              title="Biome" 
              icon={<Leaf className="w-4 h-4" />}
            >
              <div className="grid grid-cols-5 gap-1 mb-2">
                {BIOME_PRESETS.map(biome => (
                  <button
                    key={biome.type}
                    onClick={() => handleBiomeChange(biome.type)}
                    className={`flex flex-col items-center py-1.5 px-1 rounded-md text-[10px] transition-colors ${
                      config.biomeType === biome.type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary hover:bg-secondary/80 text-muted-foreground'
                    }`}
                    title={biome.label}
                  >
                    <span className="text-sm">{biome.icon}</span>
                    <span className="truncate w-full text-center">{biome.label}</span>
                  </button>
                ))}
              </div>
              <ConfigSlider
                label="Seed"
                value={config.seed}
                min={1}
                max={99999}
                step={1}
                onChange={(v) => setConfig({ seed: v })}
              />
            </AccordionItem>

            <AccordionItem 
              id="terrain-density"
              title="Terrain Density" 
              icon={<Mountain className="w-4 h-4" />}
            >
              <button
                onClick={() => setShowDensitySettings(!showDensitySettings)}
                className="flex items-center justify-between w-full text-xs text-muted-foreground hover:text-foreground mb-2"
              >
                <span>Advanced Settings</span>
                {showDensitySettings ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              
              <ConfigSlider
                label="Mountain Density"
                value={Math.round(config.density.mountainDensity * 100)}
                min={0}
                max={100}
                step={5}
                onChange={(v) => setConfig({ 
                  density: { ...config.density, mountainDensity: v / 100 } 
                })}
              />
              
              <ConfigSlider
                label="Mountain Ranges"
                value={config.density.rangeCount}
                min={0}
                max={5}
                step={1}
                onChange={(v) => setConfig({ 
                  density: { ...config.density, rangeCount: v } 
                })}
              />
              
              {showDensitySettings && (
                <>
                  <ConfigSlider
                    label="Height Multiplier"
                    value={Math.round(config.density.heightMultiplier * 100)}
                    min={50}
                    max={200}
                    step={10}
                    onChange={(v) => setConfig({ 
                      density: { ...config.density, heightMultiplier: v / 100 } 
                    })}
                  />
                  <ConfigSlider
                    label="Valley Depth"
                    value={Math.round(config.density.valleyDepth * 100)}
                    min={50}
                    max={200}
                    step={10}
                    onChange={(v) => setConfig({ 
                      density: { ...config.density, valleyDepth: v / 100 } 
                    })}
                  />
                  <ConfigSlider
                    label="Plains Flatness"
                    value={Math.round(config.density.plainsFlat * 100)}
                    min={0}
                    max={100}
                    step={10}
                    onChange={(v) => setConfig({ 
                      density: { ...config.density, plainsFlat: v / 100 } 
                    })}
                  />
                  <ConfigSlider
                    label="Cluster Size"
                    value={config.density.clusterSize}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(v) => setConfig({ 
                      density: { ...config.density, clusterSize: v } 
                    })}
                  />
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="border-barriers"
              title="Border Barriers" 
              icon={<Shield className="w-4 h-4" />}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={config.border.enabled}
                    onChange={(e) => setConfig({ 
                      border: { ...config.border, enabled: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  Enable Barriers
                </label>
              </div>
              
              {config.border.enabled && (
                <>
                  <div className="flex gap-1 mb-3">
                    {BORDER_TYPES.map(bt => (
                      <button
                        key={bt.value}
                        onClick={() => setConfig({ 
                          border: { ...config.border, type: bt.value as any } 
                        })}
                        className={`flex-1 py-1.5 px-2 rounded text-[10px] transition-colors ${
                          config.border.type === bt.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                      >
                        {bt.label}
                      </button>
                    ))}
                  </div>
                  
                  <ConfigSlider
                    label="Height"
                    value={config.border.height}
                    min={100}
                    max={1000}
                    step={50}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, height: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Smoothness"
                    value={Math.round(config.border.smoothness * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, smoothness: v / 100 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Width"
                    value={config.border.width}
                    min={20}
                    max={150}
                    step={5}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, width: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Exits"
                    value={config.border.exitCount}
                    min={0}
                    max={8}
                    step={1}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, exitCount: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Exit Width"
                    value={config.border.exitWidth}
                    min={5}
                    max={30}
                    step={1}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, exitWidth: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Noise Amplitude"
                    value={config.border.noiseAmplitude}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, noiseAmplitude: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Noise Scale"
                    value={config.border.noiseScale}
                    min={0.01}
                    max={0.2}
                    step={0.01}
                    onChange={(v) => setConfig({ 
                      border: { ...config.border, noiseScale: v } 
                    })}
                  />
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="poi-roads"
              title="POI & Roads" 
              icon={<MapPin className="w-4 h-4" />}
            >
              <ConfigSlider
                label="POI Count"
                value={config.poiCount}
                min={2}
                max={20}
                step={1}
                onChange={(v) => setConfig({ poiCount: v })}
              />
              <ConfigSlider
                label="Road Width"
                value={config.roadWidth}
                min={1}
                max={10}
                step={1}
                onChange={(v) => setConfig({ roadWidth: v })}
              />
              <ConfigSlider
                label="Road Noise"
                value={config.roads?.noiseAmplitude ?? 2}
                min={0}
                max={5}
                step={0.5}
                onChange={(v) => setConfig({ roads: { ...config.roads, noiseAmplitude: v } })}
              />
              <ConfigSlider
                label="Road Smoothing"
                value={config.roads?.smoothingPasses ?? 3}
                min={0}
                max={8}
                step={1}
                onChange={(v) => setConfig({ roads: { ...config.roads, smoothingPasses: v } })}
              />
              <ConfigSlider
                label="Road Blur"
                value={config.roads?.blurPasses ?? 2}
                min={0}
                max={5}
                step={1}
                onChange={(v) => setConfig({ roads: { ...config.roads, blurPasses: v } })}
              />
            </AccordionItem>

            <AccordionItem 
              id="performance"
              title="Performance" 
              icon={<Monitor className="w-4 h-4" />}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={config.useGPU ?? true}
                    onChange={(e) => setConfig({ useGPU: e.target.checked })}
                    className="rounded border-border"
                  />
                  <span>Use GPU (WebGL)</span>
                </label>
                <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                  {config.useGPU ? '⚡ Fast' : '🐢 CPU'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground mb-3">
                GPU uses WebGL shaders for 10-50x faster generation
              </div>
              
              <ConfigSlider
                label="Max FPS"
                value={config.maxFPS || 30}
                min={15}
                max={120}
                step={5}
                onChange={(v) => setConfig({ maxFPS: v })}
              />
              <div className="text-[10px] text-muted-foreground text-center -mt-1">
                Limits FPS to save resources
              </div>
            </AccordionItem>

            <AccordionItem 
              id="ramps"
              title="Ramps & Accessibility" 
              icon={<Mountain className="w-4 h-4" />}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={config.ramps.enabled}
                    onChange={(e) => setConfig({ 
                      ramps: { ...config.ramps, enabled: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  Enable Advanced Ramps
                </label>
              </div>
              
              {config.ramps.enabled && (
                <>
                  <ConfigSlider
                    label="Max Angle"
                    value={config.ramps.maxAngle}
                    min={15}
                    max={60}
                    step={5}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, maxAngle: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Min Angle"
                    value={config.ramps.minAngle}
                    min={5}
                    max={30}
                    step={5}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, minAngle: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Ramp Width"
                    value={config.ramps.rampWidth}
                    min={3}
                    max={30}
                    step={1}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, rampWidth: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Ramps Per Level"
                    value={config.ramps.rampsPerTransition ?? 4}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, rampsPerTransition: v } 
                    })}
                  />
                  <div className="text-[10px] text-muted-foreground text-center -mt-1 mb-2">
                    Number of access ramps between each level
                  </div>
                  
                  <ConfigSlider
                    label="Noise Amplitude"
                    value={Math.round(config.ramps.noiseAmplitude * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, noiseAmplitude: v / 100 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Noise Scale"
                    value={Math.round(config.ramps.noiseScale * 100)}
                    min={1}
                    max={50}
                    step={1}
                    onChange={(v) => setConfig({ 
                      ramps: { ...config.ramps, noiseScale: v / 100 } 
                    })}
                  />
                  
                  <div className="flex items-center justify-between mb-3 mt-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={config.ramps.enableInaccessible}
                        onChange={(e) => setConfig({ 
                          ramps: { ...config.ramps, enableInaccessible: e.target.checked } 
                        })}
                        className="rounded"
                      />
                      Enable Inaccessible Areas
                    </label>
                  </div>
                  
                  {config.ramps.enableInaccessible && (
                    <>
                      <ConfigSlider
                        label="Min Level for Inaccessible"
                        value={config.ramps.inaccessibleMinLevel}
                        min={2}
                        max={10}
                        step={1}
                        onChange={(v) => setConfig({ 
                          ramps: { ...config.ramps, inaccessibleMinLevel: v } 
                        })}
                      />
                      
                      <ConfigSlider
                        label="Inaccessible Percentage"
                        value={Math.round(config.ramps.inaccessiblePercentage * 100)}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => setConfig({ 
                          ramps: { ...config.ramps, inaccessiblePercentage: v / 100 } 
                        })}
                      />
                    </>
                  )}
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="noise"
              title="Noise Settings" 
              icon={<Waves className="w-4 h-4" />}
            >
              {config.noise && (
                <>
                  <ConfigSlider
                    label="Noise Scale"
                    value={Math.round(config.noise.noiseScale * 10000)}
                    min={10}
                    max={1000}
                    step={10}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, noiseScale: v / 10000 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Octaves"
                    value={config.noise.octaves}
                    min={1}
                    max={12}
                    step={1}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, octaves: v } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Persistence"
                    value={Math.round(config.noise.persistence * 100)}
                    min={10}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, persistence: v / 100 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Lacunarity"
                    value={Math.round(config.noise.lacunarity * 10)}
                    min={15}
                    max={30}
                    step={1}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, lacunarity: v / 10 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Ridge Strength"
                    value={Math.round(config.noise.ridgeStrength * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, ridgeStrength: v / 100 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Domain Warp Strength"
                    value={Math.round(config.noise.warpStrength * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => setConfig({ 
                      noise: { ...config.noise, warpStrength: v / 100 } 
                    })}
                  />
                  
                  {config.noise.billowStrength !== undefined && (
                    <ConfigSlider
                      label="Billow Strength"
                      value={Math.round(config.noise.billowStrength * 100)}
                      min={0}
                      max={100}
                      step={5}
                      onChange={(v) => setConfig({ 
                        noise: { ...config.noise, billowStrength: v / 100 } 
                      })}
                    />
                  )}
                  
                  {config.noise.voronoiStrength !== undefined && (
                    <ConfigSlider
                      label="Voronoi Strength"
                      value={Math.round(config.noise.voronoiStrength * 100)}
                      min={0}
                      max={100}
                      step={5}
                      onChange={(v) => setConfig({ 
                        noise: { ...config.noise, voronoiStrength: v / 100 } 
                      })}
                    />
                  )}
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="erosion"
              title="Erosion" 
              icon={<Droplets className="w-4 h-4" />}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={config.erosion.enabled}
                    onChange={(e) => setConfig({ 
                      erosion: { ...config.erosion, enabled: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  Enable Erosion
                </label>
              </div>
              
              {config.erosion.enabled && (
                <>
                  <ConfigSlider
                    label="Erosion Iterations"
                    value={config.erosion.iterations}
                    min={1}
                    max={10}
                    step={1}
                    onChange={(v) => setConfig({ 
                      erosion: { ...config.erosion, iterations: v } 
                    })}
                  />
                  
                  <div className="flex items-center justify-between mb-3 mt-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={config.erosion.hydraulicEnabled}
                        onChange={(e) => setConfig({ 
                          erosion: { ...config.erosion, hydraulicEnabled: e.target.checked } 
                        })}
                        className="rounded"
                      />
                      Hydraulic Erosion (Water)
                    </label>
                  </div>
                  
                  {config.erosion.hydraulicEnabled && (
                    <>
                      <ConfigSlider
                        label="Erosion Rate"
                        value={Math.round(config.erosion.hydraulicRate * 100)}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => setConfig({ 
                          erosion: { ...config.erosion, hydraulicRate: v / 100 } 
                        })}
                      />
                      
                      <ConfigSlider
                        label="Deposition Rate"
                        value={Math.round(config.erosion.depositionRate * 100)}
                        min={0}
                        max={100}
                        step={5}
                        onChange={(v) => setConfig({ 
                          erosion: { ...config.erosion, depositionRate: v / 100 } 
                        })}
                      />
                    </>
                  )}
                  
                  <div className="flex items-center justify-between mb-3 mt-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={config.erosion.thermalEnabled}
                        onChange={(e) => setConfig({ 
                          erosion: { ...config.erosion, thermalEnabled: e.target.checked } 
                        })}
                        className="rounded"
                      />
                      Thermal Erosion (Talus)
                    </label>
                  </div>
                  
                  {config.erosion.thermalEnabled && (
                    <>
                      <ConfigSlider
                        label="Talus Angle"
                        value={Math.round(config.erosion.thermalTalusAngle * 100)}
                        min={1}
                        max={10}
                        step={1}
                        onChange={(v) => setConfig({ 
                          erosion: { ...config.erosion, thermalTalusAngle: v / 100 } 
                        })}
                      />
                      
                      <ConfigSlider
                        label="Erosion Strength"
                        value={Math.round(config.erosion.thermalStrength * 100)}
                        min={10}
                        max={100}
                        step={5}
                        onChange={(v) => setConfig({ 
                          erosion: { ...config.erosion, thermalStrength: v / 100 } 
                        })}
                      />
                    </>
                  )}
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="detail"
              title="Detail Enhancement" 
              icon={<Brush className="w-4 h-4" />}
            >
              <div className="flex items-center justify-between mb-3">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={config.detail.enabled}
                    onChange={(e) => setConfig({ 
                      detail: { ...config.detail, enabled: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  Enable Detail Overlay
                </label>
              </div>
              
              {config.detail.enabled && (
                <>
                  <ConfigSlider
                    label="Macro Detail (Large)"
                    value={Math.round(config.detail.macroStrength * 1000)}
                    min={0}
                    max={50}
                    step={1}
                    onChange={(v) => setConfig({ 
                      detail: { ...config.detail, macroStrength: v / 1000 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Meso Detail (Medium)"
                    value={Math.round(config.detail.mesoStrength * 1000)}
                    min={0}
                    max={50}
                    step={1}
                    onChange={(v) => setConfig({ 
                      detail: { ...config.detail, mesoStrength: v / 1000 } 
                    })}
                  />
                  
                  <ConfigSlider
                    label="Micro Detail (Fine)"
                    value={Math.round(config.detail.microStrength * 1000)}
                    min={0}
                    max={30}
                    step={1}
                    onChange={(v) => setConfig({ 
                      detail: { ...config.detail, microStrength: v / 1000 } 
                    })}
                  />
                </>
              )}
            </AccordionItem>

            <AccordionItem 
              id="stamps"
              title="Stamps" 
              icon={<Stamp className="w-4 h-4" />}
            >
              <div className="text-xs text-muted-foreground text-center py-4">
                Stamp configuration coming soon...
              </div>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      )}
    </aside>
  );
};
