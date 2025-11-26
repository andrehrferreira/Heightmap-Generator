import React, { useState } from 'react';
import { useGenerator } from '../context/GeneratorContext';
import { useLayerContext } from '../context/LayerContext';
import { Card } from './ui/card';
import { LayerPanel } from './LayerPanel';

type Tab = 'stats' | 'layers';

interface LegendItemProps {
  color: string;
  label: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label }) => (
  <div className="flex items-center gap-2 px-2.5 py-2 bg-secondary rounded-md">
    <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
    <span className="text-xs">{label}</span>
  </div>
);

const StatsPanel: React.FC = () => {
  const { result } = useGenerator();
  const stats = result?.stats;
  const heightStats = result?.heightStats;

  return (
    <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
      <div className="grid grid-cols-2 gap-2">
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">Grid Size</div>
          <div className="text-lg font-semibold font-mono text-foreground">{stats?.gridSize || '-'}</div>
        </Card>
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">Total Cells</div>
          <div className="text-lg font-semibold font-mono">{stats?.totalCells?.toLocaleString() || '-'}</div>
        </Card>
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">Road Cells</div>
          <div className="text-lg font-semibold font-mono">{stats?.roadCells?.toLocaleString() || '0'}</div>
        </Card>
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">POIs</div>
          <div className="text-lg font-semibold font-mono">{stats?.poiCount || '0'}</div>
        </Card>
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">Min Height</div>
          <div className="text-lg font-semibold font-mono">{heightStats?.minHeight?.toFixed(0) || '-'}</div>
        </Card>
        <Card>
          <div className="text-[11px] text-muted-foreground mb-1">Max Height</div>
          <div className="text-lg font-semibold font-mono">{heightStats?.maxHeight?.toFixed(0) || '-'}</div>
        </Card>
      </div>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Legend
        </div>
        <div className="flex flex-col gap-1">
          <LegendItem color="#4ade80" label="Level 0 (Base)" />
          <LegendItem color="#60a5fa" label="Level 1" />
          <LegendItem color="#c084fc" label="Level 2+" />
          <LegendItem color="#a1a1aa" label="Roads" />
          <LegendItem color="#f87171" label="POIs" />
        </div>
      </div>
    </div>
  );
};

export const InfoPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('stats');

  return (
    <aside className="flex flex-col w-60 bg-card border-l border-border shrink-0">
      <div className="flex border-b border-border">
        <button
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'stats'
              ? 'text-foreground bg-secondary border-b-2 border-neutral-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
            activeTab === 'layers'
              ? 'text-foreground bg-secondary border-b-2 border-neutral-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
          onClick={() => setActiveTab('layers')}
        >
          Layers
        </button>
      </div>
      
      {activeTab === 'stats' ? <StatsPanel /> : <LayerPanel />}
    </aside>
  );
};
