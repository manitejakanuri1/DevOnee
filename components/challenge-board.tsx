"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    FileText,
    TestTube,
    Bug,
    Rocket,
    RefreshCw,
    Flame,
    Trophy,
    Star,
    Loader2,
    Play,
    GitPullRequest,
    Zap,
} from "lucide-react";

interface Challenge {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    category: "docs" | "tests" | "bugfix" | "feature" | "refactor";
    xp_reward: number;
    target_files: string[];
    steps: string[];
    status: string;
}

interface XPData {
    xp_total: number;
    level: string;
    streak_days: number;
    next: string;
    xpNeeded: number;
    progress: number;
}

interface ChallengeBoardProps {
    owner: string;
    repo: string;
    onSelectChallenge?: (challenge: Challenge) => void;
    onDryRun?: (challenge: Challenge) => void;
}

const CATEGORY_ICONS: Record<string, any> = {
    docs: FileText,
    tests: TestTube,
    bugfix: Bug,
    feature: Rocket,
    refactor: RefreshCw,
};

const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    easy: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", dot: "bg-green-400" },
    medium: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", dot: "bg-yellow-400" },
    hard: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" },
};

const LEVEL_COLORS: Record<string, string> = {
    Beginner: "text-slate-400",
    Contributor: "text-blue-400",
    Pro: "text-purple-400",
    Maintainer: "text-yellow-400",
};

export function ChallengeBoard({ owner, repo, onSelectChallenge, onDryRun }: ChallengeBoardProps) {
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [xpData, setXpData] = useState<XPData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        loadChallenges();
        loadXP();
    }, [owner, repo]);

    const loadChallenges = async () => {
        try {
            const res = await fetch("/api/challenges/list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            });
            const data = await res.json();
            if (data.success) {
                setChallenges(data.challenges);
            }
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const loadXP = async () => {
        try {
            const res = await fetch("/api/user/xp");
            const data = await res.json();
            if (data.success) setXpData(data);
        } catch {}
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch("/api/challenges/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ owner, repo }),
            });
            const data = await res.json();
            if (data.success) {
                setChallenges(data.challenges);
            }
        } catch {
        } finally {
            setGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mr-3" size={24} />
                Loading challenges...
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* XP Header */}
            {xpData && (
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center">
                            <Trophy className="text-yellow-400" size={24} />
                        </div>
                        <div>
                            <p className={`text-lg font-bold ${LEVEL_COLORS[xpData.level] || "text-white"}`}>
                                {xpData.level}
                            </p>
                            <p className="text-sm text-slate-400">{xpData.xp_total} XP</p>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    <div className="flex-1 w-full">
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>{xpData.level}</span>
                            <span>{xpData.next}</span>
                        </div>
                        <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${xpData.progress}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {xpData.xpNeeded > 0 ? `${xpData.xpNeeded} XP to next level` : "Max level reached!"}
                        </p>
                    </div>

                    {/* Streak */}
                    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2.5">
                        <Flame className="text-orange-400" size={20} />
                        <div>
                            <p className="text-lg font-bold text-orange-300">{xpData.streak_days}</p>
                            <p className="text-xs text-orange-400/70">day streak</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Challenge Cards */}
            {challenges.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                    <Star className="mx-auto text-slate-600" size={48} />
                    <p className="text-slate-400">No challenges generated yet for this repository.</p>
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                    >
                        {generating ? (
                            <><Loader2 size={18} className="animate-spin" /> Generating with AI...</>
                        ) : (
                            <><Zap size={18} /> Generate AI Challenges</>
                        )}
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {challenges.map((challenge, idx) => {
                        const CategoryIcon = CATEGORY_ICONS[challenge.category] || FileText;
                        const colors = DIFFICULTY_COLORS[challenge.difficulty] || DIFFICULTY_COLORS.easy;

                        return (
                            <motion.div
                                key={challenge.id || idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className="bg-slate-800/80 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                            <CategoryIcon size={16} className={colors.text} />
                                        </div>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                                            {challenge.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400 text-sm font-bold">
                                        <Zap size={14} />
                                        {challenge.xp_reward} XP
                                    </div>
                                </div>

                                <h4 className="text-white font-semibold mb-2 group-hover:text-blue-300 transition-colors">
                                    {challenge.title}
                                </h4>
                                <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                                    {challenge.description}
                                </p>

                                {challenge.target_files?.length > 0 && (
                                    <div className="text-xs text-slate-500 mb-3 font-mono truncate">
                                        {challenge.target_files[0]}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {onDryRun && (
                                        <button
                                            onClick={() => onDryRun(challenge)}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Play size={14} /> Dry Run
                                        </button>
                                    )}
                                    {onSelectChallenge && (
                                        <button
                                            onClick={() => onSelectChallenge(challenge)}
                                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <GitPullRequest size={14} /> Contribute
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
