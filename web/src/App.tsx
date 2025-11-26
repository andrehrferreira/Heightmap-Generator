import React, { useEffect } from 'react';
import { MenuBar } from './components/MenuBar';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { InfoPanel } from './components/InfoPanel';
import { StatusBar } from './components/StatusBar';
import { GeneratorProvider, useGenerator } from './context/GeneratorContext';
import { LayerProvider, useLayerContext } from './context/LayerContext';
import { useProject } from './hooks/useProject';

// Component that initializes auto-save
const ProjectInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useProject(); // This will setup auto-save and auto-restore
  return <>{children}</>;
};

// Component that connects Generator to Layer system
const LayerInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { onGenerate } = useGenerator();
  const { initializeStack } = useLayerContext();

  useEffect(() => {
    onGenerate((cols, rows) => {
      initializeStack(cols, rows);
    });
  }, [onGenerate, initializeStack]);

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <GeneratorProvider>
      <LayerProvider>
        <LayerInitializer>
          <ProjectInitializer>
            <div className="flex flex-col w-screen h-screen">
              <MenuBar />
              <main className="flex flex-1 overflow-hidden">
                <Sidebar />
                <Preview />
                <InfoPanel />
              </main>
              <StatusBar />
            </div>
          </ProjectInitializer>
        </LayerInitializer>
      </LayerProvider>
    </GeneratorProvider>
  );
};

export default App;
