import React from 'react';
import { useGenerator } from '../context/GeneratorContext';
import { cn } from '../lib/utils';

export const StatusBar: React.FC = () => {
  const { status } = useGenerator();

  return (
    <footer className="flex items-center h-7 px-3 bg-card border-t border-border text-xs text-muted-foreground gap-4">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'w-2 h-2 rounded-full',
            status.type === 'success' && 'bg-success',
            status.type === 'warning' && 'bg-warning',
            status.type === 'error' && 'bg-destructive',
            status.type === 'info' && 'bg-primary'
          )}
        />
        <span>{status.message}</span>
      </div>
      <div className="ml-auto">v0.1.0</div>
    </footer>
  );
};
