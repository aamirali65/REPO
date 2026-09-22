import React, { useState, useRef } from 'react';
import {
  Monitor, Cpu, Database, Cloud, Layers, Box,
  RotateCcw, ZoomIn, ZoomOut, X
} from 'lucide-react';
import { archNodes, archEdges, type ArchNode } from '../data/mockData';
import { cn } from '../lib/utils';

const typeIcons: Record<string, React.FC<{ size: number }>> = {
  screen: Monitor,
  provider: Cpu,
  service: Layers,
  model: Box,
  api: Cloud,
  storage: Database,
};

const typeColors: Record<string, string> = {
  screen: '#B8F36B',
  provider: '#60A5FA',
  service: '#A78BFA',
  model: '#F472B6',
  api: '#FBBF24',
  storage: '#34D399',
};

export function Architecture() {
  const [selectedNode, setSelectedNode] = useState<ArchNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.arch-bg')) {
      setIsPanning(true);
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => setIsPanning(false);

  return (
    <div className="h-full flex flex-col bg-repo-bg animate-fade-in">
      <div className="flex items-center justify-between px-4 h-[40px] border-b border-repo-border">
        <div>
          <h1 className="text-[13px] font-semibold text-repo-text">Architecture</h1>
          <p className="text-[10px] text-repo-text-muted">AI-generated map of the project</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
            className="p-1.5 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
            className="p-1.5 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="p-1.5 rounded hover:bg-repo-surface-2 text-repo-text-muted hover:text-repo-text transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-hidden cursor-grab active:cursor-grabbing relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="absolute arch-bg"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              width: '100%',
              height: '100%',
            }}
          >
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
              {/* Edges */}
              {archEdges.map((edge, i) => {
                const from = archNodes.find(n => n.id === edge.from);
                const to = archNodes.find(n => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={i}
                    x1={from.x + 60}
                    y1={from.y + 20}
                    x2={to.x + 60}
                    y2={to.y + 20}
                    stroke="#23262A"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {archNodes.map((node) => {
              const Icon = typeIcons[node.type] || Box;
              const color = typeColors[node.type];
              return (
                <button
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(selectedNode?.id === node.id ? null : node);
                  }}
                  className={cn(
                    'absolute flex items-center gap-2 px-3 py-2 rounded border transition-all duration-150',
                    selectedNode?.id === node.id
                      ? 'bg-repo-surface-2 border-repo-accent/40'
                      : 'bg-repo-surface border-repo-border hover:border-repo-text-muted/30'
                  )}
                  style={{ left: node.x, top: node.y }}
                >
                  <div
                    className="w-5 h-5 rounded flex items-center justify-center"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon size={12} style={{ color }} />
                  </div>
                  <span className="text-[11px] text-repo-text whitespace-nowrap">{node.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Info panel */}
        {selectedNode && (
          <div className="w-[240px] border-l border-repo-border bg-repo-surface overflow-y-auto animate-slide-up">
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-medium text-repo-text">{selectedNode.name}</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded hover:bg-repo-surface-2 text-repo-text-muted"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1">Type</h4>
                  <span
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-medium capitalize"
                    style={{ backgroundColor: `${typeColors[selectedNode.type]}15`, color: typeColors[selectedNode.type] }}
                  >
                    {selectedNode.type}
                  </span>
                </div>

                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1">Connections</h4>
                  <div className="space-y-1">
                    {archEdges
                      .filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                      .map((edge, i) => {
                        const connectedId = edge.from === selectedNode.id ? edge.to : edge.from;
                        const connected = archNodes.find(n => n.id === connectedId);
                        if (!connected) return null;
                        const direction = edge.from === selectedNode.id ? '→' : '←';
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedNode(connected)}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] text-repo-text-secondary hover:bg-repo-surface-2 transition-colors"
                          >
                            <span className="text-repo-text-muted text-[10px]">{direction}</span>
                            {connected.name}
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] text-repo-text-muted mb-1">Description</h4>
                  <p className="text-[11px] text-repo-text-secondary leading-relaxed">
                    {selectedNode.type === 'screen' && 'UI screen component that renders the user interface.'}
                    {selectedNode.type === 'provider' && 'State management component using the Provider pattern.'}
                    {selectedNode.type === 'service' && 'Business logic service handling core functionality.'}
                    {selectedNode.type === 'model' && 'Data model defining the structure of domain objects.'}
                    {selectedNode.type === 'api' && 'External API endpoint for backend communication.'}
                    {selectedNode.type === 'storage' && 'Local storage service for persisting data.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
