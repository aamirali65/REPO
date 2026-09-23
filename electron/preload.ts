import { contextBridge, ipcRenderer } from 'electron';

const repoNative = {
  getStorageRoot(): Promise<{ path: string }> {
    return ipcRenderer.invoke('repo:storage-root');
  },
  getRepositoryPath(input: { owner: string; repo: string }): Promise<{ path: string }> {
    return ipcRenderer.invoke('repo:path', input);
  },
};

export type RepoNative = typeof repoNative;

contextBridge.exposeInMainWorld('repoNative', repoNative);
