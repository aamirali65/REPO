import { useEffect, useState } from 'react';
import { Search as SearchIcon, FileCode, Hash, Braces, Layers, Filter, Loader2 } from 'lucide-react';
import { searchResults } from '../data/mockData';
import { useApp } from '../store/AppContext';
import { canUseRepoIntel, loadStructure, searchRepo, basenameOf, dirnameOf } from '../lib/repoIntel';
import { cn } from '../lib/utils';

type Tab = 'all' | 'files' | 'symbols' | 'functions' | 'classes';

const tabs: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'files', label: 'Files' },
  { id: 'symbols', label: 'Symbols' },
  { id: 'functions', label: 'Functions' },
  { id: 'classes', label: 'Classes' },
];

const tabTypeMap: Record<Tab, string[]> = {
  all: [],
  files: [],
  symbols: [],
  functions: ['function', 'method'],
  classes: ['class', 'interface', 'enum'],
};

interface Row {
  symbol: string;
  file: string;
  line: number;
  description: string;
  type: string;
}

const CLASS_KINDS = new Set(['class', 'interface', 'enum']);
const FUNC_KINDS = new Set(['function', 'method']);

export function SearchPage() {
  const { setActiveFile, setWorkspaceView, selectedRepo } = useApp();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const native = canUseRepoIntel() && !!selectedRepo;
  const [structure, setStructure] = useState<RepoStructure | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [contentMatches, setContentMatches] = useState<SearchMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchInfo, setSearchInfo] = useState<{ filesScanned: number; truncated: boolean } | null>(null);
  const [owner, repoName] = selectedRepo ? selectedRepo.fullName.split('/') : ['', ''];

  useEffect(() => {
    if (!native || !owner || !repoName) {
      setStructure(null);
      setIntelError(null);
      return;
    }
    let cancelled = false;
    setStructure(null);
    setIntelError(null);
    loadStructure(owner, repoName)
      .then((s) => { if (!cancelled) setStructure(s); })
      .catch((err) => { if (!cancelled) setIntelError(err instanceof Error ? err.message : 'Failed to read repository.'); });
    return () => { cancelled = true; };
  }, [native, owner, repoName, selectedRepo?.id]);

  useEffect(() => {
    if (!native || !owner || !repoName || query.trim().length === 0) {
      setContentMatches([]);
      setSearchInfo(null);
      setSearching(false);
      return;
    }
    const trimmed = query.trim();
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      searchRepo(owner, repoName, trimmed, { word: false })
        .then((res) => {
          if (cancelled) return;
          setContentMatches(res.matches);
          setSearchInfo({ filesScanned: res.filesScanned, truncated: res.truncated });
        })
        .catch(() => {
          if (!cancelled) setContentMatches([]);
        })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [native, owner, repoName, query]);

  const buildRows = (): Row[] => {
    if (!native) {
      return searchResults
        .filter((r) => {
          const matchesQuery = r.symbol.toLowerCase().includes(query.toLowerCase()) ||
            r.file.toLowerCase().includes(query.toLowerCase()) ||
            r.description.toLowerCase().includes(query.toLowerCase());
          if (activeTab === 'all' || activeTab === 'files') return matchesQuery;
          const types = tabTypeMap[activeTab];
          return matchesQuery && types.includes(r.type);
        })
        .map((r) => ({ symbol: r.symbol, file: r.file, line: r.line, description: r.description, type: r.type }));
    }

    const q = query.trim().toLowerCase();
    const rows: Row[] = [];
    if (!q) return rows;

    if (activeTab === 'all' || activeTab === 'files') {
      if (structure) {
        for (const f of structure.files) {
          if (rows.length >= 80) break;
          if (f.path.toLowerCase().includes(q)) {
            rows.push({
              symbol: basenameOf(f.path),
              file: f.path,
              line: 0,
              description: dirnameOf(f.path) || 'repo root',
              type: 'file',
            });
          }
        }
      }
    }

    if (activeTab === 'all' || activeTab === 'symbols' || activeTab === 'functions' || activeTab === 'classes') {
      if (structure) {
        const seen = new Set<string>();
        for (const d of structure.definitions) {
          if (rows.length >= 160) break;
          if (!d.name.toLowerCase().includes(q)) continue;
          if (activeTab === 'functions' && !FUNC_KINDS.has(d.kind)) continue;
          if (activeTab === 'classes' && !CLASS_KINDS.has(d.kind)) continue;
          const key = `${d.name}|${d.path}|${d.line}`;
          if (seen.has(key)) continue;
          seen.add(key);
          rows.push({
            symbol: d.name,
            file: d.path,
            line: d.line,
            description: `Declaration in ${dirnameOf(d.path) || 'root'}`,
            type: d.kind,
          });
        }
      }
    }

    if (activeTab === 'all') {
      for (const m of contentMatches) {
        if (rows.length >= 160) break;
        const text = m.text.trim();
        if (!text) continue;
        rows.push({
          symbol: basenameOf(m.path),
          file: m.path,
          line: m.line,
          description: text,
          type: 'match',
        });
      }
    }

    return rows;
  };

  const filtered = buildRows();

  const handleOpenFile = (file: string) => {
    setActiveFile(file);
    setWorkspaceView('explorer');
  };

  const loadingIntel = native && (!structure && !intelError);

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[14px] font-semibold text-repo-text">Search</h1>
          {native && (
            <span className="text-[10px] text-repo-text-muted">
              {selectedRepo?.fullName}
            </span>
          )}
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 px-3 h-[34px] bg-repo-surface border border-repo-border rounded focus-within:border-repo-text-muted/40 transition-colors">
          <SearchIcon size={14} className="text-repo-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={native ? 'Search files, symbols and code in this repository...' : 'Search files, symbols and code...'}
            className="flex-1 bg-transparent text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none"
            autoFocus
          />
          {searching && <Loader2 size={12} className="text-repo-text-muted animate-spin" />}
          <button className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted transition-colors">
            <Filter size={12} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-2.5 py-1.5 text-[11px] transition-colors border-b-2 -mb-[1px]',
                activeTab === tab.id
                  ? 'border-repo-accent text-repo-accent'
                  : 'border-transparent text-repo-text-muted hover:text-repo-text-secondary'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 flex items-center gap-3">
          <span className="text-[10px] text-repo-text-muted">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
          {searchInfo && (
            <span className="text-[10px] text-repo-text-muted">
              {searchInfo.filesScanned} files scanned{searchInfo.truncated ? ' · showing first matches' : ''}
            </span>
          )}
          {loadingIntel && (
            <span className="text-[10px] text-repo-text-muted flex items-center gap-1">
              <Loader2 size={10} className="animate-spin" /> Indexing repository...
            </span>
          )}
          {intelError && <span className="text-[10px] text-repo-danger">{intelError}</span>}
        </div>
        <div className="space-y-0.5 px-2 pb-3">
          {filtered.map((result, i) => (
            <button
              key={i}
              onClick={() => handleOpenFile(result.file)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded hover:bg-repo-surface-2 transition-colors text-left group"
            >
              <div className="mt-0.5">
                {CLASS_KINDS.has(result.type) ? (
                  <Layers size={14} className="text-repo-accent" />
                ) : FUNC_KINDS.has(result.type) ? (
                  <Braces size={14} className="text-purple-400" />
                ) : result.type === 'file' ? (
                  <FileCode size={14} className="text-repo-text-muted" />
                ) : (
                  <Hash size={14} className="text-repo-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-repo-text truncate">{result.symbol}</span>
                  <span className="text-[10px] text-repo-text-muted">{result.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-repo-accent/70 truncate">{result.file}</span>
                  {result.line > 0 && <span className="text-[10px] text-repo-text-muted">:{result.line}</span>}
                </div>
                <p className="text-[11px] text-repo-text-muted mt-1 truncate">{result.description}</p>
              </div>
              <FileCode size={12} className="text-repo-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </button>
          ))}
          {query.trim() && filtered.length === 0 && !loadingIntel && (
            <div className="px-3 py-6 text-center text-[12px] text-repo-text-muted">
              No results for “{query.trim()}”.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
