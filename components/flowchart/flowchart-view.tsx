"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { Loader2, AlertCircle, Network, FileCode, FolderTree } from 'lucide-react';
import { CustomFileNode } from './custom-node';

interface FlowchartViewProps {
    owner: string;
    repo: string;
}

interface FlowchartStats {
    totalFiles: number;
    analyzedFiles: number;
    resolvedEdges: number;
}

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
        g.setNode(node.id, { width: 200, height: 80 });
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
                x: dagreNode.x - 100,
                y: dagreNode.y - 40,
            },
        };
    });

    return { nodes: layoutNodes, edges: rawEdges };
}

export function FlowchartView({ owner, repo }: FlowchartViewProps) {
    const router = useRouter();
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
    const [mode, setMode] = useState<string>('imports');
    const [stats, setStats] = useState<FlowchartStats | null>(null);

    // Fetch flowchart data
    useEffect(() => {
        setLoading(true);
        setError(null);

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
                    setNodes(laid.nodes);
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

    // Navigate to file on node click
    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            const fullPath = (node.data as any)?.fullPath;
            if (fullPath) {
                router.push(`/repo/${owner}/${repo}/blob/${fullPath}`);
            }
        },
        [owner, repo, router]
    );

    // Edge hover handlers
    const onEdgeMouseEnter = useCallback((_event: React.MouseEvent, edge: Edge) => {
        setHoveredEdgeId(edge.id);
    }, []);

    const onEdgeMouseLeave = useCallback(() => {
        setHoveredEdgeId(null);
    }, []);

    // Apply hover styling to edges
    const styledEdges = useMemo(() => {
        return edges.map(edge => ({
            ...edge,
            type: 'smoothstep',
            animated: edge.id === hoveredEdgeId,
            style: edge.id === hoveredEdgeId
                ? { stroke: '#3b82f6', strokeWidth: 2.5 }
                : { stroke: 'rgba(148, 163, 184, 0.25)', strokeWidth: 1.5 },
        }));
    }, [edges, hoveredEdgeId]);

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
        <div className="w-full h-[600px] bg-[#0f172a] rounded-2xl border border-slate-700 overflow-hidden shadow-inner relative">
            <ReactFlow
                nodes={nodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onEdgeMouseEnter={onEdgeMouseEnter}
                onEdgeMouseLeave={onEdgeMouseLeave}
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
                    color="rgba(148,163,184,0.08)"
                    gap={20}
                    size={1}
                />
                <Controls
                    position="bottom-right"
                    style={{
                        background: 'rgba(15,23,42,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                    }}
                />
                <MiniMap
                    nodeColor={(n) => (n.data as any)?.color || '#60a5fa'}
                    maskColor="rgba(11,17,32,0.8)"
                    style={{
                        background: 'rgba(15,23,42,0.9)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                    }}
                    position="bottom-left"
                />
            </ReactFlow>

            {/* Mode + stats badge (top-left) */}
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-3 py-2 z-10">
                <div className="flex items-center gap-2">
                    {mode === 'imports' ? (
                        <FileCode size={12} className="text-blue-400" />
                    ) : (
                        <FolderTree size={12} className="text-amber-400" />
                    )}
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                        {mode === 'imports' ? 'Import Graph' : 'Folder Structure'}
                    </span>
                </div>
                {stats && (
                    <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[9px] text-slate-500">
                            {nodes.length} files
                        </span>
                        <span className="text-[9px] text-slate-500">
                            {edges.length} connections
                        </span>
                        {stats.totalFiles > 0 && (
                            <span className="text-[9px] text-slate-600">
                                {stats.analyzedFiles}/{stats.totalFiles} analyzed
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Legend overlay (top-right) */}
            {legendItems.length > 0 && (
                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 space-y-1.5 z-10">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">File Types</p>
                    {legendItems.map(item => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs text-slate-300 capitalize">{item.type}</span>
                        </div>
                    ))}
                    <div className="pt-1.5 mt-1.5 border-t border-slate-700 text-[10px] text-slate-500">
                        Click a node to view file
                    </div>
                </div>
            )}
        </div>
    );
}
