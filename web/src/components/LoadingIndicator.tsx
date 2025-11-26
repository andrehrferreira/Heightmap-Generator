import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingIndicatorProps {
  message?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message = 'Generating...' }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-lg shadow-lg">
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <span className="text-sm text-foreground">{message}</span>
    </div>
  );
};

