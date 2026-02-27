"use client";

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText } from 'lucide-react';

interface ReadmePreviewProps {
    owner: string;
    repo: string;
    branch: string;
}

function extractLang(className?: string): string {
    const match = className?.match(/language-(\w+)/);
    return match ? match[1] : 'text';
}

export function ReadmePreview({ owner, repo, branch }: ReadmePreviewProps) {
    const [content, setContent] = useState<string | null>(null);
    const [found, setFound] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setContent(null);
        fetch('/api/repo/readme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo, branch })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setContent(data.content || '');
                    setFound(data.found !== false);
                }
            })
            .catch(() => setFound(false))
            .finally(() => setLoading(false));
    }, [owner, repo, branch]);

    // Transform relative image URLs to raw GitHub URLs
    const transformImageUri = (src: string) => {
        if (!src || src.startsWith('http') || src.startsWith('data:')) return src;
        return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${src}`;
    };

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                <div className="h-6 w-48 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
                <div className="h-4 w-5/6 bg-white/5 rounded" />
                <div className="h-4 w-4/6 bg-white/5 rounded" />
                <div className="h-4 w-full bg-white/5 rounded" />
            </div>
        );
    }

    if (!found || !content) {
        return (
            <div className="flex items-center gap-3 text-slate-500 text-sm py-4">
                <FileText size={16} />
                No README.md found in this repository.
            </div>
        );
    }

    return (
        <div className="readme-content prose prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                    h1: ({ children }) => <h1 className="text-2xl font-bold text-white mb-4 pb-2 border-b border-white/10">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-lg font-medium text-slate-200 mt-4 mb-2">{children}</h3>,
                    p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-4">{children}</p>,
                    a: ({ href, children }) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                            return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm text-blue-300 font-mono">{children}</code>;
                        }
                        return (
                            <SyntaxHighlighter style={oneDark} language={extractLang(className)} PreTag="div" customStyle={{ background: '#0f172a', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem' }}>
                                {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                        );
                    },
                    ul: ({ children }) => <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-1">{children}</ol>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 text-slate-400 italic my-4">{children}</blockquote>,
                    table: ({ children }) => <div className="overflow-x-auto mb-4"><table className="w-full text-sm text-slate-300 border border-white/10">{children}</table></div>,
                    th: ({ children }) => <th className="bg-white/5 px-4 py-2 border border-white/10 text-left font-semibold">{children}</th>,
                    td: ({ children }) => <td className="px-4 py-2 border border-white/10">{children}</td>,
                    img: ({ src, alt }) => <img src={transformImageUri(String(src || ''))} alt={String(alt || '')} className="max-w-full rounded-lg my-4" />,
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
