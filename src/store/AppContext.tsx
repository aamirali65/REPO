import {
  createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode,
} from 'react';
import { initialMessages, type Repository, type ChatMessage } from '../data/mockData';
import {
  buildAuthorizationUrl, checkOAuthState, clearOAuthState, exchangeCodeForToken,
  fetchAuthenticatedUser, fetchUserRepositories, getStoredVerifier, initials, isElectron, mapRepo,
} from '../lib/github';
import {
  canUseNativeRepo, downloadRepository, getLocalStatus, onDownloadProgress,
} from '../lib/nativeRepo';
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
  analysisError: string | null;
  analysisMessage: string | null;
  repoMetadata: RepoMetadata | null;
  commandPaletteOpen: boolean;
  repoSwitcherOpen: boolean;
  activeFile: string;
  activeTab: string;
  openFiles: string[];
  searchQuery: string;
}

interface AppContextValue extends AppState {
  connectGitHub: () => void;
  handleOAuthCallback: () => void;
  disconnect: () => void;
  retryLoadRepos: () => void;
  selectRepo: (repo: Repository) => void;
  startAnalysis: (repo?: Repository) => void;
  completeAnalysis: () => void;
  cancelAnalysis: () => void;
  openWorkspace: () => void;
  setWorkspaceView: (view: WorkspaceView) => void;
  toggleSidebar: () => void;
  addChatMessage: (msg: ChatMessage) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setRepoSwitcherOpen: (open: boolean) => void;
  setActiveFile: (file: string) => void;
  setActiveTab: (tab: string) => void;
  closeTab: (file: string) => void;
  resetExplorerFiles: (file?: string) => void;
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null);
  const [repoMetadata, setRepoMetadata] = useState<RepoMetadata | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [repoSwitcherOpen, setRepoSwitcherOpen] = useState(false);
  const [activeFile, setActiveFileState] = useState(() => (isElectron() ? '' : 'auth_service.dart'));
  const [activeTab, setActiveTabState] = useState(() => (isElectron() ? '' : 'auth_service.dart'));
  const [openFiles, setOpenFiles] = useState<string[]>(() => (isElectron() ? [] : ['auth_service.dart', 'api_service.dart']));
  const [searchQuery, setSearchQuery] = useState('');

  const oauthHandledRef = useRef(false);
  const analysisRunRef = useRef(0);

  useEffect(() => {
    if (token && user) saveSession({ token, user, repos: repositories, selectedRepoId: selectedRepo?.id ?? null });
    else clearSession();
  }, [token, user, repositories, selectedRepo]);

  const startOAuth = useCallback(async () => {
    oauthHandledRef.current = false;
    try {
      const url = await buildAuthorizationUrl();
      if (isElectron()) {
        setStep('connecting');
        setAuthLoading(true);
        setAuthError(null);
        await window.repoNative.openOAuth({ authorizeUrl: url });
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      clearOAuthState();
      setAuthError(getErrorMessage(err));
      setAuthLoading(false);
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

  const finishOAuth = useCallback(async (code: string) => {
    const verifier = getStoredVerifier();
    if (!verifier) {
      setAuthError('Authorization session expired. Please try again.');
      setAuthLoading(false);
      setStep('welcome');
      clearOAuthState();
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
      clearOAuthState();
    }
  }, []);

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

    try {
      await finishOAuth(code);
    } finally {
      window.history.replaceState({}, document.title, '/');
    }
  }, [finishOAuth]);

  useEffect(() => {
    if (!isElectron()) return;

    return window.repoNative.onOauthCallback((data) => {
      if (oauthHandledRef.current) return;

      const error = data?.error;
      const code = data?.code;
      const state = data?.state ?? null;

      if (error) {
        oauthHandledRef.current = true;
        setAuthError(`GitHub authorization was cancelled or failed: ${error}`);
        setAuthLoading(false);
        setStep('welcome');
        clearOAuthState();
        return;
      }

      if (!code || !checkOAuthState(state)) {
        setAuthError('Authorization failed: invalid or missing OAuth response.');
        setAuthLoading(false);
        setStep('welcome');
        return;
      }

      oauthHandledRef.current = true;
      void finishOAuth(code);
    });
  }, [finishOAuth]);

  const disconnect = useCallback(() => {
    analysisRunRef.current++;
    oauthHandledRef.current = false;
    clearSession();
    setToken(null);
    setUser(null);
    setRepositories([]);
    setSelectedRepo(null);
    setConnected(false);
    setReposError(null);
    setAuthError(null);
    setAuthLoading(false);
    setAnalysisError(null);
    setAnalysisMessage(null);
    setAnalysisProgress(0);
    setAnalysisStep(0);
    setRepoMetadata(null);
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

  const applyMetadata = useCallback((repo: Repository, metadata: RepoMetadata) => {
    setRepoMetadata(metadata);
    const updated: Repository = {
      ...repo,
      files: metadata.files,
      lines: metadata.lines,
      languages: metadata.languages.length,
    };
    setSelectedRepo(updated);
    setRepositories(prev => prev.map(r => (r.id === repo.id ? updated : r)));
  }, []);

  const resetExplorerFiles = useCallback((file?: string) => {
    setOpenFiles(file ? [file] : []);
    setActiveFileState(file ?? '');
    setActiveTabState(file ?? '');
  }, []);

  const runLegacyFakeAnalysis = useCallback(() => {
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
    setTimeout(() => setStep('workspace'), 5000);
  }, []);

  const startAnalysis = useCallback((repoArg?: Repository) => {
    const repo = repoArg && typeof repoArg === 'object' && 'fullName' in repoArg ? repoArg : selectedRepo;
    if (!repo) return;

    setStep('analyzing');
    setAnalysisProgress(0);
    setAnalysisStep(0);
    setAnalysisError(null);
    setAnalysisMessage(null);

    if (!canUseNativeRepo() || !token) {
      runLegacyFakeAnalysis();
      return;
    }

    const [owner, name] = repo.fullName.split('/');
    if (!owner || !name) {
      setAnalysisError('Invalid repository.');
      return;
    }

    const runId = ++analysisRunRef.current;
    const isStale = () => analysisRunRef.current !== runId;

    const finish = (metadata: RepoMetadata, message: string) => {
      applyMetadata(repo, metadata);
      resetExplorerFiles();
      setAnalysisProgress(100);
      setAnalysisStep(6);
      setAnalysisMessage(message);
      setAnalysisError(null);
    };

    const failAnalysis = (message: string) => {
      setAnalysisError(message);
      setAnalysisMessage(null);
    };

    const unsubscribe = onDownloadProgress((p) => {
      if (isStale()) return;
      const stageStep: Record<string, number> = {
        prepare: 0, verify: 1, download: 2, extract: 3, scan: 4, build: 5, done: 6,
      };
      setAnalysisProgress(p.percent);
      setAnalysisStep(stageStep[p.stage] ?? 0);
      setAnalysisMessage(p.message);
    });

    void (async () => {
      try {
        const status = await getLocalStatus(owner, name);
        if (isStale()) return;
        if (status.downloaded && status.metadata) {
          finish(status.metadata, 'Repository already available locally');
          return;
        }
        const { metadata } = await downloadRepository(owner, name, token);
        if (isStale()) return;
        finish(metadata, 'Repository ready');
      } catch (err) {
        if (!isStale()) failAnalysis(getErrorMessage(err));
      } finally {
        unsubscribe();
      }
    })();
  }, [selectedRepo, token, applyMetadata, resetExplorerFiles, runLegacyFakeAnalysis]);

  const completeAnalysis = useCallback(() => {
    setStep('workspace');
  }, []);

  const cancelAnalysis = useCallback(() => {
    analysisRunRef.current++;
    setStep('repositories');
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

  const setActiveFile = useCallback((file: string) => {
    setActiveFileState(file);
    setActiveTabState(file);
    setOpenFiles(prev => (prev.includes(file) ? prev : [...prev, file]));
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveFileState(tab);
    setActiveTabState(tab);
  }, []);

  const closeTab = useCallback((file: string) => {
    const next = openFiles.filter(f => f !== file);
    setOpenFiles(next);
    if (activeFile === file) {
      const newActive = next[next.length - 1] ?? '';
      setActiveFileState(newActive);
      setActiveTabState(newActive);
    }
  }, [openFiles, activeFile]);

  const switchRepo = useCallback((repo: Repository) => {
    analysisRunRef.current++;
    setSelectedRepo(repo);
    setRepoSwitcherOpen(false);
    setRepoMetadata(null);
    setAnalysisProgress(0);
    setAnalysisStep(0);
    setAnalysisError(null);
    setAnalysisMessage(null);
    resetExplorerFiles();
  }, [resetExplorerFiles]);

  return (
    <AppContext.Provider
      value={{
        step, connected, authLoading, authError, reposLoading, reposError,
        user, repositories, selectedRepo, workspaceView, sidebarCollapsed,
        chatMessages, analysisProgress, analysisStep, analysisError, analysisMessage,
        repoMetadata, commandPaletteOpen, repoSwitcherOpen, activeFile, activeTab,
        openFiles, searchQuery,
        connectGitHub, handleOAuthCallback, disconnect, retryLoadRepos,
        selectRepo, startAnalysis, completeAnalysis, cancelAnalysis, openWorkspace,
        setWorkspaceView, toggleSidebar, addChatMessage, setCommandPaletteOpen,
        setRepoSwitcherOpen, setActiveFile, setActiveTab, closeTab, resetExplorerFiles,
        setSearchQuery, switchRepo,
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