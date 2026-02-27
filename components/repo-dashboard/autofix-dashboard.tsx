"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bot, Search, Loader2, AlertTriangle, Bug, Shield, Zap,
    CheckCircle2, GitPullRequest, ExternalLink, EyeOff,
    Settings, ChevronDown, ChevronUp, AlertCircle, Sparkles,
    RefreshCw, FileCode, XCircle,
} from "lucide-react";
import { useSession } from "next-auth/react";

// ── Types ──────────────────────────────────────────────────────
interface DetectedIssue {
    id: string;
    issue_type: "bug" | "lint" | "security" | "performance" | "test_failure";
    severity: "low" | "medium" | "high" | "critical";
    file_path: string;
    line_start: number | null;
    line_end: number | null;
    description: string;
    suggested_fix: string | null;
    status: "open" | "fixed" | "pr_created" | "ignored";
    pr_url: string | null;
    created_at: string;
}

interface AutofixDashboardProps {
    owner: string;
    repo: string;
}

// ── Config ─────────────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, { color: string; label: string; order: number }> = {
    critical: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Critical", order: 0 },
    high: { color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "High", order: 1 },
    medium: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Medium", order: 2 },
    low: { color: "text-slate-400 bg-slate-500/10 border-slate-500/20", label: "Low", order: 3 },
};

const STATUS_CONFIG: Record<string, { color: string; icon: any; label: string }> = {
    open: { color: "text-yellow-400", icon: AlertTriangle, label: "Open" },
    fixed: { color: "text-green-400", icon: CheckCircle2, label: "Fix Ready" },
    pr_created: { color: "text-blue-400", icon: GitPullRequest, label: "PR Created" },
    ignored: { color: "text-slate-500", icon: EyeOff, label: "Ignored" },
};

const TYPE_ICONS: Record<string, any> = {
    bug: Bug,
    lint: AlertCircle,
    security: Shield,
    performance: Zap,
    test_failure: AlertTriangle,
};

const TYPE_LABELS: Record<string, string> = {
    bug: "Bug",
    lint: "Lint",
    security: "Security",
    performance: "Performance",
    test_failure: "Test Failure",
};

// ── Component ──────────────────────────────────────────────────
export function AutofixDashboard({ owner, repo }: AutofixDashboardProps) {
    const { data: session } = useSession();
    const [issues, setIssues] = useState<DetectedIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState("");
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch existing issues on mount
    const fetchIssues = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/autofix/issues", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            });
            const data = await res.json();
            if (data.success) {
                setIssues(data.issues || []);
            }
        } catch (err) {
            console.error("Failed to fetch issues:", err);
        } finally {
            setLoading(false);
        }
    }, [owner, repo]);

    useEffect(() => {
        fetchIssues();
    }, [fetchIssues]);

    // Scan repository
    const handleScan = async () => {
        try {
            setScanning(true);
            setError(null);
            setScanProgress("Analyzing repository files...");

            const res = await fetch("/api/autofix/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            });
            const data = await res.json();

            if (data.success) {
                setIssues(data.issues || []);
                setScanProgress(
                    `Scanned ${data.scannedFiles} files — found ${data.newIssues} new issue(s)`
                );
                setTimeout(() => setScanProgress(""), 5000);
            } else {
                setError(data.message || data.error || "Scan failed");
            }
        } catch (err: any) {
            setError(err.message || "Scan failed");
        } finally {
            setScanning(false);
        }
    };

    // Generate fix for an issue
    const handleGenerateFix = async (issueId: string) => {
        try {
            setGeneratingId(issueId);
            setError(null);

            const res = await fetch("/api/autofix/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId }),
            });
            const data = await res.json();

            if (data.success) {
                setIssues((prev) =>
                    prev.map((i) =>
                        i.id === issueId
                            ? { ...i, status: "fixed" as const, suggested_fix: data.fixedContent }
                            : i
                    )
                );
            } else {
                setError(data.message || "Fix generation failed");
            }
        } catch (err: any) {
            setError(err.message || "Fix generation failed");
        } finally {
            setGeneratingId(null);
        }
    };

    // Apply fix (create PR)
    const handleApply = async (issueId: string) => {
        if (!session) {
            setError("Please sign in with GitHub to create PRs");
            return;
        }
        try {
            setApplyingId(issueId);
            setError(null);

            const res = await fetch("/api/autofix/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ issueId }),
            });
            const data = await res.json();

            if (data.success) {
                setIssues((prev) =>
                    prev.map((i) =>
                        i.id === issueId
                            ? { ...i, status: "pr_created" as const, pr_url: data.prUrl }
                            : i
                    )
                );
            } else {
                setError(data.message || "PR creation failed");
            }
        } catch (err: any) {
            setError(err.message || "PR creation failed");
        } finally {
            setApplyingId(null);
        }
    };

    // Ignore an issue (local only for now)
    const handleIgnore = (issueId: string) => {
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
    };

    // Stats
    const openCount = issues.filter((i) => i.status === "open").length;
    const fixedCount = issues.filter((i) => i.status === "fixed").length;
    const prCount = issues.filter((i) => i.status === "pr_created").length;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center">
                            <Bot size={20} className="text-violet-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">AI Agent</h3>
                            <p className="text-xs text-slate-400">
                                Autonomous bug detection & fix generation
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Settings"
                        >
                            <Settings size={16} />
                        </button>
                        <button
                            onClick={handleScan}
                            disabled={scanning}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
                        >
                            {scanning ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Search size={14} />
                            )}
                            {scanning ? "Scanning..." : "Scan Repository"}
                        </button>
                    </div>
                </div>

                {/* Scan progress */}
                {scanProgress && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 flex items-center gap-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2"
                    >
                        {scanning ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={12} />
                        )}
                        {scanProgress}
                    </motion.div>
                )}

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-4 flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                    >
                        <XCircle size={12} />
                        {error}
                        <button
                            onClick={() => setError(null)}
                            className="ml-auto text-red-400 hover:text-red-300"
                        >
                            ×
                        </button>
                    </motion.div>
                )}

                {/* Stats */}
                {issues.length > 0 && (
                    <div className="flex gap-4 mb-2">
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                            <span className="text-yellow-400 font-semibold">{openCount}</span>
                            <span className="text-slate-500">Open</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-green-400 font-semibold">{fixedCount}</span>
                            <span className="text-slate-500">Fix Ready</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-blue-400 font-semibold">{prCount}</span>
                            <span className="text-slate-500">PRs Created</span>
                        </div>
                    </div>
                )}

                {/* Settings panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Settings size={11} />
                                    Auto-Fix Rules
                                </h4>
                                <p className="text-[10px] text-slate-500">
                                    Configure which issues the agent should auto-fix. Requires GitHub sign-in.
                                </p>
                                {["bug", "security", "lint", "performance"].map((type) => {
                                    const Icon = TYPE_ICONS[type] || Bug;
                                    return (
                                        <div
                                            key={type}
                                            className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Icon size={14} className="text-slate-400" />
                                                <span className="text-sm text-slate-200 capitalize">
                                                    {TYPE_LABELS[type] || type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-slate-300">
                                                    <option value="medium">≤ Medium</option>
                                                    <option value="high">≤ High</option>
                                                    <option value="critical">≤ Critical</option>
                                                </select>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" />
                                                    <div className="w-8 h-4 bg-slate-700 peer-checked:bg-violet-600 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4" />
                                                </label>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Issues list */}
            {loading ? (
                <div className="glass-card rounded-2xl p-8 flex flex-col items-center gap-3">
                    <Loader2 size={24} className="animate-spin text-violet-400" />
                    <span className="text-sm text-slate-400">Loading detected issues...</span>
                </div>
            ) : issues.length === 0 ? (
                <div className="glass-card rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                        <Bot size={28} className="text-violet-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-white">No Issues Detected</h4>
                    <p className="text-sm text-slate-400 max-w-md">
                        Click &quot;Scan Repository&quot; to have the AI agent analyze the codebase
                        for bugs, security vulnerabilities, and code smells.
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    <AnimatePresence>
                        {issues.map((issue, idx) => {
                            const TypeIcon = TYPE_ICONS[issue.issue_type] || Bug;
                            const sev = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.low;
                            const st = STATUS_CONFIG[issue.status] || STATUS_CONFIG.open;
                            const StatusIcon = st.icon;
                            const isGenerating = generatingId === issue.id;
                            const isApplying = applyingId === issue.id;

                            return (
                                <motion.div
                                    key={issue.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ delay: idx * 0.03 }}
                                    className="glass-card rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors"
                                >
                                    {/* Issue header */}
                                    <div className="flex items-start gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            issue.issue_type === "security"
                                                ? "bg-red-500/15"
                                                : issue.issue_type === "bug"
                                                ? "bg-orange-500/15"
                                                : "bg-yellow-500/15"
                                        }`}>
                                            <TypeIcon
                                                size={14}
                                                className={
                                                    issue.issue_type === "security"
                                                        ? "text-red-400"
                                                        : issue.issue_type === "bug"
                                                        ? "text-orange-400"
                                                        : "text-yellow-400"
                                                }
                                            />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${sev.color}`}>
                                                    {sev.label}
                                                </span>
                                                <span className="text-[10px] text-slate-500 capitalize">
                                                    {TYPE_LABELS[issue.issue_type] || issue.issue_type}
                                                </span>
                                                <span className={`flex items-center gap-1 text-[10px] ${st.color}`}>
                                                    <StatusIcon size={10} />
                                                    {st.label}
                                                </span>
                                            </div>

                                            <p className="text-sm text-slate-200 mb-1.5">
                                                {issue.description}
                                            </p>

                                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                <FileCode size={10} />
                                                <span className="font-mono">{issue.file_path}</span>
                                                {issue.line_start && (
                                                    <span>
                                                        :{issue.line_start}
                                                        {issue.line_end ? `-${issue.line_end}` : ""}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 mt-3 ml-11">
                                        {issue.status === "open" && (
                                            <>
                                                <button
                                                    onClick={() => handleGenerateFix(issue.id)}
                                                    disabled={isGenerating}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/20 text-green-400 text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {isGenerating ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <Sparkles size={12} />
                                                    )}
                                                    {isGenerating ? "Generating..." : "Generate Fix"}
                                                </button>
                                                <button
                                                    onClick={() => handleIgnore(issue.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors"
                                                >
                                                    <EyeOff size={12} />
                                                    Ignore
                                                </button>
                                            </>
                                        )}

                                        {issue.status === "fixed" && (
                                            <>
                                                <button
                                                    onClick={() => handleApply(issue.id)}
                                                    disabled={isApplying}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 text-xs font-medium transition-colors disabled:opacity-50"
                                                >
                                                    {isApplying ? (
                                                        <Loader2 size={12} className="animate-spin" />
                                                    ) : (
                                                        <GitPullRequest size={12} />
                                                    )}
                                                    {isApplying ? "Creating PR..." : "Create PR"}
                                                </button>
                                                <button
                                                    onClick={() => handleGenerateFix(issue.id)}
                                                    disabled={isGenerating}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors disabled:opacity-50"
                                                >
                                                    <RefreshCw size={12} />
                                                    Regenerate
                                                </button>
                                                <button
                                                    onClick={() => handleIgnore(issue.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs transition-colors"
                                                >
                                                    <EyeOff size={12} />
                                                    Ignore
                                                </button>
                                            </>
                                        )}

                                        {issue.status === "pr_created" && issue.pr_url && (
                                            <a
                                                href={issue.pr_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 text-xs font-medium transition-colors"
                                            >
                                                <ExternalLink size={12} />
                                                View Pull Request
                                            </a>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
