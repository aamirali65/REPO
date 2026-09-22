import React, { useState, useEffect } from 'react';
import { Search, Lock, Globe, ArrowRight } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { repositories, type Repository } from '../data/mockData';
import { cn } from '../lib/utils';

type Filter = 'all' | 'public' | 'private' | 'recent';

export function RepositorySelector() {
  const { selectRepo, startAnalysis, selectedRepo } = useApp();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = repositories.filter(repo => {
    const matchesQuery = repo.name.toLowerCase().includes(query.toLowerCase()) ||
      repo.fullName.toLowerCase().includes(query.toLowerCase());
    if (filter === 'public') return matchesQuery && repo.visibility === 'public';
    if (filter === 'private') return matchesQuery && repo.visibility === 'private';
    return matchesQuery;
  });

  return (
    <div className="h-full w-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="flex-1 flex flex-col items-center pt-12 px-4">
        <div className="w-full max-w-[560px]">
          <h1 className="text-[18px] font-semibold text-repo-text mb-1">Select a repository</h1>
          <p className="text-[12px] text-repo-text-secondary mb-5">
            Choose a repository to understand with Repo.
          </p>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 h-[34px] bg-repo-surface border border-repo-border rounded mb-3">
            <Search size={14} className="text-repo-text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search repositories..."
              className="flex-1 bg-transparent text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 mb-4">
            {(['all', 'public', 'private', 'recent'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-2.5 py-1 rounded text-[11px] transition-colors capitalize',
                  filter === f
                    ? 'bg-repo-accent/10 text-repo-accent'
                    : 'text-repo-text-muted hover:text-repo-text-secondary hover:bg-repo-surface-2'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Repository list */}
          <div className="space-y-1">
            {filtered.map((repo) => (
              <button
                key={repo.id}
                onClick={() => selectRepo(repo)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded border transition-all duration-150 text-left group',
                  selectedRepo?.id === repo.id
                    ? 'border-repo-accent/40 bg-repo-accent/5'
                    : 'border-repo-border bg-repo-surface hover:border-repo-text-muted/30 hover:bg-repo-surface-2'
                )}
              >
                <div className="w-8 h-8 rounded bg-repo-surface-2 border border-repo-border flex items-center justify-center flex-shrink-0">
                  {repo.visibility === 'private' ? (
                    <Lock size={14} className="text-repo-text-muted" />
                  ) : (
                    <Globe size={14} className="text-repo-text-muted" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-repo-text">{repo.name}</span>
                    <span className="text-[10px] text-repo-text-muted">{repo.fullName}</span>
                    <span className={cn(
                      'px-1.5 py-0.5 rounded text-[9px] font-medium',
                      repo.visibility === 'private'
                        ? 'bg-repo-warning/10 text-repo-warning'
                        : 'bg-repo-surface-2 text-repo-text-muted'
                    )}>
                      {repo.visibility}
                    </span>
                  </div>
                  <p className="text-[11px] text-repo-text-muted mt-0.5 truncate">{repo.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-repo-text-muted">{repo.language}</span>
                    <span className="text-[10px] text-repo-text-muted">{repo.framework}</span>
                    <span className="text-[10px] text-repo-text-muted">Updated {repo.updatedAt}</span>
                  </div>
                </div>
                <ArrowRight
                  size={14}
                  className={cn(
                    'text-repo-text-muted transition-all duration-150',
                    selectedRepo?.id === repo.id
                      ? 'text-repo-accent opacity-100'
                      : 'opacity-0 group-hover:opacity-100'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Analyze button */}
          {selectedRepo && (
            <div className="mt-4 flex justify-end animate-slide-up">
              <button
                onClick={startAnalysis}
                className="flex items-center gap-2 px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors"
              >
                Analyze Repository
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
