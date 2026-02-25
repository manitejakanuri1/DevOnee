"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, File, ChevronRight, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

// Helper component for recursive tree rendering
interface TreeNode {
    path: string;
    name: string;
    type: 'tree' | 'blob';
    children?: TreeNode[];
}

interface FileExplorerProps {
    owner: string;
    repo: string;
    selectedFiles: string[];
    onSelectFiles: (files: string[] | ((prev: string[]) => string[])) => void;
}

export function FileExplorer({ owner, repo, selectedFiles, onSelectFiles }: FileExplorerProps) {
    const [tree, setTree] = useState<TreeNode[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we would call an internal Next API here instead of Github directly or pass tree as prop
        // Mock tree for demonstration UI purpose since backend github API fetch recursively is heavy to do client-side:
        setTree([
            {
                name: 'src', path: 'src', type: 'tree', children: [
                    { name: 'index.ts', path: 'src/index.ts', type: 'blob' },
                    { name: 'app.ts', path: 'src/app.ts', type: 'blob' },
                    {
                        name: 'utils', path: 'src/utils', type: 'tree', children: [
                            { name: 'helpers.ts', path: 'src/utils/helpers.ts', type: 'blob' }
                        ]
                    }
                ]
            },
            { name: 'package.json', path: 'package.json', type: 'blob' },
            { name: 'README.md', path: 'README.md', type: 'blob' }
        ]);
        setLoading(false);
    }, [owner, repo]);

    const toggleSelect = (path: string) => {
        onSelectFiles(prev =>
            prev.includes(path)
                ? prev.filter(p => p !== path)
                : [...prev, path]
        );
    };

    if (loading) return <div className="p-4 text-slate-400 animate-pulse text-sm">Loading tree...</div>;

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden text-sm">
            <div className="bg-slate-800 p-3 border-b border-slate-700 font-semibold text-slate-200">
                File Explorer
            </div>
            <div className="p-2 max-h-[500px] overflow-y-auto">
                {tree.map(node => (
                    <TreeView key={node.path} node={node} selectedFiles={selectedFiles} toggleSelect={toggleSelect} level={0} />
                ))}
            </div>
        </div>
    );
}

function TreeView({ node, selectedFiles, toggleSelect, level }: { node: TreeNode, selectedFiles: string[], toggleSelect: (path: string) => void, level: number }) {
    const [isOpen, setIsOpen] = useState(level === 0);
    const isSelected = selectedFiles.includes(node.path);

    return (
        <div>
            <div
                className={cn(
                    "flex items-center py-1.5 px-2 hover:bg-slate-800 rounded-md cursor-pointer transition-colors group",
                    isSelected && "bg-slate-800/50"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
            >
                <span onClick={() => node.type === 'tree' ? setIsOpen(!isOpen) : toggleSelect(node.path)} className="mr-1.5 text-slate-500 hover:text-white transition-colors">
                    {node.type === 'tree' ? (
                        isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    ) : (
                        <span className="w-3.5 inline-block" /> // Spacer for alignment
                    )}
                </span>

                {node.type === 'blob' && (
                    <span onClick={(e) => { e.stopPropagation(); toggleSelect(node.path); }} className="mr-2 cursor-pointer text-slate-500 hover:text-blue-400">
                        {isSelected ? <CheckSquare size={14} className="text-blue-500" /> : <Square size={14} />}
                    </span>
                )}

                <span onClick={() => node.type === 'tree' ? setIsOpen(!isOpen) : toggleSelect(node.path)} className="flex items-center gap-2 flex-1 text-slate-300 group-hover:text-white transition-colors">
                    {node.type === 'tree' ? (
                        <Folder size={14} className={isOpen ? "text-blue-400" : "text-blue-400/70"} />
                    ) : (
                        <File size={14} className="text-slate-400" />
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
                        className="overflow-hidden"
                    >
                        {node.children.map(child => (
                            <TreeView key={child.path} node={child} selectedFiles={selectedFiles} toggleSelect={toggleSelect} level={level + 1} />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
