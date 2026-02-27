"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    ReactFlow,
    MiniMap,
    Controls,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import {
    Loader2, AlertCircle, Network, FileCode, FolderTree,
    MousePointerClick, X,
} from 'lucide-react';
import { CustomFileNode } from './custom-node';

interface FlowchartViewProps {
    owner: string;
    repo: string;
    branch: string;
}

interface FlowchartStats {
    totalFiles: number;
    analyzedFiles: number;
    resolvedEdges: number;
}

// Entry-point filenames
const ENTRY_NAMES = new Set([
    'index.ts', 'index.tsx', 'index.js', 'index.jsx',
    'page.ts', 'page.tsx', 'page.js', 'page.jsx',
    'layout.ts', 'layout.tsx', 'layout.js', 'layout.jsx',
    'main.ts', 'main.tsx', 'main.js', 'main.jsx', 'main.py', 'main.go', 'main.rs',
    'app.ts', 'app.tsx', 'app.js', 'app.jsx', 'app.py',
    'App.ts', 'App.tsx', 'App.js', 'App.jsx',
    'server.ts', 'server.js',
]);

// Register custom node type (outside component to prevent re-renders)
const nodeTypes = { custom: CustomFileNode };

// ── Dagre layout ──
function applyDagreLayout(
    rawNodes: Node[],
    rawEdges: Edge[],
    direction: 'TB' | 'LR' = 'TB'
): { nodes: Node[]; edges: Edge[] } {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90, edgesep: 25 });

    rawNodes.forEach(node => {
        g.setNode(node.id, { width: 210, height: 90 });
    });

    rawEdges.forEach(edge => {
        g.setEdge(edge.source, edge.target);
    });

    Dagre.layout(g);

    const layoutNodes = rawNodes.map(node => {
        const dagreNode = g.node(node.id);
        return {
            ...node,
            position: {
                x: dagreNode.x - 105,
                y: dagreNode.y - 45,
            },
        };
    });

    return { nodes: layoutNodes, edges: rawEdges };
}

// ── Detect entry points ──
function detectEntryPoints(nodes: Node[], edges: Edge[]): Set<string> {
    const entryIds = new Set<string>();

    // Build incoming-edge count
    const incomingCount = new Map<string, number>();
    nodes.forEach(n => incomingCount.set(n.id, 0));
    edges.forEach(e => {
        incomingCount.set(e.target, (incomingCount.get(e.target) || 0) + 1);
    });

    // Build outgoing-edge count
    const outgoingCount = new Map<string, number>();
    nodes.forEach(n => outgoingCount.set(n.id, 0));
    edges.forEach(e => {
        outgoingCount.set(e.source, (outgoingCount.get(e.source) || 0) + 1);
    });

    nodes.forEach(node => {
        const data = node.data as any;
        const fileName = (data?.label || '').split('/').pop() || '';

        // Check filename match
        if (ENTRY_NAMES.has(fileName)) {
            entryIds.add(node.id);
            return;
        }

        // Check: no incoming edges but has outgoing edges (root of a dependency tree)
        const incoming = incomingCount.get(node.id) || 0;
        const outgoing = outgoingCount.get(node.id) || 0;
        if (incoming === 0 && outgoing > 0) {
            entryIds.add(node.id);
        }
    });

    return entryIds;
}

export function FlowchartView({ owner, repo, branch }: FlowchartViewProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<string>('imports');
    const [stats, setStats] = useState<FlowchartStats | null>(null);

    // ── Focus mode state ──
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [entryPointIds, setEntryPointIds] = useState<Set<string>>(new Set());

    // Fetch flowchart data
    useEffect(() => {
        setLoading(true);
        setError(null);
        setSelectedNodeId(null);

        fetch('/api/repo/flowchart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    if (data.nodes.length === 0) {
                        setNodes([]);
                        setEdges([]);
                        return;
                    }
                    const laid = applyDagreLayout(data.nodes, data.edges);

                    // Detect entry points
                    const entries = detectEntryPoints(laid.nodes, laid.edges);
                    setEntryPointIds(entries);

                    // Mark entry points in node data
                    const markedNodes = laid.nodes.map(n => ({
                        ...n,
                        data: {
                            ...n.data,
                            isEntry: entries.has(n.id),
                        },
                    }));

                    setNodes(markedNodes);
                    setEdges(laid.edges);
                    if (data.mode) setMode(data.mode);
                    if (data.stats) setStats(data.stats);
                } else {
                    setError(data.message || 'Failed to generate flowchart');
                }
            })
            .catch(err => setError(err.message || 'Network error'))
            .finally(() => setLoading(false));
    }, [owner, repo, setNodes, setEdges]);

    // ── Compute connected nodes for focus mode ──
    const connectedNodeIds = useMemo(() => {
        if (!selectedNodeId) return null;
        const connected = new Set<string>([selectedNodeId]);
        edges.forEach(e => {
            if (e.source === selectedNodeId) connected.add(e.target);
            if (e.target === selectedNodeId) connected.add(e.source);
        });
        return connected;
    }, [selectedNodeId, edges]);

    // ── Get selected node data for info panel ──
    const selectedNodeData = useMemo(() => {
        if (!selectedNodeId) return null;
        const node = nodes.find(n => n.id === selectedNodeId);
        if (!node) return null;
        const data = node.data as any;

        // Find names of imported files
        const importedNames: string[] = [];
        const importedByNames: string[] = [];
        edges.forEach(e => {
            if (e.source === selectedNodeId) {
                const target = nodes.find(n => n.id === e.target);
                if (target) importedNames.push((target.data as any)?.label || e.target);
            }
            if (e.target === selectedNodeId) {
                const source = nodes.find(n => n.id === e.source);
                if (source) importedByNames.push((source.data as any)?.label || e.source);
            }
        });

        return {
            label: data?.label || 'Unknown',
            fullPath: data?.fullPath || '',
            fileType: data?.fileType || 'file',
            color: data?.color || '#60a5fa',
            imports: importedNames,
            importedBy: importedByNames,
            isEntry: entryPointIds.has(selectedNodeId),
        };
    }, [selectedNodeId, nodes, edges, entryPointIds]);

    // ── Node click: toggle focus mode ──
    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            setSelectedNodeId(prev => prev === node.id ? null : node.id);
        },
        []
    );

    // ── Background click: clear focus ──
    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null);
    }, []);

    // ── Apply focus-mode styling to nodes ──
    const styledNodes = useMemo(() => {
        return nodes.map(node => ({
            ...node,
            data: {
                ...node.data,
                dimmed: connectedNodeIds ? !connectedNodeIds.has(node.id) : false,
                active: selectedNodeId === node.id,
                isEntry: entryPointIds.has(node.id),
            },
        }));
    }, [nodes, connectedNodeIds, selectedNodeId, entryPointIds]);

    // ── Apply focus-mode styling to edges ──
    const styledEdges = useMemo(() => {
        return edges.map(edge => {
            const isConnected = selectedNodeId
                ? (edge.source === selectedNodeId || edge.target === selectedNodeId)
                : false;
            const isDimmed = selectedNodeId && !isConnected;

            return {
                ...edge,
                type: 'smoothstep',
                animated: isConnected,
                style: isConnected
                    ? { stroke: '#818cf8', strokeWidth: 2.5 }
                    : isDimmed
                        ? { stroke: 'rgba(148, 163, 184, 0.06)', strokeWidth: 1 }
                        : { stroke: 'rgba(148, 163, 184, 0.25)', strokeWidth: 1.5 },
            };
        });
    }, [edges, selectedNodeId]);

    // Legend items computed from current nodes
    const legendItems = useMemo(() => {
        const seen = new Map<string, string>();
        nodes.forEach(n => {
            const data = n.data as any;
            if (data?.fileType && !seen.has(data.fileType)) {
                seen.set(data.fileType, data.color);
            }
        });
        return Array.from(seen.entries()).map(([type, color]) => ({ type, color }));
    }, [nodes]);

    // Count entry points
    const entryCount = entryPointIds.size;

    // ── Loading state ──
    if (loading) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Analyzing import relationships...</p>
                <p className="text-xs text-slate-600 mt-1">Parsing source code across all languages</p>
            </div>
        );
    }

    // ── Error state ──
    if (error) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="mb-4 text-red-400" size={32} />
                <p className="text-red-400 font-medium">Failed to generate flowchart</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md text-center">{error}</p>
            </div>
        );
    }

    // ── Empty state ──
    if (nodes.length === 0) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <Network className="mb-4" size={32} />
                <p className="font-medium">No file relationships found</p>
                <p className="text-xs text-slate-600 mt-1">This repository may be empty or use an unsupported structure</p>
            </div>
        );
    }

    // ── Main flowchart ──
    return (
        <div className="w-full h-[600px] bg-[#0a0a0f] rounded-2xl border border-slate-700/50 overflow-hidden shadow-inner relative">
            {/* Animated edge CSS */}
            <style>{`
                @keyframes entry-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.35); }
                    70% { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                .animate-entry-pulse {
                    animation: entry-pulse 2.5s ease-in-out infinite;
                }
                .react-flow__edge-path {
                    transition: stroke 0.3s ease, stroke-width 0.3s ease, opacity 0.3s ease;
                }
            `}</style>

            <ReactFlow
                nodes={styledNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.05}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    style: { stroke: 'rgba(148, 163, 184, 0.25)', strokeWidth: 1.5 },
                }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    color="rgba(148,163,184,0.06)"
                    gap={20}
                    size={1}
                />
                <Controls
                    position="bottom-right"
                    style={{
                        background: 'rgba(10,10,15,0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                    }}
                />
                <MiniMap
                    nodeColor={(n) => {
                        const data = n.data as any;
                        if (connectedNodeIds && !connectedNodeIds.has(n.id)) return '#222';
                        return data?.color || '#60a5fa';
                    }}
                    maskColor="rgba(10,10,15,0.85)"
                    style={{
                        background: 'rgba(10,10,15,0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                    }}
                    position="bottom-left"
                />
            </ReactFlow>

            {/* Mode + stats badge (top-left) */}
            <div className="absolute top-3 left-3 bg-[#0d0d14]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl px-3 py-2 z-10">
                <div className="flex items-center gap-2">
                    {mode === 'imports' ? (
                        <FileCode size={12} className="text-indigo-400" />
                    ) : (
                        <FolderTree size={12} className="text-amber-400" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                        {mode === 'imports' ? 'Import Graph' : 'Folder Structure'}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-slate-500">
                        <b className="text-slate-400">{nodes.length}</b> files
                    </span>
                    <span className="text-[9px] text-slate-500">
                        <b className="text-slate-400">{edges.length}</b> connections
                    </span>
                    {entryCount > 0 && (
                        <span className="text-[9px] text-indigo-400/70">
                            <b className="text-indigo-400">{entryCount}</b> entry{entryCount !== 1 ? ' pts' : ' pt'}
                        </span>
                    )}
                    {stats && stats.totalFiles > 0 && (
                        <span className="text-[9px] text-slate-600">
                            {stats.analyzedFiles}/{stats.totalFiles} analyzed
                        </span>
                    )}
                </div>
            </div>

            {/* Legend overlay (top-right) */}
            {legendItems.length > 0 && (
                <div className="absolute top-3 right-3 bg-[#0d0d14]/90 backdrop-blur-xl border border-white/[0.06] rounded-xl p-3 space-y-1.5 z-10 max-w-[160px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Legend</p>
                    {legendItems.map(item => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[10px] text-slate-400 capitalize">{item.type}</span>
                        </div>
                    ))}
                    <div className="pt-1.5 mt-1.5 border-t border-white/5 text-[9px] text-slate-600 flex items-center gap-1">
                        <MousePointerClick size={9} />
                        Click node to focus
                    </div>
                </div>
            )}

            {/* ── Info Panel (bottom center) ── */}
            {selectedNodeData && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#0d0d14]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-5 py-3 z-10 flex items-center gap-5 max-w-[700px] shadow-2xl shadow-black/40">
                    {/* Close button */}
                    <button
                        onClick={() => setSelectedNodeId(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X size={10} />
                    </button>

                    {/* File name */}
                    <div className="min-w-0">
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">Selected</div>
                        <div className="text-sm font-semibold text-slate-100 truncate max-w-[140px]" style={{ color: selectedNodeData.color }}>
                            {selectedNodeData.label}
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono truncate max-w-[140px]">
                            {selectedNodeData.fullPath}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/[0.06] shrink-0" />

                    {/* Imports */}
                    <div className="min-w-0">
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">
                            Imports ({selectedNodeData.imports.length})
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                            {selectedNodeData.imports.length === 0 ? (
                                <span className="text-[9px] text-slate-600 italic">none (leaf)</span>
                            ) : (
                                selectedNodeData.imports.slice(0, 6).map((name, i) => (
                                    <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                                    >
                                        {name}
                                    </span>
                                ))
                            )}
                            {selectedNodeData.imports.length > 6 && (
                                <span className="text-[9px] text-slate-500">+{selectedNodeData.imports.length - 6}</span>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/[0.06] shrink-0" />

                    {/* Imported By */}
                    <div className="min-w-0">
                        <div className="text-[9px] text-slate-600 uppercase tracking-wider font-medium">
                            Used by ({selectedNodeData.importedBy.length})
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1 max-w-[200px]">
                            {selectedNodeData.importedBy.length === 0 ? (
                                <span className="text-[9px] text-slate-600 italic">none (root)</span>
                            ) : (
                                selectedNodeData.importedBy.slice(0, 6).map((name, i) => (
                                    <span
                                        key={i}
                                        className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                                    >
                                        {name}
                                    </span>
                                ))
                            )}
                            {selectedNodeData.importedBy.length > 6 && (
                                <span className="text-[9px] text-slate-500">+{selectedNodeData.importedBy.length - 6}</span>
                            )}
                        </div>
                    </div>

                    {/* Entry badge */}
                    {selectedNodeData.isEntry && (
                        <>
                            <div className="w-px h-8 bg-white/[0.06] shrink-0" />
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                                <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wider">Entry Point</span>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Hint tooltip (top center) */}
            {!selectedNodeId && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-indigo-500/8 border border-indigo-500/15 text-indigo-300/70 px-3 py-1.5 rounded-lg text-[10px] z-10 font-mono pointer-events-none">
                    Click any node to explore its connections
                </div>
            )}
        </div>
    );
}
