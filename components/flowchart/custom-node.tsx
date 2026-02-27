"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, FolderOpen, ArrowDownToLine, ArrowUpFromLine, Zap } from 'lucide-react';

interface FileNodeData {
    label: string;
    fullPath: string;
    fileType: string;
    color: string;
    isFolder?: boolean;
    fileCount?: number;
    imports?: number;
    importedBy?: number;
    isEntry?: boolean;
    dimmed?: boolean;
    active?: boolean;
    [key: string]: unknown;
}

interface CustomNodeProps {
    data: FileNodeData;
    selected?: boolean;
}

function FileNode({ data, selected }: CustomNodeProps) {
    const Icon = data.isFolder ? FolderOpen : FileCode;
    const hasEdgeInfo = typeof data.imports === 'number' || typeof data.importedBy === 'number';
    const isActive = data.active || selected;
    const isDimmed = data.dimmed;
    const isEntry = data.isEntry;

    return (
        <div
            className={`
                group relative rounded-xl px-3 py-2.5
                border transition-all duration-300 cursor-pointer
                min-w-[150px] max-w-[240px]
                ${isDimmed
                    ? 'opacity-[0.12] grayscale pointer-events-none scale-95'
                    : isActive
                        ? 'shadow-lg scale-[1.04] z-50'
                        : 'hover:scale-[1.03] hover:shadow-lg'
                }
                ${isEntry && !isDimmed ? 'animate-entry-pulse' : ''}
            `}
            style={{
                background: isDimmed
                    ? 'rgba(15,15,20,0.6)'
                    : 'rgba(20,20,30,0.95)',
                backdropFilter: 'blur(12px)',
                borderLeft: `3px solid ${data.color}`,
                borderColor: isActive
                    ? data.color + '80'
                    : isEntry && !isDimmed
                        ? data.color + '50'
                        : 'rgba(255,255,255,0.08)',
                boxShadow: isActive
                    ? `0 0 24px ${data.color}30, 0 8px 32px rgba(0,0,0,0.4)`
                    : isEntry && !isDimmed
                        ? `0 0 16px ${data.color}20`
                        : 'none',
            }}
        >
            {/* Entry badge */}
            {isEntry && !isDimmed && (
                <div
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider text-white z-10 flex items-center gap-0.5"
                    style={{ background: data.color }}
                >
                    <Zap size={7} />
                    Entry
                </div>
            )}

            {/* Target handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !border-0 !rounded-full"
                style={{
                    background: isActive ? data.color : '#3b82f6',
                    opacity: isDimmed ? 0.1 : 0.6,
                }}
            />

            {/* Content */}
            <div className="flex items-center gap-2">
                <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{
                        backgroundColor: data.color + '20',
                    }}
                >
                    <Icon
                        size={12}
                        className="shrink-0"
                        style={{ color: data.color }}
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-[12px] font-semibold truncate leading-tight ${isActive ? 'text-white' : 'text-slate-200'}`}>
                        {data.label}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5 font-mono">
                        {data.fullPath}
                    </p>
                </div>
            </div>

            {/* Type badge + edge counts */}
            <div className="mt-2 flex items-center gap-1.5 pt-1.5 border-t border-white/5">
                <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md capitalize"
                    style={{
                        backgroundColor: data.color + '18',
                        color: data.color,
                    }}
                >
                    {data.fileType}
                </span>

                {hasEdgeInfo && (
                    <div className="flex items-center gap-2 ml-auto">
                        {typeof data.imports === 'number' && data.imports > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] text-slate-400" title={`Imports ${data.imports} file${data.imports > 1 ? 's' : ''}`}>
                                <ArrowUpFromLine size={8} className="text-blue-400/70" />
                                <b>{data.imports}</b>
                            </span>
                        )}
                        {typeof data.importedBy === 'number' && data.importedBy > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] text-slate-400" title={`Imported by ${data.importedBy} file${data.importedBy > 1 ? 's' : ''}`}>
                                <ArrowDownToLine size={8} className="text-green-400/70" />
                                <b>{data.importedBy}</b>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Source handle (bottom) */}
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-2 !h-2 !border-0 !rounded-full"
                style={{
                    background: isActive ? data.color : '#3b82f6',
                    opacity: isDimmed ? 0.1 : 0.6,
                }}
            />
        </div>
    );
}

export const CustomFileNode = memo(FileNode);
