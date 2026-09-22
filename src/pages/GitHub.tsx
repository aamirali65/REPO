import React from 'react';
import { LogOut, ExternalLink, Folder } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import { useApp } from '../store/AppContext';
import { currentUser, repositories } from '../data/mockData';

export function GitHub() {
  const { setWorkspaceView, selectedRepo, selectRepo, startAnalysis } = useApp();

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <div className="flex items-center gap-2">
          <GithubIcon size={16} className="text-repo-text-secondary" />
          <h1 className="text-[14px] font-semibold text-repo-text">GitHub</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[480px] space-y-5">
          {/* Connected account */}
          <div className="bg-repo-surface border border-repo-border rounded-lg p-4">
            <h3 className="text-[11px] text-repo-text-muted mb-3 font-medium">Connected as</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-repo-accent/20 flex items-center justify-center text-[12px] font-medium text-repo-accent">
                {currentUser.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-repo-text">{currentUser.name}</span>
                <span className="text-[11px] text-repo-text-muted">{currentUser.username}</span>
              </div>
            </div>
          </div>

          {/* Repositories */}
          <div className="bg-repo-surface border border-repo-border rounded-lg p-4">
            <h3 className="text-[11px] text-repo-text-muted mb-3 font-medium">Repositories</h3>
            <div className="space-y-1">
              {repositories.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => {
                    selectRepo(repo);
                    startAnalysis();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-repo-surface-2 transition-colors text-left"
                >
                  <Folder size={14} className="text-repo-text-muted" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[12px] text-repo-text">{repo.name}</span>
                    <span className="text-[10px] text-repo-text-muted ml-2">{repo.files} files</span>
                  </div>
                  <ExternalLink size={12} className="text-repo-text-muted" />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWorkspaceView('chat')}
              className="flex items-center gap-2 px-3 py-1.5 rounded border border-repo-border text-[11px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/40 transition-colors"
            >
              Change Repository
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded text-[11px] text-repo-danger hover:bg-repo-danger/10 transition-colors">
              <LogOut size={12} />
              Disconnect GitHub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
