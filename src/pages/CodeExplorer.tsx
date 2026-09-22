import { useState } from 'react';
import {
  ChevronRight, ChevronDown, FileCode, Folder, FolderOpen,
  Copy, Check, ExternalLink, GitBranch, Eye, Zap, Search
} from 'lucide-react';
import { useApp } from '../store/AppContext';
import { kamaoFileTree, authServiceCode, type FileNode } from '../data/mockData';
import { cn } from '../lib/utils';

function FileTreeNode({ node, depth = 0, activeFile, onSelect }: {
  node: FileNode;
  depth?: number;
  activeFile: string;
  onSelect: (name: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);

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
                key={child.name}
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
      onClick={() => onSelect(node.name)}
      className={cn(
        'w-full flex items-center gap-1.5 py-0.5 px-1 rounded text-[11px] transition-colors',
        activeFile === node.name
          ? 'bg-repo-accent/10 text-repo-accent'
          : 'text-repo-text-secondary hover:bg-repo-surface-2'
      )}
      style={{ paddingLeft: `${depth * 12 + 16}px` }}
    >
      <FileCode size={12} className={activeFile === node.name ? 'text-repo-accent' : 'text-repo-text-muted'} />
      <span className={node.name.endsWith('.dart') ? '' : 'text-repo-text-muted'}>{node.name}</span>
    </button>
  );
}

const codeLines = authServiceCode.split('\n');

const symbolInfo = {
  name: 'AuthService.login',
  type: 'Method',
  references: 7,
  calledBy: ['LoginScreen', 'AuthProvider', 'SplashService'],
  dependencies: ['ApiService', 'User'],
};

export function CodeExplorer() {
  const { activeFile, setActiveFile, setActiveTab, activeTab, setWorkspaceView } = useApp();
  const [copied, setCopied] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const handleCopy = () => {
    navigator.clipboard.writeText(authServiceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-3 h-[28px] border-b border-repo-border text-[10px] text-repo-text-muted">
        <span>kamao</span>
        <ChevronRight size={10} />
        <span>lib</span>
        <ChevronRight size={10} />
        <span>services</span>
        <ChevronRight size={10} />
        <span className="text-repo-text-secondary">{activeFile}</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        <div className="w-[220px] border-r border-repo-border overflow-y-auto py-1 flex-shrink-0">
          <FileTreeNode node={kamaoFileTree} activeFile={activeFile} onSelect={setActiveFile} />
        </div>

        {/* Code area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center h-[30px] border-b border-repo-border bg-repo-surface">
            <div className="flex items-center h-full">
              {['auth_service.dart', 'api_service.dart'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 h-full text-[11px] border-r border-repo-border transition-colors',
                    activeTab === tab
                      ? 'bg-repo-bg text-repo-text'
                      : 'text-repo-text-muted hover:text-repo-text-secondary'
                  )}
                >
                  <FileCode size={11} />
                  {tab}
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
            <div className="flex">
              {/* Line numbers */}
              <div className="flex-shrink-0 py-2 pr-2 text-right select-none" style={{ minWidth: '48px' }}>
                {codeLines.map((_, i) => (
                  <div key={i} className="px-2 text-[11px] leading-[20px] text-repo-text-muted/50 font-mono">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Code content */}
              <div className="flex-1 py-2 pl-2 overflow-x-auto">
                <pre className="text-[11px] leading-[20px] font-mono">
                  {codeLines.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        'px-2 rounded',
                        i === 5 ? 'bg-repo-accent/5 border-l-2 border-repo-accent' : ''
                      )}
                    >
                      <span className="text-repo-text-secondary">
                        {line
                          .replace(/\b(class|Future|async|await|try|catch|if|return|final|String|int|bool|void|null)\b/g, '<kw>$1</kw>')
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
          </div>
        </div>

        {/* Right panel - Code Intelligence */}
        {rightPanelOpen && (
          <div className="w-[240px] border-l border-repo-border overflow-y-auto flex-shrink-0 bg-repo-surface">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-medium text-repo-text">{symbolInfo.name}</h3>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted"
                >
                  <ChevronRight size={12} />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-1.5 py-0.5 rounded bg-repo-accent/10 text-[9px] font-medium text-repo-accent">
                  {symbolInfo.type}
                </span>
                <span className="text-[10px] text-repo-text-muted">
                  References: {symbolInfo.references}
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1.5 font-medium">Called by</h4>
                  <div className="space-y-1">
                    {symbolInfo.calledBy.map((name) => (
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
                    {symbolInfo.dependencies.map((name) => (
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
