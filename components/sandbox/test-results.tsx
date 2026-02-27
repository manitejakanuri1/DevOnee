"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle2, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight,
    Terminal as TerminalIcon, BarChart3, Loader2
} from 'lucide-react';

export interface TestResult {
    name: string;
    suite: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
    expected?: string;
    actual?: string;
}

export interface TestRunResult {
    tests: TestResult[];
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    totalDuration: number;
    consoleOutput: string[];
    timestamp: string;
}

interface TestResultsProps {
    results: TestRunResult | null;
    isRunning: boolean;
}

const statusConfig = {
    passed: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'PASS' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'FAIL' },
    skipped: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'SKIP' },
};

function TestItem({ test, index }: { test: TestResult; index: number }) {
    const [expanded, setExpanded] = useState(test.status === 'failed');
    const config = statusConfig[test.status];
    const StatusIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
        >
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg ${config.bg} border ${config.border} hover:brightness-110 transition-all text-left`}
            >
                <StatusIcon size={14} className={config.color} />
                <div className="flex-1 min-w-0">
                    <span className="text-xs text-slate-500">{test.suite} › </span>
                    <span className="text-sm text-slate-200">{test.name}</span>
                </div>
                <span className={`text-[10px] font-bold ${config.color} shrink-0`}>{config.label}</span>
                <span className="text-[10px] text-slate-500 shrink-0 w-10 text-right">{test.duration}ms</span>
                {test.error && (
                    expanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />
                )}
            </button>

            <AnimatePresence>
                {expanded && test.error && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="ml-6 mt-1 mb-2 p-3 rounded-lg bg-red-950/30 border border-red-500/10 text-xs font-mono">
                            <p className="text-red-300 whitespace-pre-wrap">{test.error}</p>
                            {test.expected && (
                                <div className="mt-2 space-y-1">
                                    <p className="text-slate-500">Expected: <span className="text-green-400">{test.expected}</span></p>
                                    <p className="text-slate-500">Received: <span className="text-red-400">{test.actual}</span></p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export function TestResults({ results, isRunning }: TestResultsProps) {
    const [showConsole, setShowConsole] = useState(false);

    if (isRunning) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <Loader2 className="animate-spin mb-4 text-green-400" size={28} />
                <p className="text-sm">Running tests...</p>
                <p className="text-xs text-slate-600 mt-1">Executing in sandbox environment</p>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-12 text-slate-500">
                <BarChart3 size={28} className="mb-3 text-slate-600" />
                <p className="text-sm">No test results yet</p>
                <p className="text-xs text-slate-600 mt-1">Write some tests and click "Run Tests"</p>
            </div>
        );
    }

    const total = results.totalPassed + results.totalFailed + results.totalSkipped;
    const passRate = total > 0 ? Math.round((results.totalPassed / total) * 100) : 0;

    return (
        <div className="flex flex-col h-full">
            {/* Summary bar */}
            <div className="px-3 py-2.5 bg-slate-900/80 border-b border-white/5 flex items-center gap-3">
                <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-green-400" />
                        <span className="text-xs text-green-400 font-semibold">{results.totalPassed}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <XCircle size={13} className="text-red-400" />
                        <span className="text-xs text-red-400 font-semibold">{results.totalFailed}</span>
                    </div>
                    {results.totalSkipped > 0 && (
                        <div className="flex items-center gap-1.5">
                            <AlertTriangle size={13} className="text-yellow-400" />
                            <span className="text-xs text-yellow-400 font-semibold">{results.totalSkipped}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 ml-2">
                        <Clock size={12} className="text-slate-500" />
                        <span className="text-[11px] text-slate-500">{results.totalDuration}ms</span>
                    </div>
                </div>

                {/* Pass rate badge */}
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    passRate === 100 ? 'bg-green-500/20 text-green-400' :
                    passRate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                }`}>
                    {passRate}% pass
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 flex bg-slate-800">
                {results.totalPassed > 0 && (
                    <div className="bg-green-500 transition-all" style={{ width: `${(results.totalPassed / total) * 100}%` }} />
                )}
                {results.totalFailed > 0 && (
                    <div className="bg-red-500 transition-all" style={{ width: `${(results.totalFailed / total) * 100}%` }} />
                )}
                {results.totalSkipped > 0 && (
                    <div className="bg-yellow-500 transition-all" style={{ width: `${(results.totalSkipped / total) * 100}%` }} />
                )}
            </div>

            {/* Test list */}
            <div className="flex-1 overflow-y-auto panel-scroll p-3 space-y-1.5">
                {results.tests.map((test, idx) => (
                    <TestItem key={`${test.suite}-${test.name}`} test={test} index={idx} />
                ))}
            </div>

            {/* Console output toggle */}
            {results.consoleOutput.length > 0 && (
                <div className="border-t border-white/5">
                    <button
                        onClick={() => setShowConsole(!showConsole)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 hover:bg-white/5 transition-colors"
                    >
                        <TerminalIcon size={12} />
                        Console Output ({results.consoleOutput.length} lines)
                        {showConsole ? <ChevronDown size={12} className="ml-auto" /> : <ChevronRight size={12} className="ml-auto" />}
                    </button>
                    <AnimatePresence>
                        {showConsole && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="max-h-32 overflow-y-auto bg-[#1a1a2e] p-3 font-mono text-[11px] leading-4 space-y-0.5">
                                    {results.consoleOutput.map((line, i) => (
                                        <div key={i} className={`${
                                            line.startsWith('[ERROR]') ? 'text-red-400' :
                                            line.startsWith('[WARN]') ? 'text-yellow-400' :
                                            'text-slate-400'
                                        }`}>
                                            {line}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}
