import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { repositories, type Repository, type ChatMessage, initialMessages } from '../data/mockData';

export type AppStep = 'welcome' | 'connecting' | 'repositories' | 'analyzing' | 'workspace';
export type WorkspaceView = 'chat' | 'explorer' | 'architecture' | 'impact' | 'search' | 'github' | 'settings';

interface AppState {
  step: AppStep;
  connected: boolean;
  selectedRepo: Repository | null;
  workspaceView: WorkspaceView;
  sidebarCollapsed: boolean;
  chatMessages: ChatMessage[];
  analysisProgress: number;
  analysisStep: number;
  commandPaletteOpen: boolean;
  repoSwitcherOpen: boolean;
  activeFile: string;
  activeTab: string;
  searchQuery: string;
}

interface AppContextValue extends AppState {
  connectGitHub: () => void;
  selectRepo: (repo: Repository) => void;
  startAnalysis: () => void;
  completeAnalysis: () => void;
  openWorkspace: () => void;
  setWorkspaceView: (view: WorkspaceView) => void;
  toggleSidebar: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setRepoSwitcherOpen: (open: boolean) => void;
  setActiveFile: (file: string) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;
  switchRepo: (repo: Repository) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AppStep>('welcome');
  const [connected, setConnected] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('chat');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [repoSwitcherOpen, setRepoSwitcherOpen] = useState(false);
  const [activeFile, setActiveFile] = useState('auth_service.dart');
  const [activeTab, setActiveTab] = useState('auth_service.dart');
  const [searchQuery, setSearchQuery] = useState('');

  const connectGitHub = useCallback(() => {
    setStep('connecting');
    setTimeout(() => {
      setConnected(true);
      setStep('repositories');
    }, 2000);
  }, []);

  const selectRepo = useCallback((repo: Repository) => {
    setSelectedRepo(repo);
  }, []);

  const startAnalysis = useCallback(() => {
    setStep('analyzing');
    setAnalysisProgress(0);
    setAnalysisStep(0);

    const steps = [10, 25, 40, 55, 70, 85, 100];
    const stepIndices = [0, 1, 2, 3, 4, 5, 6];

    steps.forEach((progress, i) => {
      setTimeout(() => {
        setAnalysisProgress(progress);
        setAnalysisStep(stepIndices[i]);
      }, (i + 1) * 600);
    });

    setTimeout(() => {
      setStep('workspace');
    }, 5000);
  }, []);

  const completeAnalysis = useCallback(() => {
    setStep('workspace');
  }, []);

  const openWorkspace = useCallback(() => {
    setStep('workspace');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages(prev => [...prev, msg]);
  }, []);

  const switchRepo = useCallback((repo: Repository) => {
    setSelectedRepo(repo);
    setRepoSwitcherOpen(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        step, connected, selectedRepo, workspaceView, sidebarCollapsed,
        chatMessages, analysisProgress, analysisStep, commandPaletteOpen,
        repoSwitcherOpen, activeFile, activeTab, searchQuery,
        connectGitHub, selectRepo, startAnalysis, completeAnalysis,
        openWorkspace, setWorkspaceView, toggleSidebar, addChatMessage,
        setCommandPaletteOpen, setRepoSwitcherOpen, setActiveFile,
        setActiveTab, setSearchQuery, switchRepo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { repositories };
