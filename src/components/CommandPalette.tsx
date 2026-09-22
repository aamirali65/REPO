import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Code2, Network, AlertTriangle, Search,
  Settings, Folder, ArrowRight, CornerDownLeft
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { useApp, type WorkspaceView } from '../store/AppContext';

const commands = [
  { id: 'chat', label: 'Ask Repo', icon: MessageSquare, view: 'chat' as WorkspaceView },
  { id: 'search', label: 'Search Code', icon: Search, view: 'search' as WorkspaceView },
  { id: 'explorer', label: 'Open File', icon: Code2, view: 'explorer' as WorkspaceView },
  { id: 'architecture', label: 'Architecture', icon: Network, view: 'architecture' as WorkspaceView },
  { id: 'impact', label: 'Impact Analysis', icon: AlertTriangle, view: 'impact' as WorkspaceView },
  { id: 'switch-repo', label: 'Switch Repository', icon: Folder, action: 'switchRepo' },
  { id: 'github', label: 'GitHub', icon: GithubIcon, view: 'github' as WorkspaceView },
  { id: 'settings', label: 'Settings', icon: Settings, view: 'settings' as WorkspaceView },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setWorkspaceView, setRepoSwitcherOpen } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const executeCommand = (cmd: typeof commands[0]) => {
    if (cmd.view) setWorkspaceView(cmd.view);
    if (cmd.action === 'switchRepo') setRepoSwitcherOpen(true);
    setCommandPaletteOpen(false);
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/50" onClick={() => setCommandPaletteOpen(false)} />
      <div className="relative w-full max-w-[480px] bg-repo-panel border border-repo-border rounded-lg shadow-2xl animate-scale-in overflow-hidden">
        <div className="flex items-center gap-2 px-3 h-[40px] border-b border-repo-border">
          <Search size={14} className="text-repo-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
              }
              if (e.key === 'Enter' && filtered[selectedIndex]) {
                executeCommand(filtered[selectedIndex]);
              }
            }}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-[13px] text-repo-text placeholder:text-repo-text-muted outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-repo-surface border border-repo-border text-[9px] text-repo-text-muted">
            esc
          </kbd>
        </div>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {filtered.map((cmd, i) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-[12px] transition-colors ${
                  i === selectedIndex
                    ? 'bg-repo-accent/10 text-repo-accent'
                    : 'text-repo-text-secondary hover:bg-repo-surface-2'
                }`}
              >
                <Icon size={14} className={i === selectedIndex ? 'text-repo-accent' : 'text-repo-text-muted'} />
                <span className="flex-1 text-left">{cmd.label}</span>
                <ArrowRight size={12} className="text-repo-text-muted opacity-0 group-hover:opacity-100" />
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[12px] text-repo-text-muted">
              No commands found
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-repo-border text-[10px] text-repo-text-muted">
          <span className="flex items-center gap-1">
            <CornerDownLeft size={10} />
            select
          </span>
          <span className="flex items-center gap-1">
            ↑↓ navigate
          </span>
        </div>
      </div>
    </div>
  );
}
