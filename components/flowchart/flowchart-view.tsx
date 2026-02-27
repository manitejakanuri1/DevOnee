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
    MarkerType,
    type Node,
    type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY, type SimulationNodeDatum, type SimulationLinkDatum } from 'd3-force';
import { Loader2, AlertCircle, Network, X, ExternalLink } from 'lucide-react';
import { CustomFileNode, FolderGroupNode } from './custom-node';

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

/* ── Entry-point filenames ── */
const ENTRY_NAMES = new Set([
    'index.ts', 'index.tsx', 'index.js', 'index.jsx',
    'page.ts', 'page.tsx', 'page.js', 'page.jsx',
    'layout.ts', 'layout.tsx', 'layout.js', 'layout.jsx',
    'main.ts', 'main.tsx', 'main.js', 'main.jsx', 'main.py', 'main.go', 'main.rs',
    'app.ts', 'app.tsx', 'app.js', 'app.jsx', 'app.py',
    'App.ts', 'App.tsx', 'App.js', 'App.jsx',
    'server.ts', 'server.js',
]);

/* ── Legend colors (matches the prototype) ── */
const LEGEND: { label: string; color: string }[] = [
    { label: '.tsx/.ts', color: '#3178c6' },
    { label: '.js', color: '#f1e05a' },
    { label: '.css', color: '#e44d96' },
    { label: '.py', color: '#3572A5' },
    { label: '.json', color: '#40a02b' },
    { label: 'config', color: '#f59e0b' },
];

/* ── Register node types (outside component) ── */
const nodeTypes = { custom: CustomFileNode, folder: FolderGroupNode };

/* ── Force-directed layout (organic / scattered) ── */
interface SimNode extends SimulationNodeDatum {
    id: string;
    _original: Node;
}

function applyForceLayout(
    rawNodes: Node[],
    rawEdges: Edge[],
    entryId?: string | null,
): { nodes: Node[]; edges: Edge[] } {
    const NODE_W = 220;
    const NODE_H = 95;

    // Build simulation nodes — pin entry to top center
    const simNodes: SimNode[] = rawNodes.map((n, i) => {
        const isEntry = n.id === entryId;
        return {
            id: n.id,
            x: isEntry ? 0 : Math.cos(2 * Math.PI * i / rawNodes.length) * 300 + Math.random() * 50,
            y: isEntry ? -400 : Math.sin(2 * Math.PI * i / rawNodes.length) * 300 + Math.random() * 50,
            fx: isEntry ? 0 : undefined,       // fix entry X at center
            fy: isEntry ? -400 : undefined,     // fix entry Y at top
            _original: n,
        };
    });

    const nodeMap = new Map(simNodes.map(n => [n.id, n]));

    // Build simulation links
    const simLinks: SimulationLinkDatum<SimNode>[] = rawEdges
        .filter(e => nodeMap.has(e.source) && nodeMap.has(e.target))
        .map(e => ({
            source: e.source,
            target: e.target,
        }));

    // Run force simulation synchronously
    const sim = forceSimulation<SimNode>(simNodes)
        .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks)
            .id(d => d.id)
            .distance(200)
            .strength(0.7)
        )
        .force('charge', forceManyBody<SimNode>().strength(-800))
        .force('center', forceCenter(0, 0))
        .force('collide', forceCollide<SimNode>(NODE_W * 0.6))
        .force('x', forceX<SimNode>(0).strength(0.05))
        .force('y', forceY<SimNode>(0).strength(0.05))
        .stop();

    // Run 200 ticks to converge
    for (let i = 0; i < 200; i++) sim.tick();

    return {
        nodes: simNodes.map(sn => ({
            ...sn._original,
            position: { x: (sn.x ?? 0) - NODE_W / 2, y: (sn.y ?? 0) - NODE_H / 2 },
        })),
        edges: rawEdges,
    };
}

/* ── Detect the SINGLE best entry point ── */
const ENTRY_PRIORITY: Record<string, number> = {
    'App.tsx': 10, 'App.jsx': 10, 'App.ts': 10, 'App.js': 10,
    'app.tsx': 9, 'app.jsx': 9, 'app.ts': 9, 'app.js': 9, 'app.py': 9,
    'main.tsx': 8, 'main.ts': 8, 'main.js': 8, 'main.jsx': 8, 'main.py': 8, 'main.go': 8, 'main.rs': 8,
    'index.tsx': 7, 'index.ts': 7, 'index.js': 7, 'index.jsx': 7,
    'page.tsx': 6, 'page.ts': 6, 'page.js': 6, 'page.jsx': 6,
    'server.ts': 5, 'server.js': 5,
    'layout.tsx': 4, 'layout.ts': 4, 'layout.js': 4, 'layout.jsx': 4,
};

function detectEntryPoints(nodes: Node[], edges: Edge[]): Set<string> {
    const outgoing = new Map<string, number>();
    nodes.forEach(n => outgoing.set(n.id, 0));
    edges.forEach(e => outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1));

    // Score each node: higher = more likely the true entry
    let bestId: string | null = null;
    let bestScore = -1;

    nodes.forEach(n => {
        const name = ((n.data as any)?.label || '').split('/').pop() || '';
        const namePriority = ENTRY_PRIORITY[name] || 0;
        if (namePriority === 0) return; // only consider known entry filenames
        // Prefer files that export more (higher outgoing edges)
        const score = namePriority * 100 + (outgoing.get(n.id) || 0);
        // Prefer shorter paths (root-level files)
        const depth = ((n.data as any)?.fullPath || '').split('/').length;
        const finalScore = score - depth;
        if (finalScore > bestScore) {
            bestScore = finalScore;
            bestId = n.id;
        }
    });

    // Fallback: node with most outgoing edges and zero incoming
    if (!bestId) {
        const incoming = new Map<string, number>();
        nodes.forEach(n => incoming.set(n.id, 0));
        edges.forEach(e => incoming.set(e.target, (incoming.get(e.target) || 0) + 1));

        nodes.forEach(n => {
            if ((incoming.get(n.id) || 0) === 0 && (outgoing.get(n.id) || 0) > 0) {
                const score = outgoing.get(n.id) || 0;
                if (score > bestScore) {
                    bestScore = score;
                    bestId = n.id;
                }
            }
        });
    }

    return bestId ? new Set([bestId]) : new Set<string>();
}

/* ── Compute folder groups from laid-out nodes ── */
function computeFolderGroups(nodes: Node[]): Node[] {
    const PAD = 40;
    const groups = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();

    nodes.forEach(n => {
        const path = (n.data as any)?.fullPath || '';
        const parts = path.split('/');
        if (parts.length < 2) return;
        // Use the first meaningful directory segment(s)
        let folder = '';
        for (let i = 0; i < parts.length - 1; i++) {
            const seg = parts[i];
            if (!seg || seg === '.') continue;
            folder = folder ? folder + '/' + seg : seg;
        }
        if (!folder) return;

        const x = n.position.x;
        const y = n.position.y;
        const cur = groups.get(folder);
        if (cur) {
            cur.minX = Math.min(cur.minX, x);
            cur.minY = Math.min(cur.minY, y);
            cur.maxX = Math.max(cur.maxX, x + 220);
            cur.maxY = Math.max(cur.maxY, y + 95);
        } else {
            groups.set(folder, { minX: x, minY: y, maxX: x + 220, maxY: y + 95 });
        }
    });

    const folderNodes: Node[] = [];
    groups.forEach((bounds, folder) => {
        // Only show groups with meaningful size
        const w = bounds.maxX - bounds.minX + PAD * 2;
        const h = bounds.maxY - bounds.minY + PAD * 2;
        if (w < 100 || h < 60) return;

        folderNodes.push({
            id: `folder-${folder}`,
            type: 'folder',
            position: { x: bounds.minX - PAD, y: bounds.minY - PAD },
            data: {
                label: folder.toUpperCase(),
                w,
                h,
            },
            selectable: false,
            draggable: false,
            style: { zIndex: -1 },
        });
    });

    return folderNodes;
}

/* ═══════════════════════════════════════════════
   FlowchartView — RepoMind dependency graph
   ═══════════════════════════════════════════════ */
export function FlowchartView({ owner, repo, branch }: FlowchartViewProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<FlowchartStats | null>(null);

    /* Focus mode */
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [entryPointIds, setEntryPointIds] = useState<Set<string>>(new Set());

    /* ── Fetch data ── */
    useEffect(() => {
        setLoading(true);
        setError(null);
        setSelectedNodeId(null);

        fetch('/api/repo/flowchart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo }),
        })
            .then(r => r.json())
            .then(data => {
                if (!data.success) { setError(data.message || 'Failed'); return; }
                if (data.nodes.length === 0) { setNodes([]); setEdges([]); return; }

                // Detect entry FIRST so we can pin it at top during layout
                const entries = detectEntryPoints(data.nodes, data.edges);
                const entryId = entries.size > 0 ? Array.from(entries)[0] : null;
                setEntryPointIds(entries);

                const laid = applyForceLayout(data.nodes, data.edges, entryId);

                // Mark entry points
                const markedNodes = laid.nodes.map(n => ({
                    ...n,
                    data: { ...n.data, isEntry: entries.has(n.id) },
                }));

                // Compute folder groups
                const folderNodes = computeFolderGroups(markedNodes);

                setNodes([...folderNodes, ...markedNodes]);
                setEdges(laid.edges);
                if (data.stats) setStats(data.stats);
            })
            .catch(err => setError(err.message || 'Network error'))
            .finally(() => setLoading(false));
    }, [owner, repo, setNodes, setEdges]);

    /* ── Connected-node set for focus mode ── */
    const connectedNodeIds = useMemo(() => {
        if (!selectedNodeId) return null;
        const s = new Set<string>([selectedNodeId]);
        edges.forEach(e => {
            if (e.source === selectedNodeId) s.add(e.target);
            if (e.target === selectedNodeId) s.add(e.source);
        });
        return s;
    }, [selectedNodeId, edges]);

    /* ── Selected node info for panel ── */
    const selectedInfo = useMemo(() => {
        if (!selectedNodeId) return null;
        const node = nodes.find(n => n.id === selectedNodeId);
        if (!node) return null;
        const d = node.data as any;
        const imports: string[] = [];
        const usedBy: string[] = [];
        edges.forEach(e => {
            if (e.source === selectedNodeId) {
                const t = nodes.find(n => n.id === e.target);
                if (t) imports.push((t.data as any)?.label || e.target);
            }
            if (e.target === selectedNodeId) {
                const s = nodes.find(n => n.id === e.source);
                if (s) usedBy.push((s.data as any)?.label || e.source);
            }
        });
        return {
            label: d?.label || '?',
            fullPath: d?.fullPath || '',
            color: d?.color || '#60a5fa',
            purpose: d?.purpose || '',
            imports,
            usedBy,
            isEntry: entryPointIds.has(selectedNodeId),
        };
    }, [selectedNodeId, nodes, edges, entryPointIds]);

    /* ── Styled nodes with focus state ── */
    const styledNodes = useMemo(() =>
        nodes.map(n => {
            if (n.type === 'folder') return n; // don't dim folder groups
            const isEntry = entryPointIds.has(n.id);
            return {
                ...n,
                data: {
                    ...n.data,
                    dimmed: connectedNodeIds ? !connectedNodeIds.has(n.id) : false,
                    active: selectedNodeId === n.id,
                    isEntry,
                    // When nothing is selected, non-entry nodes get subtle shadow
                    shadowed: !selectedNodeId && !isEntry,
                },
            };
        }),
    [nodes, connectedNodeIds, selectedNodeId, entryPointIds]);

    /* ── Styled edges with focus state + arrowheads ── */
    const styledEdges = useMemo(() =>
        edges.map(e => {
            const connected = selectedNodeId
                ? (e.source === selectedNodeId || e.target === selectedNodeId)
                : false;
            const dimmed = selectedNodeId && !connected;

            return {
                ...e,
                type: 'default',
                animated: connected,
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: connected ? '#818cf8' : '#444',
                    width: 16,
                    height: 12,
                },
                style: connected
                    ? { stroke: '#818cf8', strokeWidth: 2.5, strokeDasharray: '6 4' }
                    : dimmed
                        ? { stroke: 'rgba(148,163,184,0.06)', strokeWidth: 1 }
                        : { stroke: '#333', strokeWidth: 1.2, opacity: 0.4 },
            };
        }),
    [edges, selectedNodeId]);

    /* ── Handlers ── */
    const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
        if (node.type === 'folder') return;
        setSelectedNodeId(prev => prev === node.id ? null : node.id);
    }, []);

    const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

    /* file-only nodes for stats */
    const fileNodes = useMemo(() => nodes.filter(n => n.type !== 'folder'), [nodes]);

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="w-full h-[calc(100vh-180px)] min-h-[500px] bg-[#0a0a0f] rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p style={{ fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}>Analyzing import relationships...</p>
                <p className="text-xs text-slate-600 mt-1" style={{ fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}>Parsing source code across all languages</p>
            </div>
        );
    }

    /* ── Error ── */
    if (error) {
        return (
            <div className="w-full h-[calc(100vh-180px)] min-h-[500px] bg-[#0a0a0f] rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="mb-4 text-red-400" size={32} />
                <p className="text-red-400 font-medium">Failed to generate flowchart</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md text-center">{error}</p>
            </div>
        );
    }

    /* ── Empty ── */
    if (fileNodes.length === 0) {
        return (
            <div className="w-full h-[calc(100vh-180px)] min-h-[500px] bg-[#0a0a0f] rounded-2xl border border-white/[0.06] flex flex-col items-center justify-center text-slate-400">
                <Network className="mb-4" size={32} />
                <p className="font-medium">No file relationships found</p>
                <p className="text-xs text-slate-600 mt-1">This repository may be empty or use an unsupported structure</p>
            </div>
        );
    }

    /* ═════════════ MAIN RENDER ═════════════ */
    return (
        <div className="w-full rounded-2xl overflow-hidden relative" style={{ background: '#0a0a0f', height: 'calc(100vh - 180px)', minHeight: '500px' }}>
            {/* Keyframe styles */}
            <style>{`
                @keyframes pulse-ring {
                    0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
                    70% { box-shadow: 0 0 0 12px rgba(99, 102, 241, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
                }
                @keyframes dash-flow {
                    to { stroke-dashoffset: -20; }
                }
                .react-flow__edge.animated path { animation: dash-flow 1s linear infinite; }
                .react-flow__controls { background: rgba(10,10,15,0.9) !important; border: 1px solid rgba(255,255,255,0.06) !important; border-radius: 12px !important; }
                .react-flow__controls-button { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; color: #888 !important; width: 32px !important; height: 32px !important; }
                .react-flow__controls-button:hover { background: rgba(30,30,50,0.9) !important; color: #fff !important; }
                .react-flow__controls-button svg { fill: currentColor !important; }
            `}</style>

            {/* ── TOP BAR (matches prototype) ── */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
                background: 'rgba(10, 10, 15, 0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '10px 20px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                {/* Left: logo + title + repo badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '30px', height: '30px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '13px', color: '#fff',
                    }}>R</div>
                    <span style={{
                        fontSize: '14px', fontWeight: 600, letterSpacing: '-0.3px', color: '#f0f0f5',
                        fontFamily: "'Sora', sans-serif",
                    }}>
                        Repo<span style={{ color: '#818cf8' }}>Mind</span>
                    </span>
                    <div style={{
                        background: 'rgba(99,102,241,0.12)',
                        border: '1px solid rgba(99,102,241,0.25)',
                        color: '#a5b4fc',
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px',
                        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                        fontWeight: 500,
                    }}>
                        {owner}/{repo}
                    </div>
                </div>

                {/* Right: legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {LEGEND.map(l => (
                        <div key={l.label} style={{
                            display: 'flex', alignItems: 'center', gap: '5px',
                            fontSize: '11px', color: '#888',
                            fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                        }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color }} />
                            {l.label}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── REACT FLOW ── */}
            <ReactFlow
                nodes={styledNodes}
                edges={styledEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.4, minZoom: 0.4, maxZoom: 1.2 }}
                minZoom={0.2}
                maxZoom={2.5}
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{
                    type: 'default',
                    style: { stroke: '#333', strokeWidth: 1.2, opacity: 0.4 },
                    markerEnd: { type: MarkerType.ArrowClosed, color: '#444', width: 16, height: 12 },
                }}
                style={{ background: '#0a0a0f' }}
            >
                <Background variant={BackgroundVariant.Dots} color="rgba(148,163,184,0.04)" gap={24} size={1} />
                <Controls position="bottom-left" />
                <MiniMap
                    nodeColor={(n) => {
                        if (n.type === 'folder') return 'transparent';
                        if (connectedNodeIds && !connectedNodeIds.has(n.id)) return '#1a1a2a';
                        return (n.data as any)?.color || '#60a5fa';
                    }}
                    maskColor="rgba(10,10,15,0.85)"
                    style={{
                        background: 'rgba(15, 15, 25, 0.9)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        width: 160,
                        height: 110,
                    }}
                    position="bottom-right"
                    pannable
                    zoomable
                />
            </ReactFlow>

            {/* ── HINT (when nothing selected) ── */}
            {!selectedNodeId && (
                <div style={{
                    position: 'absolute', top: '54px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.2)',
                    color: '#a5b4fc', padding: '6px 14px', borderRadius: '10px',
                    fontSize: '11px',
                    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                    zIndex: 100, pointerEvents: 'none',
                }}>
                    💡 Click any node to see its connections — click background to reset
                </div>
            )}

            {/* ── INFO PANEL (bottom center, when a node is selected) ── */}
            {selectedInfo && (
                <div style={{
                    position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(15, 15, 25, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '16px',
                    padding: '12px 18px',
                    display: 'flex', alignItems: 'center', gap: '18px',
                    zIndex: 100,
                    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    maxWidth: '650px',
                }}>
                    {/* Close */}
                    <button
                        onClick={() => setSelectedNodeId(null)}
                        style={{
                            position: 'absolute', top: '-8px', right: '-8px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#888', cursor: 'pointer', fontSize: '10px',
                        }}
                    >
                        <X size={10} />
                    </button>

                    {/* Selected + Purpose */}
                    <div style={{ maxWidth: '180px' }}>
                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Selected</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: selectedInfo.color }}>{selectedInfo.label}</div>
                        {selectedInfo.purpose && (
                            <div style={{
                                fontSize: '9.5px', color: '#777', marginTop: '3px',
                                lineHeight: '1.3',
                                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                            }}>
                                {selectedInfo.purpose}
                            </div>
                        )}
                    </div>

                    <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

                    {/* Lines */}
                    <div>
                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Lines</div>
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#e8e8f0', marginTop: '2px' }}>
                            {(() => {
                                const node = nodes.find(n => n.id === selectedNodeId);
                                return (node?.data as any)?.lines ?? '—';
                            })()}
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

                    {/* Imports */}
                    <div>
                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Imports</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const, marginTop: '3px' }}>
                            {selectedInfo.imports.length === 0
                                ? <span style={{ color: '#555', fontSize: '10px' }}>—</span>
                                : selectedInfo.imports.slice(0, 5).map((n, i) => (
                                    <span key={i} style={{
                                        background: 'rgba(99,102,241,0.12)',
                                        border: '1px solid rgba(99,102,241,0.2)',
                                        color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px', fontSize: '10px',
                                    }}>{n}</span>
                                ))
                            }
                            {selectedInfo.imports.length > 5 && (
                                <span style={{ color: '#555', fontSize: '10px' }}>+{selectedInfo.imports.length - 5}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

                    {/* Used by */}
                    <div>
                        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Used By</div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const, marginTop: '3px' }}>
                            {selectedInfo.usedBy.length === 0
                                ? <span style={{ color: '#555', fontSize: '10px' }}>—</span>
                                : selectedInfo.usedBy.slice(0, 5).map((n, i) => (
                                    <span key={i} style={{
                                        background: 'rgba(16,185,129,0.12)',
                                        border: '1px solid rgba(16,185,129,0.2)',
                                        color: '#6ee7b7', padding: '2px 8px', borderRadius: '6px', fontSize: '10px',
                                    }}>{n}</span>
                                ))
                            }
                            {selectedInfo.usedBy.length > 5 && (
                                <span style={{ color: '#555', fontSize: '10px' }}>+{selectedInfo.usedBy.length - 5}</span>
                            )}
                        </div>
                    </div>

                    <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

                    {/* Open File button */}
                    <a
                        href={`/repo/${owner}/${repo}/blob/${selectedInfo.fullPath}`}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '8px',
                            background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)',
                            color: '#a5b4fc', fontSize: '10px', fontWeight: 600,
                            textDecoration: 'none', cursor: 'pointer',
                            letterSpacing: '0.3px', whiteSpace: 'nowrap' as const,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.25)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(99,102,241,0.15)';
                            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
                        }}
                    >
                        <ExternalLink size={11} />
                        Open File
                    </a>

                    {/* Entry badge */}
                    {selectedInfo.isEntry && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '4px 10px', borderRadius: '8px',
                            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                        }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8' }} />
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Entry Point</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
