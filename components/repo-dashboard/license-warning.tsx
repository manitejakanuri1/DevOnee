"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield, AlertTriangle, Ban, Info, ChevronDown, ChevronRight,
    ExternalLink, FileWarning, Scale, BookOpen
} from 'lucide-react';

interface LicenseData {
    key: string;
    name: string;
    spdxId: string | null;
    url: string | null;
    warningLevel: 'info' | 'warning' | 'danger';
    description: string;
    obligations: string[];
    hasPatentClause: boolean;
    hasPatentsFile: boolean;
    hasNoticeFile?: boolean;
}

interface LicenseWarningProps {
    owner: string;
    repo: string;
}

const levelConfig = {
    info: {
        icon: Shield,
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/20',
        headerBg: 'bg-emerald-500/10',
        iconColor: 'text-emerald-400',
        titleColor: 'text-emerald-300',
        badgeBg: 'bg-emerald-500/20',
        badgeText: 'text-emerald-400',
        label: 'Permissive',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-yellow-500/5',
        border: 'border-yellow-500/20',
        headerBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-400',
        titleColor: 'text-yellow-300',
        badgeBg: 'bg-yellow-500/20',
        badgeText: 'text-yellow-400',
        label: 'Copyleft',
    },
    danger: {
        icon: Ban,
        bg: 'bg-red-500/5',
        border: 'border-red-500/20',
        headerBg: 'bg-red-500/10',
        iconColor: 'text-red-400',
        titleColor: 'text-red-300',
        badgeBg: 'bg-red-500/20',
        badgeText: 'text-red-400',
        label: 'Restrictive',
    },
};

export function LicenseWarning({ owner, repo }: LicenseWarningProps) {
    const [license, setLicense] = useState<LicenseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(false);
        setLicense(null);

        fetch('/api/repo/license', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ owner, repo })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setLicense(data.license);
                } else {
                    setError(true);
                }
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));
    }, [owner, repo]);

    if (loading) {
        return (
            <div className="glass-card rounded-2xl p-4 animate-pulse">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-40 bg-white/5 rounded" />
                        <div className="h-3 w-64 bg-white/5 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !license) return null;

    const config = levelConfig[license.warningLevel];
    const LevelIcon = config.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden`}
        >
            {/* Header */}
            <button
                onClick={() => setExpanded(!expanded)}
                className={`w-full flex items-center gap-3 p-4 ${config.headerBg} hover:brightness-110 transition-all text-left`}
            >
                <div className={`w-8 h-8 rounded-lg ${config.badgeBg} flex items-center justify-center shrink-0`}>
                    <LevelIcon size={16} className={config.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={`text-sm font-semibold ${config.titleColor}`}>
                            {license.name}
                        </h4>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${config.badgeBg} ${config.badgeText}`}>
                            {config.label}
                        </span>
                        {license.spdxId && (
                            <span className="text-[10px] text-slate-500 font-mono">{license.spdxId}</span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{license.description}</p>
                </div>
                <div className="shrink-0 text-slate-500">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </button>

            {/* Expanded details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 space-y-4 border-t border-white/5">
                            {/* Description */}
                            <p className="text-sm text-slate-300 leading-relaxed">
                                {license.description}
                            </p>

                            {/* Obligations */}
                            {license.obligations.length > 0 && (
                                <div>
                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                        <BookOpen size={11} /> Obligations
                                    </h5>
                                    <ul className="space-y-1.5">
                                        {license.obligations.map((ob, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    license.warningLevel === 'info' ? 'bg-emerald-500' :
                                                    license.warningLevel === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                                }`} />
                                                {ob}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Patent notices */}
                            <div className="flex flex-wrap gap-2">
                                {license.hasPatentClause && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
                                        <Scale size={11} />
                                        Includes patent grant
                                    </div>
                                )}
                                {license.hasPatentsFile && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
                                        <FileWarning size={11} />
                                        PATENTS file detected — review before contributing
                                    </div>
                                )}
                                {license.hasNoticeFile && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-500/10 border border-slate-500/20 text-xs text-slate-300">
                                        <Info size={11} />
                                        NOTICE file present
                                    </div>
                                )}
                            </div>

                            {/* Link to full license */}
                            {license.url && (
                                <a
                                    href={license.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    <ExternalLink size={11} />
                                    View full license text on GitHub
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
