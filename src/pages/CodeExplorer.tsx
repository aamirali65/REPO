import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  Copy, Check, ExternalLink, GitBranch, Eye, Zap, Search,
  Download, AlertCircle, RefreshCw,
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { kamaoFileTree, authServiceCode, type FileNode } from '../data/mockData';
import { canUseNativeRepo, getLocalStatus, getRepositoryTree, readRepositoryFile } from '../lib/nativeRepo';
import { canUseRepoIntel, loadStructure, searchRepo, definitionsForFile, filesImportingFile, rawDependencies, basenameOf } from '../lib/repoIntel';
import { cn } from '../lib/utils';

type RepoState = 'idle' | 'loading' | 'ready' | 'not-downloaded' | 'error';

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Something unexpected went wrong.';
}

function toFileNode(n: RepoTreeNodeData): FileNode {
  return {
    name: n.name,
    type: n.type === 'directory' ? 'folder' : 'file',
    path: n.path,
    children: n.children ? n.children.map(toFileNode) : undefined,
  };
}

function collectFiles(node: FileNode, out: string[] = []): string[] {
  if (node.type === 'file') {
    out.push(node.path ?? node.name);
    return out;
  }
  for (const child of node.children ?? []) collectFiles(child, out);
  return out;
}

function findPreferredFile(tree: FileNode): string | null {
  const files = collectFiles(tree);
  if (files.length === 0) return null;
  const lower = (p: string) => p.toLowerCase();
  const preferred = [
    'readme.md', 'main.dart', 'lib/main.dart', 'src/index.ts', 'index.ts',
    'index.tsx', 'app.dart', 'main.py', 'index.js',
  ];
  for (const pref of preferred) {
    const hit = files.find((f) => lower(f) === pref);
    if (hit) return hit;
  }
  const readme = files.find((f) => lower(f).startsWith('readme'));
  if (readme) return readme;
  const md = files.find((f) => lower(f).endsWith('.md'));
  if (md) return md;
  return files[0];
}

function nodeKey(node: FileNode): string {
  return node.path ?? node.name;
}

function FileTreeNode({ node, depth = 0, activeFile, onSelect }: {
  node: FileNode;
  depth?: number;
  activeFile: string;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const identity = nodeKey(node);

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 py-0.5 px-1 rounded text-[11px] text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? <FolderOpen size={12} className="text-repo-accent/60" /> : <Folder size={12} className="text-repo-text-muted" />}
          <span>{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeNode
                key={nodeKey(child)}
                node={child}
                depth={depth + 1}
                activeFile={activeFile}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(identity)}
      className={cn(
        'w-full flex items-center gap-1.5 py-0.5 px-1 rounded text-[11px] transition-colors',
        activeFile === identity
          ? 'bg-repo-accent/10 text-repo-accent'
          : 'text-repo-text-secondary hover:bg-repo-surface-2'
      )}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      <FileCode size={12} className={activeFile === identity ? 'text-repo-accent' : 'text-repo-text-muted'} />
      <span className={node.name.endsWith('.dart') ? '' : 'text-repo-text-muted'}>{node.name}</span>
    </button>
  );
}

function LoadingIndicator({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-repo-text-muted">
      <span className="w-5 h-5 rounded-full border-2 border-repo-border border-t-repo-accent animate-spin" />
      {label && <span className="text-[11px]">{label}</span>}
    </div>
  );
}

const symbolInfo = {
  name: 'AuthService.login',
  type: 'Method',
  references: 7,
  calledBy: ['LoginScreen', 'AuthProvider', 'SplashService'],
  dependencies: ['ApiService', 'User'],
};

interface PanelInfo {
  name: string;
  type: string;
  references: number | null;
  calledBy: string[];
  dependencies: string[];
}

const KIND_LABELS: Record<string, string> = {
  class: 'Class',
  interface: 'Interface',
  enum: 'Enum',
  function: 'Function',
  method: 'Method',
  component: 'Component',
};

export function CodeExplorer() {
  const {
    activeFile, setActiveFile, setActiveTab, activeTab, setWorkspaceView,
    selectedRepo, openFiles, closeTab, resetExplorerFiles, startAnalysis,
  } = useApp();
  const [copied, setCopied] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const [repoState, setRepoState] = useState<RepoState>('idle');
  const [realTree, setRealTree] = useState<FileNode | null>(null);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeRetry, setTreeRetry] = useState(0);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const isNative = canUseNativeRepo() && !!selectedRepo;
  const [owner, repoName] = selectedRepo ? selectedRepo.fullName.split('/') : ['', ''];
  const openFilesRef = useRef(openFiles);

  useEffect(() => {
    openFilesRef.current = openFiles;
  }, [openFiles]);

  useEffect(() => {
    if (!isNative || !owner || !repoName) {
      setRepoState('idle');
      setRealTree(null);
      return;
    }
    let cancelled = false;
    setRepoState('loading');
    setTreeError(null);

    void (async () => {
      try {
        const status = await getLocalStatus(owner, repoName);
        if (cancelled) return;
        if (!status.downloaded) {
          setRepoState('not-downloaded');
          setRealTree(null);
          return;
        }
        const { root } = await getRepositoryTree(owner, repoName);
        if (cancelled) return;
        const tree = toFileNode(root);
        setRealTree(tree);
        setRepoState('ready');
        if (openFilesRef.current.length === 0) {
          const preferred = findPreferredFile(tree);
          if (preferred) resetExplorerFiles(preferred);
        }
      } catch (err) {
        if (!cancelled) {
          setRepoState('error');
          setRealTree(null);
          setTreeError(getErrorMessage(err));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isNative, owner, repoName, treeRetry, resetExplorerFiles]);

  const isReal = isNative && repoState === 'ready' && !!realTree;

  useEffect(() => {
    if (!isReal || !owner || !repoName || !activeFile) {
      setFileContent(null);
      setFileError(null);
      setFileLoading(false);
      return;
    }
    let cancelled = false;
    setFileLoading(true);
    setFileError(null);

    void readRepositoryFile(owner, repoName, activeFile)
      .then((res) => {
        if (cancelled) return;
        setFileContent(res.content);
        setFileLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setFileContent(null);
        setFileError(getErrorMessage(err));
        setFileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isReal, owner, repoName, activeFile]);

  const useIntel = isReal && canUseRepoIntel();
  const [panelStructure, setPanelStructure] = useState<RepoStructure | null>(null);

  useEffect(() => {
    if (!useIntel || !owner || !repoName) {
      setPanelStructure(null);
      return;
    }
    let cancelled = false;
    loadStructure(owner, repoName)
      .then((s) => { if (!cancelled) setPanelStructure(s); })
      .catch(() => { if (!cancelled) setPanelStructure(null); });
    return () => {
      cancelled = true;
    };
  }, [useIntel, owner, repoName, selectedRepo?.id]);

  const panel: PanelInfo | null = (() => {
    if (!useIntel) return null;
    if (!panelStructure) {
      return activeFile
        ? { name: basenameOf(activeFile) || '—', type: 'File', references: null, calledBy: [], dependencies: [] }
        : null;
    }
    const defs = definitionsForFile(panelStructure, activeFile);
    const primary = defs[0] ?? null;
    return {
      name: primary?.name ?? basenameOf(activeFile) ?? '—',
      type: primary ? KIND_LABELS[primary.kind] ?? 'Symbol' : 'File',
      references: null,
      calledBy: filesImportingFile(panelStructure, activeFile).map((f) => basenameOf(f)).slice(0, 6),
      dependencies: rawDependencies(panelStructure, activeFile),
    };
  })();

  const [panelRefCount, setPanelRefCount] = useState<number | null>(null);

  useEffect(() => {
    if (!useIntel || !owner || !repoName || !panel || !panelStructure) {
      setPanelRefCount(null);
      return;
    }
    const symbol = panel.name;
    if (!symbol || symbol === '—') {
      setPanelRefCount(null);
      return;
    }
    let cancelled = false;
    setPanelRefCount(null);
    searchRepo(owner, repoName, symbol, { word: true })
      .then((res) => { if (!cancelled) setPanelRefCount(res.matches.length); })
      .catch(() => { if (!cancelled) setPanelRefCount(null); });
    return () => {
      cancelled = true;
    };
  }, [useIntel, owner, repoName, panel?.name, panelStructure]);

  const displayPanel: PanelInfo | null = panel
    ? { ...panel, references: panelRefCount }
    : useIntel
      ? null
      : symbolInfo;

  const handleCopy = () => {
    navigator.clipboard.writeText(isReal ? (fileContent ?? '') : authServiceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLines = (isReal ? (fileContent ?? '') : authServiceCode).split('\n');

  const renderCode = () => {
    if (isReal) {
      if (fileLoading) return <LoadingIndicator label="Opening file..." />;
      if (fileError) {
        return (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-repo-text-muted">
            <AlertCircle size={16} className="text-repo-danger/70" />
            <span className="text-[11px] text-center max-w-[320px]">{fileError}</span>
          </div>
        );
      }
      if (!activeFile || !fileContent) {
        return (
          <div className="flex items-center justify-center py-10 text-[11px] text-repo-text-muted">
            Select a file to view its source.
          </div>
        );
      }
    }

    return (
      <div className="flex">
        {/* Line numbers */}
        <div className="flex-shrink-0 py-2 pr-2 text-right select-none" style={{ minWidth: '48px' }}>
          {displayLines.map((_, i) => (
            <div key={i} className="px-2 text-[11px] leading-[20px] text-repo-text-muted/50 font-mono">
              {i + 1}
            </div>
          ))}
        </div>
        {/* Code content */}
        <div className="flex-1 py-2 pl-2 overflow-x-auto">
          <pre className="text-[11px] leading-[20px] font-mono">
            {displayLines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  'px-2 rounded',
                  !isReal && i === 5 ? 'bg-repo-accent/5 border-l-2 border-repo-accent' : ''
                )}
              >
                <span className="text-repo-text-secondary">
                  {line
                    .replace(/\b(class|Future|async|await|try|catch|if|return|final|String|int|bool|void|null|const|let|var|function|export|import|from|new|this)\b/g, '<kw>$1</kw>')
                    .split(/(<kw>.*?<\/kw>|'.*?'|".*?")/)
                    .map((part, j) => {
                      if (part.startsWith('<kw>')) {
                        return <span key={j} className="text-purple-400">{part.replace(/<\/?kw>/g, '')}</span>;
                      }
                      if (part.startsWith("'") || part.startsWith('"')) {
                        return <span key={j} className="text-repo-accent/70">{part}</span>;
                      }
                      if (part.includes('//')) {
                        return <span key={j} className="text-repo-text-muted">{part}</span>;
                      }
                      return <span key={j}>{part}</span>;
                    })
                  }
                </span>
              </div>
            ))}
          </pre>
        </div>
      </div>
    );
  };

  const renderTree = () => {
    if (!isNative) {
      return <FileTreeNode node={kamaoFileTree} activeFile={activeFile} onSelect={setActiveFile} />;
    }
    if (repoState === 'loading') return <LoadingIndicator label="Loading file tree..." />;
    if (repoState === 'not-downloaded') {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <AlertCircle size={16} className="text-repo-text-muted" />
          <p className="text-[11px] text-repo-text-secondary leading-relaxed">
            {selectedRepo?.name} is not downloaded locally yet.
          </p>
          <button
            onClick={() => startAnalysis()}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-repo-accent text-repo-bg text-[11px] font-medium hover:bg-repo-accent/90 transition-colors"
          >
            <Download size={12} />
            Download Repository
          </button>
        </div>
      );
    }
    if (repoState === 'error') {
      return (
        <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <AlertCircle size={16} className="text-repo-danger/70" />
          <p className="text-[11px] text-repo-text-secondary leading-relaxed break-words">{treeError}</p>
          <button
            onClick={() => setTreeRetry((n) => n + 1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded border border-repo-border text-[11px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/40 transition-colors"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
        </div>
      );
    }
    if (realTree) return <FileTreeNode node={realTree} activeFile={activeFile} onSelect={setActiveFile} />;
    return null;
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 h-[28px] border-b border-repo-border text-[10px] text-repo-text-muted">
        {!isReal && (
          <>
            <span>kamao</span>
            <ChevronRight size={10} />
            <span>lib</span>
            <ChevronRight size={10} />
            <span>services</span>
            <ChevronRight size={10} />
            <span className="text-repo-text-secondary">{activeFile}</span>
          </>
        )}
        {isReal && (
          <>
            <span>{selectedRepo?.name}</span>
            {activeFile ? (
              activeFile.split('/').map((part, i, arr) => (
                <span key={`${part}-${i}`} className="flex items-center gap-1">
                  <ChevronRight size={10} />
                  <span className={i === arr.length - 1 ? 'text-repo-text-secondary' : undefined}>{part}</span>
                </span>
              ))
            ) : (
              <span className="flex items-center gap-1">
                <ChevronRight size={10} />
                <span className="text-repo-text-muted">no file open</span>
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        <div className="w-[220px] border-r border-repo-border overflow-y-auto py-1 flex-shrink-0">
          {renderTree()}
        </div>

        {/* Code area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center h-[30px] border-b border-repo-border bg-repo-surface">
            <div className="flex items-center h-full overflow-x-auto">
              {openFiles.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'group flex items-center gap-1.5 px-3 h-full text-[11px] border-r border-repo-border transition-colors flex-shrink-0',
                    activeTab === tab
                      ? 'bg-repo-bg text-repo-text'
                      : 'text-repo-text-muted hover:text-repo-text-secondary'
                  )}
                >
                  <FileCode size={11} />
                  {tab.split('/').pop()}
                  <span
                    role="button"
                    aria-label={`Close ${tab}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab);
                    }}
                    className="opacity-0 group-hover:opacity-100 ml-1 text-repo-text-muted hover:text-repo-text transition-opacity"
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1 px-2">
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text-secondary transition-colors"
              >
                {copied ? <Check size={12} className="text-repo-success" /> : <Copy size={12} />}
              </button>
            </div>
          </div>

          {/* Code */}
          <div className="flex-1 overflow-auto">
            {renderCode()}
          </div>
        </div>

        {/* Right panel - Code Intelligence */}
        {rightPanelOpen && (
          <div className="w-[240px] border-l border-repo-border overflow-y-auto flex-shrink-0 bg-repo-surface">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-medium text-repo-text">
                  {displayPanel?.name ?? 'No file selected'}
                </h3>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted"
                >
                  <ChevronRight size={12} />
                </button>
              </div>

              {displayPanel && (
              <>
              <div className="flex items-center gap-2 mb-3">
                <span className="px-1.5 py-0.5 rounded bg-repo-accent/10 text-[9px] font-medium text-repo-accent">
                  {displayPanel.type}
                </span>
                <span className="text-[10px] text-repo-text-muted">
                  References: {displayPanel.references ?? '…'}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1.5 font-medium">Called by</h4>
                  <div className="space-y-1">
                    {displayPanel.calledBy.length === 0 && (
                      <span className="text-[10px] text-repo-text-muted">No importing files found.</span>
                    )}
                    {displayPanel.calledBy.map((name) => (
                      <button
                        key={name}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
                      >
                        <GitBranch size={10} className="text-repo-text-muted" />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1.5 font-medium">Dependencies</h4>
                  <div className="space-y-1">
                    {displayPanel.dependencies.length === 0 && (
                      <span className="text-[10px] text-repo-text-muted">No imports in this file.</span>
                    )}
                    {displayPanel.dependencies.map((name) => (
                      <button
                        key={name}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
                      >
                        <ExternalLink size={10} className="text-repo-text-muted" />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              </>
              )}

                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1.5 font-medium">Actions</h4>
                  <div className="space-y-1">
                    {[
                      { icon: Eye, label: 'Explain' },
                      { icon: Search, label: 'References' },
                      { icon: GitBranch, label: 'Trace' },
                      { icon: Zap, label: 'Impact' },
                    ].map(({ icon: Icon, label }) => (
                      <button
                        key={label}
                        onClick={() => {
                          if (label === 'Impact') setWorkspaceView('impact');
                          if (label === 'References') setWorkspaceView('search');
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
                      >
                        <Icon size={10} className="text-repo-text-muted" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
            </div>
          </div>
        )}

        {/* Toggle right panel */}
        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="w-[24px] border-l border-repo-border flex items-center justify-center text-repo-text-muted hover:text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
          >
            <ChevronRight size={12} className="rotate-180" />
          </button>
        )}
      </div>
    </div>
  );
}
