import React from 'react';
import { Grid3X3, Mountain, PlayCircle } from 'lucide-react';
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

export const Sidebar: React.FC = () => {
  const { config, setConfig, generate, isGenerating } = useGenerator();

  return (
    <aside className="flex flex-col w-[280px] bg-card border-r border-border shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Configuration
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        <ConfigSection icon={<Grid3X3 className="w-4 h-4" />} title="Grid Settings">
          <ConfigSlider
            label="Width"
            value={config.width}
            min={128}
            max={2048}
            step={128}
            onChange={(v) => setConfig({ width: v })}
          />
          <ConfigSlider
            label="Height"
            value={config.height}
            min={128}
            max={2048}
            step={128}
            onChange={(v) => setConfig({ height: v })}
          />
          <ConfigSlider
            label="Cell Size"
            value={config.cellSize}
            min={1}
            max={16}
            step={1}
            onChange={(v) => setConfig({ cellSize: v })}
          />
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
      </div>
    </aside>
  );
};
