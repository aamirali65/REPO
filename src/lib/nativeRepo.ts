import { isElectron } from './github';

function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export function canUseNativeRepo(): boolean {
  return isElectron() && !!window.repoNative?.downloadRepository;
}

export async function getLocalStatus(owner: string, repo: string): Promise<{ downloaded: boolean; metadata: RepoMetadata | null }> {
  return unwrap(await window.repoNative.getLocalStatus({ owner, repo }));
}

export async function downloadRepository(owner: string, repo: string, token: string, branch?: string): Promise<{ metadata: RepoMetadata }> {
  return unwrap(await window.repoNative.downloadRepository({ owner, repo, token, branch }));
}

export async function getRepositoryTree(owner: string, repo: string): Promise<{ root: RepoTreeNodeData; files: number; folders: number }> {
  return unwrap(await window.repoNative.getRepositoryTree({ owner, repo }));
}

export async function readRepositoryFile(owner: string, repo: string, filePath: string): Promise<{ path: string; content: string; size: number }> {
  return unwrap(await window.repoNative.readRepositoryFile({ owner, repo, path: filePath }));
}

export function onDownloadProgress(listener: (data: RepoProgressData) => void): () => void {
  if (!canUseNativeRepo()) return () => undefined;
  return window.repoNative.onDownloadProgress(listener);
}
