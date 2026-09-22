import React from 'react';
import { useApp } from '../store/AppContext';

export function StatusBar() {
  const { selectedRepo } = useApp();

  return (
    <footer className="h-[22px] bg-repo-surface border-t border-repo-border flex items-center justify-between px-3 text-[10px] select-none">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-repo-success">
          <span className="w-1.5 h-1.5 rounded-full bg-repo-success" />
          Local AI
        </div>
        <div className="flex items-center gap-1.5 text-repo-text-muted">
          <span className="text-repo-text-secondary">Ollama</span>
          <span className="text-repo-accent/60">Qwen2.5-Coder 7B</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-repo-text-muted">
          Indexed · {selectedRepo?.files || 0} files
        </span>
        <span className="text-repo-text-muted">main</span>
      </div>
    </footer>
  );
}
