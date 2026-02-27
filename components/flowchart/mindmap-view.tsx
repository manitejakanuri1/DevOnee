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
import { Loader2, AlertCircle, Brain, ChevronRight } from 'lucide-react';
import { CustomFileNode } from './custom-node';

interface MindmapViewProps {
    owner: string;
    repo: string;
}

interface TreeNode {
    path: string;
    name: string;
    type: 'tree' | 'blob';
    size?: number;
    children?: TreeNode[];
}

const nodeTypes = { custom: CustomFileNode };

// ── File type classification (same as flowchart route) ──
function getNodeType(filePath: string): { type: string; color: string } {
    const lower = filePath.toLowerCase();
    const name = lower.split('/').pop() || '';

    if (['page.tsx', 'page.jsx', 'page.ts', 'page.js', 'layout.tsx', 'layout.jsx',
        'index.ts', 'index.tsx', 'index.js', 'index.jsx',
        'main.py', 'app.py', 'main.go', 'main.rs', 'main.java', 'main.kt',
        'main.dart', 'main.swift', 'program.cs', 'main.c', 'main.cpp'].includes(name))
        return { type: 'entry', color: '#f59e0b' };
    if (lower.includes('__tests__') || lower.includes('.test.') || lower.includes('.spec.') ||
        lower.includes('/test/') || lower.includes('/tests/'))
        return { type: 'test', color: '#facc15' };
    if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/') || lower.includes('/handlers/'))
        return { type: 'api', color: '#4ade80' };
    if (lower.includes('/components/') || lower.includes('/ui/') || lower.includes('/views/') || lower.includes('/widgets/'))
        return { type: 'component', color: '#60a5fa' };
    if (lower.includes('/lib/') || lower.includes('/utils/') || lower.includes('/helpers/') || lower.includes('/core/'))
        return { type: 'util', color: '#c084fc' };
    if (lower.includes('/models/') || lower.includes('/entities/') || lower.includes('/schemas/') || lower.includes('/types/'))
        return { type: 'model', color: '#f472b6' };
    if (lower.includes('/services/') || lower.includes('/providers/'))
        return { type: 'service', color: '#fb923c' };
    if (lower.includes('.config.') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml'))
        return { type: 'config', color: '#94a3b8' };
    if (lower.endsWith('.md') || lower.includes('/docs/'))
        return { type: 'docs', color: '#22d3ee' };
    return { type: 'source', color: '#e2e8f0' };
}

// ── Count all blob descendants of a tree node ──
function countFiles(node: TreeNode): number {
    if (node.type === 'blob') return 1;
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + countFiles(child), 0);
}

// ── Excluded directories ──
function isExcluded(name: string): boolean {
    const excluded = ['node_modules', '.next', 'dist', '.git', 'vendor', '__pycache__',
        '.idea', '.vscode', '.cache', '.turbo', 'target', '.dart_tool',
        '.pub-cache', 'Pods', 'DerivedData', '.build', 'obj', 'bin',
        '.gradle', 'build', '.expo', '.svn', 'coverage'];
    return excluded.includes(name);
}

const MAX_CHILDREN = 12;
const MAX_DEPTH = 3;
const RADIUS_STEP = 400;

// ── Radial tree layout ──
function computeRadialLayout(
    treeData: TreeNode[],
    repoName: string,
    expandedNodes: Set<string>,
): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Root node at center
    const rootId = '__root__';
    nodes.push({
        id: rootId,
        type: 'custom',
        data: {
            label: repoName,
            fullPath: '',
            fileType: 'entry',
            color: '#3b82f6',
            isFolder: true,
            fileCount: treeData.reduce((sum, child) => sum + countFiles(child), 0),
        },
        position: { x: 0, y: 0 },
    });

    // Filter top-level children (skip excluded directories and hidden files)
    const topChildren = treeData
        .filter(c => !isExcluded(c.name) && !c.name.startsWith('.'))
        .sort((a, b) => {
            // Folders first, then by file count descending
            if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
            return countFiles(b) - countFiles(a);
        });

    function addChildren(
        parentId: string,
        children: TreeNode[],
        depth: number,
        angleStart: number,
        angleEnd: number,
    ) {
        // Filter and limit children
        const filtered = children
            .filter(c => !isExcluded(c.name) && !c.name.startsWith('.'))
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
                return countFiles(b) - countFiles(a);
            });

        const visible = filtered.slice(0, MAX_CHILDREN);
        const hiddenCount = filtered.length - visible.length;

        const totalItems = visible.length + (hiddenCount > 0 ? 1 : 0);
        if (totalItems === 0) return;

        const angleStep = (angleEnd - angleStart) / totalItems;
        const radius = depth * RADIUS_STEP;

        visible.forEach((child, i) => {
            const angle = angleStart + (i + 0.5) * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const nodeId = child.path;
            const isFolder = child.type === 'tree';
            const fileCount = countFiles(child);
            const { type: fileType, color } = getNodeType(child.path);
            const isExpanded = expandedNodes.has(nodeId);

            nodes.push({
                id: nodeId,
                type: 'custom',
                data: {
                    label: isFolder ? `${child.name}/ (${fileCount})` : child.name,
                    fullPath: child.path,
                    fileType,
                    color,
                    isFolder,
                    fileCount,
                },
                position: { x, y },
            });

            edges.push({
                id: `${parentId}->${nodeId}`,
                source: parentId,
                target: nodeId,
                type: 'smoothstep',
                style: {
                    stroke: color + '40',
                    strokeWidth: Math.max(1, 3 - depth * 0.5),
                },
            });

            // Recurse into expanded folders
            if (isFolder && isExpanded && child.children && depth < MAX_DEPTH) {
                const childAngleStart = angleStart + i * angleStep;
                const childAngleEnd = childAngleStart + angleStep;
                addChildren(nodeId, child.children, depth + 1, childAngleStart, childAngleEnd);
            }
        });

        // "+N more" summary node
        if (hiddenCount > 0) {
            const angle = angleStart + (totalItems - 0.5) * angleStep;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const moreId = `${parentId}__more`;

            nodes.push({
                id: moreId,
                type: 'custom',
                data: {
                    label: `+${hiddenCount} more`,
                    fullPath: '',
                    fileType: 'config',
                    color: '#64748b',
                    isFolder: false,
                    fileCount: 0,
                },
                position: { x, y },
            });

            edges.push({
                id: `${parentId}->${moreId}`,
                source: parentId,
                target: moreId,
                type: 'smoothstep',
                style: { stroke: '#64748b30', strokeWidth: 1 },
            });
        }
    }

    // Layout level 1 children from the root
    addChildren(rootId, topChildren, 1, 0, 2 * Math.PI);

    return { nodes, edges };
}

export function MindmapView({ owner, repo }: MindmapViewProps) {
    const router = useRouter();
    const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [treeData, setTreeData] = useState<TreeNode[] | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Fetch tree data
    useEffect(() => {
        setLoading(true);
        setError(null);

        fetch('/api/repo/tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo }),
        })
            .then(res => {
                if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
                return res.json();
            })
            .then(data => {
                if (data.success && data.tree) {
                    setTreeData(data.tree);
                    // Auto-expand root-level folders
                    const initialExpanded = new Set<string>();
                    data.tree
                        .filter((n: TreeNode) => n.type === 'tree' && !isExcluded(n.name) && !n.name.startsWith('.'))
                        .forEach((n: TreeNode) => initialExpanded.add(n.path));
                    setExpandedNodes(initialExpanded);
                } else {
                    setError(data.error || 'Failed to fetch repository tree');
                }
            })
            .catch(err => setError(err.message || 'Network error'))
            .finally(() => setLoading(false));
    }, [owner, repo]);

    // Recompute layout when tree data or expanded nodes change
    useEffect(() => {
        if (!treeData) return;
        const { nodes: layoutNodes, edges: layoutEdges } = computeRadialLayout(
            treeData,
            repo,
            expandedNodes,
        );
        setNodes(layoutNodes);
        setEdges(layoutEdges);
    }, [treeData, expandedNodes, repo, setNodes, setEdges]);

    // Toggle expand/collapse on folder click, navigate on file click
    const onNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            const data = node.data as any;
            if (data.isFolder && node.id !== '__root__') {
                setExpandedNodes(prev => {
                    const next = new Set(prev);
                    if (next.has(node.id)) {
                        next.delete(node.id);
                    } else {
                        next.add(node.id);
                    }
                    return next;
                });
            } else if (!data.isFolder && data.fullPath) {
                router.push(`/repo/${owner}/${repo}/blob/${data.fullPath}`);
            }
        },
        [owner, repo, router]
    );

    // Legend items
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

    if (loading) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>Building mindmap...</p>
                <p className="text-xs text-slate-600 mt-1">Analyzing repository structure</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <AlertCircle className="mb-4 text-red-400" size={32} />
                <p className="text-red-400 font-medium">Failed to build mindmap</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md text-center">{error}</p>
            </div>
        );
    }

    if (nodes.length === 0) {
        return (
            <div className="w-full h-[600px] bg-slate-800/50 rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-slate-400">
                <Brain className="mb-4" size={32} />
                <p className="font-medium">No structure found</p>
                <p className="text-xs text-slate-600 mt-1">This repository appears to be empty</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[600px] bg-[#0f172a] rounded-2xl border border-slate-700 overflow-hidden shadow-inner relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                minZoom={0.05}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
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

            {/* Mode badge */}
            <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-3 py-2 z-10">
                <div className="flex items-center gap-2">
                    <Brain size={12} className="text-purple-400" />
                    <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                        Mindmap
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[9px] text-slate-500">{nodes.length} nodes</span>
                    <span className="text-[9px] text-slate-500">{edges.length} branches</span>
                </div>
            </div>

            {/* Legend + instructions */}
            {legendItems.length > 0 && (
                <div className="absolute top-3 right-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl p-3 space-y-1.5 z-10">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">File Types</p>
                    {legendItems.map(item => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-slate-300 capitalize">{item.type}</span>
                        </div>
                    ))}
                    <div className="pt-1.5 mt-1.5 border-t border-slate-700 space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <ChevronRight size={10} /> Click folder to expand/collapse
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500">
                            <ChevronRight size={10} /> Click file to view source
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
