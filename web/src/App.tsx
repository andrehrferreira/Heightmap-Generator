import React from 'react';
import { MenuBar } from './components/MenuBar';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { InfoPanel } from './components/InfoPanel';
import { StatusBar } from './components/StatusBar';
import { GeneratorProvider } from './context/GeneratorContext';
import { LayerProvider } from './context/LayerContext';
import { useProject } from './hooks/useProject';

// Component that initializes auto-save
const ProjectInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useProject(); // This will setup auto-save and auto-restore
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <GeneratorProvider>
      <LayerProvider>
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
      </LayerProvider>
    </GeneratorProvider>
  );
};

export default App;
