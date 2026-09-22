import React, { useState } from 'react';
import { Search, AlertTriangle, ChevronRight, ArrowDown, FileCode } from 'lucide-react';
import { impactRefs } from '../data/mockData';
import { cn } from '../lib/utils';

const symbols = ['UserModel', 'AuthService', 'ApiService', 'StorageService', 'JobModel'];

const impactData: Record<string, {
  direct: number;
  total: number;
  level: 'low' | 'medium' | 'high';
  graph: string[];
  refs: typeof impactRefs;
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

export function ImpactAnalysis() {
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSymbols = symbols.filter(s =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const data = selectedSymbol ? impactData[selectedSymbol] : null;

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
    setSearchQuery('');
    setShowResults(true);
  };

  const levelConfig = {
    low: { color: 'text-repo-success', bg: 'bg-repo-success/10', label: 'LOW IMPACT' },
    medium: { color: 'text-repo-warning', bg: 'bg-repo-warning/10', label: 'MEDIUM IMPACT' },
    high: { color: 'text-repo-danger', bg: 'bg-repo-danger/10', label: 'HIGH IMPACT' },
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <h1 className="text-[14px] font-semibold text-repo-text">Impact Analysis</h1>
        <p className="text-[11px] text-repo-text-secondary mt-0.5">
          Understand what could be affected before changing code.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[600px]">
          {/* Symbol selector */}
          {!showResults ? (
            <div className="space-y-3">
              <div className="text-[11px] text-repo-text-muted">Select a symbol...</div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-repo-text-muted" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search symbols..."
                  className="w-full pl-9 pr-3 py-2 bg-repo-surface border border-repo-border rounded text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none focus:border-repo-text-muted/40 transition-colors"
                />
              </div>
              <div className="space-y-1">
                {filteredSymbols.map((symbol) => (
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
              </div>
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
                      <span className="font-mono text-[11px] text-repo-text">{ref.file}</span>
                      <span className="text-[10px] text-repo-text-muted">Line {ref.line}</span>
                    </div>
                  ))}
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
                      <span className="font-mono text-[11px] text-repo-text">{ref.file}</span>
                      <span className="text-[10px] text-repo-text-muted">Line {ref.line}</span>
                    </div>
                  ))}
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
