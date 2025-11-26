import React, { useState } from 'react';
import { Layers, Stamp, PanelRightClose, PanelRight } from 'lucide-react';
import { LayerPanel } from './LayerPanel';
import { StampPanel } from './StampPanel';

type Tab = 'layers' | 'stamps';

interface InfoPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

// Collapsed sidebar item with tooltip
const CollapsedItem: React.FC<{ icon: React.ReactNode; label: string; isActive?: boolean; onClick?: () => void }> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full p-3 flex items-center justify-center transition-colors group relative ${
      isActive ? 'text-foreground bg-secondary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
    }`}
    title={label}
  >
    {icon}
    <span className="absolute right-full mr-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
      {label}
    </span>
  </button>
);

export const InfoPanel: React.FC<InfoPanelProps> = ({ collapsed = false, onToggle }) => {
  const [activeTab, setActiveTab] = useState<Tab>('layers');

  return (
    <aside 
      className={`flex flex-col bg-card border-l border-border shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        collapsed ? 'w-12' : 'w-64'
      }`}
    >
      {/* Header */}
      <div className={`flex border-b border-border shrink-0 ${collapsed ? 'flex-col' : ''}`}>
        {collapsed ? (
          <>
            <div className="flex items-center justify-center py-3">
              <button
                onClick={onToggle}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Expand panel"
              >
                <PanelRight className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
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
            <button
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === 'stamps'
                  ? 'text-foreground bg-secondary border-b-2 border-blue-500'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
              onClick={() => setActiveTab('stamps')}
            >
              Stamps
            </button>
            <button
              onClick={onToggle}
              className="px-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Collapse panel"
            >
              <PanelRightClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      
      {/* Collapsed icons */}
      {collapsed && (
        <div className="flex-1">
          <CollapsedItem 
            icon={<Layers className="w-4 h-4" />} 
            label="Layers" 
            isActive={activeTab === 'layers'}
            onClick={() => { setActiveTab('layers'); onToggle?.(); }}
          />
          <CollapsedItem 
            icon={<Stamp className="w-4 h-4" />} 
            label="Stamps" 
            isActive={activeTab === 'stamps'}
            onClick={() => { setActiveTab('stamps'); onToggle?.(); }}
          />
        </div>
      )}

      {/* Expanded content */}
      {!collapsed && (
        <>
          {activeTab === 'layers' && <LayerPanel />}
          {activeTab === 'stamps' && <StampPanel />}
        </>
      )}
    </aside>
  );
};
