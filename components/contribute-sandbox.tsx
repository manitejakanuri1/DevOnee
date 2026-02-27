"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, CheckCircle2, AlertTriangle, Loader2, GitPullRequest, GitFork, GitBranch, FileCode, ExternalLink, Trophy, FlaskConical } from 'lucide-react';
import { GithubDiff, DiffLine } from '@/components/ui/github-inline-diff';
import { useSession, signIn } from 'next-auth/react';
import { TestSandbox } from '@/components/sandbox/test-sandbox';

interface ContributeSandboxProps {
    owner: string;
    repo: string;
    suggestion: { title: string; description: string; files: string[]; steps: string[] } | null;
    challengeId?: string;
    onPrCreated?: (xpEarned: number) => void;
}

const PR_STEPS = [
    { key: 'fork', label: 'Forking repository', icon: GitFork },
    { key: 'branch', label: 'Creating branch', icon: GitBranch },
    { key: 'commit', label: 'Committing changes', icon: FileCode },
    { key: 'pr', label: 'Opening pull request', icon: GitPullRequest },
];

export function ContributeSandbox({ owner, repo, suggestion, challengeId, onPrCreated }: ContributeSandboxProps) {
    const { data: session } = useSession();
    const [activeTab, setActiveTab] = useState<'editor' | 'tests' | 'review'>('editor');

    // Editor state
    const [editorContent, setEditorContent] = useState(
        suggestion?.steps
            ? `// Task: ${suggestion.title}\n// File: ${suggestion.files?.[0] || 'src/index.ts'}\n\n// Make your changes here...\n`
            : "// Make your changes here...\n\nfunction fixIssue() {\n  console.log('Fixed!');\n}"
    );

    // Review flow
    const [reviewLoading, setReviewLoading] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null);

    // PR flow
    const [prLoading, setPrLoading] = useState(false);
    const [prStep, setPrStep] = useState(-1);
    const [prResult, setPrResult] = useState<{
        success?: boolean;
        prUrl?: string;
        branchUrl?: string;
        error?: string;
        xpEarned?: number;
    } | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

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

            const lines = editorContent.split('\n');
            const mockDiff: DiffLine[] = lines.map((content, idx) => ({
                type: idx % 3 === 0 ? 'addition' : 'context',
                oldLineNumber: idx % 3 === 0 ? null : idx,
                newLineNumber: idx + 1,
                content
            }));
            setDiffLines(mockDiff);
        } catch {
            setFeedback("Failed to fetch AI review.");
        } finally {
            setReviewLoading(false);
        }
    };

    const handleCreatePR = async () => {
        setShowConfirm(false);
        setPrLoading(true);
        setPrStep(0);

        try {
            // Simulate step progression for UX
            const stepInterval = setInterval(() => {
                setPrStep(prev => Math.min(prev + 1, PR_STEPS.length - 1));
            }, 3000);

            const res = await fetch('/api/contribution/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner,
                    repo,
                    changes: [{
                        path: suggestion?.files[0] || 'src/index.ts',
                        content: editorContent
                    }],
                    prDetails: {
                        title: `DevOne: ${suggestion?.title || 'Automated contribution'}`,
                        description: suggestion?.description || 'Contribution via DevOne AI platform',
                    },
                    challengeId: challengeId || null,
                })
            });

            clearInterval(stepInterval);
            const data = await res.json();

            if (data.success) {
                setPrStep(PR_STEPS.length);
                setPrResult({
                    success: true,
                    prUrl: data.prUrl,
                    branchUrl: data.branchUrl,
                    xpEarned: suggestion ? 50 : 25,
                });
                onPrCreated?.(suggestion ? 50 : 25);
            } else {
                setPrResult({ error: data.error || data.message || "Failed to create PR" });
            }
        } catch (err: any) {
            setPrResult({ error: err.message || "Failed to create PR." });
        } finally {
            setPrLoading(false);
        }
    };

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden mt-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
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
                        onClick={() => setActiveTab('tests')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === 'tests' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        <FlaskConical size={14} />
                        Tests
                    </button>
                    <button
                        onClick={() => setActiveTab('review')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'review' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                    >
                        AI Review
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="p-0 border-b border-slate-700 min-h-[350px] flex flex-col bg-[#1e1e1e]">
                {activeTab === 'editor' ? (
                    <textarea
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        className="w-full h-full min-h-[350px] bg-transparent text-slate-300 font-mono p-4 focus:outline-none resize-y"
                        spellCheck={false}
                    />
                ) : activeTab === 'tests' ? (
                    <div className="min-h-[350px]">
                        <TestSandbox
                            fileContent={editorContent}
                            fileName={suggestion?.files?.[0] || 'source.ts'}
                        />
                    </div>
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

                                {/* PR Creation Section */}
                                {!prResult && !prLoading && (
                                    <div className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-end md:items-center justify-end gap-4">
                                        {!session ? (
                                            <button
                                                onClick={() => signIn('github')}
                                                className="bg-slate-700 hover:bg-slate-600 w-full md:w-auto text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                Sign In to GitHub to Contribute
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setShowConfirm(true)}
                                                className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <GitPullRequest size={18} />
                                                Create Pull Request
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Confirmation Dialog */}
                                <AnimatePresence>
                                    {showConfirm && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl space-y-3"
                                        >
                                            <p className="text-yellow-200 font-medium">Confirm Pull Request</p>
                                            <p className="text-sm text-yellow-100/70">
                                                This will fork <span className="font-mono text-yellow-300">{owner}/{repo}</span>, create a branch, commit your changes, and open a real PR on GitHub.
                                            </p>
                                            <div className="flex gap-3 justify-end">
                                                <button
                                                    onClick={() => setShowConfirm(false)}
                                                    className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleCreatePR}
                                                    className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 font-semibold flex items-center gap-2"
                                                >
                                                    <GitPullRequest size={16} />
                                                    Confirm & Create PR
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Step-by-step Progress */}
                                {prLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-3"
                                    >
                                        <p className="text-blue-300 font-medium mb-3">Creating Pull Request...</p>
                                        {PR_STEPS.map((step, idx) => {
                                            const StepIcon = step.icon;
                                            const isActive = idx === prStep;
                                            const isDone = idx < prStep;
                                            return (
                                                <div key={step.key} className="flex items-center gap-3">
                                                    {isDone ? (
                                                        <CheckCircle2 size={18} className="text-green-400" />
                                                    ) : isActive ? (
                                                        <Loader2 size={18} className="text-blue-400 animate-spin" />
                                                    ) : (
                                                        <StepIcon size={18} className="text-slate-600" />
                                                    )}
                                                    <span className={`text-sm ${isDone ? 'text-green-300' : isActive ? 'text-blue-300' : 'text-slate-500'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </motion.div>
                                )}

                                {/* Success */}
                                {prResult?.success && (
                                    <motion.div
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl space-y-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <CheckCircle2 className="text-green-500 shrink-0" size={24} />
                                            <div>
                                                <p className="font-semibold text-green-400 mb-1">Pull Request Created!</p>
                                                <a
                                                    href={prResult.prUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-green-200/80 hover:text-white underline flex items-center gap-1"
                                                >
                                                    View on GitHub <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </div>

                                        {prResult.xpEarned && (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg"
                                            >
                                                <Trophy className="text-yellow-400" size={20} />
                                                <span className="text-yellow-300 font-bold">+{prResult.xpEarned} XP earned!</span>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* Error */}
                                {prResult?.error && (
                                    <motion.div
                                        initial={{ scale: 0.95, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3"
                                    >
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

            {/* Footer */}
            {(activeTab === 'editor' || activeTab === 'tests') && (
                <div className="bg-slate-900 p-4 flex justify-between items-center">
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        {activeTab === 'tests' ? 'Write and run tests against your code' : 'Ready to submit'}
                    </div>
                    {activeTab === 'editor' && (
                        <button
                            onClick={handleReview}
                            disabled={reviewLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            Submit to Sandbox Review <Send size={16} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
