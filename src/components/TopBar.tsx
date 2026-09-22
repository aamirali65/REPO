import React from 'react';
import { Search, ChevronDown, Command } from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { RepoLogo } from './RepoLogo';
import { useApp } from '../store/AppContext';
import { currentUser } from '../data/mockData';

export function TopBar() {
  const { selectedRepo, setCommandPaletteOpen, setRepoSwitcherOpen } = useApp();

  return (
    <header className="h-[40px] bg-repo-surface border-b border-repo-border flex items-center justify-between px-3 select-none">
      {/* Left */}
      <div className="flex items-center gap-3">
        <RepoLogo size={16} />
        <div className="flex items-center gap-1.5 text-[12px]">
          <span className="font-medium text-repo-text">{selectedRepo?.name || 'Repo'}</span>
          {selectedRepo && (
            <>
              <span className="text-repo-text-muted">/</span>
              <button
                onClick={() => setRepoSwitcherOpen(true)}
                className="flex items-center gap-1 text-repo-text-secondary hover:text-repo-text transition-colors"
              >
                main
                <ChevronDown size={12} />
              </button>
            </>
          )}
        </div>
        {selectedRepo && (
          <div className="flex items-center gap-1.5 text-[10px] text-repo-success">
            <span className="w-1.5 h-1.5 rounded-full bg-repo-success animate-pulse-dot" />
            Indexed
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-2.5 py-1 rounded border border-repo-border bg-repo-surface-2 text-[11px] text-repo-text-muted hover:text-repo-text-secondary hover:border-repo-text-muted/30 transition-colors"
        >
          <Search size={12} />
          <span>Search</span>
          <div className="flex items-center gap-0.5 ml-2">
            <kbd className="px-1 py-0.5 rounded bg-repo-bg border border-repo-border text-[9px] text-repo-text-muted">
              <Command size={9} />
            </kbd>
            <kbd className="px-1 py-0.5 rounded bg-repo-bg border border-repo-border text-[9px] text-repo-text-muted">
              K
            </kbd>
          </div>
        </button>
        <button className="p-1.5 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text-secondary transition-colors">
          <GithubIcon size={15} />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-repo-border">
          <div className="w-6 h-6 rounded-full bg-repo-accent/20 flex items-center justify-center text-[10px] font-medium text-repo-accent">
            {currentUser.avatar}
          </div>
        </div>
      </div>
    </header>
  );
}
