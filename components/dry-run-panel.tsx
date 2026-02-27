"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Loader2,
    Shield,
    FlaskConical,
    FileCheck,
    GitMerge,
    Code2,
    GitPullRequest,
} from "lucide-react";

interface DryRunPrediction {
    tests: { status: "pass" | "warn" | "fail"; reason: string };
    linting: { status: "pass" | "warn" | "fail"; reason: string };
    conflicts: { status: "pass" | "warn" | "fail"; reason: string };
    typeSafety: { status: "pass" | "warn" | "fail"; reason: string };
    riskScore: number;
    summary: string;
}

interface DryRunPanelProps {
    owner: string;
    repo: string;
    filePath: string;
    originalContent: string;
    newContent: string;
    challengeId?: string;
    onComplete?: (prediction: DryRunPrediction) => void;
    onContribute?: () => void;
}

const CHECK_ITEMS = [
    { key: "tests", label: "Test Suite", icon: FlaskConical },
    { key: "linting", label: "Linting & Style", icon: FileCheck },
    { key: "conflicts", label: "Merge Conflicts", icon: GitMerge },
    { key: "typeSafety", label: "Type Safety", icon: Code2 },
];

const STATUS_ICONS = {
    pass: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10" },
    warn: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    fail: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10" },
};

export function DryRunPanel({
    owner,
    repo,
    filePath,
    originalContent,
    newContent,
    challengeId,
    onComplete,
    onContribute,
}: DryRunPanelProps) {
    const [loading, setLoading] = useState(false);
    const [prediction, setPrediction] = useState<DryRunPrediction | null>(null);
    const [revealedItems, setRevealedItems] = useState<number>(0);

    const runDryRun = async () => {
        setLoading(true);
        setPrediction(null);
        setRevealedItems(0);

        try {
            const res = await fetch("/api/pr/dry-run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    owner,
                    repo,
                    filePath,
                    originalContent,
                    newContent,
                    challengeId,
                }),
            });

            const data = await res.json();
            if (data.success) {
                setPrediction(data.prediction);
                onComplete?.(data.prediction);

                // Stagger reveal each item
                for (let i = 0; i < CHECK_ITEMS.length; i++) {
                    await new Promise((r) => setTimeout(r, 600));
                    setRevealedItems((prev) => prev + 1);
                }
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const riskColor =
        prediction?.riskScore && prediction.riskScore <= 3
            ? "text-green-400"
            : prediction?.riskScore && prediction.riskScore <= 6
            ? "text-yellow-400"
            : "text-red-400";

    const riskBarColor =
        prediction?.riskScore && prediction.riskScore <= 3
            ? "bg-green-500"
            : prediction?.riskScore && prediction.riskScore <= 6
            ? "bg-yellow-500"
            : "bg-red-500";

    const isSafe = prediction?.riskScore !== undefined && prediction.riskScore <= 5;

    return (
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                    <Shield className="text-blue-400" size={20} />
                    CI/CD Dry Run
                </h3>
                {!prediction && (
                    <button
                        onClick={runDryRun}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {loading ? (
                            <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                        ) : (
                            <><Shield size={16} /> Run Analysis</>
                        )}
                    </button>
                )}
            </div>

            <div className="p-5 space-y-4">
                {!prediction && !loading && (
                    <p className="text-sm text-slate-400 text-center py-8">
                        Run a dry-run analysis to predict how your changes will perform in CI/CD.
                    </p>
                )}

                {/* Loading State */}
                {loading && !prediction && (
                    <div className="flex flex-col items-center py-8 text-slate-400">
                        <Loader2 className="animate-spin mb-4 text-blue-400" size={32} />
                        <p>AI is analyzing your changes...</p>
                    </div>
                )}

                {/* Results */}
                {prediction && (
                    <div className="space-y-3">
                        {CHECK_ITEMS.map((item, idx) => {
                            const status = prediction[item.key as keyof DryRunPrediction] as any;
                            const revealed = idx < revealedItems;
                            const StatusIcon = revealed ? STATUS_ICONS[status?.status as keyof typeof STATUS_ICONS]?.icon || Loader2 : Loader2;
                            const statusColor = revealed ? STATUS_ICONS[status?.status as keyof typeof STATUS_ICONS]?.color || "text-slate-500" : "text-slate-600";
                            const statusBg = revealed ? STATUS_ICONS[status?.status as keyof typeof STATUS_ICONS]?.bg || "" : "";

                            return (
                                <motion.div
                                    key={item.key}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.15 }}
                                    className={`flex items-center gap-3 p-3 rounded-xl border ${revealed ? "border-slate-600" : "border-slate-700/50"} ${statusBg}`}
                                >
                                    {revealed ? (
                                        <StatusIcon size={20} className={statusColor} />
                                    ) : (
                                        <Loader2 size={20} className="text-slate-600 animate-spin" />
                                    )}
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${revealed ? "text-white" : "text-slate-500"}`}>
                                            {item.label}
                                        </p>
                                        {revealed && status?.reason && (
                                            <p className="text-xs text-slate-400 mt-0.5">{status.reason}</p>
                                        )}
                                    </div>
                                    {revealed && (
                                        <span className={`text-xs font-bold uppercase ${statusColor}`}>
                                            {status?.status}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}

                        {/* Risk Score */}
                        <AnimatePresence>
                            {revealedItems >= CHECK_ITEMS.length && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="space-y-3 pt-3 border-t border-slate-700"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-slate-300 font-medium">Risk Score</span>
                                        <span className={`text-2xl font-bold ${riskColor}`}>
                                            {prediction.riskScore}/10
                                        </span>
                                    </div>
                                    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${prediction.riskScore * 10}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className={`h-full rounded-full ${riskBarColor}`}
                                        />
                                    </div>

                                    <p className="text-sm text-slate-400 italic">{prediction.summary}</p>

                                    {isSafe && onContribute && (
                                        <motion.button
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            onClick={onContribute}
                                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors mt-2"
                                        >
                                            <GitPullRequest size={18} />
                                            Safe to submit — Create Pull Request
                                        </motion.button>
                                    )}

                                    {!isSafe && (
                                        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-sm text-yellow-200">
                                            High risk detected. Review your changes carefully before submitting.
                                            {onContribute && (
                                                <button
                                                    onClick={onContribute}
                                                    className="mt-2 w-full bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    Submit anyway
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
