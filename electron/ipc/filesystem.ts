import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';

const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{10,512}$/;
const BRANCH_RE = /^[A-Za-z0-9._/-]{1,255}$/;
const GITHUB_API = 'https://api.github.com';

// Central ignore list for scanning/indexing. Directories are excluded from
// REPO's file tree only — they are never deleted from the local copy.
export const IGNORE_DIRS = new Set([
  '.git', '.hg', '.svn',
  'node_modules', 'dist', 'build', 'out',
  '.dart_tool', '.idea', '.vscode', 'coverage',
  '.next', 'target', 'vendor',
  '.cache', '.turbo', '.parcel-cache', '.yarn', '.pnpm-store',
  '.gradle', '__pycache__', '.venv', 'venv', '.tox',
  'Pods', 'DerivedData', '.svelte-kit', '.nuxt', '.output',
  '.terraform', '.terraform.d',
]);

export const IGNORE_FILES = new Set(['.DS_Store', 'Thumbs.db']);

export const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'tiff', 'tif',
  'mp4', 'mov', 'avi', 'mkv', 'webm',
  'mp3', 'wav', 'ogg', 'flac', 'm4a',
  'zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'class', 'jar', 'war',
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  'psd', 'ai', 'sketch', 'fig',
  'db', 'sqlite', 'sqlite3', 'pyc', 'o', 'obj', 'a', 'lib', 'wasm',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

export const MAX_SOURCE_BYTES = 512 * 1024;
export const MAX_ARCHIVE_BYTES = 100 * 1024 * 1024;

const EXT_LANGUAGE: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  mjs: 'JavaScript', cjs: 'JavaScript', dart: 'Dart', py: 'Python', go: 'Go',
  rs: 'Rust', java: 'Java', kt: 'Kotlin', kts: 'Kotlin', swift: 'Swift',
  c: 'C', h: 'C', cpp: 'C++', cc: 'C++', cxx: 'C++', hpp: 'C++', cs: 'C#',
  rb: 'Ruby', php: 'PHP', html: 'HTML', css: 'CSS', scss: 'SCSS', less: 'Less',
  vue: 'Vue', svelte: 'Svelte', json: 'JSON', md: 'Markdown', yaml: 'YAML',
  yml: 'YAML', toml: 'TOML', xml: 'XML', sh: 'Shell', bash: 'Shell',
  ps1: 'PowerShell', sql: 'SQL', lua: 'Lua', r: 'R', ex: 'Elixir',
  exs: 'Elixir', fs: 'F#', hs: 'Haskell', zig: 'Zig', scala: 'Scala',
};

export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Repo intelligence (deterministic static extraction — no AI/LLM involved)
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = new Set([
  'dart', 'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs',
  'java', 'kt', 'kts', 'swift', 'c', 'h', 'cpp', 'cc', 'cxx', 'hpp',
  'cs', 'rb', 'php', 'vue', 'svelte', 'scala', 'zig', 'lua', 'ex', 'exs',
]);

const RESOLVE_EXTS = [
  '.dart', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.go',
  '.rs', '.java', '.kt', '.swift', '.vue', '.svelte', '.css', '.scss',
  '.html', '.json', '.md',
];
const INDEX_SUFFIXES = ['/index.ts', '/index.tsx', '/index.js', '/index.jsx', '/index.dart', '/__init__.py'];

export type DefinitionKind = 'class' | 'interface' | 'enum' | 'function' | 'method';

export interface SourceDefinition {
  name: string;
  kind: DefinitionKind;
  path: string;
  line: number;
}

export interface ImportEntry {
  path: string;
  raw: string[];
  resolved: string[];
}

export interface RepoStructureData {
  projectName: string | null;
  files: { path: string; ext: string; size: number }[];
  definitions: SourceDefinition[];
  imports: ImportEntry[];
  truncated: boolean;
}

export interface SearchMatch {
  path: string;
  line: number;
  text: string;
  col: number;
}

export interface SearchResultData {
  matches: SearchMatch[];
  filesScanned: number;
  truncated: boolean;
}

const MAX_STRUCTURE_SOURCE_FILES = 3000;
const MAX_DEFINITIONS = 12000;
const MAX_IMPORTS_PER_FILE = 60;
const SEARCH_MATCH_LIMIT = 300;

function posixDirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i <= 0 ? '' : p.slice(0, i);
}

function posixResolve(from: string, spec: string): string {
  const parts = (from ? from.split('/') : []).filter(Boolean);
  for (const seg of spec.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') parts.pop();
    else parts.push(seg);
  }
  return parts.join('/');
}

function looksCommentLine(line: string): boolean {
  return /^\s*(\/\/|#|\*|\/\*|--)/.test(line);
}

function extractDefinitions(path: string, text: string, out: SourceDefinition[]): void {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length && out.length < MAX_DEFINITIONS; i++) {
    const line = lines[i];
    if (looksCommentLine(line)) continue;

    const push = (re: RegExp, kind: DefinitionKind) => {
      const m = re.exec(line);
      if (m && out.length < MAX_DEFINITIONS) {
        out.push({ name: m[1], kind, path, line: i + 1 });
        return true;
      }
      return false;
    };

    if (push(/\bclass\s+([A-Za-z_]\w*)/, 'class')) continue;
    if (push(/\binterface\s+([A-Za-z_]\w*)/, 'interface')) continue;
    if (push(/\benum\s+([A-Za-z_]\w*)/, 'enum')) continue;
    if (push(/\bfunction\s+([A-Za-z_]\w*)/, 'function')) continue;
    if (push(/\b(?:def|fn)\s+([A-Za-z_]\w*)/, 'function')) continue;
    if (push(/\bconst\s+([A-Z]\w*)\s*=\s*(?:\([^)]*\)|[A-Za-z_]\w*)\s*=>/, 'function')) continue;
    if (
      push(
        /^\s{2,}(?:static\s+)?(?:Future<[^>]+>|Stream<[^>]+>|void|int|double|String|bool|num|dynamic|Map<[^>]+>|List<[^>]+>|Set<[^>]+>|Iterable<[^>]+>|[A-Z]\w*(?:<[^>]+>)?)\s+([a-z_]\w*)\s*\(/,
        'method'
      )
    ) continue;
    push(      /^\s+(?:public|private|protected|static|async|override|\s)*[A-Za-z_][\w<>,[\]?]*\s+([a-z_]\w*)\s*\([^;]*\)\s*\{/, 'method');
  }
}

function extractImports(ext: string, text: string, path: string, out: string[]): void {
  const lines = text.split('\n');
  let inGoImportBlock = false;

  const add = (spec: string | undefined | null) => {
    if (!spec || out.length >= MAX_IMPORTS_PER_FILE) return;
    const s = spec.trim();
    if (!s || s.includes('://')) return;
    out.push(s);
  };

  for (const rawLine of lines) {
    if (out.length >= MAX_IMPORTS_PER_FILE) break;
    const line = rawLine;
    if (looksCommentLine(line)) continue;

    if (ext === 'go') {
      const trimmed = line.trim();
      if (/^import\s*\($/.test(trimmed)) { inGoImportBlock = true; continue; }
      if (inGoImportBlock) {
        if (trimmed === ')') { inGoImportBlock = false; continue; }
        const m = /"([^"]+)"/.exec(line);
        if (m) add(m[1]);
        continue;
      }
      const single = /^\s*import\s+(?:[A-Za-z_]\w*\s+)?"([^"]+)"/.exec(line);
      if (single) { add(single[1]); continue; }
    }

    if (ext === 'dart') {
      const m = /\b(?:import|export|part)\s+['"]([^'"]+)['"]/.exec(line);
      if (m) add(m[1]);
      continue;
    }

    if (ext === 'py') {
      let m = /^\s*from\s+([\w.]+)\s+import\s/.exec(line);
      if (m) { add(m[1]); continue; }
      m = /^\s*import\s+([\w.,\s]+)/.exec(line);
      if (m) { add(m[1].split(',')[0].trim()); continue; }
    }

    if (ext === 'java' || ext === 'kt' || ext === 'kts') {
      const m = /^\s*import\s+([\w.]+(?:\.\*)?)/.exec(line);
      if (m) { add(m[1]); continue; }
    }

    if (ext === 'rs') {
      const m = /^\s*(?:pub\s+)?use\s+([\w:]+(?:\s*::\s*\{[^}]*\}|\s*::\s*\*)?)/.exec(line);
      if (m) { add(m[1].split('::').slice(0, 2).join('::')); continue; }
    }

    // JS/TS + generic single/double quoted specs
    const m = /\bfrom\s+['"]([^'"]+)['"]|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\bimport\s+['"]([^'"]+)['"]/.exec(line);
    if (m) add(m[1] ?? m[2] ?? m[3] ?? m[4]);
    void path;
  }
}

function normalizeSpecPath(spec: string): string {
  let s = spec.split('?')[0].split('#')[0];
  if (s.startsWith('./')) s = s.slice(2);
  return s;
}

function tryResolveTarget(target: string, fileSet: Set<string>): string | null {
  const t = target.replace(/\/+$/, '');
  if (!t || t.includes('..')) return null;
  if (fileSet.has(t)) return t;
  for (const ext of RESOLVE_EXTS) {
    if (fileSet.has(t + ext)) return t + ext;
  }
  for (const suffix of INDEX_SUFFIXES) {
    if (fileSet.has(t + suffix)) return t + suffix;
  }
  return null;
}

function resolveImport(fromPath: string, spec: string, projectName: string | null, fileSet: Set<string>): string | null {
  if (!spec || spec.includes('://')) return null;

  // Dart package:my_pkg/lib/path.dart → lib/path.dart
  const pkg = /^package:([^/]+)\/(.*)$/.exec(spec);
  if (pkg) {
    if (projectName && pkg[1] === projectName) {
      return tryResolveTarget(`lib/${pkg[2]}`, fileSet);
    }
    return null;
  }

  if (spec.startsWith('.')) {
    return tryResolveTarget(posixResolve(posixDirname(fromPath), normalizeSpecPath(spec)), fileSet);
  }

  const ext = fromPath.includes('.') ? fromPath.slice(fromPath.lastIndexOf('.') + 1) : '';

  if (ext === 'dart') {
    // bare dart URI resolves relative to the importing file's directory
    return tryResolveTarget(posixResolve(posixDirname(fromPath), normalizeSpecPath(spec)), fileSet);
  }

  if (ext === 'py') {
    const target = normalizeSpecPath(spec).replace(/\./g, '/');
    const fromRoot = tryResolveTarget(target, fileSet);
    if (fromRoot) return fromRoot;
    return tryResolveTarget(posixResolve(posixDirname(fromPath), target), fileSet);
  }

  if (ext === 'java') {
    return tryResolveTarget(spec.replace(/\./g, '/'), fileSet);
  }

  // Node-style bare specifier or non-relative language path → external
  return null;
}

async function readProjectName(dir: string): Promise<string | null> {
  try {
    const pubspec = await fsp.readFile(path.join(dir, 'pubspec.yaml'), 'utf8');
    const m = /^name:\s*(\S+)/m.exec(pubspec);
    if (m) return m[1];
  } catch { /* no pubspec */ }
  try {
    const pkgRaw = await fsp.readFile(path.join(dir, 'package.json'), 'utf8');
    const pkg = JSON.parse(pkgRaw) as { name?: string };
    if (pkg.name) return pkg.name;
  } catch { /* no package.json */ }
  return null;
}

async function buildStructure(owner: string, repo: string): Promise<RepoStructureData> {
  const dir = repoDir(owner, repo);
  const st = await fsp.stat(dir).catch(() => null);
  if (!st || !st.isDirectory()) throw new Error('Repository not downloaded.');

  const allFiles: FileEntry[] = [];
  const root: TreeNode = { name: repo, path: '', type: 'directory', children: [] };
  await walk(dir, '', root, { files: 0, folders: 0 }, allFiles);

  const fileSet = new Set(allFiles.map((f) => f.rel));
  const sourceFiles = allFiles
    .filter((f) => SOURCE_EXTENSIONS.has(path.extname(f.rel).toLowerCase().slice(1)))
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const truncated = sourceFiles.length > MAX_STRUCTURE_SOURCE_FILES;
  const usedSources = truncated ? sourceFiles.slice(0, MAX_STRUCTURE_SOURCE_FILES) : sourceFiles;

  const projectName = await readProjectName(dir);
  const definitions: SourceDefinition[] = [];
  const imports: ImportEntry[] = [];
  const files: RepoStructureData['files'] = [];

  for (const file of usedSources) {
    const ext = path.extname(file.rel).toLowerCase().slice(1);
    files.push({ path: file.rel, ext, size: file.size });
    if (file.size > MAX_SOURCE_BYTES) continue;

    let text: string;
    try {
      const buf = await fsp.readFile(file.abs);
      if (buf.subarray(0, Math.min(buf.length, 8192)).includes(0)) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }

    extractDefinitions(file.rel, text, definitions);

    const rawImports: string[] = [];
    extractImports(ext, text, file.rel, rawImports);
    if (rawImports.length > 0) {
      const resolvedSet = new Set<string>();
      for (const spec of rawImports) {
        const resolved = resolveImport(file.rel, spec, projectName, fileSet);
        if (resolved) resolvedSet.add(resolved);
      }
      imports.push({ path: file.rel, raw: rawImports, resolved: [...resolvedSet] });
    }
  }

  return { projectName, files, definitions, imports, truncated };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function searchRepository(owner: string, repo: string, query: string, word: boolean, caseSensitive: boolean): Promise<SearchResultData> {
  const dir = repoDir(owner, repo);
  const st = await fsp.stat(dir).catch(() => null);
  if (!st || !st.isDirectory()) throw new Error('Repository not downloaded.');

  const allFiles: FileEntry[] = [];
  const root: TreeNode = { name: repo, path: '', type: 'directory', children: [] };
  await walk(dir, '', root, { files: 0, folders: 0 }, allFiles);

  const pattern = word ? new RegExp(`\\b${escapeRegExp(query)}\\b`, caseSensitive ? 'g' : 'gi') : null;
  const needle = caseSensitive ? query : query.toLowerCase();

  const matches: SearchMatch[] = [];
  let filesScanned = 0;
  let truncated = false;

  for (const file of allFiles) {
    if (matches.length >= SEARCH_MATCH_LIMIT) { truncated = true; break; }
    if (file.size === 0 || file.size > MAX_SOURCE_BYTES) continue;
    if (isBinaryRel(file.rel)) continue;

    let text: string;
    try {
      const buf = await fsp.readFile(file.abs);
      if (buf.subarray(0, Math.min(buf.length, 8192)).includes(0)) continue;
      text = buf.toString('utf8');
    } catch {
      continue;
    }
    filesScanned++;

    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= SEARCH_MATCH_LIMIT) { truncated = true; break; }
      const lineText = lines[i];
      let col = -1;
      if (pattern) {
        pattern.lastIndex = 0;
        const m = pattern.exec(lineText);
        if (m) col = m.index;
      } else {
        col = lineText.toLowerCase().indexOf(needle);
      }
      if (col >= 0) {
        matches.push({
          path: file.rel,
          line: i + 1,
          text: lineText.length > 240 ? `${lineText.slice(0, 240)}…` : lineText,
          col,
        });
      }
    }
  }

  return { matches, filesScanned, truncated };
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
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

interface ProgressEvent {
  stage: 'prepare' | 'verify' | 'download' | 'extract' | 'scan' | 'build' | 'done';
  message: string;
  percent: number;
  current?: number;
  total?: number;
}

interface FileEntry {
  abs: string;
  rel: string;
  size: number;
}

export function requireRepoSegment(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 100) {
    throw new Error(`Invalid repository ${field}`);
  }
  if (value === '.' || value === '..' || value.includes('..') || !SEGMENT_RE.test(value)) {
    throw new Error(`Invalid repository ${field}`);
  }
  return value;
}

function parseOwnerRepo(input: unknown): { owner: string; repo: string } {
  const raw = (input ?? {}) as { owner?: unknown; repo?: unknown };
  return {
    owner: requireRepoSegment(raw.owner, 'owner'),
    repo: requireRepoSegment(raw.repo, 'repo'),
  };
}

function requireToken(value: unknown): string {
  if (typeof value !== 'string' || !TOKEN_RE.test(value)) {
    throw new Error('Invalid GitHub token');
  }
  return value;
}

function requireBranch(value: unknown): string {
  if (typeof value !== 'string' || value.length > 255 || !BRANCH_RE.test(value) || value.includes('..')) {
    throw new Error('Invalid branch name');
  }
  return value;
}

function requireRepoRelativePath(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 1024) {
    throw new Error('Invalid file path');
  }
  const rel = value.replace(/\\/g, '/');
  if (rel.startsWith('/') || /^[A-Za-z]:/.test(rel)) {
    throw new Error('Invalid file path');
  }
  const parts = rel.split('/');
  for (const part of parts) {
    if (!part || part === '.' || part === '..') {
      throw new Error('Invalid file path');
    }
  }
  return parts.join('/');
}

export function repositoriesRoot(): string {
  return path.join(app.getPath('appData'), 'REPO', 'repositories');
}

function repoDir(owner: string, repo: string): string {
  return path.join(repositoriesRoot(), 'github.com', owner, repo);
}

function metaFileFor(owner: string, repo: string): string {
  return path.join(app.getPath('appData'), 'REPO', 'meta', 'github.com', owner, `${repo}.json`);
}

function emitProgress(p: ProgressEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send('repo:download-progress', p);
  }
}

function fail(error: unknown): IpcResult<never> {
  const message = error instanceof Error ? error.message : 'Something unexpected went wrong.';
  return { ok: false, error: message };
}

function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

function isBinaryRel(rel: string): boolean {
  const ext = path.extname(rel).toLowerCase().slice(1);
  return BINARY_EXTENSIONS.has(ext);
}

function countLines(text: string): number {
  if (!text) return 0;
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  if (!text.endsWith('\n')) count++;
  return count;
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function githubFetch(url: string, token: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'REPO-Desktop',
      },
    });
  } catch {
    throw new Error('Could not reach GitHub. Check your internet connection.');
  }
  if (res.status === 401) throw new Error('GitHub session expired. Disconnect and reconnect GitHub.');
  if (res.status === 403) throw new Error('GitHub API rate limit exceeded. Try again later.');
  if (res.status === 404) throw new Error('Repository not found or you do not have access to it.');
  if (!res.ok) throw new Error(`GitHub request failed (HTTP ${res.status}).`);
  return res;
}

async function downloadZip(url: string, token: string, tempFile: string): Promise<number> {
  const res = await githubFetch(url, token);
  const total = Number(res.headers.get('content-length')) || 0;
  if (total > MAX_ARCHIVE_BYTES) {
    throw new Error('Repository archive is too large to download (max 100 MB).');
  }
  if (!res.body) throw new Error('Download failed: empty response from GitHub.');

  const reader = res.body.getReader();
  const out = fs.createWriteStream(tempFile);
  let closed = false;
  const closedPromise = new Promise<void>((resolve) => out.on('close', () => { closed = true; resolve(); }));

  let received = 0;
  let lastEmit = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_ARCHIVE_BYTES) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Repository archive is too large to download (max 100 MB).');
      }
      if (!out.write(Buffer.from(value))) {
        await new Promise<void>((resolve) => out.once('drain', () => resolve()));
      }
      const now = Date.now();
      if (now - lastEmit > 250) {
        lastEmit = now;
        const percent = total ? 5 + Math.round((received / total) * 50) : 20;
        const message = total
          ? `Downloading repository (${formatMB(received)} / ${formatMB(total)})`
          : `Downloading repository (${formatMB(received)})`;
        emitProgress({ stage: 'download', message, percent, current: received, total });
      }
    }
    if (received === 0) throw new Error('Download failed: empty archive.');
  } finally {
    out.end();
    if (!closed) await closedPromise.catch(() => undefined);
  }
  return received;
}

function isSafeZipRel(rel: string): boolean {
  if (rel.startsWith('/') || rel.startsWith('\\') || /^[A-Za-z]:/.test(rel)) return false;
  for (const part of rel.split('/')) {
    if (!part || part === '.' || part === '..' || part.includes('\\')) return false;
  }
  return true;
}

async function extractZip(zipFile: string, destDir: string): Promise<number> {
  const zip = new AdmZip(zipFile);
  const entries = zip.getEntries().filter((e) => !e.isDirectory);
  if (entries.length === 0) throw new Error('Downloaded archive is empty or corrupted.');

  const firstSeg = entries[0].entryName.split('/')[0];
  const wrapped = entries.every((e) => e.entryName === firstSeg || e.entryName.startsWith(`${firstSeg}/`));

  let count = 0;
  let lastEmit = 0;
  for (const entry of entries) {
    let rel = entry.entryName;
    if (wrapped) {
      if (rel === firstSeg) continue;
      rel = rel.slice(firstSeg.length + 1);
    }
    if (!rel || rel.endsWith('/')) continue;
    if (!isSafeZipRel(rel)) throw new Error('Downloaded archive contains unsafe file paths.');

    const target = path.resolve(destDir, rel);
    if (!target.startsWith(path.resolve(destDir) + path.sep)) {
      throw new Error('Downloaded archive contains unsafe file paths.');
    }
    await fsp.mkdir(path.dirname(target), { recursive: true });
    await fsp.writeFile(target, entry.getData());
    count++;

    const now = Date.now();
    if (now - lastEmit > 200 || count === entries.length) {
      lastEmit = now;
      emitProgress({
        stage: 'extract',
        message: `Extracting files (${count} / ${entries.length})`,
        percent: 55 + Math.round((count / entries.length) * 20),
        current: count,
        total: entries.length,
      });
    }
  }
  if (count === 0) throw new Error('Downloaded archive is empty or corrupted.');
  return count;
}

async function walk(
  dir: string,
  rel: string,
  node: TreeNode,
  counters: { files: number; folders: number },
  fileList?: FileEntry[],
  onProgress?: (count: number) => void
): Promise<void> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && !e.isSymbolicLink() && !IGNORE_DIRS.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  const files = entries
    .filter((e) => e.isFile() && !e.isSymbolicLink() && !IGNORE_FILES.has(e.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  node.children = node.children ?? [];

  for (const entry of dirs) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const child: TreeNode = { name: entry.name, path: childRel, type: 'directory', children: [] };
    node.children.push(child);
    counters.folders++;
    if (onProgress) onProgress(counters.files + counters.folders);
    await walk(path.join(dir, entry.name), childRel, child, counters, fileList, onProgress);
  }

  for (const entry of files) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    node.children.push({ name: entry.name, path: childRel, type: 'file' });
    counters.files++;
    if (fileList) {
      const st = await fsp.stat(abs).catch(() => null);
      if (st) fileList.push({ abs, rel: childRel, size: st.size });
    }
    if (onProgress && counters.files % 100 === 0) onProgress(counters.files + counters.folders);
  }
}

function topLanguages(extCounts: Record<string, number>): string[] {
  const counts: Record<string, number> = {};
  for (const [ext, n] of Object.entries(extCounts)) {
    const lang = EXT_LANGUAGE[ext];
    if (lang) counts[lang] = (counts[lang] ?? 0) + n;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);
}

const activeDownloads = new Set<string>();

async function runDownload(owner: string, repo: string, token: string, branch?: string): Promise<RepoMetadata> {
  const key = `${owner}/${repo}`;
  if (activeDownloads.has(key)) throw new Error('Repository download is already in progress.');
  activeDownloads.add(key);

  const dir = repoDir(owner, repo);
  const partDir = `${dir}.part`;
  const zipTemp = path.join(os.tmpdir(), `repo-dl-${owner}-${repo}-${Date.now()}.zip`);

  try {
    emitProgress({ stage: 'prepare', message: 'Preparing repository...', percent: 0 });

    emitProgress({ stage: 'verify', message: 'Verifying GitHub repository...', percent: 1 });
    const repoRes = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`, token);
    const info = (await repoRes.json()) as { default_branch?: string; private?: boolean; size?: number };
    const defBranch = branch || info.default_branch;
    if (!defBranch) throw new Error('Repository has no default branch.');

    let languages: string[] = [];
    try {
      const langRes = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}/languages`, token);
      const langData = (await langRes.json()) as Record<string, number>;
      languages = Object.entries(langData)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name)
        .slice(0, 5);
    } catch {
      languages = [];
    }
    emitProgress({ stage: 'verify', message: 'GitHub repository verified', percent: 5 });

    emitProgress({ stage: 'download', message: 'Downloading repository...', percent: 5 });
    const zipUrl = `${GITHUB_API}/repos/${owner}/${repo}/zipball/${encodeURIComponent(defBranch)}`;
    await downloadZip(zipUrl, token, zipTemp);
    emitProgress({ stage: 'download', message: 'Repository downloaded', percent: 55 });

    emitProgress({ stage: 'extract', message: 'Extracting files...', percent: 56 });
    await fsp.rm(partDir, { recursive: true, force: true });
    await fsp.mkdir(partDir, { recursive: true });
    await extractZip(zipTemp, partDir);

    emitProgress({ stage: 'scan', message: 'Scanning files...', percent: 75 });
    const root: TreeNode = { name: repo, path: '', type: 'directory', children: [] };
    const counters = { files: 0, folders: 0 };
    const fileList: FileEntry[] = [];
    await walk(partDir, '', root, counters, fileList, (count) => {
      emitProgress({ stage: 'scan', message: `Scanning files (${count} entries)`, percent: 75, current: count });
    });

    let lines = 0;
    const extCounts: Record<string, number> = {};
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = path.extname(file.rel).toLowerCase().slice(1);
      if (ext) extCounts[ext] = (extCounts[ext] ?? 0) + 1;

      if (!isBinaryRel(file.rel) && file.size > 0 && file.size <= MAX_SOURCE_BYTES) {
        const buf = await fsp.readFile(file.abs);
        if (!buf.subarray(0, 8192).includes(0)) {
          lines += countLines(buf.toString('utf8'));
        }
      }
      if (i % 20 === 0 || i === fileList.length - 1) {
        emitProgress({
          stage: 'scan',
          message: `Scanning files (${i + 1} / ${fileList.length})`,
          percent: 75 + Math.round(((i + 1) / Math.max(1, fileList.length)) * 17),
          current: i + 1,
          total: fileList.length,
        });
      }
    }
    if (languages.length === 0) languages = topLanguages(extCounts);

    emitProgress({ stage: 'build', message: 'Building file tree', percent: 93 });
    const metadata: RepoMetadata = {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      defaultBranch: defBranch,
      private: !!info.private,
      files: counters.files,
      folders: counters.folders,
      lines,
      sizeBytes: typeof info.size === 'number' ? info.size * 1024 : 0,
      languages,
      downloadedAt: new Date().toISOString(),
    };

    await fsp.rm(dir, { recursive: true, force: true });
    await fsp.mkdir(path.dirname(dir), { recursive: true });
    await fsp.rename(partDir, dir);
    const metaFile = metaFileFor(owner, repo);
    await fsp.mkdir(path.dirname(metaFile), { recursive: true });
    await fsp.writeFile(metaFile, JSON.stringify(metadata, null, 2), 'utf8');

    emitProgress({ stage: 'done', message: 'Repository ready', percent: 100 });
    return metadata;
  } finally {
    activeDownloads.delete(key);
    await fsp.rm(zipTemp, { force: true }).catch(() => undefined);
    await fsp.rm(partDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function readRepoFile(owner: string, repo: string, filePath: unknown): Promise<{ path: string; content: string; size: number }> {
  const rel = requireRepoRelativePath(filePath);
  const root = path.resolve(repoDir(owner, repo));
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error('Invalid file path.');

  const st = await fsp.lstat(abs).catch(() => null);
  if (!st) throw new Error('File not found in the local repository copy.');
  if (st.isSymbolicLink()) throw new Error('Unsupported file (symlink).');
  if (!st.isFile()) throw new Error('Not a file.');
  if (st.size > MAX_SOURCE_BYTES) {
    throw new Error(`File too large to display (max ${Math.floor(MAX_SOURCE_BYTES / 1024)} KB).`);
  }
  if (isBinaryRel(rel)) throw new Error('Binary files cannot be displayed.');

  const buf = await fsp.readFile(abs);
  if (buf.subarray(0, Math.min(buf.length, 8192)).includes(0)) {
    throw new Error('Binary files cannot be displayed.');
  }
  return { path: rel, content: buf.toString('utf8'), size: st.size };
}

export function registerFilesystemIpc(): void {
  ipcMain.handle('repo:local-status', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const dir = repoDir(owner, repo);
      const st = await fsp.stat(dir).catch(() => null);
      if (!st || !st.isDirectory()) return ok({ downloaded: false, metadata: null });
      const raw = await fsp.readFile(metaFileFor(owner, repo), 'utf8').catch(() => null);
      if (!raw) return ok({ downloaded: false, metadata: null });
      const metadata = JSON.parse(raw) as RepoMetadata;
      return ok({ downloaded: true, metadata });
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('repo:download', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const raw = (input ?? {}) as { token?: unknown; branch?: unknown };
      const token = requireToken(raw.token);
      const branch = raw.branch === undefined || raw.branch === null ? undefined : requireBranch(raw.branch);
      const metadata = await runDownload(owner, repo, token, branch);
      return ok({ metadata });
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('repo:tree', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const dir = repoDir(owner, repo);
      const st = await fsp.stat(dir).catch(() => null);
      if (!st || !st.isDirectory()) throw new Error('Repository not downloaded.');
      const root: TreeNode = { name: repo, path: '', type: 'directory', children: [] };
      const counters = { files: 0, folders: 0 };
      await walk(dir, '', root, counters);
      return ok({ root, files: counters.files, folders: counters.folders });
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('repo:file', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const raw = (input ?? {}) as { path?: unknown };
      const file = await readRepoFile(owner, repo, raw.path);
      return ok(file);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('repo:structure', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const structure = await buildStructure(owner, repo);
      return ok(structure);
    } catch (err) {
      return fail(err);
    }
  });

  ipcMain.handle('repo:search', async (_event, input: unknown) => {
    try {
      const { owner, repo } = parseOwnerRepo(input);
      const raw = (input ?? {}) as { query?: unknown; word?: unknown; caseSensitive?: unknown };
      const query = typeof raw.query === 'string' ? raw.query.trim() : '';
      if (!query || query.length > 200) throw new Error('Invalid search query.');
      const word = raw.word === true;
      const caseSensitive = raw.caseSensitive === true;
      const result = await searchRepository(owner, repo, query, word, caseSensitive);
      return ok(result);
    } catch (err) {
      return fail(err);
    }
  });
}
