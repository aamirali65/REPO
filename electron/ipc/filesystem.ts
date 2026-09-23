const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

export function requireRepoSegment(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
    throw new Error(`Invalid repository ${field}`);
  }
  if (value === '.' || value === '..' || value.includes('..') || !SEGMENT_RE.test(value)) {
    throw new Error(`Invalid repository ${field}`);
  }
  return value;
}

export function registerFilesystemIpc(): void {
  // Read-only filesystem channels (repository download, scan, file read)
  // are registered here in a later phase. No filesystem access is exposed
  // to the renderer today.
}
