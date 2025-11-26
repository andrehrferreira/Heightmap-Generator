import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useGenerator, ViewMode } from '../context/GeneratorContext';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Preview3D } from './Preview3D';
import { Preview2D } from './Preview2D';
import { PreviewLayers } from './PreviewLayers';

export const Preview: React.FC = () => {
  const { viewMode, setViewMode } = useGenerator();

  return (
    <div className="flex flex-col flex-1 bg-background">
      <div className="flex items-center gap-2 h-10 px-3 bg-card border-b border-border">
        <span className="text-xs text-muted-foreground mr-1">View:</span>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="3d">3D Preview</TabsTrigger>
            <TabsTrigger value="2d">Heightmap</TabsTrigger>
            <TabsTrigger value="layers">Layers</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <Button variant="ghost" size="icon" title="Reset Camera">
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>
      <div className="relative flex-1 overflow-hidden">
        {viewMode === '3d' && <Preview3D />}
        {viewMode === '2d' && <Preview2D />}
        {viewMode === 'layers' && <PreviewLayers />}
      </div>
    </div>
  );
};
