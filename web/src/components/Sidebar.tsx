import React from 'react';
import { Grid3X3, Mountain, PlayCircle, Monitor } from 'lucide-react';
import { useGenerator } from '../context/GeneratorContext';
import { Button } from './ui/button';
import { Slider } from './ui/slider';

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

// Resolution presets
const RESOLUTION_PRESETS = [
  { label: '512', value: 512, desc: 'Preview' },
  { label: '1K', value: 1024, desc: 'Low' },
  { label: '2K', value: 2048, desc: 'Medium' },
  { label: '4K', value: 4096, desc: 'Standard' },
  { label: '8K', value: 8192, desc: 'High' },
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

export const Sidebar: React.FC = () => {
  const { config, setConfig, generate, isGenerating } = useGenerator();

  const handleResolutionPreset = (value: number) => {
    setConfig({ width: value, height: value });
  };

  const currentResolutionPreset = RESOLUTION_PRESETS.find(
    p => p.value === config.width && p.value === config.height
  );

  return (
    <aside className="flex flex-col w-[280px] bg-card border-r border-border shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configuration
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <ConfigSection icon={<Monitor className="w-4 h-4" />} title="Resolution">
          <div className="grid grid-cols-5 gap-1 mb-3">
            {RESOLUTION_PRESETS.map(preset => (
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
        </ConfigSection>

        <ConfigSection icon={<Grid3X3 className="w-4 h-4" />} title="Grid Settings">
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
        </ConfigSection>

        <ConfigSection icon={<Mountain className="w-4 h-4" />} title="Terrain">
          <ConfigSlider
            label="Levels"
            value={config.levels}
            min={1}
            max={10}
            step={1}
            onChange={(v) => setConfig({ levels: v })}
          />
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
        </ConfigSection>

        <Button
          className={`w-full ${isGenerating ? 'animate-pulse-opacity' : ''}`}
          onClick={generate}
          disabled={isGenerating}
        >
          <PlayCircle className="w-4 h-4" />
          {isGenerating ? 'Generating...' : 'Generate Heightmap'}
        </Button>
        
        <div className="mt-3 p-2 bg-secondary/50 rounded-md">
          <p className="text-[10px] text-muted-foreground">
            <strong>Note:</strong> 4K/8K resolutions are for export. Preview uses downsampled version for performance.
          </p>
        </div>
      </div>
    </aside>
  );
};
