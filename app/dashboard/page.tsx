"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    GitPullRequest,
    GitMerge,
    FolderSearch,
    Users,
    TrendingUp,
    Trophy,
    Flame,
    ExternalLink,
    Loader2,
    Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";

interface DashboardStats {
    totalPRs: number;
    mergedPRs: number;
    reposExplored: number;
    activeContributors: number;
    mergeRate: number;
}

interface Contribution {
    id: string;
    pr_url: string;
    pr_title: string;
    status: string;
    created_at: string;
    xp_earned: number;
    fork_owner: string;
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [contributions, setContributions] = useState<Contribution[]>([]);
    const [xpData, setXpData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch("/api/dashboard/stats").then((r) => r.json()),
            fetch("/api/user/xp").then((r) => r.json()).catch(() => null),
        ])
            .then(([dashData, xp]) => {
                if (dashData.success) {
                    setStats(dashData.stats);
                    setContributions(dashData.recentContributions);
                }
                if (xp?.success) setXpData(xp);
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-slate-400">
                <Loader2 className="animate-spin mr-3" size={24} />
                Loading dashboard...
            </div>
        );
    }

    const statCards = [
        {
            title: "PRs Created",
            value: stats?.totalPRs || 0,
            icon: GitPullRequest,
            color: "text-blue-400",
            bg: "from-blue-500/10 to-blue-600/5",
        },
        {
            title: "PRs Merged",
            value: stats?.mergedPRs || 0,
            icon: GitMerge,
            color: "text-green-400",
            bg: "from-green-500/10 to-green-600/5",
        },
        {
            title: "Repos Explored",
            value: stats?.reposExplored || 0,
            icon: FolderSearch,
            color: "text-purple-400",
            bg: "from-purple-500/10 to-purple-600/5",
        },
        {
            title: "Merge Rate",
            value: `${stats?.mergeRate || 0}%`,
            icon: TrendingUp,
            color: "text-yellow-400",
            bg: "from-yellow-500/10 to-yellow-600/5",
        },
    ];

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <a href="/" className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-sm">
                            D1
                        </a>
                        <h1 className="text-xl font-semibold">Dashboard</h1>
                    </div>
                    {session?.user && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-400">{session.user.name}</span>
                            {session.user.image && (
                                <img
                                    src={session.user.image}
                                    alt=""
                                    className="w-8 h-8 rounded-full border border-slate-700"
                                />
                            )}
                        </div>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {statCards.map((card, idx) => {
                        const Icon = card.icon;
                        return (
                            <motion.div
                                key={card.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                className={`bg-gradient-to-br ${card.bg} border border-slate-700 rounded-2xl p-5`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <Icon size={20} className={card.color} />
                                </div>
                                <p className="text-3xl font-bold text-white">{card.value}</p>
                                <p className="text-sm text-slate-400 mt-1">{card.title}</p>
                            </motion.div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* XP Card */}
                    {xpData && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4"
                        >
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Trophy className="text-yellow-400" size={20} />
                                Your Progress
                            </h2>

                            <div className="text-center space-y-2">
                                <p className="text-4xl font-bold text-white">{xpData.xp_total}</p>
                                <p className="text-sm text-slate-400">Total XP</p>
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                    {xpData.level}
                                </span>
                            </div>

                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>{xpData.level}</span>
                                    <span>{xpData.next}</span>
                                </div>
                                <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${xpData.progress}%` }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-orange-400">
                                <Flame size={18} />
                                <span className="font-bold">{xpData.streak_days} day streak</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Recent Contributions */}
                    <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700 rounded-2xl p-6">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <GitPullRequest size={20} className="text-blue-400" />
                            Recent Contributions
                        </h2>

                        {contributions.length === 0 ? (
                            <p className="text-slate-400 text-center py-8">
                                No contributions yet. Explore a repo and start contributing!
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {contributions.map((c, idx) => (
                                    <motion.div
                                        key={c.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors"
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                c.status === "merged"
                                                    ? "bg-green-400"
                                                    : c.status === "closed"
                                                    ? "bg-red-400"
                                                    : "bg-yellow-400"
                                            }`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-white truncate">
                                                {c.pr_title || "Contribution"}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {new Date(c.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                c.status === "merged"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : c.status === "closed"
                                                    ? "bg-red-500/10 text-red-400"
                                                    : "bg-yellow-500/10 text-yellow-400"
                                            }`}
                                        >
                                            {c.status || "open"}
                                        </span>
                                        {c.xp_earned > 0 && (
                                            <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                                                <Zap size={12} />
                                                {c.xp_earned}
                                            </span>
                                        )}
                                        {c.pr_url && (
                                            <a
                                                href={c.pr_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-slate-400 hover:text-blue-400"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
