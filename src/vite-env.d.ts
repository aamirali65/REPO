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
}

interface Window {
  readonly repoNative: RepoNative;
}