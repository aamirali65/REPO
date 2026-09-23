/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface RepoNative {
  getStorageRoot(): Promise<{ path: string }>;
  getRepositoryPath(input: { owner: string; repo: string }): Promise<{ path: string }>;
}

interface Window {
  readonly repoNative: RepoNative;
}