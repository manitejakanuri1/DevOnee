"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ArrowLeft, Loader2, FileCode2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safePathFromSegments } from '@/lib/path-utils';

export default function BlobViewer({ params }: { params: { owner: string, repo: string, path: string[] } }) {
    const router = useRouter();
    const filePath = safePathFromSegments(params.path);

    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/github/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner: params.owner, repo: params.repo, path: filePath, ref: 'main' })
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.message || data.error);
                setContent(data.content);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [params.owner, params.repo, filePath]);

    const fileExtension = filePath.split('.').pop() || 'typescript';
    let language = fileExtension;
    if (['ts', 'tsx'].includes(fileExtension)) language = 'typescript';
    if (['js', 'jsx'].includes(fileExtension)) language = 'javascript';
    if (['py'].includes(fileExtension)) language = 'python';

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col font-sans">
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push(`/repo/${params.owner}/${params.repo}`)}
                            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-md text-sm border border-slate-700"
                        >
                            <ArrowLeft size={16} /> Back to Repo
                        </button>
                        <h1 className="text-lg font-semibold flex items-center gap-2">
                            <FileCode2 size={20} className="text-blue-400" />
                            <span className="text-slate-400">{params.owner}/{params.repo}/</span>
                            <span className="text-slate-200">{filePath}</span>
                        </h1>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
                    <div className="border-b border-slate-800 bg-slate-800/40 p-3 px-4 flex justify-between items-center text-sm text-slate-400">
                        <span>Viewer</span>
                        <span>.{fileExtension} / {language}</span>
                    </div>

                    {loading && (
                        <div className="p-20 flex flex-col items-center justify-center text-slate-500">
                            <Loader2 className="animate-spin mb-4" size={32} />
                            <p>Fetching blob from GitHub...</p>
                        </div>
                    )}

                    {error && !loading && (
                        <div className="p-10 text-center text-red-400 bg-red-500/10 m-4 rounded border border-red-500/20">
                            Failed to load file content: {error}
                        </div>
                    )}

                    {content && !loading && (
                        <SyntaxHighlighter
                            language={language}
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '14px', lineHeight: '1.5' }}
                            showLineNumbers={true}
                            wrapLines={true}
                        >
                            {content}
                        </SyntaxHighlighter>
                    )}
                </div>
            </main>
        </div>
    );
}
