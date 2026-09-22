import {
  createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode,
} from 'react';
import { initialMessages, type Repository, type ChatMessage } from '../data/mockData';
import {
  buildAuthorizationUrl, checkOAuthState, clearOAuthState, exchangeCodeForToken,
  fetchAuthenticatedUser, fetchUserRepositories, getStoredVerifier, initials, mapRepo,
} from '../lib/github';
import { loadSession, saveSession, clearSession, type AppUser } from '../lib/session';

export type AppStep = 'welcome' | 'connecting' | 'repositories' | 'analyzing' | 'workspace';
export type WorkspaceView = 'chat' | 'explorer' | 'architecture' | 'impact' | 'search' | 'github' | 'settings';

const CALLBACK_PATH = '/auth/github/callback';
export { CALLBACK_PATH };

function isOAuthCallback(): boolean {
  return window.location.pathname.startsWith(CALLBACK_PATH);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something unexpected went wrong.';
}

interface AppState {
  step: AppStep;
  connected: boolean;
  authLoading: boolean;
  authError: string | null;
  reposLoading: boolean;
  reposError: string | null;
  user: AppUser | null;
  repositories: Repository[];
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
  handleOAuthCallback: () => void;
  disconnect: () => void;
  retryLoadRepos: () => void;
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
  const [persisted] = useState(() => loadSession());
  const [step, setStep] = useState<AppStep>(() => {
    if (isOAuthCallback()) return 'connecting';
    return persisted?.token ? 'repositories' : 'welcome';
  });
  const [authLoading, setAuthLoading] = useState(() => isOAuthCallback());
  const [authError, setAuthError] = useState<string | null>(null);
  const [reposLoading, setReposLoading] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(persisted?.token ?? null);
  const [connected, setConnected] = useState(!!persisted?.token);
  const [user, setUser] = useState<AppUser | null>(persisted?.user ?? null);
  const [repositories, setRepositories] = useState<Repository[]>(persisted?.repos ?? []);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(() =>
    persisted?.repos.find(r => r.id === persisted.selectedRepoId) ?? null
  );
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

  const oauthHandledRef = useRef(false);

  useEffect(() => {
    if (token && user) saveSession({ token, user, repos: repositories, selectedRepoId: selectedRepo?.id ?? null });
    else clearSession();
  }, [token, user, repositories, selectedRepo]);

  const startOAuth = useCallback(async () => {
    try {
      const url = await buildAuthorizationUrl();
      window.location.assign(url);
    } catch (err) {
      setAuthError(getErrorMessage(err));
      setStep('welcome');
    }
  }, []);

  const connectGitHub = useCallback(() => {
    if (connected && token) {
      setStep('repositories');
      return;
    }
    void startOAuth();
  }, [connected, token, startOAuth]);

  const handleOAuthCallback = useCallback(async () => {
    if (oauthHandledRef.current) return;
    oauthHandledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');

    const finish = () => {
      window.history.replaceState({}, document.title, '/');
      clearOAuthState();
    };

    if (oauthError) {
      setAuthError(`GitHub authorization was cancelled or failed: ${oauthError}`);
      setAuthLoading(false);
      setStep('welcome');
      finish();
      return;
    }

    if (!code || !checkOAuthState(state)) {
      setAuthError('Authorization failed: invalid or missing OAuth response.');
      setAuthLoading(false);
      setStep('welcome');
      finish();
      return;
    }

    const verifier = getStoredVerifier();
    if (!verifier) {
      setAuthError('Authorization session expired. Please try again.');
      setAuthLoading(false);
      setStep('welcome');
      finish();
      return;
    }

    setAuthLoading(true);
    setAuthError(null);
    setStep('connecting');

    try {
      const { accessToken } = await exchangeCodeForToken(code, verifier);
      const ghUser = await fetchAuthenticatedUser(accessToken);
      const apiRepos = await fetchUserRepositories(accessToken);

      const appUser: AppUser = {
        name: ghUser.name ?? ghUser.login,
        username: `@${ghUser.login}`,
        avatar: initials(ghUser.name ?? ghUser.login),
        login: ghUser.login,
        avatarUrl: ghUser.avatarUrl,
        htmlUrl: ghUser.htmlUrl,
      };
      const mappedRepos = apiRepos.map(mapRepo);

      setToken(accessToken);
      setUser(appUser);
      setRepositories(mappedRepos);
      setSelectedRepo(mappedRepos[0] ?? null);
      setConnected(true);
      setAuthError(null);
    } catch (err) {
      setAuthError(getErrorMessage(err));
      setStep('welcome');
    } finally {
      setAuthLoading(false);
      finish();
    }
  }, []);

  const disconnect = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
    setRepositories([]);
    setSelectedRepo(null);
    setConnected(false);
    setReposError(null);
    setRepoSwitcherOpen(false);
    setWorkspaceView('chat');
    setStep('welcome');
  }, []);

  const retryLoadRepos = useCallback(async () => {
    if (!token) return;
    setReposLoading(true);
    setReposError(null);
    try {
      const apiRepos = await fetchUserRepositories(token);
      const mapped = apiRepos.map(mapRepo);
      setRepositories(mapped);
      setSelectedRepo(prev => prev ? mapped.find(r => r.id === prev.id) ?? mapped[0] ?? null : mapped[0] ?? null);
    } catch (err) {
      setReposError(getErrorMessage(err));
    } finally {
      setReposLoading(false);
    }
  }, [token]);

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
        step, connected, authLoading, authError, reposLoading, reposError,
        user, repositories, selectedRepo, workspaceView, sidebarCollapsed,
        chatMessages, analysisProgress, analysisStep, commandPaletteOpen,
        repoSwitcherOpen, activeFile, activeTab, searchQuery,
        connectGitHub, handleOAuthCallback, disconnect, retryLoadRepos,
        selectRepo, startAnalysis, completeAnalysis, openWorkspace,
        setWorkspaceView, toggleSidebar, addChatMessage, setCommandPaletteOpen,
        setRepoSwitcherOpen, setActiveFile, setActiveTab, setSearchQuery, switchRepo,
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