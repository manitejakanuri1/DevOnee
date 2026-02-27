"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, ChevronDown, Search, X, MessageCircle, Loader2, Sparkles } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { safePath } from '@/lib/path-utils';

interface TreeNode {
    path: string;
    name: string;
    type: 'tree' | 'blob';
    size?: number;
    children?: TreeNode[];
}

interface SearchResult {
    id: string;
    content: string;
    filePath: string;
    similarity: number;
}

interface FileExplorerProps {
    owner: string;
    repo: string;
    branch: string;
    selectedFiles: string[];
    onSelectFiles: (files: string[] | ((prev: string[]) => string[])) => void;
    onFileClick: (filePath: string) => void;
    onAddToChat?: () => void;
    className?: string;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    if (!query) return nodes;
    const lower = query.toLowerCase();
    return nodes.reduce<TreeNode[]>((acc, node) => {
        if (node.type === 'blob') {
            if (node.name.toLowerCase().includes(lower)) acc.push(node);
        } else {
            const filteredChildren = filterTree(node.children || [], query);
            if (filteredChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
                acc.push({ ...node, children: filteredChildren });
            }
        }
        return acc;
    }, []);
}

function countFiles(nodes: TreeNode[]): number {
    let count = 0;
    for (const node of nodes) {
        if (node.type === 'blob') count++;
        else if (node.children) count += countFiles(node.children);
    }
    return count;
}

/** Recursively collect all blob paths under a tree node */
function collectBlobPaths(node: TreeNode): string[] {
    if (node.type === 'blob') return [node.path];
    if (!node.children) return [];
    return node.children.flatMap(collectBlobPaths);
}

/** Collect all blob paths from a list of tree nodes */
function collectAllBlobPaths(nodes: TreeNode[]): string[] {
    return nodes.flatMap(collectBlobPaths);
}

export function FileExplorer({ owner, repo, branch, selectedFiles, onSelectFiles, onFileClick, onAddToChat, className }: FileExplorerProps) {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Vector search state
    const [showSearchPanel, setShowSearchPanel] = useState(false);
    const [vectorQuery, setVectorQuery] = useState('');
    const [vectorResults, setVectorResults] = useState<SearchResult[]>([]);
    const [vectorSearching, setVectorSearching] = useState(false);

    const selectedSet = useMemo(() => new Set(selectedFiles), [selectedFiles]);

    useEffect(() => {
        setLoading(true);
        setTree([]);
        fetch('/api/repo/tree', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo, branch })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) setTree(data.tree);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [owner, repo, branch]);

    const filteredTree = useMemo(() => filterTree(tree, searchQuery), [tree, searchQuery]);
    const fileCount = useMemo(() => countFiles(tree), [tree]);
    const allBlobPaths = useMemo(() => collectAllBlobPaths(tree), [tree]);

    const handleSelectAll = useCallback(() => {
        onSelectFiles(allBlobPaths);
    }, [allBlobPaths, onSelectFiles]);

    const handleClearAll = useCallback(() => {
        onSelectFiles([]);
    }, [onSelectFiles]);

    const handleVectorSearch = useCallback(async () => {
        if (!vectorQuery.trim()) return;
        setVectorSearching(true);
        try {
            const res = await fetch('/api/repo/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: vectorQuery,
                    owner,
                    repo,
                    selectedFiles: selectedFiles.length > 0 ? selectedFiles : null,
                })
            });
            const data = await res.json();
            if (data.success) {
                setVectorResults(data.results);
            }
        } catch (err) {
            console.error('Vector search error:', err);
        } finally {
            setVectorSearching(false);
        }
    }, [vectorQuery, owner, repo, selectedFiles]);

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Search + Select All / Clear All */}
            <div className="p-3 border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                    <Search size={14} className="text-slate-500 shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search files..."
                        className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                </div>
                {!loading && (
                    <div className="flex items-center justify-between mt-2 px-1">
                        <span className="text-[10px] text-slate-500">{fileCount} files</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSelectAll}
                                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                Select All
                            </button>
                            <span className="text-slate-600 text-[10px]">|</span>
                            <button
                                onClick={handleClearAll}
                                className="text-[10px] text-slate-400 hover:text-slate-300 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Selection Context Bar */}
            <AnimatePresence>
                {selectedFiles.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden shrink-0"
                    >
                        <div className="px-3 py-2.5 border-b border-white/5 bg-blue-500/5">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-blue-300 font-medium">
                                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setShowSearchPanel(!showSearchPanel)}
                                        className={cn(
                                            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all",
                                            showSearchPanel
                                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                                : "bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent"
                                        )}
                                    >
                                        <Sparkles size={10} /> Search
                                    </button>
                                    {onAddToChat && (
                                        <button
                                            onClick={onAddToChat}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-slate-300 hover:bg-white/10 transition-all"
                                        >
                                            <MessageCircle size={10} /> Chat
                                        </button>
                                    )}
                                    <button
                                        onClick={handleClearAll}
                                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Vector Search Panel */}
            <AnimatePresence>
                {showSearchPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden shrink-0"
                    >
                        <div className="px-3 py-2.5 border-b border-white/5 bg-purple-500/5">
                            <form
                                onSubmit={(e) => { e.preventDefault(); handleVectorSearch(); }}
                                className="flex items-center gap-2"
                            >
                                <div className="flex items-center gap-2 flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-purple-500/20">
                                    <Sparkles size={12} className="text-purple-400 shrink-0" />
                                    <input
                                        type="text"
                                        value={vectorQuery}
                                        onChange={(e) => setVectorQuery(e.target.value)}
                                        placeholder="Semantic search..."
                                        className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={vectorSearching || !vectorQuery.trim()}
                                    className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 text-purple-300 text-[10px] font-medium hover:bg-purple-600/40 transition-all disabled:opacity-40 border border-purple-500/20"
                                >
                                    {vectorSearching ? <Loader2 size={12} className="animate-spin" /> : 'Go'}
                                </button>
                            </form>

                            {/* Results */}
                            {vectorResults.length > 0 && (
                                <div className="mt-2 max-h-48 overflow-y-auto panel-scroll space-y-1">
                                    {vectorResults.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => onFileClick(safePath(r.filePath || ''))}
                                            className="w-full text-left px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-[11px] text-slate-200 truncate font-medium group-hover:text-white">
                                                    {r.filePath || 'unknown'}
                                                </span>
                                                <span className="text-[9px] text-purple-400 font-mono shrink-0 ml-2">
                                                    {Math.round(r.similarity * 100)}%
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                                                {r.content.substring(0, 120)}...
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {vectorSearching && (
                                <div className="flex items-center justify-center py-4 text-slate-500 text-xs gap-2">
                                    <Loader2 size={14} className="animate-spin" /> Searching...
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto panel-scroll p-2">
                {loading ? (
                    <div className="space-y-2 p-2 animate-pulse">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div key={i} className="h-5 bg-white/5 rounded" style={{ width: `${50 + Math.random() * 40}%`, marginLeft: `${(i % 3) * 12}px` }} />
                        ))}
                    </div>
                ) : filteredTree.length === 0 ? (
                    <p className="text-xs text-slate-500 p-3">No files found.</p>
                ) : (
                    filteredTree.map(node => (
                        <TreeView
                            key={node.path}
                            node={node}
                            selectedSet={selectedSet}
                            onSelectFiles={onSelectFiles}
                            onFileClick={onFileClick}
                            level={0}
                            defaultOpen={!!searchQuery}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

function TreeView({ node, selectedSet, onSelectFiles, onFileClick, level, defaultOpen }: {
    node: TreeNode;
    selectedSet: Set<string>;
    onSelectFiles: (files: string[] | ((prev: string[]) => string[])) => void;
    onFileClick: (filePath: string) => void;
    level: number;
    defaultOpen: boolean;
}) {
    const [isOpen, setIsOpen] = useState(level === 0 || defaultOpen);

    useEffect(() => {
        if (defaultOpen) setIsOpen(true);
    }, [defaultOpen]);

    const isBlob = node.type === 'blob';
    const isChecked = isBlob && selectedSet.has(node.path);

    // For folder nodes: determine checked/indeterminate state
    const folderBlobs = useMemo(() => {
        if (isBlob) return [];
        return collectBlobPaths(node);
    }, [node, isBlob]);

    const folderSelectedCount = useMemo(() => {
        if (isBlob) return 0;
        return folderBlobs.filter(p => selectedSet.has(p)).length;
    }, [isBlob, folderBlobs, selectedSet]);

    const folderAllSelected = !isBlob && folderBlobs.length > 0 && folderSelectedCount === folderBlobs.length;
    const folderIndeterminate = !isBlob && folderSelectedCount > 0 && folderSelectedCount < folderBlobs.length;

    const handleCheckboxChange = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isBlob) {
            const path = node.path;
            onSelectFiles((prev: string[]) =>
                prev.includes(path) ? prev.filter(f => f !== path) : [...prev, path]
            );
        } else {
            // Folder: toggle all descendants
            if (folderAllSelected) {
                // Deselect all folder blobs
                const blobSet = new Set(folderBlobs);
                onSelectFiles((prev: string[]) => prev.filter(f => !blobSet.has(f)));
            } else {
                // Select all folder blobs
                onSelectFiles((prev: string[]) => {
                    const existing = new Set(prev);
                    const toAdd = folderBlobs.filter(p => !existing.has(p));
                    return [...prev, ...toAdd];
                });
            }
        }
    };

    const handleRowClick = () => {
        if (node.type === 'tree') {
            setIsOpen(!isOpen);
        } else {
            onFileClick(safePath(node.path));
        }
    };

    return (
        <div>
            <div
                onClick={handleRowClick}
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-white/5 rounded cursor-pointer transition-colors group text-xs",
                    isChecked && "bg-blue-500/10"
                )}
                style={{ paddingLeft: `${level * 14 + 8}px` }}
            >
                {/* Chevron */}
                <span className="mr-1 text-slate-500 shrink-0">
                    {node.type === 'tree' ? (
                        isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    ) : (
                        <span className="w-3 inline-block" />
                    )}
                </span>

                {/* Checkbox */}
                <span
                    onClick={handleCheckboxChange}
                    className="mr-1.5 shrink-0 flex items-center"
                >
                    <Checkbox
                        checked={isBlob ? isChecked : (folderAllSelected ? true : (folderIndeterminate ? 'indeterminate' : false))}
                        onCheckedChange={() => {/* handled by parent span onClick */}}
                        className={cn(
                            "h-3.5 w-3.5 border-slate-600 transition-opacity",
                            "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
                            "data-[state=indeterminate]:bg-blue-600/60 data-[state=indeterminate]:border-blue-500",
                            (isChecked || folderAllSelected || folderIndeterminate) ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                        )}
                        tabIndex={-1}
                    />
                </span>

                {/* Icon + Name */}
                <span className="flex items-center gap-1.5 flex-1 text-slate-300 group-hover:text-white transition-colors truncate">
                    {node.type === 'tree' ? (
                        <Folder size={13} className={isOpen ? 'text-blue-400' : 'text-blue-400/70'} />
                    ) : (
                        <File size={13} className="text-slate-400" />
                    )}
                    <span className="truncate">{node.name}</span>
                </span>
            </div>

            <AnimatePresence>
                {node.type === 'tree' && isOpen && node.children && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeView
                                key={child.path}
                                node={child}
                                selectedSet={selectedSet}
                                onSelectFiles={onSelectFiles}
                                onFileClick={onFileClick}
                                level={level + 1}
                                defaultOpen={defaultOpen}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
