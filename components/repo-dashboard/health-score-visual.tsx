"use client";

import { Shield, FileText, TestTube2, Activity, HelpCircle } from 'lucide-react';

interface HealthScoreVisualProps {
    score: number | null;
    metrics: Record<string, any> | null;
}

export function HealthScoreVisual({ score, metrics }: HealthScoreVisualProps) {
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
        if (s >= 80) return { text: 'text-green-400', bg: 'bg-green-400', ring: 'ring-green-400/20' };
        if (s >= 60) return { text: 'text-yellow-400', bg: 'bg-yellow-400', ring: 'ring-yellow-400/20' };
        return { text: 'text-red-400', bg: 'bg-red-400', ring: 'ring-red-400/20' };
    };

    const c = getColor(score);

    const checks = [
        { label: 'README', icon: FileText, ok: metrics?.hasReadme },
        { label: 'Tests', icon: TestTube2, ok: metrics?.hasTests },
        { label: 'Active', icon: Activity, ok: metrics?.recentActivity },
        { label: 'Good Issues', icon: HelpCircle, ok: metrics?.hasGoodFirstIssues },
    ];

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center ring-4 ${c.ring} shrink-0`}>
                <Shield size={24} className={c.text} />
                <span className={`absolute -bottom-1 ${c.bg} text-black text-xs font-bold px-2 py-0.5 rounded-full`}>
                    {score}
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
                        {checks.map(({ label, icon: Icon, ok }) => (
                            <div key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-400' : 'text-slate-500'}`}>
                                <Icon size={12} />
                                {label}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
