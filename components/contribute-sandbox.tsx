"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Terminal, Send, CheckCircle2, AlertTriangle, Loader2, GitPullRequest } from 'lucide-react';
import { GithubDiff, DiffLine } from '@/components/ui/github-inline-diff';
import { useSession, signIn } from 'next-auth/react';

interface ContributeSandboxProps {
    owner: string;
    repo: string;
    suggestion: { title: string; description: string; files: string[]; steps: string[] } | null;
}

export function ContributeSandbox({ owner, repo, suggestion }: ContributeSandboxProps) {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'editor' | 'review' | 'pr'>('editor');
    const [forkUrl, setForkUrl] = useState('');

    // Mock Editor State
    const [editorContent, setEditorContent] = useState("// Make your changes here...\n\nfunction fixIssue() {\n  console.log('Fixed!');\n}");

    // Review flow
    const [reviewLoading, setReviewLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);

    // PR flow
    const [prLoading, setPrLoading] = useState(false);
    const [prResult, setPrResult] = useState<{ success?: boolean, prUrl?: string, branchUrl?: string, error?: string } | null>(null);

    const handleReview = async () => {
        setReviewLoading(true);
        setActiveTab('review');
        try {
            const res = await fetch('/api/review/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: editorContent })
            });
            const data = await res.json();
            setFeedback(data.success ? data.feedback : data.message);

            // Generate mock diff lines based on the user's content for the Sandbox
            const lines = editorContent.split('\n');
            const mockDiff: DiffLine[] = lines.map((content, idx) => ({
                type: idx % 3 === 0 ? 'addition' : 'context',
                oldLineNumber: idx % 3 === 0 ? null : idx,
                newLineNumber: idx + 1,
                content
            }));
            setDiffLines(mockDiff);

        } catch (err: any) {
            setFeedback("Failed to fetch AI review.");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleCreatePR = async () => {
        setPrLoading(true);

        let parsedForkOwner = '';
        if (forkUrl) {
            const regex = /(?:github\.com\/)?([a-zA-Z0-9.-]+)\/[a-zA-Z0-9.-]+/;
            const match = forkUrl.match(regex);
            if (match && match[1]) {
                parsedForkOwner = match[1];
            }
        }

        try {
            const res = await fetch('/api/contribution/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner,
                    repo,
                    forkOwner: parsedForkOwner,
                    branchName: `fix-${Date.now()}`,
                    changes: [{ path: suggestion?.files[0] || 'src/index.ts', content: editorContent }],
                    prDetails: { title: `Feature: ${suggestion?.title || 'Automated Patch'}` }
                })
            });
            const data = await res.json();
            setPrResult(data);
        } catch (err: any) {
            setPrResult({ error: "Failed to create PR mockup." });
        } finally {
            setPrLoading(false);
        }
    }

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden mt-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Terminal className="text-green-400" />
                    Contribution Sandbox
                </h3>

                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'editor' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => setActiveTab('review')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'review' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        AI Review
                    </button>
                </div>
            </div>

            <div className="p-0 border-b border-slate-700 min-h-[350px] flex flex-col bg-[#1e1e1e]">
                {activeTab === 'editor' ? (
                    <textarea
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        className="w-full h-full min-h-[350px] bg-transparent text-slate-300 font-mono p-4 focus:outline-none resize-y"
                        spellCheck={false}
                    />
                ) : (
                    <div className="p-6 h-full flex flex-col h-[350px] overflow-y-auto bg-slate-900">
                        {reviewLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                                <Loader2 className="animate-spin mb-4 text-blue-400" size={32} />
                                <p>Senior AI Mentor is reviewing your code changes...</p>
                            </div>
                        ) : feedback ? (
                            <div className="flex-1 space-y-4">
                                <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-xl text-blue-100 whitespace-pre-wrap text-sm leading-relaxed">
                                    {feedback}
                                </div>

                                {diffLines && (
                                    <div className="mt-6 mb-4">
                                        <GithubDiff
                                            fileName={suggestion?.files[0] || 'src/index.ts'}
                                            diffLines={diffLines}
                                            initialComments={{
                                                0: [{
                                                    id: 'mock-1',
                                                    author: { name: 'AI Reviewer', avatar: '', role: 'Bot' },
                                                    content: feedback,
                                                    timestamp: 'Just now'
                                                }]
                                            }}
                                        />
                                    </div>
                                )}

                                {!prResult && (
                                    <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-end md:items-center justify-between gap-4">
                                        {!session ? (
                                            <button
                                                onClick={() => signIn('github')}
                                                className="bg-slate-700 hover:bg-slate-600 w-full md:w-auto text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ml-auto"
                                            >
                                                Sign In to GitHub to Contribute
                                            </button>
                                        ) : (
                                            <>
                                                <input
                                                    type="text"
                                                    value={forkUrl}
                                                    onChange={(e) => setForkUrl(e.target.value)}
                                                    placeholder="Paste your fork URL (Required: github.com/you/repo)"
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 max-w-sm"
                                                />
                                                <button
                                                    onClick={handleCreatePR}
                                                    disabled={prLoading || !forkUrl.trim()}
                                                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                                >
                                                    {prLoading ? <Loader2 size={18} className="animate-spin" /> : <GitPullRequest size={18} />}
                                                    {prLoading ? 'Submitting to GitHub...' : 'Looks good, create PR!'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}

                                {prResult?.success && (
                                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                                        <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                                        <div>
                                            <p className="font-semibold text-green-400 mb-1">Success! PR Draft Created.</p>
                                            <p className="text-sm text-green-200/80">
                                                Simulated pull request created at <a href={prResult.prUrl} target="_blank" className="underline hover:text-white">GitHub</a>
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                                {prResult?.error && (
                                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0" size={24} />
                                        <div>
                                            <p className="font-semibold text-red-400">Failed to create PR</p>
                                            <p className="text-sm text-red-200/80">{prResult.error}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500 italic">
                                No review requested yet.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {activeTab === 'editor' && (
                <div className="bg-slate-900 p-4 flex justify-between items-center">
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        Ready to submit
                    </div>
                    <button
                        onClick={handleReview}
                        disabled={reviewLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        Submit to Sandbox Review <Send size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
