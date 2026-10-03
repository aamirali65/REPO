import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, ChevronRight, ArrowDown, FileCode, Loader2 } from 'lucide-react';
import { impactRefs, type ImpactRef } from '../data/mockData';
import { useApp } from '../store/AppContext';
import {
  canUseRepoIntel, loadStructure, searchRepo, buildReverseImports, basenameOf,
} from '../lib/repoIntel';
import { cn } from '../lib/utils';

const mockSymbols = ['UserModel', 'AuthService', 'ApiService', 'StorageService', 'JobModel'];

const mockImpactData: Record<string, {
  direct: number;
  total: number;
  level: 'low' | 'medium' | 'high';
  graph: string[];
  refs: ImpactRef[];
}> = {
  UserModel: {
    direct: 5,
    total: 12,
    level: 'high',
    graph: ['UserModel', 'AuthService', 'ProfileProvider', 'ProfileScreen', 'SettingsScreen'],
    refs: impactRefs,
  },
  AuthService: {
    direct: 3,
    total: 8,
    level: 'medium',
    graph: ['AuthService', 'AuthProvider', 'LoginScreen', 'SplashScreen'],
    refs: [
      { file: 'auth_provider.dart', line: 24, type: 'direct' },
      { file: 'login_screen.dart', line: 52, type: 'direct' },
      { file: 'splash_screen.dart', line: 18, type: 'indirect' },
    ],
  },
  ApiService: {
    direct: 4,
    total: 10,
    level: 'medium',
    graph: ['ApiService', 'AuthService', 'JobService', 'StorageService'],
    refs: [
      { file: 'auth_service.dart', line: 32, type: 'direct' },
      { file: 'job_service.dart', line: 15, type: 'direct' },
    ],
  },
  StorageService: {
    direct: 2,
    total: 5,
    level: 'low',
    graph: ['StorageService', 'AuthService', 'ThemeProvider'],
    refs: [
      { file: 'auth_service.dart', line: 38, type: 'direct' },
      { file: 'theme_provider.dart', line: 12, type: 'direct' },
    ],
  },
  JobModel: {
    direct: 3,
    total: 7,
    level: 'medium',
    graph: ['JobModel', 'JobProvider', 'JobListScreen', 'JobDetailScreen'],
    refs: [
      { file: 'job_provider.dart', line: 20, type: 'direct' },
      { file: 'job_list_screen.dart', line: 34, type: 'direct' },
      { file: 'job_detail_screen.dart', line: 18, type: 'direct' },
    ],
  },
};

interface ComputedImpact {
  direct: number;
  total: number;
  level: 'low' | 'medium' | 'high';
  graph: string[];
  refs: ImpactRef[];
}

export function ImpactAnalysis() {
  const { selectedRepo } = useApp();
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const native = canUseRepoIntel() && !!selectedRepo;
  const [structure, setStructure] = useState<RepoStructure | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [computed, setComputed] = useState<ComputedImpact | null>(null);
  const [computing, setComputing] = useState(false);
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
    setComputed(null);
    loadStructure(owner, repoName)
      .then((s) => { if (!cancelled) setStructure(s); })
      .catch((err) => { if (!cancelled) setIntelError(err instanceof Error ? err.message : 'Failed to read repository.'); });
    return () => { cancelled = true; };
  }, [native, owner, repoName, selectedRepo?.id]);

  const nativeSymbols = (() => {
    if (!structure) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const d of structure.definitions) {
      if (seen.has(d.name)) continue;
      seen.add(d.name);
      out.push(d.name);
    }
    out.sort((a, b) => a.localeCompare(b));
    return out;
  })();

  const symbols = native ? nativeSymbols : mockSymbols;

  const filteredSymbols = symbols.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const data = native ? computed : (selectedSymbol ? mockImpactData[selectedSymbol] : null);

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery('');
    setShowResults(true);
    if (!native) return;

    if (!structure || !owner || !repoName) return;
    let cancelled = false;
    setComputing(true);
    setComputed(null);

    void (async () => {
      try {
        const def = structure.definitions.find((d) => d.name === symbol);
        const definingPath = def?.path ?? null;
        const res = await searchRepo(owner, repoName, symbol, { word: true });

        const firstLineByFile = new Map<string, number>();
        for (const m of res.matches) {
          if (!firstLineByFile.has(m.path)) firstLineByFile.set(m.path, m.line);
        }
        if (definingPath) firstLineByFile.delete(definingPath);

        const directRefs: ImpactRef[] = [...firstLineByFile.entries()]
          .slice(0, 10)
          .map(([file, line]) => ({ file, line, type: 'direct' as const }));

        const reverse = buildReverseImports(structure);
        const directSet = new Set(directRefs.map((r) => r.file));
        const indirectSeen = new Set<string>();
        const indirectRefs: ImpactRef[] = [];
        for (const d of directRefs) {
          if (indirectRefs.length >= 8) break;
          for (const importer of reverse.get(d.file) ?? []) {
            if (indirectRefs.length >= 8) break;
            if (importer === definingPath || directSet.has(importer) || indirectSeen.has(importer)) continue;
            indirectSeen.add(importer);
            indirectRefs.push({ file: importer, line: 0, type: 'indirect' });
          }
        }

        const direct = directRefs.length;
        const total = direct + indirectRefs.length;
        const level = direct >= 7 ? 'high' : direct >= 3 ? 'medium' : 'low';

        if (cancelled) return;
        setComputed({
          direct,
          total,
          level,
          graph: [symbol, ...directRefs.slice(0, 4).map((r) => basenameOf(r.file))],
          refs: [...directRefs, ...indirectRefs],
        });
      } catch (err) {
        if (!cancelled) {
          setIntelError(err instanceof Error ? err.message : 'Failed to compute impact.');
        }
      } finally {
        if (!cancelled) setComputing(false);
      }
    })();

    return () => { cancelled = true; };
  };

  const levelConfig = {
    low: { color: 'text-repo-success', bg: 'bg-repo-success/10', label: 'LOW IMPACT' },
    medium: { color: 'text-repo-warning', bg: 'bg-repo-warning/10', label: 'MEDIUM IMPACT' },
    high: { color: 'text-repo-danger', bg: 'bg-repo-danger/10', label: 'HIGH IMPACT' },
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[14px] font-semibold text-repo-text">Impact Analysis</h1>
            <p className="text-[11px] text-repo-text-secondary mt-0.5">
              Understand what could be affected before changing code.
            </p>
          </div>
          {native && selectedRepo && (
            <span className="text-[10px] text-repo-text-muted">{selectedRepo.fullName}</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[600px]">
          {/* Symbol selector */}
          {!showResults ? (
            <div className="space-y-3">
              <div className="text-[11px] text-repo-text-muted">
                {native && !structure && !intelError ? 'Loading symbols...' : 'Select a symbol...'}
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-repo-text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symbols..."
                  className="w-full pl-9 pr-3 py-2 bg-repo-surface border border-repo-border rounded text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none focus:border-repo-text-muted/40 transition-colors"
                />
              </div>
              {intelError && <div className="text-[11px] text-repo-danger">{intelError}</div>}
              <div className="space-y-1">
                {native && !structure && !intelError && (
                  <div className="flex items-center gap-2 px-3 py-3 text-[11px] text-repo-text-muted">
                    <Loader2 size={12} className="animate-spin" />
                    Indexing declarations...
                  </div>
                )}
                {filteredSymbols.slice(0, 300).map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleSelect(symbol)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded border border-repo-border bg-repo-surface text-[12px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/30 transition-colors"
                  >
                    <FileCode size={14} className="text-repo-text-muted" />
                    {symbol}
                    <ChevronRight size={12} className="ml-auto text-repo-text-muted" />
                  </button>
                ))}
                {structure && filteredSymbols.length === 0 && (
                  <div className="px-3 py-4 text-[11px] text-repo-text-muted text-center">
                    No symbols match “{searchQuery}”.
                  </div>
                )}
              </div>
            </div>
          ) : (native && computing) ? (
            <div className="flex items-center gap-2 py-6 text-[11px] text-repo-text-muted">
              <Loader2 size={14} className="animate-spin" />
              Scanning references across the repository...
            </div>
          ) : data && (
            <div className="space-y-4 animate-slide-up">
              <button
                onClick={() => setShowResults(false)}
                className="text-[11px] text-repo-text-muted hover:text-repo-text-secondary transition-colors"
              >
                ← Select another symbol
              </button>

              {/* Symbol header */}
              <div className="flex items-center gap-3">
                <FileCode size={18} className="text-repo-accent" />
                <div>
                  <h2 className="text-[14px] font-semibold text-repo-text">{selectedSymbol}</h2>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-repo-text-muted">{data.direct} direct references</span>
                    <span className="text-[11px] text-repo-text-muted">{data.total} total references</span>
                  </div>
                </div>
              </div>

              {/* Impact level */}
              <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded', levelConfig[data.level].bg)}>
                <AlertTriangle size={12} className={levelConfig[data.level].color} />
                <span className={cn('text-[11px] font-medium', levelConfig[data.level].color)}>
                  {levelConfig[data.level].label}
                </span>
              </div>

              {/* Graph */}
              <div className="bg-repo-surface border border-repo-border rounded-lg p-4">
                <h3 className="text-[11px] text-repo-text-muted mb-3 font-medium">Impact Chain</h3>
                <div className="space-y-0">
                  {data.graph.map((node, i) => (
                    <React.Fragment key={i}>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          'w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium',
                          i === 0 ? 'bg-repo-accent/20 text-repo-accent' : 'bg-repo-surface-2 text-repo-text-secondary border border-repo-border'
                        )}>
                          {i + 1}
                        </div>
                        <span className="text-[12px] text-repo-text">{node}</span>
                      </div>
                      {i < data.graph.length - 1 && (
                        <div className="flex items-center ml-3 py-0.5">
                          <ArrowDown size={12} className="text-repo-text-muted" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {data.graph.length <= 1 && (
                    <div className="text-[11px] text-repo-text-muted">
                      No dependent files reference this symbol directly.
                    </div>
                  )}
                </div>
              </div>

              {/* Direct references */}
              <div>
                <h3 className="text-[11px] text-repo-text-muted mb-2 font-medium">Direct References</h3>
                <div className="space-y-1">
                  {data.refs.filter(r => r.type === 'direct').map((ref, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded bg-repo-surface border border-repo-border"
                    >
                      <FileCode size={12} className="text-repo-text-muted" />
                      <span className="font-mono text-[11px] text-repo-text truncate">{ref.file}</span>
                      <span className="text-[10px] text-repo-text-muted ml-auto flex-shrink-0">
                        {ref.line > 0 ? `Line ${ref.line}` : ''}
                      </span>
                    </div>
                  ))}
                  {data.refs.filter(r => r.type === 'direct').length === 0 && (
                    <div className="text-[11px] text-repo-text-muted">No direct references found.</div>
                  )}
                </div>
              </div>

              {/* Potentially affected */}
              <div>
                <h3 className="text-[11px] text-repo-text-muted mb-2 font-medium">Potentially Affected</h3>
                <div className="space-y-1">
                  {data.refs.filter(r => r.type === 'indirect').map((ref, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded bg-repo-surface border border-repo-border"
                    >
                      <FileCode size={12} className="text-repo-text-muted" />
                      <span className="font-mono text-[11px] text-repo-text truncate">{ref.file}</span>
                      <span className="text-[10px] text-repo-text-muted ml-auto flex-shrink-0">imports a reference</span>
                    </div>
                  ))}
                  {data.refs.filter(r => r.type === 'indirect').length === 0 && (
                    <div className="text-[11px] text-repo-text-muted">No indirect dependents found.</div>
                  )}
                </div>
              </div>

              {/* Generate change plan */}
              <button className="flex items-center gap-2 px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors">
                Generate Change Plan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
