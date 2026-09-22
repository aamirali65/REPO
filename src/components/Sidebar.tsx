import React from 'react';
import {
  MessageSquare, Code2, Network, AlertTriangle, Search,
  Settings, ChevronLeft, ChevronRight, FileCode, Folder
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';
import { RepoLogo } from './RepoLogo';
import { useApp } from '../store/AppContext';
import { currentUser } from '../data/mockData';
import { cn } from '../lib/utils';

const navItems = [
  { id: 'chat' as const, label: 'Ask Repo', icon: MessageSquare, group: 'CHAT' },
];

const codeItems = [
  { id: 'explorer' as const, label: 'Explorer', icon: Code2 },
  { id: 'search' as const, label: 'Search', icon: Search },
  { id: 'architecture' as const, label: 'Architecture', icon: Network },
  { id: 'impact' as const, label: 'Impact', icon: AlertTriangle },
];

export function Sidebar() {
  const { workspaceView, setWorkspaceView, sidebarCollapsed, toggleSidebar, selectedRepo, setRepoSwitcherOpen } = useApp();

  return (
    <aside
      className={cn(
        'h-full bg-repo-surface border-r border-repo-border flex flex-col transition-all duration-200 select-none',
        sidebarCollapsed ? 'w-[52px]' : 'w-[220px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-[40px] border-b border-repo-border">
        {!sidebarCollapsed && <RepoLogo size={18} showText />}
        {sidebarCollapsed && <RepoLogo size={18} />}
        <button
          onClick={toggleSidebar}
          className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text-secondary transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2 px-1.5">
        {/* CHAT group */}
        {!sidebarCollapsed && (
          <div className="px-2 mb-1">
            <span className="text-[10px] font-medium tracking-wider text-repo-text-muted uppercase">
              Workspace
            </span>
          </div>
        )}
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setWorkspaceView(item.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] transition-colors mb-0.5',
              workspaceView === item.id
                ? 'bg-repo-accent/10 text-repo-accent'
                : 'text-repo-text-secondary hover:bg-repo-surface-2 hover:text-repo-text'
            )}
          >
            <item.icon size={14} className={workspaceView === item.id ? 'text-repo-accent' : 'text-repo-text-muted'} />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* CODE group */}
        <div className={cn('mt-3', sidebarCollapsed ? 'px-0' : 'px-2')}>
          {!sidebarCollapsed && (
            <span className="text-[10px] font-medium tracking-wider text-repo-text-muted uppercase">
              Code
            </span>
          )}
        </div>
        {codeItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setWorkspaceView(item.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] transition-colors mb-0.5',
              workspaceView === item.id
                ? 'bg-repo-accent/10 text-repo-accent'
                : 'text-repo-text-secondary hover:bg-repo-surface-2 hover:text-repo-text'
            )}
          >
            <item.icon size={14} className={workspaceView === item.id ? 'text-repo-accent' : 'text-repo-text-muted'} />
            {!sidebarCollapsed && <span>{item.label}</span>}
          </button>
        ))}

        {/* Repository section */}
        <div className={cn('mt-3', sidebarCollapsed ? 'px-0' : 'px-2')}>
          {!sidebarCollapsed && (
            <span className="text-[10px] font-medium tracking-wider text-repo-text-muted uppercase">
              Repository
            </span>
          )}
        </div>
        <button
          onClick={() => setRepoSwitcherOpen(true)}
          className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] text-repo-text-secondary hover:bg-repo-surface-2 hover:text-repo-text transition-colors"
        >
          <Folder size={14} className="text-repo-text-muted" />
          {!sidebarCollapsed && (
            <div className="flex flex-col items-start">
              <span className="font-medium">{selectedRepo?.name || 'No repo'}</span>
              <span className="text-[10px] text-repo-text-muted">main · {selectedRepo?.files || 0} files</span>
            </div>
          )}
        </button>

        {!sidebarCollapsed && (
          <div className="mt-2 px-2">
            <button
              onClick={() => setWorkspaceView('github')}
              className="flex items-center gap-1.5 text-[11px] text-repo-text-muted hover:text-repo-text-secondary transition-colors"
            >
              <GithubIcon size={12} />
              <span>{selectedRepo?.fullName || ''}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom */}
      <div className="border-t border-repo-border px-2 py-2">
        <button
          onClick={() => setWorkspaceView('settings')}
          className={cn(
            'w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] transition-colors',
            workspaceView === 'settings'
              ? 'bg-repo-accent/10 text-repo-accent'
              : 'text-repo-text-secondary hover:bg-repo-surface-2 hover:text-repo-text'
          )}
        >
          <Settings size={14} className={workspaceView === 'settings' ? 'text-repo-accent' : 'text-repo-text-muted'} />
          {!sidebarCollapsed && <span>Settings</span>}
        </button>
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 mt-2 px-2">
            <div className="w-6 h-6 rounded-full bg-repo-accent/20 flex items-center justify-center text-[10px] font-medium text-repo-accent">
              {currentUser.avatar}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-repo-text">{currentUser.name}</span>
              <span className="text-[10px] text-repo-text-muted">{currentUser.username}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
