"use client";

import { useState, useEffect } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { X, FileCode, AlertCircle } from 'lucide-react';
import { safePath } from '@/lib/path-utils';

interface FileViewerProps {
    owner: string;
    repo: string;
    filePath: string;
    branch: string;
    onClose: () => void;
}

const extLangMap: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    py: 'python', rb: 'ruby', rs: 'rust', go: 'go',
    java: 'java', kt: 'kotlin', swift: 'swift', c: 'c',
    cpp: 'cpp', cs: 'csharp', php: 'php', sh: 'bash',
    md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', xml: 'xml', html: 'html', css: 'css',
    scss: 'scss', sql: 'sql', graphql: 'graphql', dockerfile: 'docker',
    makefile: 'makefile', txt: 'text',
};

function getLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const name = filePath.split('/').pop()?.toLowerCase() || '';
    if (name === 'dockerfile') return 'docker';
    if (name === 'makefile') return 'makefile';
    return extLangMap[ext] || 'text';
}

export function FileViewer({ owner, repo, filePath, branch, onClose }: FileViewerProps) {
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const cleanPath = safePath(filePath);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setContent(null);
        fetch('/api/github/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo, path: cleanPath, ref: branch })
        })
            .then(res => res.json())
            .then(data => {
                if (data.content !== undefined) {
                    setContent(data.content);
                } else {
                    setError(data.error || 'Failed to load file');
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [owner, repo, cleanPath, branch]);

    const parts = cleanPath.split('/');
    const language = getLanguage(cleanPath);

    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex items-center gap-2 text-sm min-w-0">
                    <FileCode size={15} className="text-blue-400 shrink-0" />
                    <div className="flex items-center gap-1 text-slate-300 truncate">
                        {parts.map((part, i) => (
                            <span key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-slate-600">/</span>}
                                <span className={i === parts.length - 1 ? 'text-white font-medium' : ''}>{part}</span>
                            </span>
                        ))}
                    </div>
                </div>
                <button onClick={onClose} className="shrink-0 w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors">
                    <X size={14} className="text-slate-400" />
                </button>
            </div>

            {/* Content */}
            <div className="max-h-[600px] overflow-auto panel-scroll">
                {loading && (
                    <div className="p-4 space-y-2 animate-pulse">
                        {Array.from({ length: 15 }).map((_, i) => (
                            <div key={i} className="h-4 bg-white/5 rounded" style={{ width: `${40 + Math.random() * 50}%` }} />
                        ))}
                    </div>
                )}
                {error && (
                    <div className="p-4 flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
                {content !== null && (
                    <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        showLineNumbers
                        customStyle={{ margin: 0, background: 'transparent', fontSize: '0.8rem', padding: '1rem' }}
                        lineNumberStyle={{ color: 'rgba(255,255,255,0.15)', paddingRight: '1rem', minWidth: '2.5em' }}
                    >
                        {content}
                    </SyntaxHighlighter>
                )}
            </div>
        </div>
    );
}
