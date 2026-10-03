import type { ArchEdge, ArchNode } from '../data/mockData';
import { canUseNativeRepo } from './nativeRepo';

const structureCache = new Map<string, Promise<RepoStructure>>();
const searchCache = new Map<string, Promise<SearchResult>>();

function unwrap<T>(result: { ok: true; data: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

export function canUseRepoIntel(): boolean {
  return canUseNativeRepo();
}

export function loadStructure(owner: string, repo: string): Promise<RepoStructure> {
  const key = `${owner}/${repo}`;
  let p = structureCache.get(key);
  if (!p) {
    p = unwrapAsync(window.repoNative.getRepoStructure({ owner, repo }));
    structureCache.set(key, p);
    p.catch(() => structureCache.delete(key));
  }
  return p;
}

async function unwrapAsync<T>(promise: Promise<{ ok: true; data: T } | { ok: false; error: string }>): Promise<T> {
  return unwrap(await promise);
}

export function searchRepo(
  owner: string,
  repo: string,
  query: string,
  opts?: { word?: boolean; caseSensitive?: boolean; noCache?: boolean },
): Promise<SearchResult> {
  const word = opts?.word ?? false;
  const key = `${owner}/${repo}|${word}|${opts?.caseSensitive ? 'c' : 'i'}|${query}`;
  if (!opts?.noCache) {
    const cached = searchCache.get(key);
    if (cached) return cached;
  }
  const p = unwrapAsync(
    window.repoNative.searchRepositoryFiles({ owner, repo, query, word, caseSensitive: opts?.caseSensitive ?? false }),
  );
  searchCache.set(key, p);
  p.catch(() => searchCache.delete(key));
  return p;
}

export function clearIntelCache(): void {
  structureCache.clear();
  searchCache.clear();
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

export function buildReverseImports(s: RepoStructure): Map<string, string[]> {
  const reverse = new Map<string, string[]>();
  for (const entry of s.imports) {
    for (const target of entry.resolved) {
      const list = reverse.get(target);
      if (list) {
        if (list.length < 200 && !list.includes(entry.path)) list.push(entry.path);
      } else {
        reverse.set(target, [entry.path]);
      }
    }
  }
  return reverse;
}

export function definitionsForFile(s: RepoStructure, filePath: string): SourceDefinition[] {
  return s.definitions.filter((d) => d.path === filePath);
}

export function filesImportingFile(s: RepoStructure, filePath: string): string[] {
  return s.imports.filter((e) => e.resolved.includes(filePath)).map((e) => e.path);
}

export function rawDependencies(s: RepoStructure, filePath: string): string[] {
  const entry = s.imports.find((e) => e.path === filePath);
  if (!entry) return [];
  const stripExt = (n: string) => n.replace(/\.[^.]+$/, '');
  const out = entry.resolved.map((r) => stripExt(basenameOf(r)));
  for (const raw of entry.raw) {
    if (out.length >= 6) break;
    const key = stripExt(basenameOf(raw) || raw);
    if (!key || out.includes(key)) continue;
    out.push(key);
  }
  return out.slice(0, 6);
}

export function basenameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(i + 1) : p;
}

export function dirnameOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i <= 0 ? '' : p.slice(0, i);
}

const TYPE_ORDER = ['screen', 'provider', 'service', 'model', 'api', 'storage'] as const;
type ModuleType = (typeof TYPE_ORDER)[number];

const TYPE_WORDS: Record<ModuleType, string[]> = {
  storage: ['storage', 'db', 'database', 'local', 'cache', 'caches', 'prefs', 'preferences', 'repository', 'repositories', 'data'],
  api: ['api', 'apis', 'network', 'networking', 'remote', 'http', 'client', 'clients', 'endpoints'],
  screen: ['screen', 'screens', 'view', 'views', 'page', 'pages', 'widget', 'widgets', 'component', 'components', 'ui'],
  provider: ['provider', 'providers', 'state', 'store', 'stores', 'controller', 'controllers', 'hook', 'hooks', 'bloc', 'cubit', 'viewmodel', 'notifier', 'notifiers'],
  model: ['model', 'models', 'entity', 'entities', 'type', 'types', 'domain', 'schema', 'schemas'],
  service: ['service', 'services', 'util', 'utils', 'helper', 'helpers', 'core', 'common', 'lib', 'manager', 'managers', 'tool', 'tools', 'src', 'app', 'modules', 'features'],
};

const CHECK_ORDER: ModuleType[] = ['storage', 'api', 'screen', 'provider', 'model', 'service'];

function classifyModule(modulePath: string): ModuleType {
  const segments = modulePath.split('/').map((s) => s.toLowerCase());
  for (const type of CHECK_ORDER) {
    for (const word of TYPE_WORDS[type]) {
      if (segments.includes(word)) return type;
    }
  }
  return 'service';
}

function collapseModule(filePath: string): string {
  const dir = dirnameOf(filePath);
  if (!dir) return '.';
  const parts = dir.split('/');
  return parts.length > 3 ? parts.slice(0, 3).join('/') : dir;
}

export interface ArchGraph {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export function buildArchGraph(s: RepoStructure): ArchGraph {
  const modules = new Map<string, { files: number; exts: Map<string, number>; samples: string[] }>();

  for (const f of s.files) {
    const mod = collapseModule(f.path);
    let m = modules.get(mod);
    if (!m) {
      m = { files: 0, exts: new Map(), samples: [] };
      modules.set(mod, m);
    }
    m.files++;
    m.exts.set(f.ext, (m.exts.get(f.ext) ?? 0) + 1);
    if (m.samples.length < 3) m.samples.push(basenameOf(f.path));
  }

  let entries = [...modules.entries()].filter(([mod, m]) => mod !== '.' || m.files >= 4);
  entries.sort((a, b) => b[1].files - a[1].files);
  entries = entries.slice(0, 24);

  const moduleSet = new Set(entries.map(([mod]) => mod));
  const usedNames = new Map<string, number>();
  for (const [mod] of entries) {
    const name = mod === '.' ? '(root)' : mod.split('/').pop() ?? mod;
    usedNames.set(name, (usedNames.get(name) ?? 0) + 1);
  }

  const byType = new Map<ModuleType, { mod: string; files: number; exts: Map<string, number>; samples: string[] }[]>();
  for (const [mod, info] of entries) {
    const type = classifyModule(mod);
    const list = byType.get(type) ?? [];
    list.push({ mod, ...info });
    byType.set(type, list);
  }

  const nodes: ArchNode[] = [];
  const idOf = new Map<string, string>();
  TYPE_ORDER.forEach((type, col) => {
    const list = byType.get(type) ?? [];
    list.forEach((entry, row) => {
      const baseName = entry.mod === '.' ? '(root)' : entry.mod.split('/').pop() ?? entry.mod;
      const dup = (usedNames.get(baseName) ?? 0) > 1;
      const name = dup && entry.mod !== '.' ? entry.mod.split('/').slice(-2).join('/') : baseName;
      const id = `mod:${entry.mod}`;
      idOf.set(entry.mod, id);
      nodes.push({
        id,
        name,
        type,
        x: 40 + col * 175,
        y: 40 + row * 58,
        files: entry.files,
        sampleFiles: entry.samples,
        topExt: [...entry.exts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '',
      });
    });
  });

  const edgeCounts = new Map<string, { from: string; to: string; count: number }>();
  for (const entry of s.imports) {
    const fromMod = collapseModule(entry.path);
    if (!moduleSet.has(fromMod)) continue;
    for (const target of entry.resolved) {
      const toMod = collapseModule(target);
      if (toMod === fromMod || !moduleSet.has(toMod)) continue;
      const key = `${fromMod}→${toMod}`;
      const cur = edgeCounts.get(key);
      if (cur) cur.count++;
      else edgeCounts.set(key, { from: fromMod, to: toMod, count: 1 });
    }
  }

  const edges: ArchEdge[] = [...edgeCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 40)
    .map((e) => ({ from: idOf.get(e.from)!, to: idOf.get(e.to)!, count: e.count }));

  return { nodes, edges };
}
