import { useState } from 'react';
import { Settings as SettingsIcon, Palette, Code2, Brain, Shield, Info } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';
import { useApp } from '../store/AppContext';

export function Settings() {
  const { user } = useApp();
  const [font, setFont] = useState('JetBrains Mono');
  const [fontSize, setFontSize] = useState(14);
  const [provider] = useState('Ollama');
  const [model] = useState('Qwen2.5-Coder 7B');
  const [status] = useState('Running locally');

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="px-4 pt-4 pb-3 border-b border-repo-border">
        <div className="flex items-center gap-2">
          <SettingsIcon size={16} className="text-repo-text-secondary" />
          <h1 className="text-[14px] font-semibold text-repo-text">Settings</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-[520px] space-y-6">
          {/* General */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">Appearance</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Theme</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded bg-repo-accent/10 text-[11px] text-repo-accent">Dark</span>
                </div>
              </div>
            </div>
          </section>

          {/* Editor */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Code2 size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">Editor</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Font</span>
                <select
                  value={font}
                  onChange={(e) => setFont(e.target.value)}
                  className="px-2 py-1 bg-repo-surface-2 border border-repo-border rounded text-[11px] text-repo-text outline-none"
                >
                  <option>JetBrains Mono</option>
                  <option>Fira Code</option>
                  <option>Source Code Pro</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Size</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFontSize(s => Math.max(10, s - 1))}
                    className="w-6 h-6 rounded bg-repo-surface-2 border border-repo-border text-[11px] text-repo-text-secondary hover:text-repo-text transition-colors"
                  >
                    -
                  </button>
                  <span className="text-[11px] text-repo-text w-6 text-center font-mono">{fontSize}</span>
                  <button
                    onClick={() => setFontSize(s => Math.min(24, s + 1))}
                    className="w-6 h-6 rounded bg-repo-surface-2 border border-repo-border text-[11px] text-repo-text-secondary hover:text-repo-text transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* AI */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Brain size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">AI</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Provider</span>
                <span className="text-[11px] text-repo-text">{provider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Model</span>
                <span className="text-[11px] text-repo-text">{model}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Status</span>
                <div className="flex items-center gap-1.5 text-[11px] text-repo-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-repo-success" />
                  {status}
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">Privacy</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Source code processing</span>
                <span className="text-[11px] text-repo-accent">Local</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Status</span>
                <div className="flex items-center gap-1.5 text-[11px] text-repo-success">
                  <Shield size={10} className="text-repo-success" />
                  Protected
                </div>
              </div>
            </div>
          </section>

          {/* GitHub */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <GithubIcon size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">GitHub</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Connected account</span>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-repo-accent/20 flex items-center justify-center text-[8px] font-medium text-repo-accent">
                    {user?.avatar ?? '?'}
                  </div>
                  <span className="text-[11px] text-repo-text">{user?.name}</span>
                  <span className="text-[10px] text-repo-text-muted">{user?.username}</span>
                </div>
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Info size={14} className="text-repo-text-muted" />
              <h2 className="text-[12px] font-medium text-repo-text">About</h2>
            </div>
            <div className="bg-repo-surface border border-repo-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Version</span>
                <span className="text-[11px] text-repo-text font-mono">0.1.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-repo-text-secondary">Open source</span>
                <span className="text-[11px] text-repo-text-secondary">Yes</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
