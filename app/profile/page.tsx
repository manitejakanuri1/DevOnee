"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Trophy, Flame, Star, GitCommit, GitPullRequest, Code, CheckCircle, MapPin, Loader2, FolderGit2, GitFork, Pencil, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserProfile() {
    const { data: session, status } = useSession();
    const [repos, setRepos] = useState<any[]>([]);
    const [loadingRepos, setLoadingRepos] = useState(false);

    useEffect(() => {
        async function fetchRepos() {
            setLoadingRepos(true);
            try {
                // Fetch from our backend to get DevOne indexed repos
                const res = await fetch('/api/repo/list');
                const data = await res.json();
                if (data.success && Array.isArray(data.repositories)) {
                    setRepos(data.repositories);
                }
            } catch (e) {
                console.error("Failed to fetch indexed repos", e);
            } finally {
                setLoadingRepos(false);
            }
        }
        if (session) {
            fetchRepos();
        }
    }, [session]);

    if (status === "loading") {
        return (
            <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#0f172a] text-slate-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4">You are not signed in.</h1>
                <p className="text-slate-400">Please sign in via GitHub to view your DevOne profile.</p>
            </div>
        );
    }

    const userName = session.user?.name || "GitHub User";
    const userInitials = userName.substring(0, 2).toUpperCase();

    // Mock generic achievements
    const achievements = [
        { id: 1, title: 'First Steps', description: 'Generated a personalized onboarding plan', icon: MapPin, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        { id: 2, title: 'Contributor', description: 'Simulated a first contribution PR safely', icon: GitPullRequest, color: 'text-green-400', bg: 'bg-green-500/10' },
        { id: 3, title: 'Code Explorer', description: 'Viewed 10+ syntax highlighted blob files', icon: Code, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        { id: 4, title: 'Community Helper', description: 'Posted an upvoted community insight', icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    ];

    const history = [
        { date: 'Today', event: 'Created simulated PR on facebook/react' },
        { date: 'Yesterday', event: 'Generated plan for vercel/next.js' },
        { date: '3 days ago', event: 'Earned "Code Explorer" badge' },
    ];

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-50 font-sans pb-20">
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md pt-20 pb-12">
                <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-8">
                    {session.user?.image ? (
                        <img src={session.user.image} alt="Profile" className="w-32 h-32 rounded-full border-4 border-slate-700 shadow-xl" />
                    ) : (
                        <div className="w-32 h-32 rounded-full border-4 border-slate-700 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-bold">
                            {userInitials}
                        </div>
                    )}
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-4xl font-extrabold mb-2">{userName}</h1>
                        <p className="text-slate-400 text-lg mb-6">{session.user?.email}</p>

                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                                <Flame className="text-orange-500" size={20} />
                                <span className="font-semibold">12 Day Streak</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                                <Trophy className="text-yellow-400" size={20} />
                                <span className="font-semibold">8450 Points</span>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700">
                                <GitCommit className="text-slate-300" size={20} />
                                <span className="font-semibold">{repos.length} Repositories</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="text-yellow-400" /> Earned Badges
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {achievements.map(badge => {
                            const Icon = badge.icon as any;
                            return (
                                <div key={badge.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex items-start gap-4 hover:bg-slate-800 transition-colors">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${badge.bg} ${badge.color}`}>
                                        {Icon ? <Icon size={24} /> : <CheckCircle size={24} />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg text-slate-200">{badge.title}</h4>
                                        <p className="text-sm text-slate-400 leading-relaxed mt-1">{badge.description}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold flex items-center gap-2 pt-6">
                            <FolderGit2 className="text-blue-500" /> Your Current Projects
                        </h2>
                        {loadingRepos ? (
                            <div className="flex items-center justify-center p-8 bg-slate-800/50 rounded-2xl border border-slate-700">
                                <Loader2 className="animate-spin text-slate-500" size={24} />
                            </div>
                        ) : repos.length === 0 ? (
                            <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl text-center text-slate-500">
                                No public repositories found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {repos.map((repo, i) => (
                                    <EditableRepoCard key={repo.id} repo={repo} index={i} />
                                ))}
                            </div>
                        )}
                    </div>

                </div>

                <div className="space-y-6">
                    <h2 className="text-2xl font-bold">Activity Feed</h2>
                    <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 relative">
                        <div className="absolute left-8 top-10 bottom-10 w-0.5 bg-slate-700"></div>
                        <div className="space-y-6 relative z-10">
                            {history.map((h, i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 mt-1 shrink-0 ring-4 ring-slate-800/50" />
                                    <div>
                                        <p className="text-slate-200 font-medium">{h.event}</p>
                                        <span className="text-xs text-slate-500 font-medium">{h.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function EditableRepoCard({ repo, index }: { repo: any, index: number }) {
    const [isEditing, setIsEditing] = useState(false);
    const [summary, setSummary] = useState(repo.summary || "No summary provided yet. Click to generate an onboarding plan!");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/repo/summary', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: repo.id, summary })
            });
            if (res.ok) {
                setIsEditing(false);
            } else {
                alert("Failed to save summary.");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="block p-5 bg-slate-800/30 transition-colors border border-slate-700/50 hover:border-slate-600 rounded-xl"
        >
            <div className="flex items-center justify-between mb-3">
                <a href={`/repo/${repo.name}`} className="font-semibold text-blue-400 hover:text-blue-300 hover:underline truncate pr-4 text-lg">
                    {repo.name}
                </a>
            </div>

            {isEditing ? (
                <div className="mt-2 mb-4">
                    <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 min-h-[100px]"
                    />
                    <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors" disabled={isSaving}><X size={16} /></button>
                        <button onClick={handleSave} className="px-3 py-1.5 text-white bg-green-600 hover:bg-green-700 rounded-md shadow-lg shadow-green-500/20 transition-colors flex items-center gap-2" disabled={isSaving}>
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Save Changes</>}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="relative group/edit mb-4 bg-slate-900/50 rounded-lg p-4 border border-slate-800">
                    <p className="text-sm text-slate-300 leading-relaxed pr-8 whitespace-pre-wrap">
                        {summary}
                    </p>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="absolute right-2 top-2 p-2 text-slate-500 hover:text-blue-400 opacity-0 group-hover/edit:opacity-100 transition-opacity bg-slate-800 rounded-md border border-slate-700 hover:border-blue-500/50 shadow-sm"
                        title="Edit Summary"
                    >
                        <Pencil size={14} />
                    </button>
                </div>
            )}

            <div className="flex gap-4 text-xs font-medium text-slate-500 mt-2">
                <span className="flex items-center gap-1.5"><FolderGit2 size={14} className="text-blue-500/70" /> Indexed in DevOne</span>
                <span className="flex items-center gap-1 text-slate-700">•</span>
                <span>{new Date(repo.created_at).toLocaleDateString()}</span>
            </div>
        </motion.div>
    );
}

