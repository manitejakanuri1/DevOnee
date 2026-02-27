"use client";

import { memo, useState } from 'react';
import { Handle, Position } from '@xyflow/react';

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
    shadowed?: boolean;
    lines?: number;
    [key: string]: unknown;
}

interface CustomNodeProps {
    data: FileNodeData;
    selected?: boolean;
}

/* File-extension → icon label */
const TYPE_LABELS: Record<string, string> = {
    tsx: 'TSX', ts: 'TS', js: 'JS', jsx: 'JSX',
    css: 'CSS', py: 'PY', json: '{ }', config: '⚙',
    entry: '▶', test: 'TST', api: 'API', component: 'UI',
    util: 'LIB', model: 'M', service: 'SVC', docs: 'MD', source: 'SRC',
};

const DARK_TEXT_TYPES = new Set(['js', 'jsx', 'config']);

function FileNode({ data }: CustomNodeProps) {
    const [hovered, setHovered] = useState(false);
    const isDimmed = data.dimmed;
    const isActive = data.active;
    const isEntry = data.isEntry;
    const isShadowed = data.shadowed && !hovered; // subtle shadow for non-entry nodes
    const typeLabel = TYPE_LABELS[data.fileType] || data.fileType.slice(0, 3).toUpperCase();
    const darkText = DARK_TEXT_TYPES.has(data.fileType);
    const lineCount = typeof data.lines === 'number' ? data.lines : 0;
    const importCount = typeof data.imports === 'number' ? data.imports : 0;

    return (
        <div
            onMouseEnter={() => !isDimmed && setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                opacity: isDimmed ? 0.12 : isShadowed ? 0.55 : 1,
                filter: isDimmed ? 'grayscale(0.8)' : isShadowed ? 'brightness(0.7)' : 'none',
                transform: isActive ? 'scale(1.06)' : hovered && !isDimmed ? 'scale(1.06)' : isDimmed ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                pointerEvents: isDimmed ? 'none' as const : 'auto' as const,
            }}
        >
            <div
                style={{
                    position: 'relative',
                    background: isEntry && !isDimmed
                        ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(20,20,30,0.95))'
                        : 'rgba(20, 20, 30, 0.95)',
                    border: isActive
                        ? '2px solid #818cf8'
                        : isEntry && !isDimmed
                            ? '2px solid #6366f1'
                            : '1.5px solid rgba(255,255,255,0.08)',
                    borderLeft: isEntry && !isDimmed ? '4px solid #6366f1' : `3px solid ${data.color}`,
                    borderRadius: '12px',
                    padding: '10px 14px',
                    minWidth: '140px',
                    maxWidth: '250px',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    boxShadow: isActive
                        ? '0 0 30px rgba(99,102,241,0.2), 0 0 0 1px #818cf8'
                        : hovered && !isDimmed
                            ? '0 0 20px rgba(99,102,241,0.15), 0 0 0 1px rgba(129,140,248,0.3)'
                            : isEntry && !isDimmed
                                ? '0 0 25px rgba(99,102,241,0.3), 0 0 50px rgba(99,102,241,0.1)'
                                : '0 2px 8px rgba(0,0,0,0.3)',
                    animation: isEntry && !isDimmed && !isActive ? 'pulse-ring 2s infinite' : 'none',
                }}
            >
                {/* ENTRY badge — prominent so user knows the starting point */}
                {isEntry && !isDimmed && (
                    <div style={{
                        position: 'absolute', top: '-10px', right: '-10px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        color: '#fff',
                        fontSize: '9px', padding: '3px 8px', borderRadius: '8px',
                        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                        fontWeight: 700, textTransform: 'uppercase' as const,
                        letterSpacing: '0.8px', zIndex: 10,
                        boxShadow: '0 0 12px rgba(99,102,241,0.5), 0 2px 8px rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', gap: '4px',
                    }}>
                        <span style={{ fontSize: '10px' }}>▶</span> START
                    </div>
                )}

                {/* Header row: icon + filename */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div style={{
                        width: '20px', height: '20px', borderRadius: '5px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700,
                        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                        color: darkText ? '#000' : '#fff',
                        background: data.color, flexShrink: 0,
                    }}>
                        {typeLabel}
                    </div>
                    <div style={{
                        fontSize: '12.5px', fontWeight: 600,
                        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                        color: '#e8e8f0',
                        whiteSpace: 'nowrap' as const, overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}>
                        {data.label}
                    </div>
                </div>

                {/* Path */}
                <div style={{
                    fontSize: '10px', color: '#666',
                    fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                    whiteSpace: 'nowrap' as const, overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {data.fullPath}
                </div>

                {/* Meta row */}
                <div style={{
                    display: 'flex', gap: '8px', marginTop: '6px', paddingTop: '6px',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <div style={{ fontSize: '9.5px', color: '#555', fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}>
                        <b style={{ color: '#999' }}>{lineCount}</b> lines
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#555', fontFamily: "ui-monospace, 'JetBrains Mono', monospace" }}>
                        <b style={{ color: '#999' }}>{importCount}</b> imports
                    </div>
                </div>
            </div>

            {/* Handles */}
            <Handle type="target" position={Position.Top}
                className="!w-2 !h-2 !border-0 !rounded-full"
                style={{ background: isActive ? '#818cf8' : data.color, opacity: isDimmed ? 0.1 : 0.5 }}
            />
            <Handle type="source" position={Position.Bottom}
                className="!w-2 !h-2 !border-0 !rounded-full"
                style={{ background: isActive ? '#818cf8' : data.color, opacity: isDimmed ? 0.1 : 0.5 }}
            />
        </div>
    );
}

export const CustomFileNode = memo(FileNode);

/* ── Folder group node (dashed border container) ── */
function FolderGroup({ data }: { data: { label: string; w: number; h: number; [key: string]: unknown } }) {
    return (
        <div style={{
            width: data.w, height: data.h,
            border: '1px dashed rgba(255,255,255,0.06)',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.015)',
            position: 'relative',
            pointerEvents: 'none' as const,
        }}>
            <span style={{
                position: 'absolute', top: '-10px', left: '16px',
                background: '#0a0a0f', padding: '2px 10px',
                fontSize: '10px',
                fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
                color: '#555', borderRadius: '4px',
                letterSpacing: '0.5px', textTransform: 'uppercase' as const,
            }}>
                {data.label}
            </span>
        </div>
    );
}

export const FolderGroupNode = memo(FolderGroup);
