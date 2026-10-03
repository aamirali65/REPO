import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

export interface OAuthCallbackData {
  code?: string;
  state?: string;
  error?: string;
}

export interface ExchangeTokenInput {
  clientId: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface RepoTreeNodeData {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: RepoTreeNodeData[];
}

export interface RepoMetadataData {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  files: number;
  folders: number;
  lines: number;
  sizeBytes: number;
  languages: string[];
  downloadedAt: string;
}

export interface RepoProgressData {
  stage: 'prepare' | 'verify' | 'download' | 'extract' | 'scan' | 'build' | 'done';
  message: string;
  percent: number;
  current?: number;
  total?: number;
}

export type DefinitionKind = 'class' | 'interface' | 'enum' | 'function' | 'method';

export interface SourceDefinitionData {
  name: string;
  kind: DefinitionKind;
  path: string;
  line: number;
}

export interface ImportEntryData {
  path: string;
  raw: string[];
  resolved: string[];
}

export interface RepoStructureData {
  projectName: string | null;
  files: { path: string; ext: string; size: number }[];
  definitions: SourceDefinitionData[];
  imports: ImportEntryData[];
  truncated: boolean;
}

export interface SearchMatchData {
  path: string;
  line: number;
  text: string;
  col: number;
}

export interface SearchResultData {
  matches: SearchMatchData[];
  filesScanned: number;
  truncated: boolean;
}

const repoNative = {
  getStorageRoot(): Promise<{ path: string }> {
    return ipcRenderer.invoke('repo:storage-root');
  },
  getRepositoryPath(input: { owner: string; repo: string }): Promise<{ path: string }> {
    return ipcRenderer.invoke('repo:path', input);
  },
  openOAuth(input: { authorizeUrl: string }): Promise<{ ok: boolean }> {
    return ipcRenderer.invoke('oauth:begin', input);
  },
  onOauthCallback(listener: (data: OAuthCallbackData) => void): () => void {
    const handler = (_event: IpcRendererEvent, data: OAuthCallbackData) => listener(data);
    ipcRenderer.on('oauth:callback', handler);
    return () => {
      ipcRenderer.removeListener('oauth:callback', handler);
    };
  },
  exchangeToken(input: ExchangeTokenInput): Promise<TokenResult> {
    return ipcRenderer.invoke('oauth:exchange', input);
  },
  getLocalStatus(input: { owner: string; repo: string }): Promise<IpcResult<{ downloaded: boolean; metadata: RepoMetadataData | null }>> {
    return ipcRenderer.invoke('repo:local-status', input);
  },
  downloadRepository(input: { owner: string; repo: string; token: string; branch?: string }): Promise<IpcResult<{ metadata: RepoMetadataData }>> {
    return ipcRenderer.invoke('repo:download', input);
  },
  getRepositoryTree(input: { owner: string; repo: string }): Promise<IpcResult<{ root: RepoTreeNodeData; files: number; folders: number }>> {
    return ipcRenderer.invoke('repo:tree', input);
  },
  readRepositoryFile(input: { owner: string; repo: string; path: string }): Promise<IpcResult<{ path: string; content: string; size: number }>> {
    return ipcRenderer.invoke('repo:file', input);
  },
  getRepoStructure(input: { owner: string; repo: string }): Promise<IpcResult<RepoStructureData>> {
    return ipcRenderer.invoke('repo:structure', input);
  },
  searchRepositoryFiles(input: { owner: string; repo: string; query: string; word?: boolean; caseSensitive?: boolean }): Promise<IpcResult<SearchResultData>> {
    return ipcRenderer.invoke('repo:search', input);
  },
  onDownloadProgress(listener: (data: RepoProgressData) => void): () => void {
    const handler = (_event: IpcRendererEvent, data: RepoProgressData) => listener(data);
    ipcRenderer.on('repo:download-progress', handler);
    return () => {
      ipcRenderer.removeListener('repo:download-progress', handler);
    };
  },
};

export type RepoNative = typeof repoNative;

contextBridge.exposeInMainWorld('repoNative', repoNative);
