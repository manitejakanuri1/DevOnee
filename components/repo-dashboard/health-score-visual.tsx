"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, FileText, TestTube2, Activity, HelpCircle,
    ChevronDown, ChevronRight, Scale, Users, GitBranch,
    BookOpen, Workflow,
} from 'lucide-react';

interface BreakdownItem {
    score: number;
    max: number;
    label: string;
    detail: string;
}

interface HealthScoreVisualProps {
    score: number | null;
    metrics: Record<string, any> | null;
    breakdown?: Record<string, BreakdownItem> | null;
}

const metricIcons: Record<string, any> = {
    readme: FileText,
    tests: TestTube2,
    activity: Activity,
    issues: HelpCircle,
    license: Scale,
    contributing: BookOpen,
    ci: Workflow,
    community: Users,
};

export function HealthScoreVisual({ score, metrics, breakdown }: HealthScoreVisualProps) {
    const [expanded, setExpanded] = useState(false);

    if (score === null) {
        return (
            <div className="flex items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-24 bg-white/5 rounded" />
                    <div className="h-2 w-full bg-white/5 rounded-full" />
                </div>
            </div>
        );
    }

    const getColor = (s: number) => {
        if (s >= 80) return { text: 'text-green-400', bg: 'bg-green-400', ring: 'ring-green-400/20', glow: 'shadow-green-500/20' };
        if (s >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-400', ring: 'ring-yellow-400/20', glow: 'shadow-yellow-500/20' };
        return { text: 'text-red-400', bg: 'bg-red-400', ring: 'ring-red-400/20', glow: 'shadow-red-500/20' };
    };

    const getBarColor = (pct: number) => {
        if (pct >= 80) return 'bg-green-400';
        if (pct >= 50) return 'bg-yellow-400';
        return 'bg-red-400';
    };

    const c = getColor(score);

    const grade =
        score >= 90 ? 'A+' :
        score >= 80 ? 'A' :
        score >= 70 ? 'B' :
        score >= 60 ? 'C' :
        score >= 50 ? 'D' : 'F';

    const quickChecks = [
        { label: 'README', ok: metrics?.readme === 'Present' },
        { label: 'Tests', ok: metrics?.tests === 'Present' },
        { label: 'Active', ok: metrics?.activity === 'High' || metrics?.activity === 'Moderate' },
        { label: 'Good Issues', ok: (metrics?.goodFirstIssuesCount || 0) > 0 },
    ];

    const breakdownEntries = breakdown ? Object.entries(breakdown) : [];

    return (
        <div className="space-y-3">
            {/* Main score row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ring-4 ${c.ring} shrink-0`}>
                    <Shield size={24} className={c.text} />
                    <span className={`absolute -bottom-1 ${c.bg} text-black text-xs font-bold px-2 py-0.5 rounded-full`}>
                        {score}
                    </span>
                    <span className={`absolute -top-1 -right-1 ${c.bg} text-black text-[10px] font-black px-1.5 py-0.5 rounded-full`}>
                        {grade}
                    </span>
                </div>
                <div className="flex-1 space-y-3 w-full">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-300">Health Score</span>
                        <span className={`text-sm font-bold ${c.text}`}>{score}/100</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${c.bg} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                    {metrics && (
                        <div className="flex flex-wrap gap-3">
                            {quickChecks.map(({ label, ok }) => (
                                <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-400' : 'bg-slate-600'}`} />
                                    {label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Expandable breakdown */}
            {breakdownEntries.length > 0 && (
                <>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1.5 px-1"
                    >
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="font-medium">
                            {expanded ? 'Hide breakdown' : 'Show detailed breakdown'}
                        </span>
                        <span className="flex-1 border-t border-dashed border-white/10 ml-2" />
                    </button>

                    <AnimatePresence>
                        {expanded && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {breakdownEntries.map(([key, item]) => {
                                        const pct = item.max > 0 ? Math.round((item.score / item.max) * 100) : 0;
                                        const Icon = metricIcons[key] || GitBranch;
                                        return (
                                            <div
                                                key={key}
                                                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                    pct >= 80 ? 'bg-green-500/15' :
                                                    pct >= 50 ? 'bg-yellow-500/15' :
                                                    'bg-red-500/15'
                                                }`}>
                                                    <Icon size={14} className={
                                                        pct >= 80 ? 'text-green-400' :
                                                        pct >= 50 ? 'text-yellow-400' :
                                                        'text-red-400'
                                                    } />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-slate-200 truncate">
                                                            {item.label}
                                                        </span>
                                                        <span className={`text-[10px] font-bold ml-2 shrink-0 ${
                                                            pct >= 80 ? 'text-green-400' :
                                                            pct >= 50 ? 'text-yellow-400' :
                                                            'text-red-400'
                                                        }`}>
                                                            {item.score}/{item.max}
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${getBarColor(pct)}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                                                        {item.detail}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </div>
    );
}
