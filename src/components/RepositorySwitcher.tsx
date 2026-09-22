import React, { useState, useRef, useEffect } from 'react';
import { X, Search, GitBranch } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { repositories, type Repository } from '../data/mockData';
import { cn } from '../lib/utils';

export function RepositorySwitcher() {
  const { repoSwitcherOpen, setRepoSwitcherOpen, switchRepo, selectedRepo } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = repositories.filter(repo =>
    repo.name.toLowerCase().includes(query.toLowerCase()) ||
    repo.fullName.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (repoSwitcherOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [repoSwitcherOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && repoSwitcherOpen) {
        setRepoSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [repoSwitcherOpen, setRepoSwitcherOpen]);

  if (!repoSwitcherOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setRepoSwitcherOpen(false)} />
      <div className="relative w-full max-w-[440px] bg-repo-panel border border-repo-border rounded-lg shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between px-3 h-[40px] border-b border-repo-border">
          <div className="flex items-center gap-2 text-[12px] text-repo-text-secondary">
            <GitBranch size={14} className="text-repo-text-muted" />
            Switch repository
          </div>
          <button
            onClick={() => setRepoSwitcherOpen(false)}
            className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-3 py-2 border-b border-repo-border">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-repo-text-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories..."
              className="flex-1 bg-transparent text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none"
            />
          </div>
        </div>
        <div className="max-h-[260px] overflow-y-auto py-1">
          <div className="px-3 py-1.5 text-[10px] font-medium tracking-wider text-repo-text-muted uppercase">
            Recent
          </div>
          {filtered.map((repo) => (
            <button
              key={repo.id}
              onClick={() => switchRepo(repo)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors',
                selectedRepo?.id === repo.id
                  ? 'bg-repo-accent/10 text-repo-accent'
                  : 'text-repo-text-secondary hover:bg-repo-surface-2'
              )}
            >
              <div className="flex flex-col items-start flex-1">
                <span className="font-medium">{repo.name}</span>
                <span className="text-[10px] text-repo-text-muted">{repo.fullName}</span>
              </div>
              <span className="text-[10px] text-repo-text-muted">{repo.files} files</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
