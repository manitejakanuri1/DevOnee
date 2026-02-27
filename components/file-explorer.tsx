"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TreeNode {
    path: string;
    name: string;
    type: 'tree' | 'blob';
    size?: number;
    children?: TreeNode[];
}

interface FileExplorerProps {
    owner: string;
    repo: string;
    branch: string;
    selectedFiles: string[];
    onSelectFiles: (files: string[] | ((prev: string[]) => string[])) => void;
    onFileClick: (filePath: string) => void;
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

export function FileExplorer({ owner, repo, branch, selectedFiles, onSelectFiles, onFileClick, className }: FileExplorerProps) {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Search */}
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
                    <div className="text-[10px] text-slate-500 mt-2 px-1">{fileCount} files</div>
                )}
            </div>

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
                            selectedFiles={selectedFiles}
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

function TreeView({ node, selectedFiles, onSelectFiles, onFileClick, level, defaultOpen }: {
    node: TreeNode;
    selectedFiles: string[];
    onSelectFiles: (files: string[] | ((prev: string[]) => string[])) => void;
    onFileClick: (filePath: string) => void;
    level: number;
    defaultOpen: boolean;
}) {
    const [isOpen, setIsOpen] = useState(level === 0 || defaultOpen);

    useEffect(() => {
        if (defaultOpen) setIsOpen(true);
    }, [defaultOpen]);

    const isSelected = selectedFiles.includes(node.path);

    const handleClick = () => {
        if (node.type === 'tree') {
            setIsOpen(!isOpen);
        } else {
            onFileClick(node.path);
        }
    };

    return (
        <div>
            <div
                onClick={handleClick}
                className={cn(
                    "flex items-center py-1 px-2 hover:bg-white/5 rounded cursor-pointer transition-colors group text-xs",
                    isSelected && "bg-blue-500/10"
                )}
                style={{ paddingLeft: `${level * 14 + 8}px` }}
            >
                <span className="mr-1 text-slate-500">
                    {node.type === 'tree' ? (
                        isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                    ) : (
                        <span className="w-3 inline-block" />
                    )}
                </span>
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
                                selectedFiles={selectedFiles}
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
