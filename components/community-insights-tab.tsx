"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowUp, MessageSquare, Plus, Send, Loader2, AlertCircle,
    User, Calendar, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Insight {
    id: string;
    title: string;
    content: string;
    upvotes: number;
    author_id?: string;
    created_at: string;
}

interface CommunityInsightsTabProps {
    owner: string;
    repo: string;
}

export function CommunityInsightsTab({ owner, repo }: CommunityInsightsTabProps) {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

    const repoFullName = `${owner}/${repo}`;

    // Fetch insights
    useEffect(() => {
        setLoading(true);
        setError(null);

        fetch(`/api/insights?repo=${encodeURIComponent(repoFullName)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setInsights(data.insights || []);
                } else {
                    setError(data.error || 'Failed to load insights');
                }
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [repoFullName]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) return;
        setSubmitting(true);

        try {
            const res = await fetch('/api/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: title.trim(), content: content.trim(), repo: repoFullName })
            });
            const data = await res.json();

            if (data.success && data.insight) {
                setInsights(prev => [data.insight, ...prev]);
                setTitle('');
                setContent('');
                setShowForm(false);
            } else {
                setError(data.error || 'Failed to submit insight');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (insightId: string) => {
        if (votedIds.has(insightId)) return;

        // Optimistic update
        setVotedIds(prev => new Set(prev).add(insightId));
        setInsights(prev =>
            prev.map(i => i.id === insightId ? { ...i, upvotes: (i.upvotes || 0) + 1 } : i)
        );

        try {
            const res = await fetch(`/api/insights/${insightId}/vote`, { method: 'POST' });
            const data = await res.json();

            if (!data.success) {
                // Revert on failure
                setVotedIds(prev => { const next = new Set(prev); next.delete(insightId); return next; });
                setInsights(prev =>
                    prev.map(i => i.id === insightId ? { ...i, upvotes: Math.max(0, (i.upvotes || 0) - 1) } : i)
                );
            }
        } catch {
            // Revert on error
            setVotedIds(prev => { const next = new Set(prev); next.delete(insightId); return next; });
            setInsights(prev =>
                prev.map(i => i.id === insightId ? { ...i, upvotes: Math.max(0, (i.upvotes || 0) - 1) } : i)
            );
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 30) return `${days}d ago`;
        return d.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mb-4" size={28} />
                <p className="text-sm">Loading community insights...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Lightbulb size={20} className="text-yellow-400" />
                        Community Insights
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Tips, notes, and knowledge shared by developers exploring this repo
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                    <Plus size={14} />
                    Share Insight
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {/* Submit form */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="glass-card rounded-2xl p-5 space-y-4 border border-blue-500/20">
                            <h3 className="text-sm font-semibold text-white">Share your insight</h3>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Title (e.g., 'How the auth system works')"
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50"
                            />
                            <textarea
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                placeholder="Share your findings, tips, or notes about this codebase..."
                                rows={4}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 resize-none"
                            />
                            <div className="flex items-center gap-2 justify-end">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !title.trim() || !content.trim()}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                                >
                                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                    {submitting ? 'Posting...' : 'Post Insight'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Insights list */}
            {insights.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 flex flex-col items-center text-slate-400">
                    <MessageSquare size={32} className="mb-4 text-slate-600" />
                    <p className="font-medium">No insights yet</p>
                    <p className="text-xs text-slate-500 mt-1">Be the first to share your knowledge about this repo</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {insights.map((insight, idx) => (
                        <motion.div
                            key={insight.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-card rounded-2xl p-5 flex gap-4"
                        >
                            {/* Vote button */}
                            <div className="flex flex-col items-center shrink-0">
                                <button
                                    onClick={() => handleVote(insight.id)}
                                    className={cn(
                                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                        votedIds.has(insight.id)
                                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                            : "bg-white/5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 border border-white/5 hover:border-blue-500/20"
                                    )}
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <span className={cn(
                                    "text-sm font-semibold mt-1",
                                    votedIds.has(insight.id) ? "text-blue-400" : "text-slate-400"
                                )}>
                                    {insight.upvotes || 0}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white mb-1 line-clamp-1">
                                    {insight.title?.replace(/^\[.*?\]\s*/, '')}
                                </h4>
                                <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 whitespace-pre-wrap">
                                    {insight.content}
                                </p>
                                <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <User size={10} />
                                        {insight.author_id ? 'Member' : 'Anonymous'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={10} />
                                        {formatDate(insight.created_at)}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
