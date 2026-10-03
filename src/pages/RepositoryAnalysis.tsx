import { RepoLogo } from '../components/RepoLogo';
import { useApp } from '../store/AppContext';
import { Check, ArrowRight, ArrowLeft } from 'lucide-react';

const analysisSteps = [
  'Preparing repository',
  'GitHub repository verified',
  'Downloading repository',
  'Extracting files',
  'Scanning files',
  'Building file tree',
];

export function RepositoryAnalysis() {
  const {
    selectedRepo, analysisProgress, analysisStep, analysisError, analysisMessage,
    repoMetadata, openWorkspace, startAnalysis, cancelAnalysis,
  } = useApp();

  return (
    <div className="h-full w-full flex items-center justify-center bg-repo-bg animate-fade-in">
      <div className="w-full max-w-[520px] px-4">
        <div className="flex items-center gap-3 mb-6">
          <RepoLogo size={24} />
          <div>
            <h1 className="text-[16px] font-semibold text-repo-text">
              {analysisError ? 'Repository download failed' : `Analyzing ${selectedRepo?.name}`}
            </h1>
            <p className="text-[11px] text-repo-text-muted">
              {selectedRepo?.fullName}
            </p>
          </div>
        </div>

        {!analysisError && (
          <>
            {/* Progress bar */}
            <div className="w-full h-1 bg-repo-surface-2 rounded-full mb-5 overflow-hidden">
              <div
                className="h-full bg-repo-accent rounded-full transition-all duration-300"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>

            {/* Steps */}
            <div className="space-y-1.5 mb-5">
              {analysisSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2.5 text-[11px]">
                  {i < analysisStep ? (
                    <Check size={12} className="text-repo-accent flex-shrink-0" />
                  ) : i === analysisStep ? (
                    <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-repo-accent animate-pulse-dot" />
                    </span>
                  ) : (
                    <span className="w-3 h-3 flex items-center justify-center flex-shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-repo-border" />
                    </span>
                  )}
                  <span className={
                    i < analysisStep ? 'text-repo-text-secondary' :
                    i === analysisStep ? 'text-repo-text' :
                    'text-repo-text-muted'
                  }>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Stats */}
            {analysisProgress > 30 && (
              <div className="flex items-center gap-6 mb-4 animate-fade-in">
                <div className="flex flex-col">
                  <span className="text-[16px] font-semibold text-repo-text font-mono">{selectedRepo?.files}</span>
                  <span className="text-[10px] text-repo-text-muted">Files</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-semibold text-repo-text font-mono">
                    {selectedRepo?.lines.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-repo-text-muted">Lines</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-semibold text-repo-text font-mono">
                    {repoMetadata ? `${(repoMetadata.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : '—'}
                  </span>
                  <span className="text-[10px] text-repo-text-muted">Size</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[16px] font-semibold text-repo-text font-mono">{selectedRepo?.languages}</span>
                  <span className="text-[10px] text-repo-text-muted">Languages</span>
                </div>
              </div>
            )}

            {/* Activity */}
            {!analysisError && analysisMessage && analysisProgress < 100 && (
              <div className="flex items-center gap-2 text-[11px] animate-fade-in">
                <span className="text-repo-text-secondary">Status:</span>
                <span className="font-mono text-repo-accent/80">{analysisMessage}</span>
              </div>
            )}

            {/* Complete */}
            {analysisProgress >= 100 && (
              <div className="mt-5 animate-slide-up flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[12px] font-medium text-repo-text">
                    {analysisMessage || 'Repository ready'}
                  </span>
                  {repoMetadata && (
                    <span className="text-[10px] text-repo-text-muted font-mono">
                      {repoMetadata.fullName} · {repoMetadata.defaultBranch} · {repoMetadata.files} files ·{' '}
                      {repoMetadata.lines.toLocaleString()} lines · {repoMetadata.languages.join(', ') || 'Unknown'}
                    </span>
                  )}
                </div>
                <button
                  onClick={openWorkspace}
                  className="flex items-center gap-2 px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors"
                >
                  Open Project
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Error state */}
        {analysisError && (
          <div className="animate-fade-in">
            <p className="text-[12px] text-repo-danger mb-5 leading-relaxed">{analysisError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => startAnalysis()}
                className="px-4 py-2 rounded bg-repo-accent text-repo-bg text-[12px] font-medium hover:bg-repo-accent/90 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={cancelAnalysis}
                className="flex items-center gap-2 px-4 py-2 rounded border border-repo-border text-[12px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/40 transition-colors"
              >
                <ArrowLeft size={14} />
                Back to repositories
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
