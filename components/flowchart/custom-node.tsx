"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { FileCode, FolderOpen, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface FileNodeData {
    label: string;
    fullPath: string;
    fileType: string;
    color: string;
    isFolder?: boolean;
    fileCount?: number;
    imports?: number;
    importedBy?: number;
    [key: string]: unknown;
}

interface CustomNodeProps {
    data: FileNodeData;
    selected?: boolean;
}

function FileNode({ data, selected }: CustomNodeProps) {
    const Icon = data.isFolder ? FolderOpen : FileCode;
    const hasEdgeInfo = typeof data.imports === 'number' || typeof data.importedBy === 'number';

    return (
        <div
            className={`
                group relative rounded-lg px-3 py-2.5
                border transition-all duration-200 cursor-pointer
                min-w-[140px] max-w-[240px]
                ${selected
                    ? 'border-blue-500/50 shadow-lg shadow-blue-500/10'
                    : 'border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-blue-500/5'
                }
            `}
            style={{
                background: 'linear-gradient(145deg, rgba(26,26,31,0.7), rgba(10,10,15,0.9))',
                backdropFilter: 'blur(16px)',
                borderLeft: `3px solid ${data.color}`,
            }}
        >
            {/* Target handle (top) */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !border-0 !rounded-full"
                style={{ background: '#3b82f6', opacity: 0.6 }}
            />

            {/* Content */}
            <div className="flex items-center gap-2">
                <Icon
                    size={14}
                    className="shrink-0"
                    style={{ color: data.color }}
                />
                <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate leading-tight">
                        {data.label}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">
                        {data.fullPath}
                    </p>
                </div>
            </div>

            {/* Type badge + edge counts */}
            <div className="mt-1.5 flex items-center gap-1.5">
                <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full capitalize"
                    style={{
                        backgroundColor: data.color + '20',
                        color: data.color,
                    }}
                >
                    {data.fileType}
                </span>

                {hasEdgeInfo && (
                    <div className="flex items-center gap-1.5 ml-auto">
                        {typeof data.imports === 'number' && data.imports > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] text-slate-500" title={`Imports ${data.imports} file${data.imports > 1 ? 's' : ''}`}>
                                <ArrowUpFromLine size={8} className="text-blue-400/60" />
                                {data.imports}
                            </span>
                        )}
                        {typeof data.importedBy === 'number' && data.importedBy > 0 && (
                            <span className="flex items-center gap-0.5 text-[8px] text-slate-500" title={`Imported by ${data.importedBy} file${data.importedBy > 1 ? 's' : ''}`}>
                                <ArrowDownToLine size={8} className="text-green-400/60" />
                                {data.importedBy}
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
                style={{ background: '#3b82f6', opacity: 0.6 }}
            />
        </div>
    );
}

export const CustomFileNode = memo(FileNode);
