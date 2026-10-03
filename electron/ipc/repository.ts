import { ipcMain } from 'electron';
import path from 'node:path';
import { repositoriesRoot, requireRepoSegment } from './filesystem';

export function registerRepositoryIpc(): void {
  ipcMain.handle('repo:storage-root', () => ({ path: repositoriesRoot() }));

  ipcMain.handle('repo:path', (_event, input: unknown) => {
    const raw = (input ?? {}) as { owner?: unknown; repo?: unknown };
    const owner = requireRepoSegment(raw.owner, 'owner');
    const repo = requireRepoSegment(raw.repo, 'repo');
    return { path: path.join(repositoriesRoot(), 'github.com', owner, repo) };
  });
}
