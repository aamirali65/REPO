/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RepoOAuthCallback {
  code?: string;
  state?: string;
  error?: string;
}

interface RepoTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number | null;
}

type RepoIpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

interface RepoTreeNodeData {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: RepoTreeNodeData[];
}

interface RepoMetadata {
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

interface RepoProgressData {
  stage: 'prepare' | 'verify' | 'download' | 'extract' | 'scan' | 'build' | 'done';
  message: string;
  percent: number;
  current?: number;
  total?: number;
}

type DefinitionKind = 'class' | 'interface' | 'enum' | 'function' | 'method';

interface SourceDefinition {
  name: string;
  kind: DefinitionKind;
  path: string;
  line: number;
}

interface ImportEntry {
  path: string;
  raw: string[];
  resolved: string[];
}

interface RepoStructure {
  projectName: string | null;
  files: { path: string; ext: string; size: number }[];
  definitions: SourceDefinition[];
  imports: ImportEntry[];
  truncated: boolean;
}

interface SearchMatch {
  path: string;
  line: number;
  text: string;
  col: number;
}

interface SearchResult {
  matches: SearchMatch[];
  filesScanned: number;
  truncated: boolean;
}

interface RepoNative {
  getStorageRoot(): Promise<{ path: string }>;
  getRepositoryPath(input: { owner: string; repo: string }): Promise<{ path: string }>;
  openOAuth(input: { authorizeUrl: string }): Promise<{ ok: boolean }>;
  onOauthCallback(listener: (data: RepoOAuthCallback) => void): () => void;
  exchangeToken(input: {
    clientId: string;
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<RepoTokenResult>;
  getLocalStatus(input: { owner: string; repo: string }): Promise<RepoIpcResult<{ downloaded: boolean; metadata: RepoMetadata | null }>>;
  downloadRepository(input: { owner: string; repo: string; token: string; branch?: string }): Promise<RepoIpcResult<{ metadata: RepoMetadata }>>;
  getRepositoryTree(input: { owner: string; repo: string }): Promise<RepoIpcResult<{ root: RepoTreeNodeData; files: number; folders: number }>>;
  readRepositoryFile(input: { owner: string; repo: string; path: string }): Promise<RepoIpcResult<{ path: string; content: string; size: number }>>;
  getRepoStructure(input: { owner: string; repo: string }): Promise<RepoIpcResult<RepoStructure>>;
  searchRepositoryFiles(input: { owner: string; repo: string; query: string; word?: boolean; caseSensitive?: boolean }): Promise<RepoIpcResult<SearchResult>>;
  onDownloadProgress(listener: (data: RepoProgressData) => void): () => void;
}

interface Window {
  readonly repoNative: RepoNative;
}