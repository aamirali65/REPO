import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Search, ChevronRight, ExternalLink, GitBranch, Eye } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { suggestedQuestions, type ChatMessage, type SourceRef } from '../data/mockData';
import { cn } from '../lib/utils';

const aiResponses: Record<string, { content: string; sources: SourceRef[] }> = {
  'where is authentication handled?': {
    content: `Authentication is primarily handled by **AuthService**.\n\nThe login flow starts from **LoginScreen** and passes credentials to \`AuthService.login()\`. The service communicates with **ApiService** and stores the resulting session state.\n\nThe complete flow:\n1. LoginScreen collects email and password\n2. AuthProvider calls AuthService.login()\n3. AuthService sends a POST request to /auth/login\n4. On success, the session token is stored via StorageService\n5. AuthProvider updates the app state, making HomeScreen accessible`,
    sources: [
      { file: 'auth_service.dart', lines: '24-91', snippet: 'Future<User?> login(String email, String password) async {' },
      { file: 'login_screen.dart', lines: '48-76', snippet: 'void _handleLogin() async {' },
      { file: 'auth_provider.dart', lines: '12-54', snippet: 'Future<void> login(String email, String password) async {' },
    ],
  },
  'how does the login flow work?': {
    content: `The login flow works as follows:\n\n1. User enters credentials on **LoginScreen**\n2. LoginScreen validates input using Validators\n3. **AuthProvider.login()** is called with email and password\n4. AuthProvider delegates to **AuthService.login()**\n5. AuthService makes an HTTP POST to the REST API\n6. On success, AuthService stores the session token\n7. AuthProvider updates app state\n8. Navigator pushes HomeScreen, replacing the auth stack`,
    sources: [
      { file: 'login_screen.dart', lines: '48-76' },
      { file: 'auth_provider.dart', lines: '18-35' },
      { file: 'auth_service.dart', lines: '24-50' },
    ],
  },
  'default': {
    content: `That's a great question. Let me analyze the codebase to find the relevant information.\n\nBased on the code structure, this involves multiple components working together. I've identified the key files and their relationships.`,
    sources: [
      { file: 'auth_service.dart', lines: '1-100' },
    ],
  },
};

function parseMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    let processed: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        processed.push(line.slice(lastIndex, match.index));
      }
      processed.push(<strong key={`b-${i}-${match.index}`} className="text-repo-text font-medium">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < line.length) {
      processed.push(line.slice(lastIndex));
    }
    
    // Code
    const codeRegex = /`(.*?)`/g;
    processed = processed.map((part) => {
      if (typeof part !== 'string') return part;
      const codeParts: React.ReactNode[] = [];
      let lastIdx = 0;
      let codeMatch;
      while ((codeMatch = codeRegex.exec(part)) !== null) {
        if (codeMatch.index > lastIdx) {
          codeParts.push(part.slice(lastIdx, codeMatch.index));
        }
        codeParts.push(
          <code key={`c-${codeMatch.index}`} className="px-1 py-0.5 rounded bg-repo-surface-2 text-repo-accent/80 text-[11px] font-mono">
            {codeMatch[1]}
          </code>
        );
        lastIdx = codeMatch.index + codeMatch[0].length;
      }
      if (lastIdx < part.length) {
        codeParts.push(part.slice(lastIdx));
      }
      return codeParts.length > 0 ? codeParts : part;
    });

    if (line.startsWith('1. ') || line.startsWith('2. ') || line.startsWith('3. ') || line.startsWith('4. ') || line.startsWith('5. ')) {
      return (
        <div key={i} className="flex items-start gap-2 ml-1">
          <span className="text-repo-accent/60 text-[11px] font-mono mt-0.5">{line[0]}.</span>
          <span>{processed.map((p, j) => typeof p === 'string' ? p.replace(/^\d+\.\s*/, '') : p)}</span>
        </div>
      );
    }

    if (line === '') return <div key={i} className="h-2" />;
    return <div key={i}>{processed}</div>;
  });
}

export function Chat() {
  const { chatMessages, addChatMessage, setActiveFile, setWorkspaceView } = useApp();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const key = text.toLowerCase();
      const response = aiResponses[key] || aiResponses['default'];
      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        sources: response.sources,
        timestamp: Date.now(),
      };
      addChatMessage(aiMsg);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const openFile = (file: string) => {
    setActiveFile(file);
    setWorkspaceView('explorer');
  };

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-5 pb-3">
        <h1 className="text-[16px] font-semibold text-repo-text">Ask Repo</h1>
        <p className="text-[11px] text-repo-text-secondary mt-0.5">
          Understand your codebase with natural language.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {chatMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <p className="text-[13px] text-repo-text-secondary">What do you want to understand?</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-[480px]">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="px-3 py-1.5 rounded border border-repo-border text-[11px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-[640px] mx-auto space-y-4">
          {chatMessages.map((msg) => (
            <div key={msg.id} className="animate-slide-up">
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-lg bg-repo-accent/10 text-[12px] text-repo-text">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="px-1">
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-4 h-4 rounded bg-repo-accent/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-repo-accent">R</span>
                      </div>
                      <span className="text-[10px] font-medium text-repo-accent">Repo</span>
                    </div>
                    <div className="text-[12px] text-repo-text-secondary leading-relaxed space-y-1">
                      {parseMarkdown(msg.content)}
                    </div>
                  </div>

                  {/* Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 px-1">
                      <div className="text-[10px] text-repo-text-muted mb-1.5 font-medium">Sources</div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((src, i) => (
                          <button
                            key={i}
                            onClick={() => openFile(src.file)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-repo-surface border border-repo-border text-[10px] text-repo-text-secondary hover:text-repo-text hover:border-repo-text-muted/30 transition-colors group"
                          >
                            <span className="font-mono text-repo-accent/70">{src.file}</span>
                            <span className="text-repo-text-muted">{src.lines}</span>
                            <ExternalLink size={10} className="text-repo-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => openFile(msg.sources![0].file)}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-repo-accent hover:bg-repo-accent/10 transition-colors"
                        >
                          Open file
                          <ChevronRight size={10} />
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-repo-text-secondary hover:text-repo-text transition-colors">
                          <Eye size={10} />
                          View context
                        </button>
                        <button className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-repo-text-secondary hover:text-repo-text transition-colors">
                          <GitBranch size={10} />
                          Trace flow
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="animate-fade-in">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-repo-accent/20 flex items-center justify-center">
                  <span className="text-[8px] font-bold text-repo-accent">R</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-repo-accent/40 animate-pulse-dot" />
                  <span className="w-1.5 h-1.5 rounded-full bg-repo-accent/40 animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-repo-accent/40 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="px-6 pb-4">
        <div className="max-w-[640px] mx-auto">
          <div className="flex items-end gap-2 bg-repo-surface border border-repo-border rounded-lg px-3 py-2 focus-within:border-repo-text-muted/40 transition-colors">
            <button className="p-1 text-repo-text-muted hover:text-repo-text-secondary transition-colors mb-0.5">
              <Paperclip size={14} />
            </button>
            <button className="p-1 text-repo-text-muted hover:text-repo-text-secondary transition-colors mb-0.5">
              <Search size={14} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask about your codebase..."
              rows={1}
              className="flex-1 bg-transparent text-[12px] text-repo-text placeholder:text-repo-text-muted outline-none resize-none max-h-[100px] py-0.5"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className={cn(
                'p-1 rounded transition-colors mb-0.5',
                input.trim()
                  ? 'text-repo-accent hover:bg-repo-accent/10'
                  : 'text-repo-text-muted/40'
              )}
            >
              <Send size={14} />
            </button>
          </div>
          <p className="text-[9px] text-repo-text-muted/50 mt-1.5 text-center">
            Repo uses local AI to analyze your code.
          </p>
        </div>
      </div>
    </div>
  );
}
