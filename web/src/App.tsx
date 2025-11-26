import React, { useEffect, useState } from 'react';
import { MenuBar } from './components/MenuBar';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { InfoPanel } from './components/InfoPanel';
import { StatusBar } from './components/StatusBar';
import { LoadingIndicator } from './components/LoadingIndicator';
import { GeneratorProvider, useGenerator } from './context/GeneratorContext';
import { LayerProvider, useLayerContext } from './context/LayerContext';

// Load sidebar state from localStorage
const loadSidebarState = () => {
  try {
    const saved = localStorage.getItem('sidebar-collapsed-state');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  // Default: left expanded, right collapsed for better preview
  return { left: false, right: true };
};

// Component that connects Generator to Layer system
const LayerInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { onGenerate, isGenerating } = useGenerator();
  const { initializeStack } = useLayerContext();

  useEffect(() => {
    onGenerate((cols, rows) => {
      initializeStack(cols, rows);
    });
  }, [onGenerate, initializeStack]);

  return (
    <>
      {children}
      {isGenerating && <LoadingIndicator message="Generating terrain..." />}
    </>
  );
};

const App: React.FC = () => {
  const [sidebarState, setSidebarState] = useState(loadSidebarState);

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed-state', JSON.stringify(sidebarState));
  }, [sidebarState]);

  const toggleLeftSidebar = () => {
    setSidebarState((prev: { left: boolean; right: boolean }) => ({ ...prev, left: !prev.left }));
  };

  const toggleRightSidebar = () => {
    setSidebarState((prev: { left: boolean; right: boolean }) => ({ ...prev, right: !prev.right }));
  };

  return (
    <GeneratorProvider>
      <LayerProvider>
        <LayerInitializer>
          <div className="flex flex-col w-screen h-screen">
            <MenuBar />
            <main className="flex flex-1 overflow-hidden">
              <Sidebar collapsed={sidebarState.left} onToggle={toggleLeftSidebar} />
              <Preview />
              <InfoPanel collapsed={sidebarState.right} onToggle={toggleRightSidebar} />
            </main>
            <StatusBar />
          </div>
        </LayerInitializer>
      </LayerProvider>
    </GeneratorProvider>
  );
};

export default App;
