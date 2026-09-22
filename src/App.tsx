import React, { useEffect } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { RepositorySwitcher } from './components/RepositorySwitcher';
import { Welcome } from './pages/Welcome';
import { Connecting } from './pages/Connecting';
import { RepositorySelector } from './pages/RepositorySelector';
import { RepositoryAnalysis } from './pages/RepositoryAnalysis';
import { Chat } from './pages/Chat';
import { CodeExplorer } from './pages/CodeExplorer';
import { Architecture } from './pages/Architecture';
import { ImpactAnalysis } from './pages/ImpactAnalysis';
import { SearchPage } from './pages/SearchPage';
import { GitHub } from './pages/GitHub';
import { Settings } from './pages/Settings';

function Workspace() {
  const { workspaceView } = useApp();

  const renderView = () => {
    switch (workspaceView) {
      case 'chat': return <Chat />;
      case 'explorer': return <CodeExplorer />;
      case 'architecture': return <Architecture />;
      case 'impact': return <ImpactAnalysis />;
      case 'search': return <SearchPage />;
      case 'github': return <GitHub />;
      case 'settings': return <Settings />;
      default: return <Chat />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {renderView()}
        </main>
      </div>
      <StatusBar />
    </div>
  );
}

function AppContent() {
  const { step, connectGitHub } = useApp();

  useEffect(() => {
    const handler = () => connectGitHub();
    window.addEventListener('github-connected', handler);
    return () => window.removeEventListener('github-connected', handler);
  }, [connectGitHub]);

  switch (step) {
    case 'welcome':
      return <Welcome />;
    case 'connecting':
      return <Connecting />;
    case 'repositories':
      return <RepositorySelector />;
    case 'analyzing':
      return <RepositoryAnalysis />;
    case 'workspace':
      return (
        <>
          <Workspace />
          <CommandPalette />
          <RepositorySwitcher />
        </>
      );
    default:
      return <Welcome />;
  }
}

export default function App() {
  return (
    <AppProvider>
      <div className="h-screen w-screen overflow-hidden bg-repo-bg">
        <AppContent />
      </div>
    </AppProvider>
  );
}
