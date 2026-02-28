"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles, Loader2, RefreshCw, Lock, LogIn,
    Bug, FileText, TestTube, Rocket, RefreshCcw, Shield, Zap,
    Clock, ChevronRight, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { signInWithGitHub } from "@/lib/auth";

interface Suggestion {
    id: string;
    title: string;
    description: string;
    files: string[];
    steps: string[];
    impact: "low" | "medium" | "high";
    category: string;
    estimated_effort: string;
}

interface AgentSuggestionsProps {
    owner: string;
    repo: string;
    licenseLevel: string;
    onAccept: (suggestion: Suggestion) => void;
}

const IMPACT_CONFIG: Record<string, { color: string; label: string }> = {
    high: { color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "High Impact" },
    medium: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Medium" },
    low: { color: "text-slate-400 bg-slate-500/10 border-slate-500/20", label: "Low" },
};

const CATEGORY_ICONS: Record<string, any> = {
    bug: Bug,
    docs: FileText,
    test: TestTube,
    feature: Rocket,
    refactor: RefreshCcw,
    security: Shield,
    performance: Zap,
};

const CATEGORY_COLORS: Record<string, string> = {
    bug: "text-red-400",
    docs: "text-cyan-400",
    test: "text-yellow-400",
    feature: "text-green-400",
    refactor: "text-purple-400",
    security: "text-orange-400",
    performance: "text-blue-400",
};

export function AgentSuggestions({ owner, repo, licenseLevel, onAccept }: AgentSuggestionsProps) {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [persona, setPersona] = useState<string>("");

    const fetchSuggestions = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/agent/suggestions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error === "LIMIT_EXCEEDED"
                    ? "Daily limit reached. Sign in for more."
                    : data.error || data.message || "Failed to load suggestions");
                return;
            }
            if (data.success) {
                setSuggestions(data.suggestions || []);
                setPersona(data.persona || "");
            }
        } catch (e: any) {
            setError("Failed to load suggestions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuggestions();
    }, [owner, repo]);

    const handleAccept = (suggestion: Suggestion) => {
        if (licenseLevel === "danger") return;
        onAccept(suggestion);
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Sparkles size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Personalized Suggestions</h3>
                        <p className="text-[10px] text-slate-500">Analyzing repository for you...</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="glass-card rounded-xl p-4 animate-pulse">
                            <div className="h-4 bg-white/5 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-white/5 rounded w-full mb-2" />
                            <div className="h-3 bg-white/5 rounded w-2/3 mb-4" />
                            <div className="h-8 bg-white/5 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="mb-8">
                <div className="glass-card rounded-xl p-6 flex flex-col items-center gap-3 text-center">
                    <AlertTriangle size={24} className="text-yellow-400" />
                    <p className="text-sm text-slate-400">{error}</p>
                    <button
                        onClick={fetchSuggestions}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition-colors"
                    >
                        <RefreshCw size={12} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) return null;

    return (
        <div className="mb-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                        <Sparkles size={16} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Personalized Suggestions</h3>
                        <p className="text-[10px] text-slate-500">
                            {persona ? `Tailored for ${persona}` : "AI-powered improvements for this repo"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchSuggestions}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] transition-colors"
                    title="Refresh suggestions"
                >
                    <RefreshCw size={10} /> Refresh
                </button>
            </div>

            {/* Suggestion Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <AnimatePresence>
                    {suggestions.map((s, idx) => {
                        const CatIcon = CATEGORY_ICONS[s.category] || Rocket;
                        const catColor = CATEGORY_COLORS[s.category] || "text-slate-400";
                        const impact = IMPACT_CONFIG[s.impact] || IMPACT_CONFIG.medium;
                        const isLocked = licenseLevel === "danger";

                        return (
                            <motion.div
                                key={s.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="glass-card rounded-xl p-4 flex flex-col gap-3 group hover:border-indigo-500/20 transition-all"
                            >
                                {/* Top: category + impact */}
                                <div className="flex items-center justify-between">
                                    <div className={`flex items-center gap-1.5 text-[10px] font-medium ${catColor}`}>
                                        <CatIcon size={12} />
                                        {s.category}
                                    </div>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full border ${impact.color}`}>
                                        {impact.label}
                                    </span>
                                </div>

                                {/* Title */}
                                <h4 className="text-xs font-bold text-white leading-snug line-clamp-2">
                                    {s.title}
                                </h4>

                                {/* Description */}
                                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-3">
                                    {s.description}
                                </p>

                                {/* Files */}
                                {s.files.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                        {s.files.slice(0, 2).map((f, i) => (
                                            <span key={i} className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-500 truncate max-w-[140px]">
                                                {f.split("/").pop()}
                                            </span>
                                        ))}
                                        {s.files.length > 2 && (
                                            <span className="text-[9px] text-slate-600">+{s.files.length - 2}</span>
                                        )}
                                    </div>
                                )}

                                {/* Effort */}
                                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                    <Clock size={9} />
                                    {s.estimated_effort}
                                </div>

                                {/* Spacer */}
                                <div className="flex-1" />

                                {/* Accept button */}
                                {isLocked ? (
                                    <button
                                        disabled
                                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold cursor-not-allowed"
                                    >
                                        <Lock size={10} /> License Restricted
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAccept(s)}
                                        className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-300 text-[10px] font-semibold transition-all group-hover:bg-indigo-600/30"
                                    >
                                        Accept & Start <ChevronRight size={10} />
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
