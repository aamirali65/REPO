import { RepoLogo } from '../components/RepoLogo';
import { useApp } from '../store/AppContext';
import { Check } from 'lucide-react';

export function Connecting() {
  const { authLoading, authError, user, connectGitHub } = useApp();

  return (
    <div className="h-full w-full flex items-center justify-center bg-repo-bg animate-fade-in">
      <div className="w-full max-w-[380px] bg-repo-surface border border-repo-border rounded-lg p-6 animate-scale-in">
        <div className="flex items-center gap-3 mb-4">
          <RepoLogo size={20} />
          <h2 className="text-[14px] font-semibold text-repo-text">Connect GitHub</h2>
        </div>

        <p className="text-[12px] text-repo-text-secondary mb-5">
          Connect your GitHub account to browse your repositories.
        </p>

        {authLoading && (
          <div className="flex flex-col items-center py-6 gap-3">
            <div className="w-8 h-8 border-2 border-repo-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-[12px] text-repo-text-secondary">Connecting to GitHub...</span>
          </div>
        )}

        {!authLoading && authError && (
          <div className="flex flex-col items-center py-4 gap-4 animate-fade-in">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="text-[12px] text-repo-danger">{authError}</span>
              <button
                onClick={connectGitHub}
                className="px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors mt-2"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!authLoading && !authError && user && (
          <div className="flex flex-col items-center py-4 gap-4 animate-fade-in">
            <div className="w-10 h-10 rounded-full bg-repo-accent/20 flex items-center justify-center">
              <Check size={20} className="text-repo-accent" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-repo-accent/20 flex items-center justify-center text-[12px] font-medium text-repo-accent">
                {user.avatar}
              </div>
              <div className="flex flex-col">
                <span className="text-[13px] font-medium text-repo-text">{user.name}</span>
                <span className="text-[11px] text-repo-text-muted">{user.username}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-repo-success">
              <span className="w-1.5 h-1.5 rounded-full bg-repo-success" />
              Connected
            </div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('github-connected'));
              }}
              className="w-full py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors mt-2"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}