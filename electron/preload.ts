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
};

export type RepoNative = typeof repoNative;

contextBridge.exposeInMainWorld('repoNative', repoNative);
