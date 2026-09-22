import React from 'react';
import { RepoLogo } from '../components/RepoLogo';
import { useApp } from '../store/AppContext';
import { currentUser } from '../data/mockData';
import { Lock, Folder } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';

export function Welcome() {
  const { connectGitHub } = useApp();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-repo-bg animate-fade-in">
      <div className="flex flex-col items-center gap-5">
        <RepoLogo size={48} />
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-[22px] font-semibold tracking-wide text-repo-text">Repo</h1>
          <p className="text-[13px] text-repo-text-secondary">Understand your codebase.</p>
        </div>

        <p className="text-[11px] text-repo-text-muted mt-1">
          Connect your GitHub account or open a local repository.
        </p>

        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={connectGitHub}
            className="flex items-center gap-2 px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-all duration-150"
          >
            <GithubIcon size={14} />
            Connect GitHub
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded border border-repo-border text-[12px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/40 transition-all duration-150">
            <Folder size={14} />
            Open Local Folder
          </button>
        </div>

        <div className="flex items-center gap-4 mt-8 text-[10px] text-repo-text-muted">
          <div className="flex items-center gap-1.5">
            <Lock size={10} />
            Local processing
          </div>
        </div>

        <p className="text-[10px] text-repo-text-muted/60 mt-2">
          Local-first AI. Your source code stays on your machine.
        </p>
      </div>
    </div>
  );
}
