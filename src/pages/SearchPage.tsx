import React, { useState } from 'react';
import { Search as SearchIcon, FileCode, Hash, Braces, Layers, Filter } from 'lucide-react';
import { searchResults } from '../data/mockData';
import { useApp } from '../store/AppContext';
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
  classes: ['class'],
};

export function SearchPage() {
  const { setActiveFile, setWorkspaceView } = useApp();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('all');

  const filtered = searchResults.filter(r => {
    const matchesQuery = r.symbol.toLowerCase().includes(query.toLowerCase()) ||
      r.file.toLowerCase().includes(query.toLowerCase()) ||
      r.description.toLowerCase().includes(query.toLowerCase());

    if (activeTab === 'all' || activeTab === 'files') return matchesQuery;
    const types = tabTypeMap[activeTab];
    return matchesQuery && types.includes(r.type);
  });

  const handleOpenFile = (file: string) => {
    setActiveFile(file);
    setWorkspaceView('explorer');
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <h1 className="text-[14px] font-semibold text-repo-text mb-3">Search</h1>

        {/* Search input */}
        <div className="flex items-center gap-2 px-3 h-[34px] bg-repo-surface border border-repo-border rounded focus-within:border-repo-text-muted/40 transition-colors">
          <SearchIcon size={14} className="text-repo-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files, symbols and code..."
            className="flex-1 bg-transparent text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none"
            autoFocus
          />
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
        <div className="px-4 py-2">
          <span className="text-[10px] text-repo-text-muted">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="space-y-0.5 px-2">
          {filtered.map((result, i) => (
            <button
              key={i}
              onClick={() => handleOpenFile(result.file)}
              className="w-full flex items-start gap-3 px-3 py-2.5 rounded hover:bg-repo-surface-2 transition-colors text-left group"
            >
              <div className="mt-0.5">
                {result.type === 'class' ? (
                  <Layers size={14} className="text-repo-accent" />
                ) : result.type === 'function' || result.type === 'method' ? (
                  <Braces size={14} className="text-purple-400" />
                ) : (
                  <Hash size={14} className="text-repo-text-muted" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-repo-text">{result.symbol}</span>
                  <span className="text-[10px] text-repo-text-muted">{result.type}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px] text-repo-accent/70">{result.file}</span>
                  <span className="text-[10px] text-repo-text-muted">:{result.line}</span>
                </div>
                <p className="text-[11px] text-repo-text-muted mt-1">{result.description}</p>
              </div>
              <FileCode size={12} className="text-repo-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
