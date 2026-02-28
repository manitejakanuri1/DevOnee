"use client";

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal, Send, CheckCircle2, AlertTriangle, Loader2, GitPullRequest,
    GitFork, GitBranch, FileCode, ExternalLink, Trophy, FlaskConical,
    ArrowRight, Languages, Sparkles, RotateCcw, Download
} from 'lucide-react';
import { GithubDiff, DiffLine } from '@/components/ui/github-inline-diff';
import { useAuth } from '@/lib/hooks/use-auth';
import { signInWithGitHub } from '@/lib/auth';
import { TestSandbox } from '@/components/sandbox/test-sandbox';
import { safePath } from '@/lib/path-utils';

// Lazy-load Monaco Editor (requires browser APIs — cannot SSR)
const MonacoEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.default), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[400px] bg-[#1e1e1e] flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-500" size={24} />
        </div>
    ),
});

// Language maps
const monacoLangMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', rs: 'rust', go: 'go',
    java: 'java', kt: 'kotlin', swift: 'swift', c: 'c',
    cpp: 'cpp', cs: 'csharp', php: 'php', sh: 'shell',
    md: 'markdown', json: 'json', yaml: 'yaml', yml: 'yaml',
    html: 'html', css: 'css', scss: 'scss', sql: 'sql',
};

const TARGET_LANGUAGES = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'go', label: 'Go' },
    { value: 'rust', label: 'Rust' },
    { value: 'java', label: 'Java' },
    { value: 'cpp', label: 'C++' },
    { value: 'ruby', label: 'Ruby' },
    { value: 'php', label: 'PHP' },
    { value: 'csharp', label: 'C#' },
    { value: 'swift', label: 'Swift' },
    { value: 'kotlin', label: 'Kotlin' },
];

function getMonacoLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const name = filePath.split('/').pop()?.toLowerCase() || '';
    if (name === 'dockerfile') return 'dockerfile';
    if (name === 'makefile') return 'shell';
    return monacoLangMap[ext] || 'plaintext';
}

function getLangLabel(langId: string): string {
    const match = TARGET_LANGUAGES.find(l => l.value === langId);
    return match?.label || langId;
}

// ────────────────────────────────────────────────────────────────

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
    const { user: session } = useAuth();
    const [activeTab, setActiveTab] = useState<'editor' | 'tests' | 'review'>('editor');

    // File state
    const [selectedFile, setSelectedFile] = useState(suggestion?.files?.[0] || '');
    const [fileInput, setFileInput] = useState(suggestion?.files?.[0] || '');
    const [originalContent, setOriginalContent] = useState('');
    const [fileLoading, setFileLoading] = useState(false);

    // Editor state
    const [editorContent, setEditorContent] = useState('');
    const [detectedLanguage, setDetectedLanguage] = useState('typescript');
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);

    // Translation state
    const [targetLanguage, setTargetLanguage] = useState('');
    const [translating, setTranslating] = useState(false);

    // Commit message state
    const [commitMessage, setCommitMessage] = useState('');
    const [commitMsgLoading, setCommitMsgLoading] = useState(false);

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

    // Update language when file changes
    useEffect(() => {
        if (selectedFile) {
            setDetectedLanguage(getMonacoLanguage(selectedFile));
        }
    }, [selectedFile]);

    const generateSolution = useCallback(async (fileContent: string | null, filePath: string) => {
        if (!suggestion) return;
        setGenerating(true);
        setGenError(null);
        try {
            const hasFile = fileContent && fileContent.length > 0;
            const prompt = hasFile
                ? `OUTPUT ONLY RAW CODE. No markdown fences, no backticks, no explanation, no prose. Return the complete modified file with the fix applied.\n\nFix: ${suggestion.title}\n${suggestion.description}\nSteps: ${suggestion.steps.join('; ')}\n\nFile (${filePath}):\n${fileContent}\n\nOutput the fixed file now:`
                : `OUTPUT ONLY RAW CODE. No markdown fences, no backticks, no explanation, no prose. Write the complete implementation file.\n\nTask: ${suggestion.title}\n${suggestion.description}\nSteps: ${suggestion.steps.join('; ')}\n\nFile: ${filePath}\n\nWrite the complete code file now:`;

            const res = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: prompt, owner, repo }),
            });
            const data = await res.json();

            if (!data.success) {
                setGenError(data.message || 'AI generation failed');
                return;
            }

            let code = data.response || '';
            const fenceMatch = code.match(/```[\w]*\n([\s\S]*?)```/);
            if (fenceMatch) code = fenceMatch[1];
            code = code.trim();

            if (code.length > 0) {
                setEditorContent(code);
            } else {
                setGenError('AI returned empty response');
            }
        } catch (err: any) {
            setGenError(err?.message || 'Failed to generate code');
        } finally {
            setGenerating(false);
        }
    }, [suggestion, owner, repo]);

    const loadFile = async (filePath: string) => {
        if (!filePath) return;
        setFileLoading(true);
        try {
            const res = await fetch('/api/github/content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ owner, repo, path: safePath(filePath), ref: 'main' })
            });
            const data = await res.json();
            if (data.content !== undefined) {
                setOriginalContent(data.content);
                setEditorContent(data.content);
                setSelectedFile(filePath);
                setDetectedLanguage(getMonacoLanguage(filePath));
                if (suggestion) {
                    generateSolution(data.content, filePath);
                }
            } else if (suggestion) {
                setSelectedFile(filePath);
                setDetectedLanguage(getMonacoLanguage(filePath));
                generateSolution(null, filePath);
            }
        } catch {
            if (suggestion) {
                generateSolution(null, filePath);
            }
        } finally {
            setFileLoading(false);
        }
    };

    useEffect(() => {
        if (suggestion?.files?.[0]) {
            loadFile(suggestion.files[0]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTranslate = async () => {
        if (!targetLanguage || !editorContent) return;
        setTranslating(true);
        try {
            const res = await fetch('/api/ai/translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: editorContent,
                    sourceLanguage: detectedLanguage,
                    targetLanguage,
                })
            });
            const data = await res.json();
            if (data.success && data.translatedCode) {
                setEditorContent(data.translatedCode);
                setDetectedLanguage(targetLanguage);
            }
        } catch {
            // Translation failed
        } finally {
            setTranslating(false);
        }
    };

    const handleGenerateCommitMsg = async () => {
        setCommitMsgLoading(true);
        try {
            const res = await fetch('/api/ai/commit-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent,
                    newContent: editorContent,
                    filePath: selectedFile || 'src/index.ts',
                    repoContext: `${owner}/${repo}`,
                })
            });
            const data = await res.json();
            if (data.success) {
                setCommitMessage(data.commitMessage);
            }
        } catch {
            // Commit message generation failed
        } finally {
            setCommitMsgLoading(false);
        }
    };

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
            const stepInterval = setInterval(() => {
                setPrStep(prev => Math.min(prev + 1, PR_STEPS.length - 1));
            }, 3000);

            const prTitle = commitMessage || `DevOne: ${suggestion?.title || 'Automated contribution'}`;

            const res = await fetch('/api/contribution/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    owner,
                    repo,
                    changes: [{
                        path: selectedFile || suggestion?.files[0] || 'src/index.ts',
                        content: editorContent
                    }],
                    prDetails: {
                        title: prTitle,
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

    const hasChanges = editorContent !== originalContent;

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden mt-6 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header with tabs */}
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Terminal className="text-green-400" />
                    Contribution Sandbox
                </h3>
                <div className="flex gap-2">
                    {(['editor', 'tests', 'review'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                                activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                        >
                            {tab === 'tests' && <FlaskConical size={14} />}
                            {tab === 'editor' ? 'Editor' : tab === 'tests' ? 'Tests' : 'AI Review'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="border-b border-slate-700 min-h-[350px] flex flex-col bg-[#1e1e1e]">
                {activeTab === 'editor' ? (
                    <>
                        {/* File selector */}
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 border-b border-slate-700/50">
                            <FileCode size={14} className="text-blue-400 shrink-0" />
                            {suggestion?.files && suggestion.files.length > 1 ? (
                                <select
                                    value={fileInput}
                                    onChange={(e) => { setFileInput(e.target.value); loadFile(e.target.value); }}
                                    className="flex-1 bg-slate-800 text-sm text-slate-300 rounded-md px-2.5 py-1.5 border border-slate-600 focus:border-blue-500 focus:outline-none font-mono"
                                >
                                    {suggestion.files.map(f => (
                                        <option key={f} value={f}>{f}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    value={fileInput}
                                    onChange={(e) => setFileInput(e.target.value)}
                                    placeholder="Enter file path (e.g., src/utils.ts)"
                                    className="flex-1 bg-slate-800 text-sm text-slate-300 rounded-md px-2.5 py-1.5 border border-slate-600 focus:border-blue-500 focus:outline-none font-mono"
                                    onKeyDown={(e) => { if (e.key === 'Enter') loadFile(fileInput); }}
                                />
                            )}
                            <button
                                onClick={() => loadFile(fileInput)}
                                disabled={fileLoading || !fileInput}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {fileLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                                Load
                            </button>
                            {originalContent && hasChanges && (
                                <button
                                    onClick={() => setEditorContent(originalContent)}
                                    className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1.5"
                                >
                                    <RotateCcw size={12} />
                                    Revert
                                </button>
                            )}
                        </div>

                        {/* Translation bar */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
                            <Languages size={14} className="text-purple-400 shrink-0" />
                            <span className="text-xs text-slate-400 font-medium min-w-[80px]">
                                {getLangLabel(detectedLanguage)}
                            </span>
                            <ArrowRight size={14} className="text-slate-600 shrink-0" />
                            <select
                                value={targetLanguage}
                                onChange={(e) => setTargetLanguage(e.target.value)}
                                className="bg-slate-800 text-xs text-slate-300 rounded-md px-2 py-1.5 border border-slate-600 focus:border-purple-500 focus:outline-none"
                            >
                                <option value="">Select target language</option>
                                {TARGET_LANGUAGES.filter(l => l.value !== detectedLanguage).map(lang => (
                                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleTranslate}
                                disabled={translating || !targetLanguage}
                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-purple-600 hover:bg-purple-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {translating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                                Translate
                            </button>
                        </div>

                        {/* Monaco Editor + generating overlay */}
                        <div className="relative">
                            <MonacoEditor
                                height="400px"
                                language={detectedLanguage}
                                theme="vs-dark"
                                value={editorContent}
                                onChange={(value) => setEditorContent(value || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    wordWrap: 'on',
                                    automaticLayout: true,
                                    padding: { top: 12 },
                                    renderLineHighlight: 'all',
                                    readOnly: generating,
                                }}
                            />
                            {(generating || genError) && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                                    {generating ? (
                                        <>
                                            <Loader2 size={28} className="text-indigo-400 animate-spin mb-3" />
                                            <p className="text-sm font-semibold text-white mb-1">Generating code...</p>
                                            <p className="text-xs text-slate-400">AI is writing the solution</p>
                                        </>
                                    ) : genError ? (
                                        <>
                                            <AlertTriangle size={28} className="text-red-400 mb-3" />
                                            <p className="text-sm font-semibold text-red-300 mb-1">Generation failed</p>
                                            <p className="text-xs text-slate-400 mb-3 max-w-xs text-center">{genError}</p>
                                            <button
                                                onClick={() => {
                                                    setGenError(null);
                                                    generateSolution(originalContent || null, selectedFile);
                                                }}
                                                className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
                                            >
                                                <RotateCcw size={12} /> Retry
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            )}
                        </div>

                        {/* Commit message bar */}
                        {commitMessage && (
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-900/80 border-t border-slate-700/50">
                                <Sparkles size={14} className="text-yellow-400 shrink-0" />
                                <input
                                    type="text"
                                    value={commitMessage}
                                    onChange={(e) => setCommitMessage(e.target.value)}
                                    className="flex-1 bg-slate-800 text-sm text-slate-300 rounded-md px-2.5 py-1.5 border border-slate-600 focus:border-yellow-500 focus:outline-none font-mono"
                                    placeholder="Commit message..."
                                />
                            </div>
                        )}
                    </>
                ) : activeTab === 'tests' ? (
                    <div className="min-h-[350px]">
                        <TestSandbox
                            fileContent={editorContent}
                            fileName={selectedFile || suggestion?.files?.[0] || 'source.ts'}
                        />
                    </div>
                ) : (
                    /* ── AI Review Tab (fully preserved) ── */
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
                                            fileName={selectedFile || suggestion?.files[0] || 'src/index.ts'}
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
                                                onClick={() => signInWithGitHub()}
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
                                No review requested yet. Edit your code and click &quot;Submit to Review&quot;.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer toolbar */}
            <div className="bg-slate-900 p-4 flex flex-wrap justify-between items-center gap-3">
                <div className="text-sm text-slate-400 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${hasChanges ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    {activeTab === 'tests'
                        ? 'Write and run tests against your code'
                        : hasChanges
                            ? 'Unsaved changes'
                            : 'Ready to submit'
                    }
                </div>
                {activeTab === 'editor' && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={handleGenerateCommitMsg}
                            disabled={commitMsgLoading || !editorContent}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 border border-yellow-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                            {commitMsgLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                            AI Commit Message
                        </button>
                        <button
                            onClick={handleReview}
                            disabled={reviewLoading || !editorContent}
                            className="px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <Send size={14} />
                            Submit to Review
                        </button>
                        {session ? (
                            <button
                                onClick={() => setShowConfirm(true)}
                                disabled={prLoading || !editorContent}
                                className="px-3 py-2 text-sm font-medium rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                                <GitPullRequest size={14} />
                                Create PR
                            </button>
                        ) : (
                            <button
                                onClick={() => signInWithGitHub()}
                                className="px-3 py-2 text-sm font-medium rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1.5"
                            >
                                Sign In to Push
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
